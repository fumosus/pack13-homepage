# Cub Scout Pack 13 homepage

Draft family homepage for **Pack 13, Plainfield, Illinois** (Rainbow Council). This is a local pack page, not an official Scouting America / BSA site.

The live public site today is [cubscoutpack13.com](https://www.cubscoutpack13.com/). This project is a replacement draft.

## Preview locally

Do not open `index.html` as a file. The events list loads `events.json` over HTTP.

```bash
python3 -m http.server 8080
```

Then visit <http://localhost:8080>.

## Refresh the calendar

Upcoming events come from the public Scoutbook Plus ICS feed (title, time, location, and event link only — no descriptions).

```bash
python3 scripts/fetch-calendar.py
```

That writes `events.json`. Re-run after pack calendar changes. The homepage does **not** call Scoutbook from the browser (their API does not allow it).

## Contact

The contact form opens the visitor’s email app to **info@cubscoutpack13.com**. Nothing is submitted to a server from this site.

## Repo notes

- Private source control. GitHub Pages is **not** enabled.
- The calendar URL in `scripts/fetch-calendar.py` is a public ICS link, not a secret. Do not add Scoutbook logins, tokens, or form-service keys to this repo.
