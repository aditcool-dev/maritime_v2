"""
STEP 4 -- Simplified backward drift.

The slick's age is unknown: a polygon seen at 23:20 UTC could be 30 minutes old
or 12 hours old. So instead of producing a single origin point, this step sweeps
candidate ages and produces a BACKTRACK LOCUS -- one candidate origin
(position, time, uncertainty radius) per candidate age.

For each candidate age a:

    t_origin  = t_obs - a
    u_mean    = vector-mean current over [t_origin, t_obs]
                + 0.03 * vector-mean wind over [t_origin, t_obs]
    origin    = slick_centroid - u_mean * a

This is deliberately the simple scheme the phase-1 spec asks for: a single
displacement from vector-mean forcing, NOT a Lagrangian ensemble and NOT the
inverse of the forward model used in step 0. It therefore carries real error,
which is the point -- we want to know whether the attribution loop still works
with a crude drift model.

Vector-mean, not scalar-mean: over a tidal cycle a 0.4 m/s current can produce
almost no net displacement, and it is displacement that moves oil.

Uncertainty radius per age (stated heuristic, not a calibrated error model):
    r = max(250 m, 0.25 * |displacement|)
i.e. we assume the crude drift estimate is good to about 25%.

Input  : data/interim/spill_scene.json, data/interim/env_*.csv
Output : data/interim/backtrack.json
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

import envdata
from common import (
    BACKTRACK_AGES_H,
    INTERIM,
    WIND_DRIFT_FACTOR,
    banner,
    to_deg,
    uv_to_azimuth,
)

MIN_UNCERTAINTY_M = 250.0
UNCERTAINTY_FRACTION = 0.25


def main() -> None:
    banner("STEP 4  Simplified backward drift -> candidate origin locus")

    scene = json.loads((INTERIM / "spill_scene.json").read_text(encoding="utf-8"))
    t_obs = pd.Timestamp(scene["observation_time_utc"])
    cx, cy = scene["centroid_x_m"], scene["centroid_y_m"]

    wind = pd.read_csv(INTERIM / "env_wind.csv", parse_dates=["time"])
    cur = pd.read_csv(INTERIM / "env_current.csv", parse_dates=["time"])

    print(f"  slick centroid   : {scene['centroid_lat']:.5f}, "
          f"{scene['centroid_lon']:.5f} at {t_obs} UTC")
    print(f"  wind drift factor: {WIND_DRIFT_FACTOR:.3f}")
    print(f"  ages tested      : {BACKTRACK_AGES_H[0]:.1f} .. "
          f"{BACKTRACK_AGES_H[-1]:.1f} h in "
          f"{BACKTRACK_AGES_H[1] - BACKTRACK_AGES_H[0]:.1f} h steps "
          f"({len(BACKTRACK_AGES_H)} candidates)\n")
    print("   age_h  origin_time_utc      back-dist  toward   origin lat/lon        r_unc")
    print("   " + "-" * 84)

    locus = []
    for a in BACKTRACK_AGES_H:
        t_org = t_obs - pd.Timedelta(hours=float(a))
        cu, cv, n_cur = envdata.mean_uv(cur, t_org, t_obs)
        wu, wv, n_wind = envdata.mean_uv(wind, t_org, t_obs)
        u = cu + WIND_DRIFT_FACTOR * wu
        v = cv + WIND_DRIFT_FACTOR * wv

        dt_s = float(a) * 3600.0
        ox = cx - u * dt_s
        oy = cy - v * dt_s
        olon, olat = to_deg(ox, oy)

        disp = float(np.hypot(u, v) * dt_s)
        # Azimuth FROM the origin TOWARD the slick, i.e. the drift direction.
        drift_az = float(uv_to_azimuth(u, v))
        r_unc = max(MIN_UNCERTAINTY_M, UNCERTAINTY_FRACTION * disp)

        locus.append({
            "age_h": round(float(a), 2),
            "origin_time_utc": str(t_org),
            "origin_lat": round(float(olat), 6),
            "origin_lon": round(float(olon), 6),
            "origin_x_m": round(float(ox), 2),
            "origin_y_m": round(float(oy), 2),
            "backtrack_distance_m": round(disp, 1),
            "drift_toward_deg": round(drift_az, 1),
            "drift_speed_ms": round(float(np.hypot(u, v)), 4),
            "uncertainty_radius_m": round(float(r_unc), 1),
            "n_current_samples": n_cur,
            "n_wind_samples": n_wind,
        })

        print(f"   {a:5.1f}  {t_org}  {disp / 1000:7.2f} km  {drift_az:5.1f}  "
              f"{olat:9.5f},{olon:10.5f}  {r_unc / 1000:5.2f} km")

    out = {
        "case_id": scene.get("case_id"),
        "observation_time_utc": str(t_obs),
        "slick_centroid_lat": scene["centroid_lat"],
        "slick_centroid_lon": scene["centroid_lon"],
        "method": (
            "Backward displacement of the slick centroid by the vector-mean of "
            "(observed current + wind_drift_factor * observed wind) over the "
            "candidate age interval. One candidate origin per candidate age; "
            "the age is not resolved by this step."
        ),
        "wind_drift_factor": WIND_DRIFT_FACTOR,
        "uncertainty_model": (
            f"r = max({MIN_UNCERTAINTY_M:.0f} m, "
            f"{UNCERTAINTY_FRACTION:.2f} x backtrack distance) -- a stated "
            "heuristic, not a calibrated error model."
        ),
        "locus": locus,
    }
    path = INTERIM / "backtrack.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")

    print(f"\n  NOTE: slick age is a free parameter here. Step 5 lets each vessel")
    print("        match against its best-fitting age, and step 6 reports which")
    print("        age the winning match implied.")
    print(f"  wrote {path.name}  ({len(locus)} candidate origins)")


if __name__ == "__main__":
    main()
