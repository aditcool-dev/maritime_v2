"""
STEP 1 -- Load the spill scene.

Reads data/interim/spill_observation.geojson and derives the geometric
descriptors the rest of the pipeline needs:

  * centroid (lat/lon and metres)
  * area
  * elongation axis azimuth and aspect ratio
  * observation timestamp

This step is deliberately agnostic about where the polygon came from. It reads
a polygon + timestamp, which is exactly what a SAR annotation mask or a
digitised aerial observation would provide. It carries the provenance flags
through untouched so that downstream output cannot silently misrepresent a
simulated polygon as an observed one.

Input  : data/interim/spill_observation.geojson
Output : data/interim/spill_scene.json
"""

from __future__ import annotations

import json

import numpy as np
from shapely.geometry import Polygon, shape

from common import INTERIM, banner, observation_time, to_deg, to_m, uv_to_azimuth

GRID_TARGET_POINTS = 20_000  # resolution of the area-moment sampling grid


def elongation_axis(poly_m: Polygon) -> dict:
    """
    Azimuth and aspect ratio of a polygon's principal axis.

    Two independent estimates are computed because the elongation axis is the
    single most fragile geometric input to the heading sub-score:

      * area-moment PCA on a regular grid of interior points. Area-weighted, so
        it is not distorted by vertex density along the outline. Primary.
      * the longest edge of the minimum rotated rectangle. Cross-check; it is
        driven by the extreme tips of the slick.
    """
    minx, miny, maxx, maxy = poly_m.bounds
    w, h = maxx - minx, maxy - miny
    step = max(np.sqrt(w * h / GRID_TARGET_POINTS), 1.0)
    gx, gy = np.meshgrid(np.arange(minx, maxx + step, step),
                         np.arange(miny, maxy + step, step))
    gx, gy = gx.ravel(), gy.ravel()

    from shapely import contains_xy

    inside = contains_xy(poly_m, gx, gy)
    px, py = gx[inside], gy[inside]
    if len(px) < 10:  # degenerate polygon; fall back to the outline
        px, py = np.array(poly_m.exterior.coords).T

    pts = np.column_stack([px - px.mean(), py - py.mean()])
    cov = np.cov(pts, rowvar=False)
    evals, evecs = np.linalg.eigh(cov)
    order = np.argsort(evals)[::-1]
    evals, evecs = evals[order], evecs[:, order]
    major = evecs[:, 0]
    pca_az = float(uv_to_azimuth(major[0], major[1])) % 180.0
    pca_aspect = float(np.sqrt(evals[0] / evals[1])) if evals[1] > 0 else float("inf")

    # Cross-check from the minimum rotated rectangle.
    rect = np.array(poly_m.minimum_rotated_rectangle.exterior.coords)
    edges = np.diff(rect, axis=0)
    lens = np.hypot(edges[:, 0], edges[:, 1])
    longest = edges[int(np.argmax(lens))]
    mrr_az = float(uv_to_azimuth(longest[0], longest[1])) % 180.0
    lens_sorted = np.sort(lens)[::-1]
    mrr_aspect = float(lens_sorted[0] / lens_sorted[2]) if lens_sorted[2] > 0 else float("inf")

    return {
        "axis_azimuth_deg": round(pca_az, 1),
        "aspect_ratio": round(pca_aspect, 2),
        "method": "area-moment PCA on interior grid",
        "n_grid_points": int(len(px)),
        "crosscheck_mrr_azimuth_deg": round(mrr_az, 1),
        "crosscheck_mrr_aspect_ratio": round(mrr_aspect, 2),
    }


def main() -> None:
    banner("STEP 1  Load spill scene")

    src = INTERIM / "spill_observation.geojson"
    if not src.exists():
        raise SystemExit(f"missing {src} -- run 0_make_spill_observation.py first")

    fc = json.loads(src.read_text(encoding="utf-8"))
    feat = fc["features"][0]
    props = feat["properties"]
    poly_deg = shape(feat["geometry"])

    t_obs = props.get("observation_time_utc")
    if str(t_obs) != str(observation_time()):
        raise SystemExit(
            f"observation timestamp mismatch: scene says {t_obs}, "
            f"case config says {observation_time()}"
        )

    # Reproject to metres for all geometry work.
    lon, lat = np.array(poly_deg.exterior.coords).T
    xm, ym = to_m(lon, lat)
    poly_m = Polygon(zip(xm, ym))
    if not poly_m.is_valid:
        poly_m = poly_m.buffer(0)

    cx, cy = poly_m.centroid.x, poly_m.centroid.y
    clon, clat = to_deg(cx, cy)
    axis = elongation_axis(poly_m)

    scene = {
        "case_id": props.get("case_id"),
        "observation_time_utc": str(t_obs),
        "centroid_lat": round(float(clat), 6),
        "centroid_lon": round(float(clon), 6),
        "centroid_x_m": round(float(cx), 2),
        "centroid_y_m": round(float(cy), 2),
        "area_km2": round(poly_m.area / 1e6, 4),
        "perimeter_km": round(poly_m.length / 1000.0, 3),
        "bounds_lonlat": [round(v, 6) for v in poly_deg.bounds],
        "elongation": axis,
        # Provenance is carried through verbatim so no downstream output can
        # present a simulated polygon as a remote-sensing observation.
        "polygon_source": props.get("polygon_source"),
        "polygon_is_remote_sensing_observation": props.get(
            "polygon_is_remote_sensing_observation"
        ),
        "provenance": props.get("provenance"),
    }

    print(f"  observation time : {scene['observation_time_utc']} UTC")
    print(f"  centroid         : {scene['centroid_lat']:.5f}, {scene['centroid_lon']:.5f}")
    print(f"  area             : {scene['area_km2']:.3f} km2  "
          f"(perimeter {scene['perimeter_km']:.2f} km)")
    print(f"  elongation axis  : {axis['axis_azimuth_deg']:.1f} deg  "
          f"(aspect {axis['aspect_ratio']:.2f}, "
          f"{axis['n_grid_points']} grid pts)")
    print(f"  cross-check MRR  : {axis['crosscheck_mrr_azimuth_deg']:.1f} deg  "
          f"(aspect {axis['crosscheck_mrr_aspect_ratio']:.2f})")
    print(f"  polygon source   : {scene['polygon_source']}")

    out = INTERIM / "spill_scene.json"
    out.write_text(json.dumps(scene, indent=2), encoding="utf-8")
    print(f"  wrote {out.name}")


if __name__ == "__main__":
    main()
