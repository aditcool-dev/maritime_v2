"""
STEP 3 -- Fetch wind and current data for the region and time window.

Source: NOAA CO-OPS (free, no authentication), 6-minute observed data.
  wind     station 8771013  Eagle Point, Galveston Bay      (29.4813, -94.9173)
  currents station g08010   Fred Hartman Br., HSC, bin 30   (29.7035, -95.0189)

Both are real in-situ observations, not a reanalysis or a model. That is a
strength for this feasibility test (no download credentials, 6-minute cadence)
and a limitation for the full build: each is a SINGLE POINT, so the pipeline
treats the wind and current fields as spatially uniform over the whole bay.
See docs/FEASIBILITY_NOTE.md.

Output : data/interim/env_wind.csv
         data/interim/env_current.csv
         data/interim/env_summary.json
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

import envdata
from common import (
    CASE,
    INTERIM,
    WIND_DRIFT_FACTOR,
    banner,
    env_window,
    observation_time,
    uv_to_azimuth,
)


def main() -> None:
    banner("STEP 3  Fetch environmental data (observed wind + currents)")

    t0, t1 = env_window()
    print(f"  window : {t0} .. {t1} UTC")
    print(f"  wind   : station {CASE['wind_station']['id']}  "
          f"{CASE['wind_station']['name']}")
    print(f"  current: station {CASE['current_station']['id']} "
          f"bin {CASE['current_station']['bin']} "
          f"(~{CASE['current_station']['bin_depth_m']} m depth)")

    wind = envdata.load_wind()
    cur = envdata.load_current()

    w_desc = envdata.describe(wind, "NOAA CO-OPS observed wind")
    c_desc = envdata.describe(cur, "NOAA CO-OPS observed current")

    print(f"\n  wind    {w_desc['n_samples']:,} samples  "
          f"scalar mean {w_desc['mean_scalar_speed_ms']:.2f} m/s "
          f"(max {w_desc['max_scalar_speed_ms']:.1f})  "
          f"vector mean {w_desc['vector_mean_speed_ms']:.2f} m/s "
          f"toward {w_desc['vector_mean_toward_deg']:.0f} deg")
    print(f"  current {c_desc['n_samples']:,} samples  "
          f"scalar mean {c_desc['mean_scalar_speed_ms']:.2f} m/s "
          f"(max {c_desc['max_scalar_speed_ms']:.2f})  "
          f"vector mean {c_desc['vector_mean_speed_ms']:.2f} m/s "
          f"toward {c_desc['vector_mean_toward_deg']:.0f} deg")

    # Reporting gaps matter: a hole in the current record silently biases the
    # backtrack, so surface it here rather than discovering it in step 4.
    for label, df in (("wind", wind), ("current", cur)):
        gaps = df["time"].diff().dt.total_seconds().dropna()
        big = gaps[gaps > 3600.0]
        print(f"  {label:<7} median cadence {gaps.median() / 60:.0f} min; "
              f"{len(big)} gaps > 1 h"
              + (f" (largest {big.max() / 3600:.1f} h)" if len(big) else ""))

    # The combined surface-drift velocity actually used by steps 0 and 4, over
    # the few hours before the observation. Printed so a reviewer can sanity
    # check the backtrack by hand.
    t_obs = observation_time()
    print(f"\n  combined drift velocity (current + {WIND_DRIFT_FACTOR:.3f} x wind), "
          "vector-mean over the N hours before the observation:")
    combined = {}
    for h in (1, 2, 3, 6, 12):
        cu, cv, nc = envdata.mean_uv(cur, t_obs - pd.Timedelta(hours=h), t_obs)
        wu, wv, nw = envdata.mean_uv(wind, t_obs - pd.Timedelta(hours=h), t_obs)
        u = cu + WIND_DRIFT_FACTOR * wu
        v = cv + WIND_DRIFT_FACTOR * wv
        spd = float(np.hypot(u, v))
        az = float(uv_to_azimuth(u, v))
        combined[f"{h}h"] = {
            "speed_ms": round(spd, 4),
            "toward_deg": round(az, 1),
            "displacement_km": round(spd * h * 3600 / 1000.0, 3),
            "n_current_samples": nc,
            "n_wind_samples": nw,
        }
        print(f"    last {h:>2} h : {spd:.3f} m/s toward {az:5.1f} deg  "
              f"-> {spd * h * 3600 / 1000:.2f} km displacement")

    wind.to_csv(INTERIM / "env_wind.csv", index=False)
    cur.to_csv(INTERIM / "env_current.csv", index=False)
    summary = {
        "window_utc": [str(t0), str(t1)],
        "wind_station": CASE["wind_station"],
        "current_station": CASE["current_station"],
        "wind": w_desc,
        "current": c_desc,
        "wind_drift_factor": WIND_DRIFT_FACTOR,
        "combined_drift_before_observation": combined,
        "limitation": (
            "Single-point wind and single-point, mid-depth current, applied as "
            "spatially uniform fields. No coastline, no bathymetry, no spatial "
            "shear."
        ),
    }
    (INTERIM / "env_summary.json").write_text(json.dumps(summary, indent=2),
                                              encoding="utf-8")
    print("\n  wrote env_wind.csv, env_current.csv, env_summary.json")


if __name__ == "__main__":
    main()
