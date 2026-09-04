"""
Environmental forcing: real observed wind and currents from NOAA CO-OPS.

Shared by step 0 (the observation simulator) and step 3 (the pipeline's own
environmental fetch), so both see byte-identical forcing. Downloads are cached
under data/raw/env/ and only fetched once.

Units on the wire (NOAA CO-OPS datagetter, units=metric):
  wind     product 'wind'     -> speed m/s,  direction = degrees the wind is
                                 blowing FROM (meteorological convention)
  currents product 'currents' -> speed cm/s, direction = degrees the current
                                 sets TOWARD (oceanographic convention)

Both are converted here to (u, v) east/north components in m/s with a single
consistent convention: the direction the fluid is MOVING TOWARD.
"""

from __future__ import annotations

import io
import sys

import numpy as np
import pandas as pd
import requests

from common import CASE, RAW_ENV, azimuth_to_uv, env_window

API = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"
TIMEOUT = 90


def _get(params: dict, cache_name: str) -> pd.DataFrame:
    """Fetch a CO-OPS CSV, caching the raw response on disk."""
    path = RAW_ENV / cache_name
    if path.exists() and path.stat().st_size > 200:
        text = path.read_text(encoding="utf-8")
    else:
        r = requests.get(API, params=params, timeout=TIMEOUT)
        r.raise_for_status()
        text = r.text
        if "Error" in text[:200] or "error" in text[:200]:
            raise RuntimeError(f"CO-OPS returned an error for {cache_name}: {text[:300]}")
        path.write_text(text, encoding="utf-8")
        print(f"    fetched  {cache_name}  ({len(text) / 1024:.0f} KiB)")
    df = pd.read_csv(io.StringIO(text))
    df.columns = [c.strip() for c in df.columns]
    return df


def load_wind() -> pd.DataFrame:
    """
    Observed wind at the case's wind station.

    Returns columns: time, speed_ms, dir_from_deg, u, v
    where (u, v) is the direction the air is moving TOWARD.
    """
    st = CASE["wind_station"]
    t0, t1 = env_window()
    df = _get(
        {
            "product": "wind",
            "application": "SIH26143-feasibility",
            "begin_date": t0.strftime("%Y%m%d %H:%M"),
            "end_date": t1.strftime("%Y%m%d %H:%M"),
            "station": st["id"],
            "time_zone": "gmt",
            "units": "metric",
            "format": "csv",
        },
        f"wind_{st['id']}_{t0:%Y%m%d}_{t1:%Y%m%d}.csv",
    )
    out = pd.DataFrame(
        {
            "time": pd.to_datetime(df["Date Time"]),
            "speed_ms": pd.to_numeric(df["Speed"], errors="coerce"),
            "dir_from_deg": pd.to_numeric(df["Direction"], errors="coerce"),
        }
    ).dropna()
    # Meteorological "from" -> vector "toward".
    out["u"], out["v"] = azimuth_to_uv(out["dir_from_deg"] + 180.0, out["speed_ms"])
    return out.sort_values("time").reset_index(drop=True)


def load_current() -> pd.DataFrame:
    """
    Observed current at the case's current station / bin.

    Returns columns: time, speed_ms, dir_to_deg, u, v
    """
    st = CASE["current_station"]
    t0, t1 = env_window()
    df = _get(
        {
            "product": "currents",
            "application": "SIH26143-feasibility",
            "begin_date": t0.strftime("%Y%m%d %H:%M"),
            "end_date": t1.strftime("%Y%m%d %H:%M"),
            "station": st["id"],
            "bin": st["bin"],
            "time_zone": "gmt",
            "units": "metric",
            "format": "csv",
        },
        f"currents_{st['id']}_bin{st['bin']}_{t0:%Y%m%d}_{t1:%Y%m%d}.csv",
    )
    speed_cms = pd.to_numeric(df["Speed"], errors="coerce")
    out = pd.DataFrame(
        {
            "time": pd.to_datetime(df["Date Time"]),
            "speed_ms": speed_cms / 100.0,  # cm/s -> m/s
            "dir_to_deg": pd.to_numeric(df["Direction"], errors="coerce"),
        }
    ).dropna()
    out["u"], out["v"] = azimuth_to_uv(out["dir_to_deg"], out["speed_ms"])
    return out.sort_values("time").reset_index(drop=True)


# ---------------------------------------------------------------------------
# Interpolation / averaging used by both the forward and backward drift steps
# ---------------------------------------------------------------------------


def interp_uv(df: pd.DataFrame, when) -> tuple[float, float]:
    """Linearly interpolate an env DataFrame's (u, v) to an arbitrary time."""
    t = pd.Timestamp(when).value
    ts = df["time"].values.astype("int64")
    u = float(np.interp(t, ts, df["u"].values))
    v = float(np.interp(t, ts, df["v"].values))
    return u, v


def mean_uv(df: pd.DataFrame, t0, t1) -> tuple[float, float, int]:
    """
    Vector-mean (u, v) over [t0, t1].

    Averaging the VECTORS (not the speeds and directions separately) is the
    only defensible way to do this: a current that floods for 3 h and ebbs for
    3 h has a large mean speed but a near-zero mean displacement, and it is the
    displacement we care about.

    Returns (u_mean, v_mean, n_samples).
    """
    t0, t1 = pd.Timestamp(t0), pd.Timestamp(t1)
    if t1 < t0:
        t0, t1 = t1, t0
    m = (df["time"] >= t0) & (df["time"] <= t1)
    sel = df.loc[m]
    if len(sel) == 0:  # window shorter than the sample interval
        u, v = interp_uv(df, t0 + (t1 - t0) / 2)
        return u, v, 0
    return float(sel["u"].mean()), float(sel["v"].mean()), int(len(sel))


def describe(df: pd.DataFrame, label: str) -> dict:
    from common import uv_to_azimuth

    u, v = df["u"].mean(), df["v"].mean()
    return {
        "source": label,
        "n_samples": int(len(df)),
        "time_first_utc": str(df["time"].iloc[0]),
        "time_last_utc": str(df["time"].iloc[-1]),
        "mean_scalar_speed_ms": round(float(df["speed_ms"].mean()), 3),
        "max_scalar_speed_ms": round(float(df["speed_ms"].max()), 3),
        "vector_mean_speed_ms": round(float(np.hypot(u, v)), 3),
        "vector_mean_toward_deg": round(float(uv_to_azimuth(u, v)), 1),
    }


if __name__ == "__main__":
    w, c = load_wind(), load_current()
    print(describe(w, "wind"))
    print(describe(c, "current"))
    sys.exit(0)
