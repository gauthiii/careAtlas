# CareAtlas

A React + Vite frontend (patient, clinician, and AI Governance portals) backed by a
FastAPI service that brokers all communication with ServiceNow.

## Architecture

```
Browser (React / Vite)
        │  fetch /api/*
        ▼
Vite dev server  ──proxy /api──►  FastAPI backend (server/)  ──►  ServiceNow
   (port 5173)                         (port 8000)                (AI Control Tower)
```

The frontend never talks to ServiceNow directly and holds no secrets. Everything that
touches a backend lives in [`server/`](server/):

- `GET  /api/agents` — AI agent inventory from the ServiceNow `sn_aia_agent` table.
- `POST /api/auth/validate` — validates a username/password against ServiceNow `sys_user`.
- `GET  /api/health` — liveness check.

## Prerequisites

- Node.js 18+
- Python 3.11+

## Backend (`server/`)

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then fill in your ServiceNow credentials
uvicorn app.main:app --reload --port 8000
```

Verify it's up:

```bash
curl http://localhost:8000/api/health      # {"status":"ok"}
curl http://localhost:8000/api/agents       # JSON array of agents
```

Interactive API docs are served at <http://localhost:8000/docs>.

## Frontend

In a second terminal, from the repo root:

```bash
npm install
npm run dev
```

Open the printed URL. The dev server proxies `/api` to the backend on port 8000, so
make sure the backend is running first. Key pages:

- `/governance/ai-agents` — AI agent inventory cards (calls `/api/agents`).
- `/patient/sign-in` and `/staff/sign-in` — credential checks (call `/api/auth/validate`).

## Environment variables

### Backend — `server/.env`

| Variable               | Required | Default                 | Description                                              |
| ---------------------- | -------- | ----------------------- | -------------------------------------------------------- |
| `SNOW_INSTANCE`        | yes      | —                       | ServiceNow host, e.g. `ven04690.service-now.com`         |
| `SNOW_USERNAME`        | yes      | —                       | Service account with read access to the AI tables        |
| `SNOW_PASSWORD`        | yes      | —                       | Service account password                                 |
| `CORS_ORIGINS`         | no       | `http://localhost:5173` | Comma-separated browser origins allowed to call the API  |
| `AGENTS_CREATED_SINCE` | no       | `2026-06-02 00:00:00`   | Only return agents created on/after this UTC datetime     |

### Frontend — `.env` (repo root)

| Variable                 | Required | Default                 | Description                                          |
| ------------------------ | -------- | ----------------------- | --------------------------------------------------- |
| `VITE_API_BASE_URL`      | no       | `/api`                  | API base URL; set to the deployed API origin in prod |
| `VITE_API_PROXY_TARGET`  | no       | `http://localhost:8000` | Where the Vite dev server proxies `/api`             |

## Production

1. Deploy the backend (e.g. `uvicorn app.main:app --host 0.0.0.0 --port 8000`, behind a
   reverse proxy) and add the frontend's origin to `CORS_ORIGINS`.
2. Build the frontend with `VITE_API_BASE_URL` pointed at the deployed API, then host
   the static `dist/` output:

   ```bash
   VITE_API_BASE_URL=https://api.example.com/api npm run build
   ```

### Optional: static snapshot

For fully static hosting that can't reach the live API, generate a JSON snapshot of the
agent inventory (you would then wire the frontend to read it):

```bash
cd server && source .venv/bin/activate
python scripts/generate_snapshot.py        # writes public/snow-ai-agent-inventory.json
```
