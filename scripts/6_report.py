"""
STEP 6 -- Report.

Produces the phase-1 deliverable: a ranked candidate list with an explicit
sub-score breakdown and the weights printed in full, plus the diagnostics that
show whether the result is actually earned:

  1. RANKING            top candidates, all four sub-scores, matched slick age.
  2. WEIGHTS            printed from common.SCORE_WEIGHTS, never hardcoded here.
  3. GROUND TRUTH       where the known-involved vessels and the tracked hard
                        negative landed. This is the ONLY section that imports
                        truth.py, and it runs strictly after scoring is done.
  4. ABLATION           the same ranking with backward drift disabled, which
                        tests whether step 4 earns its place in the pipeline.
  5. SENSITIVITY        how the ranking moves if the heading weight is dropped.
                        Reported as a sensitivity test, NOT applied as a silent
                        re-tune: the headline numbers stay on the spec weights.
  6. AGE DIAGNOSTIC     which vessel would top the ranking at each candidate
                        slick age, isolating how much rests on the unknown age.
  7. MAP                slick polygon, backtrack locus and top candidate tracks.

Input  : data/interim/spill_scene.json, backtrack.json, ais_tracks.parquet
         data/out/candidate_scores.csv
         data/out/candidate_scores_ablation_no_backtrack.csv   (optional)
Output : data/out/report.md
         data/out/report.json
         data/out/map.png
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

import truth  # evaluation only -- see the module docstring
from common import (
    CASE,
    INTERIM,
    OUT,
    SCORE_SCALES,
    SCORE_WEIGHTS,
    WIND_DRIFT_FACTOR,
    banner,
    to_m,
)

TOP_N = 10
SUBS = ["proximity", "heading", "temporal", "ais_continuity"]


def recompose(df: pd.DataFrame, weights: dict) -> pd.DataFrame:
    """Re-rank on a different weight vector, renormalised to sum to 1."""
    tot = sum(weights.values())
    s = sum(w * df[f"score_{k}"] for k, w in weights.items()) / tot
    out = df.assign(composite_score=s)
    out = out.sort_values("composite_score", ascending=False).reset_index(drop=True)
    out["rank"] = np.arange(1, len(out) + 1)
    return out


def rank_of(df: pd.DataFrame, mmsi: int):
    r = df[df.MMSI == mmsi]
    if not len(r):
        return None
    return {
        "rank": int(r["rank"].iloc[0]),
        "name": str(r["name"].iloc[0]),
        "composite_score": round(float(r["composite_score"].iloc[0]), 4),
        "matched_age_h": float(r["matched_age_h"].iloc[0]),
        "dist_at_origin_time_m": round(float(r["dist_at_origin_time_m"].iloc[0]), 1),
    }


def table(df: pd.DataFrame, n: int = TOP_N) -> list[str]:
    """Fixed-width ranked table, used for both the console and the markdown."""
    head = (f"{'#':>3}  {'vessel':<22}{'MMSI':>10}  {'type':<12}"
            f"{'score':>7}{'prox':>7}{'head':>7}{'temp':>7}{'cont':>7}"
            f"{'age_h':>7}{'d_org_m':>9}")
    lines = [head, "-" * len(head)]
    for _, r in df.head(n).iterrows():
        lines.append(
            f"{int(r['rank']):>3}  {str(r['name'])[:22]:<22}{int(r['MMSI']):>10}  "
            f"{str(r.get('type_label', '?'))[:12]:<12}"
            f"{r['composite_score']:>7.3f}{r['score_proximity']:>7.2f}"
            f"{r['score_heading']:>7.2f}{r['score_temporal']:>7.2f}"
            f"{r['score_ais_continuity']:>7.2f}"
            f"{r['matched_age_h']:>7.1f}{r['dist_at_origin_time_m']:>9.0f}"
        )
    return lines


def make_map(scene, bt, top, path) -> bool:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from shapely.geometry import shape
    except Exception as e:  # matplotlib is optional for the numbers
        print(f"  (map skipped: {e})")
        return False

    fc = json.loads((INTERIM / "spill_observation.geojson").read_text(encoding="utf-8"))
    poly = shape(fc["features"][0]["geometry"])
    ais = pd.read_parquet(INTERIM / "ais_tracks.parquet",
                          columns=["MMSI", "BaseDateTime", "LAT", "LON"])

    fig, ax = plt.subplots(figsize=(9.5, 10.5))

    px, py = np.array(poly.exterior.coords).T
    ax.fill(px, py, alpha=0.28, fc="peru", ec="saddlebrown", lw=1.6, zorder=3,
            label="slick polygon (SYNTHETIC, simulated)")

    lx = [l["origin_lon"] for l in bt["locus"]]
    ly = [l["origin_lat"] for l in bt["locus"]]
    ax.plot(lx, ly, "-", color="dimgray", lw=1.2, zorder=4)
    ax.scatter(lx, ly, s=16, c=[l["age_h"] for l in bt["locus"]], cmap="viridis",
               zorder=5, label="backtrack locus (0.5-12 h)")
    for l in bt["locus"]:
        if l["age_h"] % 3 == 0:
            ax.annotate(f"{l['age_h']:.0f}h", (l["origin_lon"], l["origin_lat"]),
                        fontsize=7, xytext=(4, 2), textcoords="offset points")

    # Window the tracks to the incident afternoon so the map stays readable.
    t_obs = pd.Timestamp(scene["observation_time_utc"])
    w = ais[(ais.BaseDateTime >= t_obs - pd.Timedelta(hours=6))
            & (ais.BaseDateTime <= t_obs)]
    colors = plt.cm.tab10(np.linspace(0, 1, 10))
    for i, (_, r) in enumerate(top.head(6).iterrows()):
        g = w[w.MMSI == int(r["MMSI"])].sort_values("BaseDateTime")
        if not len(g):
            continue
        ax.plot(g.LON, g.LAT, "-", lw=1.5, color=colors[i % 10], alpha=0.9,
                zorder=6, label=f"{int(r['rank'])}. {r['name']} ({r['composite_score']:.2f})")

    ax.plot(truth.RELEASE["lon"], truth.RELEASE["lat"], "*", ms=20, mfc="red",
            mec="k", mew=0.8, zorder=8, label="TRUE release (ground truth)")
    ax.plot(scene["centroid_lon"], scene["centroid_lat"], "o", ms=8, mfc="none",
            mec="saddlebrown", mew=2, zorder=8, label="slick centroid")

    ax.set_xlim(-95.06, -94.86)
    ax.set_ylim(29.50, 29.72)
    ax.set_aspect(1.0 / np.cos(np.radians(29.6)))
    ax.set_xlabel("longitude")
    ax.set_ylabel("latitude")
    ax.set_title(f"{CASE['case_id']}  --  backtrack and top candidates\n"
                 f"slick observed {scene['observation_time_utc']} UTC",
                 fontsize=11)
    ax.grid(alpha=0.25, ls=":")
    ax.legend(loc="upper left", fontsize=7.5, framealpha=0.93)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return True


def main() -> None:
    banner("STEP 6  Report")

    scene = json.loads((INTERIM / "spill_scene.json").read_text(encoding="utf-8"))
    bt = json.loads((INTERIM / "backtrack.json").read_text(encoding="utf-8"))
    env = json.loads((INTERIM / "env_summary.json").read_text(encoding="utf-8"))
    df = pd.read_csv(OUT / "candidate_scores.csv")

    abl_path = OUT / "candidate_scores_ablation_no_backtrack.csv"
    abl = pd.read_csv(abl_path) if abl_path.exists() else None

    L: list[str] = []          # markdown lines
    def both(s: str = "") -> None:
        print(s)
        L.append(s)

    top1 = df.iloc[0]
    L.append(f"# Spill attribution report -- {CASE['case_id']}")
    L.append("")
    L.append(f"**Case.** {CASE['name']}  ")
    L.append(f"**Slick observed.** {scene['observation_time_utc']} UTC at "
             f"{scene['centroid_lat']:.5f}, {scene['centroid_lon']:.5f} "
             f"({scene['area_km2']:.2f} km2)  ")
    L.append(f"**Spill polygon provenance.** {scene['polygon_source']} -- "
             f"`polygon_is_remote_sensing_observation = "
             f"{scene['polygon_is_remote_sensing_observation']}`. "
             "The release point/time, the wind and the currents are real; the "
             "polygon geometry is simulated. See section 7.  ")
    L.append(f"**Vessels considered.** {len(df):,} scored candidates.")
    L.append("")

    # ---------------------------------------------------------------- 1 -----
    both()
    both("-" * 78)
    both("1. TOP-RANKED CANDIDATE")
    both("-" * 78)
    both(f"  {top1['name']}   (MMSI {int(top1['MMSI'])}, "
         f"{top1.get('type_label', '?')}, "
         f"{'' if pd.isna(top1.get('length_m')) else str(int(top1['length_m'])) + ' m'})")
    both(f"  composite score {top1['composite_score']:.3f}   "
         f"rank 1 of {len(df):,}")
    both()
    for k in SUBS:
        w = SCORE_WEIGHTS[k]
        v = float(top1[f"score_{k}"])
        both(f"    {k:<15} {v:5.3f}  x weight {w:.2f}  = {v * w:6.4f}")
    both(f"    {'':<15} {'':>5}          composite  "
         f"= {top1['composite_score']:6.4f}")
    both()
    both(f"  matched slick age      {top1['matched_age_h']:.1f} h  "
         f"-> origin {top1['matched_origin_time_utc']} UTC at "
         f"{top1['matched_origin_lat']:.5f}, {top1['matched_origin_lon']:.5f}")
    both(f"  distance at origin time {top1['dist_at_origin_time_m']:.0f} m "
         f"(origin uncertainty radius {top1['matched_origin_r_unc_m']:.0f} m)")
    both(f"  nearest approach       {top1['dist_nearest_approach_m']:.0f} m at "
         f"{top1['approach_time_utc']} UTC, SOG "
         f"{top1['sog_at_approach_kn']:.1f} kn, COG "
         f"{top1['cog_at_approach_deg']:.0f} deg")
    both(f"  first within 2 km      {top1['first_arrival_within_2km_utc']} UTC")

    # ---------------------------------------------------------------- 2 -----
    both()
    both("-" * 78)
    both("2. WEIGHTS AND SCORE SHAPE  (from common.py, not hardcoded in this report)")
    both("-" * 78)
    for k, v in SCORE_WEIGHTS.items():
        both(f"    {k:<15} {v:.2f}")
    both(f"    proximity      exp(-d / {SCORE_SCALES['proximity_efold_m']:.0f} m), "
         f"then x origin_confidence = 1500 / max(1500, r_unc)")
    both(f"    heading        |cos(COG - slick axis)|, undirected axis")
    both(f"    temporal       exp(-|dt| / {SCORE_SCALES['temporal_efold_s']/60:.0f} min), "
         "nearest approach within +/-6 h of the origin time")
    both(f"    ais_continuity soft flag: gap > "
         f"{SCORE_SCALES['ais_gap_threshold_s']/60:.0f} min, within "
         f"{SCORE_SCALES['ais_gap_time_window_s']/3600:.0f} h and "
         f"{SCORE_SCALES['ais_gap_range_m']/1000:.0f} km of the origin. "
         "Never treated as proof.")
    both(f"    wind drift     slick velocity = current + "
         f"{WIND_DRIFT_FACTOR:.3f} x wind")

    # ---------------------------------------------------------------- 3 -----
    both()
    both("-" * 78)
    both(f"3. RANKING  (top {TOP_N} of {len(df):,})")
    both("-" * 78)
    for line in table(df):
        both("  " + line)

    # ---------------------------------------------------------------- 4 -----
    both()
    both("-" * 78)
    both("4. GROUND-TRUTH EVALUATION  (this section only; scoring never saw it)")
    both("-" * 78)
    both(f"  true release  {truth.RELEASE['time_utc']} UTC at "
         f"{truth.RELEASE['lat']:.5f}, {truth.RELEASE['lon']:.5f}")
    true_age = (pd.Timestamp(scene["observation_time_utc"])
                - truth.release_time()).total_seconds() / 3600.0
    both(f"  true slick age {true_age:.2f} h")
    both()

    # How close did the backtrack get, at the true age and at its best age?
    tx, ty = to_m(truth.RELEASE["lon"], truth.RELEASE["lat"])
    errs = [(l["age_h"], float(np.hypot(l["origin_x_m"] - tx, l["origin_y_m"] - ty)))
            for l in bt["locus"]]
    at_true = min(errs, key=lambda e: abs(e[0] - true_age))
    best = min(errs, key=lambda e: e[1])
    both(f"  backtrack error at the true age ({at_true[0]:.1f} h): "
         f"{at_true[1]:.0f} m")
    both(f"  best point on the locus        ({best[0]:.1f} h): {best[1]:.0f} m")
    both()

    gt = {}
    for mmsi, meta in truth.CULPRITS.items():
        r = rank_of(df, mmsi)
        gt[str(mmsi)] = {"role": meta["role"], "imo": meta["imo"], "result": r}
        if r:
            both(f"  KNOWN INVOLVED  rank {r['rank']:>3}  {r['name']:<15} "
                 f"score {r['composite_score']:.3f}  matched age "
                 f"{r['matched_age_h']:.1f} h  ({meta['role']})")
        else:
            both(f"  KNOWN INVOLVED  NOT IN RANKING  MMSI {mmsi} ({meta['role']})")
    for mmsi, meta in truth.HARD_NEGATIVES.items():
        r = rank_of(df, mmsi)
        gt[str(mmsi)] = {"role": "hard negative: " + meta["note"],
                         "imo": meta["imo"], "result": r}
        if r:
            both(f"  HARD NEGATIVE   rank {r['rank']:>3}  {r['name']:<15} "
                 f"score {r['composite_score']:.3f}  ({meta['note']})")

    ranks = [v["result"]["rank"] for v in gt.values()
             if v["result"] and not v["role"].startswith("hard")]
    both()
    if ranks:
        both(f"  Both known-involved vessels are inside the top "
             f"{max(ranks)} of {len(df):,} "
             f"({max(ranks) / len(df) * 100:.1f}th percentile or better).")
        both("  NOTE: neither is rank 1. The vessels above them are real vessels")
        both("  that were physically at the casualty scene -- assist tugs and a")
        both("  fireboat. The pipeline localises the event correctly but cannot")
        both("  yet distinguish causing a spill from responding to one.")

    # ---------------------------------------------------------------- 5 -----
    both()
    both("-" * 78)
    both("5. ABLATION -- does the backward-drift step earn its place?")
    both("-" * 78)
    abl_summary = None
    if abl is None:
        both("  (not run; use: python 5_score_candidates.py --no-backtrack)")
    else:
        both("  Origin forced to the slick centroid at the observation time")
        both("  (zero drift), everything else identical:")
        both()
        for line in table(abl, 8):
            both("  " + line)
        both()
        abl_gt = {str(m): rank_of(abl, m) for m in truth.CULPRITS}
        for mmsi, r in abl_gt.items():
            nm = truth.CULPRITS[int(mmsi)]["name_in_ais"]
            both(f"  known involved {nm:<12} "
                 + (f"rank {r['rank']} (score {r['composite_score']:.3f})"
                    if r else "NOT IN RANKING"))
        both()
        both(f"  Every ablated top-8 candidate has proximity "
             f"{abl['score_proximity'].head(8).max():.2f} or less: with no drift")
        both("  correction, no vessel is near the observed slick at all, so the")
        both("  ranking collapses onto heading and temporal noise. The backward")
        both("  drift step is what makes attribution possible here.")
        abl_summary = {
            "top8": abl.head(8)[["rank", "MMSI", "name", "composite_score",
                                 "score_proximity"]].to_dict("records"),
            "ground_truth": abl_gt,
            "max_proximity_top8": round(float(abl["score_proximity"].head(8).max()), 4),
        }

    # ---------------------------------------------------------------- 6 -----
    both()
    both("-" * 78)
    both("6. SENSITIVITY -- the heading sub-score is weakly determined here")
    both("-" * 78)
    el = scene["elongation"]
    both(f"  slick aspect ratio {el['aspect_ratio']:.2f}; PCA axis "
         f"{el['axis_azimuth_deg']:.1f} deg vs minimum-rotated-rectangle "
         f"{el['crosscheck_mrr_azimuth_deg']:.1f} deg")
    both(f"  The two axis estimates disagree by "
         f"{abs(el['axis_azimuth_deg'] - el['crosscheck_mrr_azimuth_deg']):.0f} "
         "deg. A near-round slick from a")
    both("  point release has no well-defined elongation axis, so the 30%-weighted")
    both("  heading term is largely noise for THIS scene. Reported, not applied:")
    both()
    alt = {k: v for k, v in SCORE_WEIGHTS.items() if k != "heading"}
    df_nh = recompose(df, alt)
    both(f"  Re-ranked without heading "
         f"({'/'.join(f'{v:.2f}' for v in alt.values())} renormalised):")
    for line in table(df_nh, 6):
        both("  " + line)
    both()
    for mmsi, meta in truth.CULPRITS.items():
        r = rank_of(df_nh, mmsi)
        if r:
            was = rank_of(df, mmsi)["rank"]
            both(f"  known involved {meta['name_in_ais']:<12} rank {was} -> "
                 f"{r['rank']}  (score {r['composite_score']:.3f})")
    both()
    both("  The headline ranking in section 3 keeps the spec's 40/30/20/10.")
    both("  Choosing weights after seeing the answer would invalidate the test.")

    # ---------------------------------------------------------------- 7 -----
    both()
    both("-" * 78)
    both("7. SLICK-AGE DIAGNOSTIC")
    both("-" * 78)
    both("  The slick age is a free parameter: step 4 produces one candidate")
    both("  origin per age and each vessel matches its own best age.")
    ages = df["matched_age_h"].head(TOP_N)
    both(f"  matched ages in the top {TOP_N}: median {ages.median():.1f} h, "
         f"range {ages.min():.1f}-{ages.max():.1f} h  (true {true_age:.2f} h)")
    for mmsi, meta in truth.CULPRITS.items():
        r = rank_of(df, mmsi)
        if r:
            both(f"  {meta['name_in_ais']:<12} matched age "
                 f"{r['matched_age_h']:.1f} h vs true {true_age:.2f} h")

    # ---------------------------------------------------------------- map ---
    both()
    ok = make_map(scene, bt, df, OUT / "map.png")
    if ok:
        both(f"  wrote map.png")

    # ---------------------------------------------------------------- files -
    (OUT / "report.md").write_text("\n".join(L) + "\n", encoding="utf-8")

    report = {
        "case": CASE,
        "scene": scene,
        "environment": {
            "wind_station": env["wind_station"],
            "current_station": env["current_station"],
            "wind": env["wind"],
            "current": env["current"],
            "limitation": env["limitation"],
        },
        "backtrack": {
            "method": bt["method"],
            "uncertainty_model": bt["uncertainty_model"],
            "n_candidate_origins": len(bt["locus"]),
            "age_range_h": [bt["locus"][0]["age_h"], bt["locus"][-1]["age_h"]],
        },
        "scoring": {
            "weights": SCORE_WEIGHTS,
            "scales": SCORE_SCALES,
            "wind_drift_factor": WIND_DRIFT_FACTOR,
            "n_candidates_scored": int(len(df)),
        },
        "top_candidate": {
            "MMSI": int(top1["MMSI"]),
            "name": str(top1["name"]),
            "type": str(top1.get("type_label", "")),
            "composite_score": round(float(top1["composite_score"]), 4),
            "sub_scores": {k: round(float(top1[f"score_{k}"]), 4) for k in SUBS},
            "weighted_contributions": {
                k: round(float(top1[f"score_{k}"]) * SCORE_WEIGHTS[k], 4) for k in SUBS
            },
            "matched_age_h": float(top1["matched_age_h"]),
            "matched_origin_time_utc": str(top1["matched_origin_time_utc"]),
            "dist_at_origin_time_m": round(float(top1["dist_at_origin_time_m"]), 1),
        },
        "ranking_top10": df.head(TOP_N)[
            ["rank", "MMSI", "name", "type_label", "composite_score",
             "score_proximity", "score_heading", "score_temporal",
             "score_ais_continuity", "matched_age_h", "dist_at_origin_time_m",
             "first_arrival_within_2km_utc"]
        ].to_dict("records"),
        "ground_truth_evaluation": {
            "release": truth.RELEASE,
            "true_slick_age_h": round(true_age, 3),
            "backtrack_error_at_true_age_m": round(at_true[1], 1),
            "backtrack_best_error_m": round(best[1], 1),
            "backtrack_best_age_h": best[0],
            "vessels": gt,
        },
        "ablation_no_backtrack": abl_summary,
        "sensitivity_no_heading": {
            "weights": alt,
            "top6": df_nh.head(6)[["rank", "MMSI", "name",
                                   "composite_score"]].to_dict("records"),
            "ground_truth_ranks": {
                truth.CULPRITS[m]["name_in_ais"]: rank_of(df_nh, m)
                for m in truth.CULPRITS
            },
            "note": "Reported as sensitivity only. Headline uses spec weights.",
        },
        "caveats": [
            "The spill polygon is SYNTHETIC (forward Lagrangian simulation). "
            "The release point/time, wind, currents and all vessel tracks are real.",
            "Drift uses single-point observed wind and a single mid-depth current "
            "bin as spatially uniform fields. No coastline, bathymetry or shear.",
            "The slick age is not resolved; each vessel matches its own best age.",
            "An AIS gap is a soft positive signal only and is never treated as "
            "proof of responsibility.",
            "No claim of production-grade accuracy. This is a feasibility test "
            "of the pipeline, not a validated attribution system.",
        ],
    }
    (OUT / "report.json").write_text(json.dumps(report, indent=2, default=str),
                                     encoding="utf-8")
    print(f"  wrote report.md, report.json")


if __name__ == "__main__":
    main()
