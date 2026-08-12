#!/usr/bin/env python3
"""Fetch Pack 13 Scoutbook Plus calendar and write public events.json.

Shows only title, times, location, and Scoutbook event URL — no descriptions.
Re-run this script whenever you want the homepage list refreshed, or wire it
to a scheduled job / GitHub Action.
"""

from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ICS_URL = "https://api.scouting.org/advancements/events/calendar/21452"
TIMEZONE = "America/Chicago"
ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "events.json"
USER_AGENT = "Pack13Homepage/1.0 (calendar-sync)"


def unfold_ics(raw: str) -> list[str]:
    lines: list[str] = []
    for line in raw.splitlines():
        if line.startswith((" ", "\t")) and lines:
            lines[-1] += line[1:]
        else:
            lines.append(line)
    return lines


def parse_vevents(lines: list[str]) -> list[dict[str, str]]:
    events: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    for line in lines:
        if line == "BEGIN:VEVENT":
            current = {}
            continue
        if line == "END:VEVENT" and current is not None:
            events.append(current)
            current = None
            continue
        if current is None or ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.split(";", 1)[0]
        current[key] = value
    return events


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    if value.endswith("Z"):
        return datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
    if len(value) == 8 and "T" not in value:
        # All-day date — interpret as midnight UTC for sorting
        return datetime.strptime(value, "%Y%m%d").replace(tzinfo=timezone.utc)
    return datetime.strptime(value, "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)


def unescape_ics(text: str) -> str:
    return (
        text.replace("\\n", "\n")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .replace("\\\\", "\\")
        .strip()
    )


def to_iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_ics(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/calendar, */*"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        body = response.read()
        charset = response.headers.get_content_charset() or "utf-8"
        return body.decode(charset, errors="replace")


def main() -> int:
    try:
        raw = fetch_ics(ICS_URL)
    except Exception as exc:  # noqa: BLE001 — CLI surface
        print(f"Failed to fetch calendar: {exc}", file=sys.stderr)
        return 1

    local_tz = ZoneInfo(TIMEZONE)
    public_events = []

    for event in parse_vevents(unfold_ics(raw)):
        start = parse_dt(event.get("DTSTART"))
        end = parse_dt(event.get("DTEND"))
        if start is None:
            continue

        uid = event.get("UID", "")
        event_id = uid.split("@", 1)[0]
        url = event.get("URL", "").strip()
        if not url and event_id:
            url = f"https://advancements.scouting.org/calendar/event/{event_id}"

        start_local = start.astimezone(local_tz)
        end_local = end.astimezone(local_tz) if end else None

        public_events.append(
            {
                "id": event_id,
                "title": unescape_ics(event.get("SUMMARY", "Event")),
                "start": to_iso_z(start),
                "end": to_iso_z(end) if end else None,
                "startLocal": start_local.strftime("%Y-%m-%dT%H:%M:%S"),
                "endLocal": end_local.strftime("%Y-%m-%dT%H:%M:%S") if end_local else None,
                "location": unescape_ics(event.get("LOCATION", "")),
                "url": url,
            }
        )

    public_events.sort(key=lambda item: item["start"])

    payload = {
        "source": ICS_URL,
        "generatedAt": to_iso_z(datetime.now(timezone.utc)),
        "timezone": TIMEZONE,
        "events": public_events,
    }

    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(public_events)} events to {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
