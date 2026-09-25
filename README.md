# ELD Trip Planner

Plan an hours-of-service compliant truck trip from four inputs (current location, pickup, drop-off
and hours already used in the cycle). The app returns:

- **A route map** with every required stop: pickup, drop-off, fuel, 30-minute breaks, 10-hour rests
  and 34-hour restarts.
- **Filled-in Driver's Daily Log sheets**, one per calendar day. Each has the duty-status graph,
  per-status totals, remarks with the location of every change of duty, and the 70-hour/8-day recap.
  Sheets can be printed or saved as PDF.
- **An itinerary and turn-by-turn directions.**

Stack: Django 6 + Django REST Framework (API), React 19 + TypeScript + Vite + Tailwind 4 (web).
Maps use free, keyless OpenStreetMap services: [OSRM](https://project-osrm.org) for routing,
[Photon](https://photon.komoot.io) for geocoding, and OSM tiles rendered with Leaflet.

## Quick start (Docker)

```bash
docker compose up --build        # or: make up
```

| Service | URL                                   |
| ------- | ------------------------------------- |
| Web app | http://localhost:8080                 |
| API     | http://localhost:8000/api/health/     |

Run the backend lint and test suite in Docker:

```bash
docker compose run --rm --build backend-tests
```

## Local development

```bash
# API
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
DJANGO_DEBUG=1 python manage.py runserver        # http://localhost:8000
pytest && ruff check . && ruff format --check .

# Web
cd frontend
npm install
npm run dev                                      # http://localhost:5173
npm test && npm run lint && npm run typecheck
```

## Hours-of-service model

The brief's assumptions are a property-carrying driver on the 70-hour/8-day cycle, no adverse
driving conditions, fueling at least every 1,000 miles, and 1 hour each for pickup and drop-off.
The rules follow the FMCSA *Interstate Truck Driver's Guide to Hours of Service* (April 2022).

| Rule                    | Implementation                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ |
| 11-hour driving limit   | A shift ends after 11 hours of driving.                                        |
| 14-hour window          | No driving after the 14th hour since the shift started.                        |
| 30-minute break         | Required after 8 hours of driving. Any 30+ minutes not driving counts (fuel, pickup). |
| 10 consecutive hours off | Resets the 11/14-hour limits. Logged as sleeper berth.                        |
| 70 hours / 8 days       | Driving stops at 70 hours on duty. A 34-hour restart resets the cycle.         |
| Fuel                    | 30 minutes on duty before 1,000 miles have been driven since the last fill-up. |
| Inspections             | 15-minute pre-trip at the start of each shift, 15-minute post-trip at the end. |

**Design decisions**

- The scheduler is greedy, like a real driver: keep driving until a limit forces a stop, then take
  the shortest stop that makes driving legal again.
- The limits restrict *driving* only. On-duty work such as unloading after the 14th hour, or at
  70 hours, stays legal, so it never triggers an unnecessary restart.
- The brief gives the hours already used, not which days they fell on. The conservative reading
  keeps them all in the rolling window until a 34-hour restart.
- Logs use the home terminal's time standard. The trip is pinned to the start time's UTC offset,
  so every sheet is exactly 24 hours.
- Driving times come from OSRM's estimates.

## Architecture

```
backend/
  config/                 settings (12-factor, env-driven), urls, wsgi
  trips/hos/              pure HOS domain: rules, scheduling engine, daily-log builder
  trips/services/         OSRM routing, Photon geocoding, geometry, trip-planning use case
  trips/serializers.py    request validation
  trips/presenters.py     response shaping
  trips/views.py          thin DRF views (throttled)
  trips/tests/            unit + API tests, plus an independent HOS compliance auditor
frontend/src/
  api/                    typed client and wire types
  components/ui/          reusable primitives (Button, Card, Field, Tabs, Alert, ...)
  domain/                 duty-status and activity metadata (labels, colors, icons)
  features/planner/       trip form, location autocomplete, validation
  features/map/           Leaflet route map, stop grouping, pins
  features/logs/          SVG log sheet (pure, tested layout geometry + rendering)
  features/itinerary/     day-by-day duty timeline
  features/directions/    turn-by-turn directions
```

The HOS engine has no framework dependencies. The test suite checks every generated schedule with
an independent auditor across 144 combinations of trip length and starting cycle hours.

## API

| Method | Path                        | Description                                          |
| ------ | --------------------------- | ---------------------------------------------------- |
| POST   | `/api/trips/plan/`          | Plan a trip: summary, route, duty events, daily logs |
| GET    | `/api/places/search/?q=`    | Location autocomplete                                |
| GET    | `/api/places/reverse/?lat=&lng=` | Name a coordinate ("use my location")           |
| GET    | `/api/health/`              | Health check                                         |

```json
POST /api/trips/plan/
{
  "current_location": { "label": "Chicago, IL", "lat": 41.8756, "lng": -87.6244 },
  "pickup_location":  { "label": "St. Louis, MO" },
  "dropoff_location": { "label": "Los Angeles, CA" },
  "current_cycle_used": 20,
  "start_time": "2026-09-25T08:00",
  "timezone": "America/Chicago"
}
```

A location without coordinates is geocoded on the server. Errors use one envelope:
`{"error": {"code", "message", "details"?}}`.

## Deployment

- **API:** `render.yaml` is a Render Blueprint that builds `backend/Dockerfile`. Set
  `CORS_ALLOWED_ORIGINS` to the web app's URL. The image runs anywhere Docker does (Fly.io,
  Railway, and others).
- **Web:** deploy `frontend/` to Vercel (`vercel.json` included) with `VITE_API_BASE_URL` set to
  `https://<api-host>/api`.

Environment variables are documented in `backend/.env.example` and `frontend/.env.example`.
