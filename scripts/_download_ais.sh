#!/usr/bin/env bash
# Background bulk download of Marine Cadastre daily AIS zips.
set -u
DEST="data/raw/ais"
BASE="https://coast.noaa.gov/htdata/CMSP/AISDataHandler/2019"
for d in 2019_05_10 2019_05_09 2019_05_11 2019_05_08 2019_05_12; do
  f="AIS_${d}.zip"
  if [ -s "${DEST}/${f}" ]; then echo "[skip] ${f} already present"; continue; fi
  echo "[get ] ${f} $(date -u +%H:%M:%S)"
  curl -sL --retry 3 --retry-delay 5 -C - -o "${DEST}/${f}.part" "${BASE}/${f}" \
    && mv "${DEST}/${f}.part" "${DEST}/${f}" \
    && echo "[done] ${f} $(du -h ${DEST}/${f} | cut -f1) $(date -u +%H:%M:%S)" \
    || echo "[FAIL] ${f}"
done
echo "[ALL DONE] $(date -u +%H:%M:%S)"
