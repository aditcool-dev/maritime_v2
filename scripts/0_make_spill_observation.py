"""
STEP 0 -- Build the spill observation.  *** NOT PART OF THE PIPELINE ***

This script stands in for the SAR + segmentation front end, which is an
explicit non-goal of phase 1 (no trained model, and no post-incident Sentinel-1
pass exists for this case -- see docs/FEASIBILITY_NOTE.md).

It produces the one artefact the attribution pipeline is allowed to see about
the spill: a polygon with an observation timestamp, written to
data/interim/spill_observation.geojson, in exactly the form step 1 would read
a real SAR annotation.

WHAT IS REAL AND WHAT IS NOT
  REAL : the release position and time (derived from the primary AIS record of
         a documented 2019 collision -- see truth.py), and the wind and current
         fields used to drift the oil (NOAA CO-OPS observed, 6-minute).
  NOT  : the polygon geometry itself. It is a forward Lagrangian simulation,
         not a remote-sensing observation.

WHY THIS IS STILL A FAIR TEST OF THE PIPELINE
  * The pipeline is never told the release point or time; it only gets the
    drifted polygon and its timestamp, and must recover the origin.
  * The forward model here (time-stepped particle ensemble, per-particle
    windage, turbulent diffusion, finite-duration release) is deliberately NOT
    the inverse of the backward model in step 4 (a single displacement from
    vector-mean forcing). Step 4 cannot simply undo this, so the recovered
    origin carries genuine error.
  * The candidate vessels are entirely real: every track in the ranking is a
    real vessel that was really in Galveston Bay that day.
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from shapely.geometry import mapping
from shapely.ops import unary_union

import envdata
import truth
from common import (
    CASE,
    INTERIM,
    banner,
    observation_time,
    to_deg,
    to_m,
    uv_to_azimuth,
)

# --- forward-model parameters, all stated explicitly -----------------------
N_PARTICLES = 3000
DT_S = 120.0
INITIAL_SCATTER_M = 50.0        # barge / tow footprint
WINDAGE_MIN, WINDAGE_MAX = 0.025, 0.035  # per-particle, film-thickness spread
EDDY_DIFFUSIVITY_M2S = 2.0      # horizontal turbulent diffusion
PARTICLE_BUFFER_M = 80.0        # radius used to turn the cloud into a polygon
SIMPLIFY_TOLERANCE_M = 25.0
RNG_SEED = 20190510             # fixed so the case is reproducible


def main() -> None:
    banner("STEP 0  Build spill observation (stand-in for SAR + segmentation)")

    rng = np.random.default_rng(RNG_SEED)

    t_rel = truth.release_time()
    t_obs = observation_time()
    dur = pd.Timedelta(minutes=truth.RELEASE["release_duration_min"])
    age_h = (t_obs - t_rel).total_seconds() / 3600.0

    print(f"  release  : {t_rel} UTC at {truth.RELEASE['lat']:.5f}, "
          f"{truth.RELEASE['lon']:.5f}  (+{dur.total_seconds()/60:.0f} min duration)")
    print(f"  observed : {t_obs} UTC   -> slick age {age_h:.2f} h")

    print("  loading observed forcing ...")
    wind = envdata.load_wind()
    cur = envdata.load_current()

    # --- initialise particles ---------------------------------------------
    x0, y0 = to_m(truth.RELEASE["lon"], truth.RELEASE["lat"])
    x = x0 + rng.normal(0.0, INITIAL_SCATTER_M, N_PARTICLES)
    y = y0 + rng.normal(0.0, INITIAL_SCATTER_M, N_PARTICLES)
    windage = rng.uniform(WINDAGE_MIN, WINDAGE_MAX, N_PARTICLES)
    # Staggered release start times over the release duration.
    t_start = t_rel.value + rng.uniform(0.0, dur.value, N_PARTICLES)

    diff_std = np.sqrt(2.0 * EDDY_DIFFUSIVITY_M2S * DT_S)

    # --- integrate forward -------------------------------------------------
    n_steps = int(np.ceil((t_obs - t_rel).total_seconds() / DT_S))
    for k in range(n_steps):
        t = t_rel + pd.Timedelta(seconds=DT_S * k)
        active = t_start <= t.value
        if not active.any():
            continue
        cu, cv = envdata.interp_uv(cur, t)
        wu, wv = envdata.interp_uv(wind, t)
        u = cu + windage[active] * wu
        v = cv + windage[active] * wv
        x[active] += u * DT_S + rng.normal(0.0, diff_std, active.sum())
        y[active] += v * DT_S + rng.normal(0.0, diff_std, active.sum())

    # --- turn the particle cloud into one polygon --------------------------
    from shapely.geometry import Point

    blob = unary_union([Point(px, py).buffer(PARTICLE_BUFFER_M, quad_segs=6)
                        for px, py in zip(x, y)])
    if blob.geom_type == "MultiPolygon":
        parts = sorted(blob.geoms, key=lambda g: g.area, reverse=True)
        print(f"  cloud produced {len(parts)} patches; keeping the largest "
              f"({parts[0].area / 1e6:.3f} of {blob.area / 1e6:.3f} km2)")
        blob = parts[0]
    poly_m = blob.simplify(SIMPLIFY_TOLERANCE_M).buffer(0)

    area_km2 = poly_m.area / 1e6
    cx_m, cy_m = poly_m.centroid.x, poly_m.centroid.y
    clon, clat = to_deg(cx_m, cy_m)

    disp_m = float(np.hypot(cx_m - x0, cy_m - y0))
    disp_az = float(uv_to_azimuth(cx_m - x0, cy_m - y0))
    print(f"  slick    : area {area_km2:.3f} km2, centroid {clat:.5f}, {clon:.5f}")
    print(f"  centroid drifted {disp_m / 1000:.2f} km toward {disp_az:.0f} deg "
          f"over {age_h:.2f} h  (mean {disp_m / (age_h * 3600):.3f} m/s)")

    # --- reproject the polygon ring to lon/lat and write GeoJSON -----------
    ring_x, ring_y = np.array(poly_m.exterior.coords).T
    ring_lon, ring_lat = to_deg(ring_x, ring_y)
    from shapely.geometry import Polygon

    poly_deg = Polygon(zip(ring_lon, ring_lat))

    feature = {
        "type": "Feature",
        "geometry": mapping(poly_deg),
        "properties": {
            "case_id": CASE["case_id"],
            "observation_time_utc": str(t_obs),
            "area_km2": round(area_km2, 4),
            "centroid_lat": round(float(clat), 6),
            "centroid_lon": round(float(clon), 6),
            "polygon_source": "SYNTHETIC - forward Lagrangian simulation",
            "polygon_is_remote_sensing_observation": False,
            "provenance": (
                "Geometry generated by scripts/0_make_spill_observation.py: "
                f"{N_PARTICLES} particles advected by NOAA CO-OPS observed "
                f"currents (station {CASE['current_station']['id']} bin "
                f"{CASE['current_station']['bin']}) plus "
                f"{WINDAGE_MIN:.3f}-{WINDAGE_MAX:.3f} windage on NOAA CO-OPS "
                f"observed wind (station {CASE['wind_station']['id']}), with "
                f"{EDDY_DIFFUSIVITY_M2S} m2/s eddy diffusion, from a real "
                "AIS-derived release point/time. The release, the wind and the "
                "current are real; the polygon geometry is not an observation."
            ),
            "forward_model": {
                "n_particles": N_PARTICLES,
                "dt_s": DT_S,
                "initial_scatter_m": INITIAL_SCATTER_M,
                "windage_range": [WINDAGE_MIN, WINDAGE_MAX],
                "eddy_diffusivity_m2s": EDDY_DIFFUSIVITY_M2S,
                "particle_buffer_m": PARTICLE_BUFFER_M,
                "rng_seed": RNG_SEED,
                "true_age_h": round(age_h, 3),
                "true_centroid_displacement_m": round(disp_m, 1),
                "true_centroid_displacement_toward_deg": round(disp_az, 1),
            },
        },
    }
    fc = {"type": "FeatureCollection", "features": [feature]}

    path = INTERIM / "spill_observation.geojson"
    path.write_text(json.dumps(fc, indent=2), encoding="utf-8")
    print(f"  wrote {path.relative_to(path.parents[3])}")

    # Particle cloud kept only for the report map, never read by scoring.
    np.savez_compressed(INTERIM / "particles_debug.npz",
                        lon=to_deg(x, y)[0], lat=to_deg(x, y)[1])


if __name__ == "__main__":
    main()
