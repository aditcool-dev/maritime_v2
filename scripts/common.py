"""
Shared configuration, paths and geometry helpers for the SIH26143
maritime spill-attribution feasibility pipeline.

Everything in this module is information the attribution pipeline is
ALLOWED to know: the observation bounding box, the observation timestamp,
which environmental stations to read, and the scoring weights.

The true release point / release time / culprit vessels live in
`truth.py`, which is imported ONLY by the observation simulator (step 0)
and the evaluation section of the report (step 6). No scoring code may
import it.

All timestamps everywhere in this project are tz-naive UTC.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pandas as pd
from pyproj import Transformer

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
RAW_AIS = ROOT / "data" / "raw" / "ais"
RAW_ENV = ROOT / "data" / "raw" / "env"
INTERIM = ROOT / "data" / "interim"
OUT = ROOT / "data" / "out"

for _p in (RAW_AIS, RAW_ENV, INTERIM, OUT):
    _p.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------------------------------
# Case definition (public: visible to the whole pipeline)
# --------------------------------------------------------------------------

CASE = {
    "case_id": "HSC-BAYPORT-2019-05-10",
    "name": (
        "Houston Ship Channel collision, Bayport Flare, Upper Galveston Bay, "
        "Texas, 2019-05-10"
    ),
    # The moment the spill polygon is 'observed'. This is the only timestamp
    # the attribution pipeline is given.
    "observation_time_utc": "2019-05-10 23:20:00",
    # +/- 48 h of AIS around the observation, per the phase-1 spec.
    "ais_window_hours": 48,
    # Geographic extent for AIS extraction: Galveston Bay + offshore approaches.
    "bbox": {"lat_min": 28.90, "lat_max": 29.95, "lon_min": -95.35, "lon_max": -94.45},
    # Metric CRS for all distance / geometry work (UTM zone 15N covers Galveston).
    "metric_epsg": 32615,
    # NOAA CO-OPS stations supplying real observed forcing.
    "wind_station": {
        "id": "8771013",
        "name": "Eagle Point, Galveston Bay, TX (NOAA CO-OPS)",
        "lat": 29.4813,
        "lon": -94.9173,
    },
    "current_station": {
        "id": "g08010",
        "name": "Fred Hartman Bridge, Houston Ship Channel, TX (NOAA CO-OPS PORTS)",
        "lat": 29.7035,
        "lon": -95.0189,
        # Bin 30 is the bin NOAA publishes in real time and has the cleanest,
        # strongest signal of the 40 bins (see docs/FEASIBILITY_NOTE.md).
        # It is a MID-DEPTH bin (~7.6 m), not the surface -- a stated limitation.
        "bin": 30,
        "bin_depth_m": 7.6,
    },
}

# Standard surface-oil drift relation: slick velocity = current + 3% of wind.
WIND_DRIFT_FACTOR = 0.030

# --------------------------------------------------------------------------
# Composite score weights -- stated explicitly, never hardcoded silently.
# These are the phase-1 starting values from the build spec.
# --------------------------------------------------------------------------

SCORE_WEIGHTS = {
    "proximity": 0.40,
    "heading": 0.30,
    "temporal": 0.20,
    "ais_continuity": 0.10,
}

# Score shape parameters (e-folding scales), also stated explicitly so a
# reviewer can see exactly what "close" and "soon" mean numerically.
SCORE_SCALES = {
    # Proximity: exp(-d / d0). d0 = 1500 m -> 1.5 km away scores 0.37.
    "proximity_efold_m": 1500.0,
    # Temporal: exp(-|dt| / t0). t0 = 90 min -> 90 min off scores 0.37.
    "temporal_efold_s": 90.0 * 60.0,
    # An AIS reporting gap longer than this is treated as a real gap.
    "ais_gap_threshold_s": 20.0 * 60.0,
    # A gap only counts if it overlaps the estimated origin time by this much.
    "ais_gap_time_window_s": 2.0 * 3600.0,
    # ...and if the vessel was within this range of the estimated origin.
    "ais_gap_range_m": 10_000.0,
    # Only vessels that come at least this close to the backtrack locus are
    # carried into the ranked output (keeps the report readable).
    "candidate_cutoff_m": 25_000.0,
}

# Backward-drift search: candidate slick ages to test, in hours.
BACKTRACK_AGES_H = np.arange(0.5, 12.01, 0.5)

# --------------------------------------------------------------------------
# Derived helpers
# --------------------------------------------------------------------------


def observation_time() -> pd.Timestamp:
    return pd.Timestamp(CASE["observation_time_utc"])


def ais_window() -> tuple[pd.Timestamp, pd.Timestamp]:
    """(start, end) of the AIS time window: observation +/- ais_window_hours."""
    t = observation_time()
    h = pd.Timedelta(hours=CASE["ais_window_hours"])
    return t - h, t + h


def ais_days() -> list[str]:
    """UTC dates (YYYY_MM_DD) whose Marine Cadastre daily files we need."""
    t0, t1 = ais_window()
    days = pd.date_range(t0.normalize(), t1.normalize(), freq="D")
    return [d.strftime("%Y_%m_%d") for d in days]


def env_window() -> tuple[pd.Timestamp, pd.Timestamp]:
    """Environmental data window: wide enough for the deepest backtrack."""
    t0, t1 = ais_window()
    return t0 - pd.Timedelta(hours=24), t1 + pd.Timedelta(hours=24)


# --------------------------------------------------------------------------
# Projection helpers -- lon/lat (EPSG:4326) <-> metres (UTM 15N)
# --------------------------------------------------------------------------

_TO_M = Transformer.from_crs(4326, CASE["metric_epsg"], always_xy=True)
_TO_DEG = Transformer.from_crs(CASE["metric_epsg"], 4326, always_xy=True)


def to_m(lon, lat):
    """lon/lat (degrees) -> easting/northing (metres). Accepts scalars or arrays."""
    return _TO_M.transform(lon, lat)


def to_deg(x, y):
    """easting/northing (metres) -> lon/lat (degrees)."""
    return _TO_DEG.transform(x, y)


# --------------------------------------------------------------------------
# Angle helpers. Convention: azimuth = degrees clockwise from true north.
# --------------------------------------------------------------------------


def azimuth_to_uv(azimuth_deg, speed):
    """Azimuth the flow moves TOWARD + speed -> (east, north) vector components."""
    a = np.radians(np.asarray(azimuth_deg, dtype=float))
    s = np.asarray(speed, dtype=float)
    return s * np.sin(a), s * np.cos(a)


def uv_to_azimuth(u, v):
    """(east, north) components -> azimuth the flow moves TOWARD, in [0, 360)."""
    return np.degrees(np.arctan2(u, v)) % 360.0


def axis_angle_diff(azimuth_a, azimuth_b) -> float:
    """
    Smallest angle in [0, 90] between two undirected axes.

    A slick's elongation axis has no head or tail, so a vessel heading 020
    and a slick axis of 200 are perfectly aligned.
    """
    d = abs(float(azimuth_a) - float(azimuth_b)) % 180.0
    return min(d, 180.0 - d)


def vessel_type_label(code) -> str:
    """Human-readable label for an AIS ship-and-cargo type code."""
    try:
        c = int(float(code))
    except (TypeError, ValueError):
        return "unknown"
    if c == 30:
        return "fishing"
    if c in (31, 32, 52):
        return "tug/towing"
    if c == 35:
        return "military"
    if c in (36, 37):
        return "sailing/pleasure"
    if 40 <= c <= 49:
        return "high-speed craft"
    if c in (50, 51, 53, 54, 55, 58, 59):
        return "special craft"
    if 60 <= c <= 69:
        return "passenger"
    if 70 <= c <= 79:
        return "cargo"
    if 80 <= c <= 89:
        return "tanker"
    if 90 <= c <= 99:
        return "other"
    return f"code {c}"


def banner(text: str) -> None:
    print("\n" + "=" * 74)
    print(text)
    print("=" * 74)


def fmt_km(m: float) -> str:
    return "n/a" if m is None or not math.isfinite(m) else f"{m / 1000.0:.2f} km"
