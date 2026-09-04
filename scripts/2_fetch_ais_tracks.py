"""
STEP 2 -- Load AIS vessel tracks for the case region and time window.

Source: NOAA Marine Cadastre historical AIS (free, no authentication), daily
national CSV files, decimated to roughly 1-minute reporting.
  https://coast.noaa.gov/htdata/CMSP/AISDataHandler/2019/AIS_YYYY_MM_DD.zip

Each daily file is ~280 MB zipped / ~780 MB as CSV and covers the whole US EEZ,
so this step streams each file in chunks and keeps only rows inside the case
bounding box and inside the observation +/- 48 h window. Nothing is unzipped to
disk.

Run scripts/_download_ais.sh first (or let run_all.py do it) to place the daily
zips in data/raw/ais/.

Input  : data/raw/ais/AIS_2019_05_*.zip
Output : data/interim/ais_tracks.parquet     one row per AIS position report
         data/interim/ais_vessels.csv        one row per vessel, with metadata
"""

from __future__ import annotations

import sys
import zipfile

import numpy as np
import pandas as pd

from common import (
    CASE,
    INTERIM,
    RAW_AIS,
    ais_days,
    ais_window,
    banner,
    to_m,
    vessel_type_label,
)

USECOLS = [
    "MMSI", "BaseDateTime", "LAT", "LON", "SOG", "COG", "Heading",
    "VesselName", "IMO", "CallSign", "VesselType", "Status", "Length", "Width",
]
CHUNK = 1_000_000

# A track needs at least this many fixes to be scoreable (heading, gaps, etc.).
MIN_FIXES = 3


def load_day(path, t0, t1, bb) -> pd.DataFrame:
    keep = []
    with zipfile.ZipFile(path) as z:
        member = z.infolist()[0].filename
        with z.open(member) as fh:
            reader = pd.read_csv(
                fh,
                usecols=USECOLS,
                chunksize=CHUNK,
                dtype={
                    "MMSI": "int64", "VesselName": "string", "IMO": "string",
                    "CallSign": "string",
                },
                parse_dates=["BaseDateTime"],
            )
            for chunk in reader:
                m = (
                    chunk["LAT"].between(bb["lat_min"], bb["lat_max"])
                    & chunk["LON"].between(bb["lon_min"], bb["lon_max"])
                    & chunk["BaseDateTime"].between(t0, t1)
                )
                if m.any():
                    keep.append(chunk.loc[m])
    return pd.concat(keep, ignore_index=True) if keep else pd.DataFrame(columns=USECOLS)


def main() -> None:
    banner("STEP 2  Load AIS tracks")

    t0, t1 = ais_window()
    bb = CASE["bbox"]
    print(f"  window : {t0} .. {t1} UTC  (+/- {CASE['ais_window_hours']} h)")
    print(f"  bbox   : lat {bb['lat_min']}..{bb['lat_max']}  "
          f"lon {bb['lon_min']}..{bb['lon_max']}")

    frames = []
    missing = []
    for day in ais_days():
        path = RAW_AIS / f"AIS_{day}.zip"
        if not path.exists():
            missing.append(path.name)
            continue
        df = load_day(path, t0, t1, bb)
        print(f"  {path.name}: {len(df):>8,} rows in region+window")
        frames.append(df)

    if missing:
        print(f"\n  ERROR: missing AIS files: {', '.join(missing)}")
        print("  Run:  bash scripts/_download_ais.sh")
        sys.exit(1)

    ais = pd.concat(frames, ignore_index=True)

    # --- clean -------------------------------------------------------------
    n_raw = len(ais)
    ais = ais.dropna(subset=["LAT", "LON", "BaseDateTime"])
    ais = ais[(ais.MMSI > 0)]
    ais = ais.drop_duplicates(subset=["MMSI", "BaseDateTime"])
    ais = ais.sort_values(["MMSI", "BaseDateTime"]).reset_index(drop=True)
    # AIS sentinels: SOG 102.3 = not available, COG 360 = not available,
    # Heading 511 = not available.
    ais.loc[ais.SOG >= 102.0, "SOG"] = np.nan
    ais.loc[ais.COG >= 360.0, "COG"] = np.nan
    ais.loc[ais.Heading >= 511.0, "Heading"] = np.nan
    print(f"\n  cleaned: {n_raw:,} -> {len(ais):,} position reports")

    # --- projected coordinates for all downstream distance work ------------
    ais["x_m"], ais["y_m"] = to_m(ais["LON"].values, ais["LAT"].values)

    # --- drop tracks too short to score ------------------------------------
    counts = ais.groupby("MMSI").size()
    short = counts[counts < MIN_FIXES].index
    if len(short):
        ais = ais[~ais.MMSI.isin(short)]
        print(f"  dropped {len(short)} vessels with < {MIN_FIXES} fixes")

    # --- per-vessel metadata ----------------------------------------------
    def first_valid(s: pd.Series):
        s = s.dropna()
        return s.iloc[0] if len(s) else None

    vessels = (
        ais.groupby("MMSI")
        .agg(
            name=("VesselName", first_valid),
            imo=("IMO", first_valid),
            callsign=("CallSign", first_valid),
            vessel_type=("VesselType", first_valid),
            length_m=("Length", first_valid),
            width_m=("Width", first_valid),
            n_fixes=("BaseDateTime", "size"),
            t_first=("BaseDateTime", "min"),
            t_last=("BaseDateTime", "max"),
            sog_max=("SOG", "max"),
            sog_mean=("SOG", "mean"),
        )
        .reset_index()
    )
    vessels["type_label"] = vessels["vessel_type"].map(vessel_type_label)
    vessels["name"] = vessels["name"].fillna("(no name broadcast)")

    print(f"  vessels: {len(vessels):,} unique MMSI")
    print("\n  vessel mix:")
    for label, n in vessels.type_label.value_counts().items():
        print(f"    {label:<18} {n:>5}")

    out_tracks = INTERIM / "ais_tracks.parquet"
    out_vessels = INTERIM / "ais_vessels.csv"
    ais.to_parquet(out_tracks, index=False)
    vessels.to_csv(out_vessels, index=False)
    print(f"\n  wrote {out_tracks.name} ({out_tracks.stat().st_size / 1e6:.1f} MB)")
    print(f"  wrote {out_vessels.name}")


if __name__ == "__main__":
    main()
