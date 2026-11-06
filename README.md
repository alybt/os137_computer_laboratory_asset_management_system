# LabAssets — OS 137 Computer Laboratory Asset Management System

A complete web-based asset management system for a university computer
laboratory. It tracks workstations, laptops, peripherals, network equipment, and
other laboratory assets across laboratories; records check-outs and returns;
schedules and closes maintenance work orders; and produces reports and CSV
exports.

The system is split into:

- **Frontend** — React 19 + Vite + Tailwind CSS v4, designed to run in
  WSL/Distrobox.
- **Backend** — Python FastAPI with JWT authentication and role-based access.
- **Database** — PostgreSQL for the VirtualBox deployment, with a zero-setup
  SQLite fallback for local testing.

---

## Features

- **Authentication and roles** — administrator, technician, and read-only viewer.
- **Dashboard** — inventory totals, asset value, assignment and maintenance
  summaries, category/laboratory breakdowns, and recent activity.
- **Asset inventory** — search, filters, pagination, full asset details, status
  and condition tracking, and CSV export.
- **Laboratories** — manage laboratories, rooms, capacity, and asset counts.
- **Categories** — organize assets and see per-category totals.
- **Assignments** — issue assets to borrowers, track due dates, see overdue
  items, and process returns.
- **Maintenance** — log preventive/corrective work orders, start and complete
  jobs, record costs and technicians, and return assets to service.
- **Reports** — summary report plus downloadable assets, assignments, and
  maintenance CSVs.
- **User administration** — create, edit, deactivate, and delete accounts
  (administrators only).
- **Activity log** — audit trail of logins and record changes (administrators
  only).
- **Demo data** — six laboratories, eight categories, 40 assets, active
  assignments, maintenance records, and an activity history.

---

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@labassets.edu` | `admin123` |
| Technician | `tech@labassets.edu` | `labassets123` |
| Viewer | `viewer@labassets.edu` | `labassets123` |

The login screen also has one-click buttons that fill these credentials.

### Role capabilities

| Capability | Administrator | Technician | Viewer |
| --- | :---: | :---: | :---: |
| View dashboard, assets, reports | Yes | Yes | Yes |
| Create/edit assets, laboratories, categories | Yes | Yes | No |
| Issue, edit, and return assignments | Yes | Yes | No |
| Log and update maintenance | Yes | Yes | No |
| Delete records | Yes | No | No |
| Manage users | Yes | No | No |
| View activity log | Yes | No | No |

---

## Architecture

The intended laboratory setup keeps the frontend in WSL/Distrobox and the API
and database inside a VirtualBox VM:

```text
┌──────────────────────────────┐         HTTP/JSON          ┌──────────────────────────────┐
│ Windows host                 │                            │ VirtualBox VM                │
│                              │                            │                              │
│  Browser                     │                            │  FastAPI (0.0.0.0:8000)      │
│    │                         │                            │    │                         │
│    ▼                         │                            │    ▼                         │
│  WSL / Distrobox             │  VITE_API_URL=…:8000/api   │  PostgreSQL (127.0.0.1:5432) │
│  Vite dev server :5173  ─────┼───────────────────────────▶│                              │
└──────────────────────────────┘         CORS               └──────────────────────────────┘
```

- The browser calls the API directly at `VITE_API_URL`.
- The VM must allow inbound TCP 8000 from the host/WSL network.
- The API allows cross-origin requests through `CORS_ORIGINS`.
- PostgreSQL only needs to listen on the VM's loopback interface because the
  backend runs in the same VM.

For a single-machine demo, the frontend dev server proxies `/api` to
`http://127.0.0.1:8000`, so no `.env` file is required.

---

## Quick start (single machine, SQLite)

This is the fastest way to run and test the complete system. No PostgreSQL
installation is needed.

### 1. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On first startup the API creates `backend/lab_assets.db` and seeds the demo data.
Open <http://127.0.0.1:8000/docs> for the interactive API documentation.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> and sign in with an account from the table above.

> The Vite dev server proxies `/api` to `http://127.0.0.1:8000` by default. If
> your API is elsewhere, set `VITE_API_URL` (see below) or
> `VITE_PROXY_TARGET` for the proxy target.

---

## Deployment: frontend in WSL/Distrobox, backend + database in VirtualBox

### 1. Prepare the VM and PostgreSQL

Use a Linux VM (Ubuntu/Debian instructions below) with a network adapter that
the WSL/Distrobox environment can reach. A **Bridged Adapter** is the simplest;
a **Host-only Adapter** also works if routing between WSL and the host-only
network is configured. Note the VM's IP address:

```bash
ip addr
# example: 192.168.1.50 or 192.168.56.10
```

Install PostgreSQL:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Create the database and application user:

```bash
sudo -u postgres psql <<'SQL'
CREATE USER labassets WITH PASSWORD 'change-this-password';
CREATE DATABASE labassets OWNER labassets;
GRANT ALL PRIVILEGES ON DATABASE labassets TO labassets;
SQL
```

Verify the connection (the password is the one you just set):

```bash
psql "postgresql://labassets:change-this-password@127.0.0.1:5432/labassets" -c 'SELECT 1;'
```

No `postgresql.conf` or `pg_hba.conf` changes are required for this design: the
API connects over the VM's loopback interface. Do **not** expose port 5432 to
the network unless you deliberately want remote database access.

### 2. Run the backend in the VM

Copy the project into the VM, then:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env`:

```dotenv
DATABASE_URL=postgresql+psycopg://labassets:change-this-password@127.0.0.1:5432/labassets
SECRET_KEY=replace-with-a-long-random-value
CORS_ORIGINS=*
AUTO_SEED=true
```

Generate a secret key with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Start the API on all VM interfaces:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Allow port 8000 through the VM firewall if one is enabled:

```bash
sudo ufw allow 8000/tcp
```

From the Windows host or WSL, verify connectivity:

```bash
curl http://192.168.1.50:8000/api/health
```

You should receive `{"status":"ok", ...}`. If this fails, check the VM network
mode, the VM IP, the firewall, and that uvicorn is bound to `0.0.0.0`.

### 3. Point the frontend at the VM

In WSL/Distrobox:

```bash
cd frontend
npm install
cp .env.example .env
```

Set the VM address in `frontend/.env`:

```dotenv
VITE_API_URL=http://192.168.1.50:8000/api
```

Start Vite:

```bash
npm run dev
```

Open the printed URL (normally <http://localhost:5173>) from your browser.

> `VITE_API_URL` is read when Vite starts. Restart the dev server after changing
> it. Because the browser calls the VM directly, `CORS_ORIGINS` on the backend
> must include the browser's origin, or be `*` during testing.

### 4. Optional production-style frontend build

```bash
cd frontend
VITE_API_URL=http://192.168.1.50:8000/api npm run build
```

The static files are written to `frontend/dist/`. Serve them with any web
server (for example, `npx vite preview --host 0.0.0.0`) and keep the same CORS
rules on the API.

---

## Configuration reference

### Backend (`backend/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///backend/lab_assets.db` | SQLAlchemy database URL. Use `postgresql+psycopg://…` for PostgreSQL. |
| `SECRET_KEY` | development value | JWT signing key. Change this outside local demos. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `720` | Access token lifetime in minutes. |
| `CORS_ORIGINS` | `*` | Comma-separated allowed browser origins. |
| `AUTO_SEED` | `true` | Seed demo data on startup when the database is empty. |
| `ENVIRONMENT` | `development` | Value shown by `/api/health`. |
| `ADMIN_PASSWORD` | `admin123` | Password for the seeded administrator. |
| `DEMO_PASSWORD` | `labassets123` | Password for the seeded technician and viewer. |

See [`backend/.env.example`](backend/.env.example).

### Frontend (`frontend/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base URL of the API, including `/api`. Set this to the VM address for the split deployment. |
| `VITE_PROXY_TARGET` | `http://127.0.0.1:8000` | Only used by the Vite dev proxy when `VITE_API_URL` is left at `/api`. |

See [`frontend/.env.example`](frontend/.env.example).

---

## Seeding and resetting data

Demo data is inserted automatically when the database is empty and
`AUTO_SEED=true`.

To force a full reset (this **drops all tables** and recreates the demo data):

```bash
cd backend
source .venv/bin/activate
python -m app.seed --reset
```

To seed without deleting existing data:

```bash
python -m app.seed
```

The command prints the demo account credentials when it creates them.

---

## API overview

Base URL: `http://<host>:8000/api`

| Area | Endpoints |
| --- | --- |
| Authentication | `POST /auth/login`, `GET /auth/me`, `PATCH /auth/me`, `POST /auth/change-password` |
| Dashboard | `GET /dashboard` |
| Assets | `GET/POST /assets`, `GET/PATCH/DELETE /assets/{id}` |
| Laboratories | `GET/POST /laboratories`, `GET/PATCH/DELETE /laboratories/{id}` |
| Categories | `GET/POST /categories`, `GET/PATCH/DELETE /categories/{id}` |
| Assignments | `GET/POST /assignments`, `PATCH/DELETE /assignments/{id}`, `POST /assignments/{id}/return` |
| Maintenance | `GET/POST /maintenance`, `GET/PATCH/DELETE /maintenance/{id}` |
| Reports | `GET /reports/summary`, `GET /reports/assets.csv`, `GET /reports/assignments.csv`, `GET /reports/maintenance.csv` |
| Users (admin) | `GET/POST /users`, `GET/PATCH/DELETE /users/{id}` |
| Activity (admin) | `GET /activity` |
| System | `GET /health`, interactive docs at `/docs` |

All endpoints except `/health` and `/auth/login` require a bearer token:

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@labassets.edu","password":"admin123"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')

curl http://127.0.0.1:8000/api/dashboard -H "Authorization: Bearer $TOKEN"
```

---

## Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── config.py         # environment settings
│   │   ├── database.py       # engine/session, SQLite fallback
│   │   ├── deps.py           # authentication and role dependencies
│   │   ├── main.py           # FastAPI app, CORS, startup seeding
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── security.py       # password hashing and JWTs
│   │   ├── seed.py           # demo data seeder / reset command
│   │   ├── services.py       # serializers and activity logging
│   │   └── routers/          # auth, assets, labs, categories, …
│   ├── .env.example
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/       # layout, modal system, forms
│   │   ├── context/          # auth and toast providers
│   │   ├── lib/              # API client, formatters, constants
│   │   └── pages/            # dashboard, inventory, reports, …
│   ├── .env.example
│   ├── eslint.config.js
│   ├── vite.config.js
│   └── README.md
└── README.md
```

---

## Development checks

```bash
# Frontend build
cd frontend
npm run build

# Frontend lint (warnings are the intentional data-loading effect notices)
npm run lint
```

The backend exposes a health check and self-documenting OpenAPI schema:

```bash
curl http://127.0.0.1:8000/api/health
open http://127.0.0.1:8000/docs
```

---

## Troubleshooting

**The frontend shows “Cannot reach the API”.**

- Confirm the backend is running: `curl http://127.0.0.1:8000/api/health`.
- If the API is in the VM, confirm `curl http://<vm-ip>:8000/api/health` from
  WSL, that uvicorn uses `--host 0.0.0.0`, and that the VM firewall allows 8000.
- Check `frontend/.env` has the full API URL including `/api`, then restart
  `npm run dev`.

**Browser console reports a CORS error.**

- Set `CORS_ORIGINS=*` in `backend/.env` while testing, or add the exact browser
  origin (including scheme and port) to the comma-separated list.
- Restart the API after changing `.env`.

**PostgreSQL authentication or connection fails.**

- Verify the password and database name in `DATABASE_URL`.
- Test with `psql "postgresql://labassets:PASSWORD@127.0.0.1:5432/labassets" -c 'SELECT 1;'`.
- Confirm PostgreSQL is running: `sudo systemctl status postgresql`.
- If you changed `pg_hba.conf`, reload with `sudo systemctl reload postgresql`.

**Demo data is missing.**

- Check `AUTO_SEED=true`; otherwise run `python -m app.seed`.
- To start over, run `python -m app.seed --reset`.

**Login rejects `admin@lab.local`.**

The current demo domain is `labassets.edu`; use `admin@labassets.edu` and the
password shown in the table above.

---

## Notes and limitations

- Tables are created automatically with SQLAlchemy. For a production deployment
  that needs controlled schema changes, add Alembic migrations.
- JWTs are stored in browser `localStorage`. This is appropriate for a
  laboratory/demo deployment; review it against your institution's security
  policy before exposing the system publicly.
- The default `SECRET_KEY` and demo passwords are development values. Replace
  them before using the system outside a controlled laboratory network.
