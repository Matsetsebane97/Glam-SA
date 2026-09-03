# Glam SA

The project is split into a Vite React frontend and a Django Python backend.

## Run both

From the project root:

```powershell
npm install
npm run dev
```

This starts both services together and stops them together with `Ctrl+C`.

## Frontend

```powershell
Set-Location frontend
npm install
npm run dev
```

## Django backend

The Django API lives in `backend/` and uses **PostgreSQL**.

### 1. Database Setup

Ensure PostgreSQL is running and create the database (e.g. `glam_sa`):

```powershell
# Using psql or pgAdmin
CREATE DATABASE glam_sa;
```

Configure your database credentials in `backend/.env` (or copy from `backend/.env.example`):

```env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=glam_sa
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

### 2. Install dependencies & run migrations

```powershell
Set-Location backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Available endpoints:

- `GET /api/health/`
- `GET /api/categories/`
- `GET /api/posts/`
- `POST /api/posts/`

Vite proxies `/api` requests to Django on port `8000`.

## Deploy on Render

The included `render.yaml` deploys the Vite build and Django API as one web service backed by PostgreSQL.

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Review the generated `glam-sa` web service and database, then deploy.

Render supplies `DATABASE_URL` and `SECRET_KEY`. The service runs migrations and collects static files during each build.

### Supabase media storage

Create a Storage bucket named `media` in Supabase, then add these environment variables to the Render web service:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
SUPABASE_STORAGE_BUCKET=media
```

Keep `SUPABASE_SERVICE_ROLE_KEY` private and use the Supabase service-role key only on the Django backend. New uploads are stored in Supabase and returned as signed URLs; local uploads continue using Django media storage when these variables are absent.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
