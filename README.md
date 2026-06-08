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
- `POST /api/agents/execute` — submits a Zurich ServiceNow AI Agent over asynchronous A2A.
- `GET  /api/agents/execute/{request_id}` — polls for an async A2A callback result.
- `POST /api/a2a/callback/{agent_sys_id}` — receives ServiceNow async A2A callbacks.
- `POST /api/acl/test` — tests read-only ServiceNow ACL access for a known non-human identity.
- `POST /api/auth/validate` — validates a username/password against ServiceNow `sys_user`.
- `POST /api/auth/entra/*` — Microsoft Entra External ID Native Auth signup,
  login, MFA challenge/verification, strong-auth registration, and token refresh.
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
| `SNOW_A2A_CLIENT_ID`   | yes for agent execution | —             | OAuth client id for Zurich A2A agent invocation          |
| `SNOW_A2A_CLIENT_SECRET` | yes for agent execution | —           | OAuth client secret for Zurich A2A agent invocation      |
| `SNOW_A2A_TOKEN_SKEW_SECONDS` | no | `60`                  | Refresh cached A2A tokens this many seconds before expiry |
| `A2A_CALLBACK_BASE_URL` | yes for agent execution | —            | Public backend origin for ServiceNow callbacks, e.g. `https://careatlas.onrender.com` |
| `A2A_CALLBACK_TOKEN`   | yes for agent execution | —             | Long shared token expected from ServiceNow callback auth  |
| `CORS_ORIGINS`         | no       | `http://localhost:5173` | Comma-separated browser origins allowed to call the API  |
| `AGENTS_CREATED_SINCE` | no       | `2026-06-02 00:00:00`   | Only return agents created on/after this UTC datetime     |
| `ENTRA_APP_ID`         | yes      | —                       | Entra app registration Application (client) ID            |
| `ENTRA_TENANT_ID`      | yes      | —                       | Entra external tenant Directory (tenant) ID               |
| `ENTRA_TENANT_SUBDOMAIN` | yes    | —                       | Prefix in `https://<subdomain>.ciamlogin.com/common`      |
| `ENTRA_TENANT_DOMAIN`  | no       | `<subdomain>.onmicrosoft.com` | External tenant domain used in Native Auth API paths |
| `ENTRA_SCOPES`         | no       | `openid offline_access profile` | Scopes requested when issuing or refreshing tokens |

### Zurich A2A agent execution setup

To run agents from `/governance/ai-agents`, configure ServiceNow Zurich for
secondary-agent A2A access. CareAtlas calls ServiceNow in two ways:

- Basic Auth with `SNOW_USERNAME` / `SNOW_PASSWORD` for the `GET /api/agents`
  inventory read from `sn_aia_agent`.
- OAuth client credentials with `SNOW_A2A_CLIENT_ID` /
  `SNOW_A2A_CLIENT_SECRET` for `POST /api/agents/execute` over A2A.

ServiceNow setup:

1. In **AI Agent Studio > Settings > External AI Agents > Discoverability**, turn on
   **Allow third party to access ServiceNow AI Agents**.
2. Set the External AI Agents communication mode to **Asynchronous** if ServiceNow
   requires it. CareAtlas sends `pushNotificationConfig` and polls its own backend
   for the callback result.
3. In **System Properties > sys_properties.list**, confirm this property exists and
   is set to `true`:

   ```text
   glide.oauth.inbound.client.credential.grant_type.enabled
   ```

4. In **System OAuth > Application Registry**, create or open an inbound OAuth
   application for CareAtlas.
5. Set the OAuth app to **Active** and use **Client Credentials** / **Integration as a Service**.
6. If **Scope Restriction** is set to **Securely scoped**, add an active REST API Auth
   Scope for the A2A integration, for example `a2aauthscope`.
7. Add the **OAuth Application User** field to the OAuth app form if it is hidden,
   then set it to the integration user. Client-credentials tokens run as this user.
8. On the integration user, confirm:
   - **Active** is checked.
   - **Locked out** is unchecked.
   - **Password needs reset** is unchecked.
   - **Web service access only** is allowed.
   - Roles include the AI/A2A roles needed by your agents, such as
     `sn_aia.admin`, `sn_aia.viewer`, `sn_agent.sn_agent_user`, and, for the
     governance setup, `sn_ai_governance.ai_steward`.
9. Save the user, save the OAuth app, then regenerate the client secret if it has
   been exposed or copied before the final configuration was saved.
10. Put the OAuth client id, secret, callback base URL, callback token, and allowed
    browser origins in `server/.env`:

    ```env
    SNOW_A2A_CLIENT_ID=your_client_id_here
    SNOW_A2A_CLIENT_SECRET=your_client_secret_here
    SNOW_A2A_TOKEN_SKEW_SECONDS=60
    A2A_CALLBACK_BASE_URL=https://careatlas.onrender.com
    A2A_CALLBACK_TOKEN=choose-a-long-random-token
    CORS_ORIGINS=http://localhost:5173,https://gauthiii.github.io
    ```

11. In Render, set the same env vars in the backend service dashboard.
12. In **External Agent Callback Registry**
    (`sn_aia_external_agent_callback_registry`), create one callback registry record
    per agent. Use this URL pattern:

    ```text
    https://careatlas.onrender.com/api/a2a/callback/<agent_sys_id>
    ```

    For the current governance agent:

    ```text
    https://careatlas.onrender.com/api/a2a/callback/90ef57251b1d8b14b72fc9d3604bcbce
    ```

13. Configure callback authentication so ServiceNow sends:

    ```text
    Authorization: Bearer <A2A_CALLBACK_TOKEN>
    ```

14. Click **Verify URL** and confirm the callback registry record becomes **Verified**.
15. Restart the FastAPI backend after editing local `server/.env`.

After a CareAtlas run, verify ServiceNow received it in the Execution Plan
[`sn_aia_execution_plan`] table by finding an Objective that contains the prompt you submitted.
The `/governance/ai-agents` page opens each agent in a local slide-out chat drawer.
Each chat turn submits asynchronous A2A with `pushNotificationConfig`, then polls
`GET /api/agents/execute/{request_id}` every two seconds until the ServiceNow
callback arrives. CareAtlas keeps returned `contextId` / `taskId` values on
follow-up turns when ServiceNow provides them.

Token test:

```bash
curl -X POST "https://<your-instance>.service-now.com/oauth_token.do" \
  -H "Accept: application/json" \
  -d "grant_type=client_credentials" \
  -d "client_id=<client-id>" \
  -d "client_secret=<client-secret>"
```

If the OAuth app is securely scoped, also test with the auth scope:

```bash
curl -X POST "https://<your-instance>.service-now.com/oauth_token.do" \
  -H "Accept: application/json" \
  -d "grant_type=client_credentials" \
  -d "client_id=<client-id>" \
  -d "client_secret=<client-secret>" \
  -d "scope=a2aauthscope"
```

A working response contains an `access_token`. If ServiceNow returns
`{"error_description":"access_denied","error":"server_error"}`, the request has
not reached agent execution yet. Recheck the client secret, saved OAuth app, OAuth
Application User, `glide.oauth.inbound.client.credential.grant_type.enabled`, and
whether **Password needs reset** is still checked on the integration user.

A manual asynchronous A2A execution payload should include `pushNotificationConfig`:

```bash
curl -X POST "https://<your-instance>.service-now.com/api/sn_aia/a2a/v2/agent/id/<agent-sys-id>" \
  -H "Authorization: Bearer <access-token>" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "careatlas-test-1",
    "method": "message/send",
    "params": {
      "configuration": {
        "acceptedOutputModes": ["application/json"],
        "blocking": false,
        "returnImmediately": true,
        "return_immediately": true,
        "historyLength": 0,
        "pushNotificationConfig": {
          "url": "https://careatlas.onrender.com/api/a2a/callback/<agent-sys-id>",
          "token": "<A2A_CALLBACK_TOKEN>",
          "authentication": {
            "schemes": ["Bearer"]
          }
        }
      },
      "message": {
        "kind": "message",
        "role": "user",
        "messageId": "careatlas-message-1",
        "parts": [
          {
            "kind": "text",
            "text": "Test from CareAtlas. Please respond with a short confirmation."
          }
        ]
      },
      "metadata": {}
    }
  }'
```


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
