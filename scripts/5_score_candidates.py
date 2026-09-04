"""
STEP 5 -- Score and rank candidate vessels.

For every vessel in the AIS window, four sub-scores are computed against the
backtrack locus from step 4, then combined with the weights declared in
common.SCORE_WEIGHTS (40 / 30 / 20 / 10, from the phase-1 spec).

  proximity      0.40  How close the vessel was to the estimated release point
                       AT the estimated release time, discounted by how well
                       constrained that origin is (see ORIGIN CONFIDENCE below).
  heading        0.30  Alignment of the vessel's course over ground with the
                       slick's elongation axis. An axis has no head or tail, so
                       0 deg and 180 deg both count as aligned.
                         |cos(delta_theta)|
  temporal       0.20  How close in time the vessel's nearest approach to that
                       origin point was to the estimated release time.
                         exp(-|dt| / 90 min)
  ais_continuity 0.10  SOFT signal only. Fires if the vessel has a reporting gap
                       longer than 20 min that overlaps the estimated release
                       time within +/- 2 h while the vessel was within 10 km.
                       An AIS gap is never treated as proof of anything.

AGE SELECTION.  The slick age is unknown, so each vessel is matched against
whichever candidate age in the locus places it closest to the origin at that
age's origin time. Because proximity is evaluated at the origin TIME rather than
over the whole track, a vessel that crossed the origin point many hours earlier
does not score well on proximity -- which would otherwise be a serious failure
mode of a purely additive composite.

ORIGIN CONFIDENCE (a declared addition to the spec's four raw components).
Step 4's uncertainty radius grows with backtrack distance: an origin inferred by
drifting back 30 minutes is located to ~250 m, one inferred by drifting back
12 hours only to ~4.4 km. Matching a vessel to within 150 m of a 4.4 km-radius
origin disc is much weaker evidence than matching it to within 150 m of a 250 m
disc, because the larger disc contains far more vessels by chance. Proximity is
therefore discounted:

    origin_confidence = d0 / max(d0, uncertainty_radius)      d0 = 1500 m
    score_proximity   = exp(-d / d0) * origin_confidence

Without this, the deep end of the locus sweeps through the tug and barge
mooring basins of the upper Houston Ship Channel and every moored tug there
scores near-perfect proximity and near-perfect temporal alignment. Both the
discounted and the raw proximity are written to the output so the effect is
auditable, and step 6 reports the ranking with and without it.

TEMPORAL SEARCH WINDOW.  The vessel's "nearest approach" to the origin is
searched only within +/- 6 h of the estimated origin time. Without this window a
vessel that transits the same point twice is scored against the wrong transit,
which produced spurious near-zero temporal scores in an earlier revision.

GAP HANDLING.  If a vessel has no fix within +/- 30 min of a candidate origin
time but does have fixes bracketing it, its position is linearly interpolated
across the gap and the fact is recorded. This is deliberate: a vessel that goes
dark exactly over the release window is precisely the case the continuity
signal exists to catch, and dropping it would discard the signal.

This script must NOT import truth.py.

Input  : data/interim/spill_scene.json, backtrack.json,
         ais_tracks.parquet, ais_vessels.csv
Output : data/out/candidate_scores.csv
         data/out/age_resolved_top.csv
"""

from __future__ import annotations

import argparse
import json

import numpy as np
import pandas as pd
from shapely.geometry import Point, Polygon, shape

from common import (
    INTERIM,
    OUT,
    SCORE_SCALES,
    SCORE_WEIGHTS,
    axis_angle_diff,
    banner,
    to_m,
)

# A vessel fix must be this close in time to count as a direct observation
# rather than an interpolation across a reporting gap.
DIRECT_FIX_TOLERANCE_S = 30 * 60
# Nearest-approach search window around the candidate origin time.
TEMPORAL_SEARCH_WINDOW_S = 6 * 3600
NS = 1e9


def build_scene_polygon() -> Polygon:
    fc = json.loads((INTERIM / "spill_observation.geojson").read_text(encoding="utf-8"))
    poly_deg = shape(fc["features"][0]["geometry"])
    lon, lat = np.array(poly_deg.exterior.coords).T
    xm, ym = to_m(lon, lat)
    p = Polygon(zip(xm, ym))
    return p if p.is_valid else p.buffer(0)


def score_vessel(t_ns, x, y, cog, locus_t_ns, locus_x, locus_y, locus_conf, axis_az):
    """
    Score one vessel's track against every candidate age in the backtrack locus.

    t_ns, x, y, cog are 1-D arrays for a single MMSI, sorted by time.
    Returns (best_result_dict, per_age_composite_array).
    """
    n_ages = len(locus_t_ns)
    t_first, t_last = t_ns[0], t_ns[-1]

    per_age = np.full(n_ages, np.nan)
    results: list[dict | None] = [None] * n_ages

    for k in range(n_ages):
        tk = locus_t_ns[k]
        if tk < t_first or tk > t_last:
            # No coverage at this origin time at all; this age cannot be scored
            # for this vessel without extrapolating, which we refuse to do.
            continue

        ox, oy = locus_x[k], locus_y[k]

        # --- position at the origin time -----------------------------------
        j = min(max(int(np.searchsorted(t_ns, tk)), 1), len(t_ns) - 1)
        nearest_fix_s = min(abs(tk - t_ns[j]), abs(tk - t_ns[j - 1])) / NS
        px = float(np.interp(tk, t_ns, x))
        py = float(np.interp(tk, t_ns, y))
        d_at_time = float(np.hypot(px - ox, py - oy))
        interpolated = nearest_fix_s > DIRECT_FIX_TOLERANCE_S

        # --- proximity, discounted by how well constrained this origin is ---
        prox_raw = float(np.exp(-d_at_time / SCORE_SCALES["proximity_efold_m"]))
        prox = prox_raw * locus_conf[k]

        # --- temporal: nearest approach WITHIN +/- 6 h of the origin time ---
        win = np.abs(t_ns - tk) <= TEMPORAL_SEARCH_WINDOW_S * NS
        dists = np.hypot(x - ox, y - oy)
        if win.any():
            idx = np.flatnonzero(win)
            i_near = int(idx[int(np.argmin(dists[idx]))])
            dt_s = float(abs(t_ns[i_near] - tk) / NS)
            temporal = float(np.exp(-dt_s / SCORE_SCALES["temporal_efold_s"]))
        else:
            i_near = int(np.argmin(dists))
            dt_s = float(abs(t_ns[i_near] - tk) / NS)
            temporal = 0.0

        # --- heading: COG around that approach vs the slick's axis ----------
        cw = cog[max(0, i_near - 3): i_near + 4]
        cw = cw[np.isfinite(cw)]
        if len(cw):
            a = np.radians(cw)
            cog_use = float(
                np.degrees(np.arctan2(np.sin(a).mean(), np.cos(a).mean())) % 360.0
            )
            dtheta = axis_angle_diff(cog_use, axis_az)
            heading = float(abs(np.cos(np.radians(dtheta))))
        else:
            cog_use, dtheta, heading = np.nan, np.nan, 0.0

        # --- AIS continuity: soft signal only -------------------------------
        gaps_s = np.diff(t_ns) / NS
        cont, gap_len_s, gap_off_s = 0.0, 0.0, np.nan
        for gi in np.flatnonzero(gaps_s > SCORE_SCALES["ais_gap_threshold_s"]):
            mid = (t_ns[gi] + t_ns[gi + 1]) / 2.0
            off = abs(mid - tk) / NS
            if off > SCORE_SCALES["ais_gap_time_window_s"]:
                continue
            r = min(np.hypot(x[gi] - ox, y[gi] - oy),
                    np.hypot(x[gi + 1] - ox, y[gi + 1] - oy))
            if r > SCORE_SCALES["ais_gap_range_m"]:
                continue
            s = min(1.0, gaps_s[gi] / 3600.0)  # >= 60 min saturates
            if s > cont:
                cont, gap_len_s, gap_off_s = float(s), float(gaps_s[gi]), float(off)

        composite = (
            SCORE_WEIGHTS["proximity"] * prox
            + SCORE_WEIGHTS["heading"] * heading
            + SCORE_WEIGHTS["temporal"] * temporal
            + SCORE_WEIGHTS["ais_continuity"] * cont
        )
        per_age[k] = composite
        results[k] = {
            "composite_score": composite,
            "score_proximity": prox,
            "score_proximity_raw": prox_raw,
            "origin_confidence": float(locus_conf[k]),
            "score_heading": heading,
            "score_temporal": temporal,
            "score_ais_continuity": cont,
            "k": k,
            "dist_at_origin_time_m": d_at_time,
            "dist_nearest_approach_m": float(dists[i_near]),
            "dt_nearest_approach_s": dt_s,
            "cog_at_approach_deg": cog_use,
            "heading_axis_delta_deg": dtheta,
            "position_interpolated_across_gap": bool(interpolated),
            "ais_gap_len_s": gap_len_s,
            "ais_gap_mid_offset_s": gap_off_s,
            "i_near": i_near,
        }

    if not np.isfinite(per_age).any():
        return None, per_age

    # A vessel is represented by its best-scoring candidate age.
    k_best = int(np.nanargmax(per_age))
    return results[k_best], per_age


def main() -> None:
    ap = argparse.ArgumentParser(description="Score candidate vessels.")
    ap.add_argument(
        "--no-backtrack",
        action="store_true",
        help="ABLATION: ignore step 4 and assume the release happened at the "
             "slick centroid at the observation time (zero drift). Writes to "
             "candidate_scores_ablation_no_backtrack.csv.",
    )
    args = ap.parse_args()
    ablation = args.no_backtrack

    banner("STEP 5  Score candidate vessels"
           + ("   [ABLATION: no backward drift]" if ablation else ""))

    scene = json.loads((INTERIM / "spill_scene.json").read_text(encoding="utf-8"))
    bt = json.loads((INTERIM / "backtrack.json").read_text(encoding="utf-8"))
    locus = bt["locus"]

    if ablation:
        locus = [{
            "age_h": 0.0,
            "origin_time_utc": scene["observation_time_utc"],
            "origin_lat": scene["centroid_lat"],
            "origin_lon": scene["centroid_lon"],
            "origin_x_m": scene["centroid_x_m"],
            "origin_y_m": scene["centroid_y_m"],
            "uncertainty_radius_m": 250.0,
        }]
        print("  ABLATION: backward drift disabled; single origin = slick centroid")
        print(f"            {scene['centroid_lat']:.5f}, {scene['centroid_lon']:.5f} "
              f"at {scene['observation_time_utc']} UTC")

    axis_az = scene["elongation"]["axis_azimuth_deg"]
    aspect = scene["elongation"]["aspect_ratio"]

    print("\n  weights (from common.SCORE_WEIGHTS):")
    for k, v in SCORE_WEIGHTS.items():
        print(f"    {k:<16} {v:.2f}")
    d0 = SCORE_SCALES["proximity_efold_m"]
    print(f"  proximity e-fold : {d0:.0f} m")
    print(f"  temporal e-fold  : {SCORE_SCALES['temporal_efold_s'] / 60:.0f} min")
    print(f"  slick axis       : {axis_az:.1f} deg (aspect ratio {aspect:.2f})")
    if aspect < 1.5:
        print("    WARNING: aspect ratio < 1.5 -- the slick is nearly round, so its")
        print("             elongation axis is poorly defined and the 30% heading")
        print("             sub-score is largely uninformative for this scene.")

    ais = pd.read_parquet(INTERIM / "ais_tracks.parquet")
    vessels = pd.read_csv(INTERIM / "ais_vessels.csv")
    print(f"\n  scoring {ais.MMSI.nunique():,} vessels / {len(ais):,} position reports")

    locus_t = np.array([pd.Timestamp(l["origin_time_utc"]).value for l in locus], float)
    locus_x = np.array([l["origin_x_m"] for l in locus], float)
    locus_y = np.array([l["origin_y_m"] for l in locus], float)
    locus_age = np.array([l["age_h"] for l in locus], float)
    locus_r = np.array([l["uncertainty_radius_m"] for l in locus], float)
    locus_conf = d0 / np.maximum(d0, locus_r)

    print("\n  origin-confidence discount by age:")
    for a, r, c in zip(locus_age, locus_r, locus_conf):
        if float(a) % 2.0 < 1e-9 or a == locus_age[0]:
            print(f"    age {a:5.1f} h  r_unc {r / 1000:5.2f} km  -> factor {c:.2f}")

    slick = build_scene_polygon()
    cutoff = SCORE_SCALES["candidate_cutoff_m"]
    ais = ais.sort_values(["MMSI", "BaseDateTime"])

    rows, per_age_all, n_skipped = [], {}, 0
    for mmsi, g in ais.groupby("MMSI", sort=False):
        x = g["x_m"].to_numpy(float)
        y = g["y_m"].to_numpy(float)
        if np.min(np.hypot(x[:, None] - locus_x[None, :],
                           y[:, None] - locus_y[None, :])) > cutoff:
            n_skipped += 1
            continue

        t_ns = g["BaseDateTime"].to_numpy("datetime64[ns]").astype("int64").astype(float)
        res, per_age = score_vessel(t_ns, x, y, g["COG"].to_numpy(float),
                                    locus_t, locus_x, locus_y, locus_conf, axis_az)
        if res is None:
            n_skipped += 1
            continue

        k = res.pop("k")
        i_near = res.pop("i_near")
        res["MMSI"] = int(mmsi)
        res["matched_age_h"] = float(locus_age[k])
        res["matched_origin_time_utc"] = locus[k]["origin_time_utc"]
        res["matched_origin_lat"] = locus[k]["origin_lat"]
        res["matched_origin_lon"] = locus[k]["origin_lon"]
        res["matched_origin_r_unc_m"] = float(locus_r[k])
        res["within_origin_uncertainty"] = bool(
            res["dist_at_origin_time_m"] <= locus_r[k]
        )
        res["approach_time_utc"] = str(g["BaseDateTime"].iloc[i_near])
        res["approach_lat"] = round(float(g["LAT"].iloc[i_near]), 6)
        res["approach_lon"] = round(float(g["LON"].iloc[i_near]), 6)
        res["sog_at_approach_kn"] = float(g["SOG"].iloc[i_near])
        res["crossed_slick_polygon"] = bool(slick.intersects(Point(x[i_near], y[i_near])))

        # --- non-scoring diagnostic: arrival timing -------------------------
        # When did this vessel first come within 2 km of the origin it matched?
        # A source must be present at or before the release; a responder
        # converges only afterwards.
        #
        # CAVEAT, stated because it matters: the offset below is measured
        # against the vessel's OWN best-matching origin time, which each vessel
        # effectively self-selects by maximising its own score. It is therefore
        # NOT a valid source-vs-responder discriminator as computed here -- e.g.
        # a fireboat that arrived at 20:47 still looks "present before origin"
        # if its best-matching age puts the origin at 22:20. Making this a real
        # discriminator requires one shared origin time for all vessels, which
        # means resolving the slick age. See docs/PROJECT_HANDOFF.md section 13.
        # The absolute arrival timestamp is reference-free and is the useful
        # column; it is what step 6 reports.
        t_org_ns = locus_t[k]
        near2 = np.hypot(x - locus_x[k], y - locus_y[k]) <= 2000.0
        res["present_within_2km_before_origin"] = bool(
            near2[t_ns <= t_org_ns].any() if (t_ns <= t_org_ns).any() else False
        )
        if near2.any():
            res["first_arrival_within_2km_utc"] = str(
                g["BaseDateTime"].iloc[int(np.flatnonzero(near2)[0])]
            )
            res["arrival_offset_from_origin_s"] = float(
                (t_ns[np.flatnonzero(near2)[0]] - t_org_ns) / NS
            )
        else:
            res["first_arrival_within_2km_utc"] = None
            res["arrival_offset_from_origin_s"] = np.nan

        rows.append(res)
        per_age_all[int(mmsi)] = per_age

    print(f"\n  {len(rows):,} scored, {n_skipped:,} skipped "
          f"(never within {cutoff / 1000:.0f} km of the locus, or no time overlap)")

    df = pd.DataFrame(rows).merge(vessels, on="MMSI", how="left")
    df = df.sort_values("composite_score", ascending=False).reset_index(drop=True)
    df.insert(0, "rank", np.arange(1, len(df) + 1))

    cols = [
        "rank", "MMSI", "name", "imo", "callsign", "type_label", "length_m",
        "composite_score", "score_proximity", "score_heading", "score_temporal",
        "score_ais_continuity", "score_proximity_raw", "origin_confidence",
        "matched_age_h", "matched_origin_time_utc", "matched_origin_lat",
        "matched_origin_lon", "matched_origin_r_unc_m", "dist_at_origin_time_m",
        "within_origin_uncertainty", "dist_nearest_approach_m",
        "dt_nearest_approach_s", "approach_time_utc", "approach_lat",
        "approach_lon", "sog_at_approach_kn", "cog_at_approach_deg",
        "heading_axis_delta_deg", "crossed_slick_polygon",
        "present_within_2km_before_origin", "first_arrival_within_2km_utc",
        "arrival_offset_from_origin_s",
        "position_interpolated_across_gap", "ais_gap_len_s",
        "ais_gap_mid_offset_s", "n_fixes", "t_first", "t_last",
    ]
    df = df[[c for c in cols if c in df.columns]]

    path = OUT / ("candidate_scores_ablation_no_backtrack.csv" if ablation
                  else "candidate_scores.csv")
    df.to_csv(path, index=False, float_format="%.6f")
    print(f"  wrote {path.name}")

    # --- age-resolved diagnostic ------------------------------------------
    # Which vessel tops the ranking if the slick age were known to be X hours?
    # This isolates how much of the result depends on the unresolved age.
    if not ablation:
        name_by_mmsi = vessels.set_index("MMSI")["name"].to_dict()
        recs = []
        mm = np.array(list(per_age_all.keys()))
        mat = np.vstack([per_age_all[m] for m in mm])
        for k, a in enumerate(locus_age):
            col = mat[:, k]
            if not np.isfinite(col).any():
                continue
            order = np.argsort(np.where(np.isfinite(col), -col, np.inf))[:3]
            recs.append({
                "age_h": a,
                "origin_time_utc": locus[k]["origin_time_utc"],
                "n_vessels_scored": int(np.isfinite(col).sum()),
                **{f"top{i + 1}": f"{name_by_mmsi.get(int(mm[o]), '?')} "
                                  f"({col[o]:.3f})"
                   for i, o in enumerate(order)},
            })
        agedf = pd.DataFrame(recs)
        agedf.to_csv(OUT / "age_resolved_top.csv", index=False)
        print(f"  wrote age_resolved_top.csv")

    print("\n  top 8 by composite score:")
    for _, r in df.head(8).iterrows():
        print(f"    {r['rank']:>2}. {str(r['name'])[:20]:<20} {r['composite_score']:.3f}  "
              f"prox {r['score_proximity']:.2f} head {r['score_heading']:.2f} "
              f"temp {r['score_temporal']:.2f} cont {r['score_ais_continuity']:.2f}  "
              f"age {r['matched_age_h']:.1f}h")


if __name__ == "__main__":
    main()
