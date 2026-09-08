#!/usr/bin/env python3
"""Generate reference natal-chart fixtures with the Swiss Ephemeris.

Oracle: pyswisseph (Swiss Ephemeris, the engine behind astro.com), Moshier
mode so no ephemeris data files are needed. Tropical zodiac, apparent
geocentric positions, Placidus houses. Output feeds
packages/astro/src/__fixtures__/*.json; the engine under test must match
every value within 1 degree (ADR-0004).

The fixture directory is in .prettierignore: this script's output is the
canonical byte form, so re-running it must produce no diff.

Usage (dev machine only; never part of the battery):
  python3 -m venv .venv && .venv/bin/pip install pyswisseph==2.10.3.2
  .venv/bin/python packages/astro/scripts/gen-fixtures.py
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import swisseph as swe

OUT = Path(__file__).resolve().parents[1] / "src" / "__fixtures__"

PLANETS = [
    ("sun", swe.SUN),
    ("moon", swe.MOON),
    ("mercury", swe.MERCURY),
    ("venus", swe.VENUS),
    ("mars", swe.MARS),
    ("jupiter", swe.JUPITER),
    ("saturn", swe.SATURN),
    ("uranus", swe.URANUS),
    ("neptune", swe.NEPTUNE),
    ("pluto", swe.PLUTO),
]

# id, UTC instant, latitude, longitude, note
CHARTS = [
    ("istanbul-1995", "1995-07-14T00:30:00Z", 41.0082, 28.9784,
     "Istanbul, 14 Jul 1995 03:30 EEST (UTC+3)"),
    ("ankara-1990", "1990-01-01T10:00:00Z", 39.9334, 32.8597,
     "Ankara, 1 Jan 1990 12:00 EET (UTC+2)"),
    ("helsinki-2001", "2001-11-20T16:45:00Z", 60.1699, 24.9384,
     "Helsinki, 20 Nov 2001 18:45 EET (UTC+2); high latitude for Placidus"),
]

FLAGS = swe.FLG_MOSEPH | swe.FLG_SPEED


def julian_day(iso: str) -> float:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(timezone.utc)
    hour = dt.hour + dt.minute / 60 + dt.second / 3600
    return swe.julday(dt.year, dt.month, dt.day, hour)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for chart_id, utc, lat, lon, note in CHARTS:
        jd = julian_day(utc)
        planets = {}
        for name, body in PLANETS:
            (elon, _lat, _dist, speed, *_), _ = swe.calc_ut(jd, body, FLAGS)
            planets[name] = {
                "longitude": round(elon, 4),
                "retrograde": speed < 0,
            }
        cusps, ascmc = swe.houses(jd, lat, lon, b"P")
        fixture = {
            "id": chart_id,
            "note": note,
            "source": (
                f"Swiss Ephemeris {swe.version} via pyswisseph, Moshier mode "
                "(FLG_MOSEPH|FLG_SPEED), tropical, apparent geocentric; "
                "houses: Placidus"
            ),
            "input": {"utc": utc, "latitude": lat, "longitude": lon},
            "planets": planets,
            "ascendant": round(ascmc[0], 4),
            "mc": round(ascmc[1], 4),
            "cusps": [round(c, 4) for c in cusps],
        }
        path = OUT / f"{chart_id}.json"
        path.write_text(json.dumps(fixture, indent=2) + "\n")
        print(f"wrote {path.relative_to(OUT.parents[2])}")


if __name__ == "__main__":
    main()
