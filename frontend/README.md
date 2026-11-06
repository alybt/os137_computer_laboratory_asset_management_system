# LabAssets Frontend

React 19 + Vite + Tailwind CSS v4 client for the OS 137 Computer Laboratory
Asset Management System.

It provides the login screen, dashboard, inventory, assignment, maintenance,
laboratory, category, report, user-management, activity-log, and settings
interfaces. Access is controlled by the role returned from the API.

## Requirements

- Node.js 20+ and npm
- A running LabAssets API (see [`../backend/README.md`](../backend/README.md))

## Local setup

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

By default the app calls `/api`, and the Vite dev server proxies that to
`http://127.0.0.1:8000`. This means the quick-start setup needs **no `.env`
file** when the API is running locally on port 8000.

## Configuration

Copy `.env.example` to `.env` when the API is not on the local machine:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Full API base URL, including `/api`. For the VM deployment: `http://192.168.1.50:8000/api`. |
| `VITE_PROXY_TARGET` | `http://127.0.0.1:8000` | Target for the dev-server proxy. Only used while `VITE_API_URL` is left at `/api`. |

Restart the dev server after changing environment variables.

### Split deployment (WSL/Distrobox → VirtualBox)

```dotenv
VITE_API_URL=http://<vm-ip>:8000/api
```

The backend must be started with `--host 0.0.0.0` and must allow the browser
origin through `CORS_ORIGINS`. The browser calls the VM directly, so the VM
firewall must allow TCP 8000. See the root [`README.md`](../README.md) for the
full deployment walkthrough.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@labassets.edu` | `admin123` |
| Technician | `tech@labassets.edu` | `labassets123` |
| Viewer | `viewer@labassets.edu` | `labassets123` |

## Scripts

```bash
npm run dev      # Vite dev server with HMR on 0.0.0.0:5173
npm run build    # production build in dist/
npm run preview  # serve the production build locally
npm run lint     # ESLint
```

`npm run lint` is configured to catch genuine unused variables/imports and
React issues. The remaining `react-hooks/set-state-in-effect` messages are
warnings for intentional data-loading and modal-reset effects.

## Production build

```bash
VITE_API_URL=http://<vm-ip>:8000/api npm run build
```

Serve the contents of `dist/` with any static web server. The API URL is baked
into the build, so rebuild whenever it changes.

## Source layout

```text
src/
├── components/    Layout, modal UI primitives, asset/assignment/maintenance forms
├── context/       AuthContext and ToastContext providers
├── lib/           API client, constants, currency/date formatters
├── pages/         one page per feature area
├── App.jsx        routes and role guards
├── main.jsx       application entry point
└── index.css      Tailwind v4 theme and component classes
```
