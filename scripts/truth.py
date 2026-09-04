"""
Ground truth for the case study -- QUARANTINED ON PURPOSE.

This module may be imported by EXACTLY TWO things:

  * scripts/0_make_spill_observation.py  -- the stand-in "sensor", which needs
    the release point/time to forward-simulate the slick that the pipeline
    will later be asked to explain.
  * scripts/6_report.py                  -- the evaluation section, which needs
    to say where the known-responsible vessels actually landed in the ranking.

Scripts 1-5 (the attribution pipeline proper) MUST NOT import this module.
If they did, the experiment would be circular and worthless.

-------------------------------------------------------------------------------
PROVENANCE OF THE GROUND TRUTH
-------------------------------------------------------------------------------
The incident is real and documented: a collision in the Houston Ship Channel
at the Bayport Flare, Upper Galveston Bay, Texas, on 2019-05-10, in which a
tank barge under tow was breached and released a cargo of reformate.

The release position and time below were NOT taken from a news article. They
were derived independently from the primary AIS record (NOAA Marine Cadastre,
AIS_2019_05_10.csv), which shows an unambiguous casualty signature:

  * VOYAGER     (MMSI 366996020, IMO 8424549, towing vessel, 21 m) is inbound
    up the channel at 5.3 kn on COG ~327 deg, and goes to 0.2 kn at 20:27 UTC
    at 29.59581 N, 94.94310 W, then sits nearly motionless for ~2.5 h.
  * ROSE BALSAM (MMSI 356144000, IMO 9478937, cargo, 189 m) is outbound at
    11.8 kn on COG ~161 deg at 20:09 UTC, decelerates hard to 3.0 kn by
    20:17:27, is dead stopped at 20:26:38 at 29.60061 N, 94.94655 W, holds
    that position ~45 min, and from 21:14:58 broadcasts AIS navigational
    status 2 = "not under command".
  * HPA FIREBOAT 3 (MMSI 338168501) arrives on scene at 20:45 UTC.

Two vessels stopping dead 630 m apart within one minute of each other, one of
them then declaring "not under command", with a fireboat alongside 20 minutes
later, is a collision. The release point below is the midpoint of the two
stopped positions.

NOTE ON VESSEL NAMING: the published investigation of this collision refers to
the ship as GENESIS RIVER. The AIS static data in the Marine Cadastre archive
carries IMO 9478937 under the name ROSE BALSAM. Ships are renamed, and the
Marine Cadastre name field is not guaranteed to be the name broadcast on the
day. The IMO number is the stable identifier; we key ground truth on MMSI and
report the name exactly as the AIS archive gives it, without asserting which
name was in use on 2019-05-10.
"""

from __future__ import annotations

import pandas as pd

# ---------------------------------------------------------------------------
# True release (derived from AIS as described above)
# ---------------------------------------------------------------------------

RELEASE = {
    "time_utc": "2019-05-10 20:20:00",
    "lat": 29.59821,
    "lon": -94.94483,
    "note": (
        "Midpoint of the stopped positions of VOYAGER (29.59581, -94.94310, "
        "20:27:25Z) and ROSE BALSAM (29.60061, -94.94655, 20:26:38Z)."
    ),
    # A breached barge does not empty instantaneously.
    "release_duration_min": 30.0,
}

# ---------------------------------------------------------------------------
# Vessels known to be involved, for scoring the ranking after the fact.
# ---------------------------------------------------------------------------

CULPRITS = {
    366996020: {
        "name_in_ais": "VOYAGER",
        "imo": "8424549",
        "role": "towing vessel pushing the tank barge that was breached",
    },
    356144000: {
        "name_in_ais": "ROSE BALSAM",
        "imo": "9478937",
        "role": "outbound ship that struck the tow; later NUC",
    },
}

# A deliberately-tracked hard negative: a 225 m tanker that transited the
# collision point within 73 m only ~15 min before the collision, at 12 kn, and
# carried on to Houston unaffected. A useful check that the ranking is not
# simply "biggest ship that was nearby".
HARD_NEGATIVES = {
    235101304: {"name_in_ais": "BW OAK", "imo": "9320764", "note": "innocent transit"},
}


def release_time() -> pd.Timestamp:
    return pd.Timestamp(RELEASE["time_utc"])
