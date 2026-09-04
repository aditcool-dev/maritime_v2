"""
Run the whole feasibility experiment end to end.

    python scripts/run_all.py              # full run
    python scripts/run_all.py --from 4     # resume from step 4
    python scripts/run_all.py --skip-ais   # reuse the parsed AIS parquet

Step order and why it is this order:

    3  env      real observed wind + currents, cached to disk. Runs FIRST
                because step 0 needs the same forcing to drift the oil, and
                caching guarantees steps 0 and 4 see byte-identical fields.
    0  observe  builds the spill polygon (SYNTHETIC -- stand-in for SAR +
                segmentation). Not part of the attribution pipeline.
    ------------------------------------------------------ pipeline proper ---
    1  scene    polygon -> centroid, area, elongation axis
    2  ais      Marine Cadastre daily archives -> tracks in region + window
    4  drift    backward drift -> candidate origin locus (one origin per age)
    5  score    four sub-scores per vessel -> ranked candidates
    5' ablation same, with backward drift disabled (for section 5 of the report)
    6  report   ranked table, ground-truth evaluation, sensitivity, map

Step 2 needs the daily AIS zips in data/raw/ais/ (~1.4 GB, ~25 min on a slow
link). This script will start scripts/_download_ais.sh for you if they are
missing, but downloading them ahead of time is faster.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

# (step label, script, argv, human description)
STEPS = [
    ("3", "3_fetch_env_data.py", [], "environmental data (real, NOAA CO-OPS)"),
    ("0", "0_make_spill_observation.py", [], "spill observation (SYNTHETIC polygon)"),
    ("1", "1_load_sar_scene.py", [], "load scene geometry"),
    ("2", "2_fetch_ais_tracks.py", [], "AIS tracks (real, Marine Cadastre)"),
    ("4", "4_backward_drift.py", [], "backward drift -> origin locus"),
    ("5", "5_score_candidates.py", [], "score and rank candidates"),
    ("5'", "5_score_candidates.py", ["--no-backtrack"], "ablation: no drift"),
    ("6", "6_report.py", [], "report + map"),
]


def ais_present() -> bool:
    sys.path.insert(0, str(HERE))
    from common import RAW_AIS, ais_days
    return all((RAW_AIS / f"AIS_{d}.zip").exists() for d in ais_days())


def run(script: str, argv: list[str]) -> float:
    t0 = time.time()
    r = subprocess.run([sys.executable, script, *argv], cwd=HERE)
    if r.returncode != 0:
        print(f"\n*** {script} failed (exit {r.returncode}); stopping.")
        sys.exit(r.returncode)
    return time.time() - t0


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--from", dest="start", default=None,
                    help="first step label to run (0,1,2,3,4,5,6)")
    ap.add_argument("--skip-ais", action="store_true",
                    help="skip step 2 and reuse data/interim/ais_tracks.parquet")
    args = ap.parse_args()

    steps = STEPS
    if args.start is not None:
        labels = [s[0] for s in STEPS]
        if args.start not in labels:
            sys.exit(f"--from must be one of {labels}")
        steps = STEPS[labels.index(args.start):]
    if args.skip_ais:
        steps = [s for s in steps if s[0] != "2"]

    needs_ais = any(s[0] == "2" for s in steps)
    if needs_ais and not ais_present():
        print("=" * 74)
        print("AIS daily archives are missing. Downloading (~1.4 GB) ...")
        print("=" * 74)
        subprocess.run(["bash", str(HERE / "_download_ais.sh")], cwd=ROOT, check=True)
        if not ais_present():
            sys.exit("AIS download incomplete; rerun scripts/_download_ais.sh")

    print("=" * 74)
    print("SIH26143 -- maritime spill attribution, phase-1 feasibility run")
    print("=" * 74)
    for label, script, argv, desc in steps:
        print(f"  step {label:<3} {desc}")
    print()

    timings = []
    t_start = time.time()
    for label, script, argv, desc in steps:
        timings.append((label, desc, run(script, argv)))

    print("\n" + "=" * 74)
    print("DONE")
    print("=" * 74)
    for label, desc, dt in timings:
        print(f"  step {label:<3} {desc:<45} {dt:7.1f} s")
    print(f"  {'total':<54} {time.time() - t_start:7.1f} s")
    print()
    print("  outputs in data/out/ :")
    for p in sorted((ROOT / "data" / "out").iterdir()):
        print(f"    {p.name:<45} {p.stat().st_size / 1024:8.1f} KiB")
    print()
    print("  read data/out/report.md for the ranked result and the caveats.")


if __name__ == "__main__":
    main()
