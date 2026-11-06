# LabAssets API

FastAPI backend for the OS 137 Computer Laboratory Asset Management System.

It provides JWT authentication, role-based access control, asset/laboratory/
category management, assignments and returns, maintenance work orders,
dashboard aggregates, CSV reports, user administration, and an activity log.

## Requirements

- Python 3.11 or newer (developed with 3.12)
- SQLite for the zero-setup demo, or PostgreSQL for the VirtualBox deployment
- No external services are required when using SQLite

## Local setup (SQLite)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The first startup creates `backend/lab_assets.db`, creates the tables, and seeds
the demo data when `AUTO_SEED=true` (the default).

- API root: <http://127.0.0.1:8000/>
- Health check: <http://127.0.0.1:8000/api/health>
- Swagger UI: <http://127.0.0.1:8000/docs>
- ReDoc: <http://127.0.0.1:8000/redoc>

## PostgreSQL setup (VirtualBox VM)

Install and configure PostgreSQL in the VM:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

sudo -u postgres psql <<'SQL'
CREATE USER labassets WITH PASSWORD 'change-this-password';
CREATE DATABASE labassets OWNER labassets;
GRANT ALL PRIVILEGES ON DATABASE labassets TO labassets;
SQL
```

Create the environment file:

```bash
cp .env.example .env
```

Set at least:

```dotenv
DATABASE_URL=postgresql+psycopg://labassets:change-this-password@127.0.0.1:5432/labassets
SECRET_KEY=replace-with-a-long-random-value
CORS_ORIGINS=*
```

The backend runs in the same VM as PostgreSQL, so PostgreSQL can keep listening
only on loopback; there is no need to expose port 5432. Expose only the API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

If a firewall is enabled:

```bash
sudo ufw allow 8000/tcp
```

Verify from the host/WSL environment:

```bash
curl http://<vm-ip>:8000/api/health
```

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///backend/lab_assets.db` | Database connection URL. |
| `SECRET_KEY` | development value | JWT signing key. Replace outside demos. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `720` | Token lifetime in minutes. |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins. Use `*` while testing across machines. |
| `AUTO_SEED` | `true` | Seed demo data on startup if the database is empty. |
| `ENVIRONMENT` | `development` | Reported by `/api/health`. |
| `ADMIN_PASSWORD` | `admin123` | Password for the demo administrator. |
| `DEMO_PASSWORD` | `labassets123` | Password for the demo technician/viewer. |

Copy `.env.example` to `.env`; values already present in the process
environment take precedence over the file.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@labassets.edu` | `admin123` |
| Technician | `tech@labassets.edu` | `labassets123` |
| Viewer | `viewer@labassets.edu` | `labassets123` |

## Seeding

```bash
# Seed only when the database has no users
python -m app.seed

# Drop all tables and recreate the demo data
python -m app.seed --reset
```

## Authentication

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@labassets.edu","password":"admin123"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')

curl http://127.0.0.1:8000/api/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

## Main endpoints

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/login`, `GET/PATCH /api/auth/me`, `POST /api/auth/change-password` |
| Dashboard | `GET /api/dashboard` |
| Assets | `GET/POST /api/assets`, `GET/PATCH/DELETE /api/assets/{id}` |
| Laboratories | `GET/POST /api/laboratories`, `GET/PATCH/DELETE /api/laboratories/{id}` |
| Categories | `GET/POST /api/categories`, `GET/PATCH/DELETE /api/categories/{id}` |
| Assignments | `GET/POST /api/assignments`, `PATCH/DELETE /api/assignments/{id}`, `POST /api/assignments/{id}/return` |
| Maintenance | `GET/POST /api/maintenance`, `GET/PATCH/DELETE /api/maintenance/{id}` |
| Reports | `GET /api/reports/summary`, `GET /api/reports/{assets,assignments,maintenance}.csv` |
| Users | `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/{id}` (admin only) |
| Activity | `GET /api/activity` (admin only) |

See `/docs` for request/response schemas and query parameters.

## Project layout

```text
app/
├── config.py       environment settings
├── database.py     engine, session factory, SQLite foreign-key support
├── deps.py         current-user and role dependencies
├── main.py         application, CORS, lifespan seeding, health check
├── models.py       SQLAlchemy ORM models
├── schemas.py      Pydantic schemas
├── security.py     PBKDF2 password hashing and JWT helpers
├── seed.py         demo data and reset CLI
├── services.py     shared serializers and activity logging
└── routers/        one module per API area
```

## Notes

- SQLAlchemy `create_all()` creates tables on startup. Add Alembic if you need
  versioned migrations.
- Passwords use PBKDF2-HMAC-SHA256 with per-password salts.
- Replace the default `SECRET_KEY` and demo passwords before any non-demo use.
