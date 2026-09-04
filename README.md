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

### Cloudinary media storage

Create a Cloudinary account, then add these environment variables to the Render web service:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Keep `CLOUDINARY_API_SECRET` private and use it only on the Django backend. New uploads are stored in Cloudinary and returned as permanent HTTPS URLs.

For the live Render service, all three Cloudinary variables are required. Production uploads are rejected when storage is not configured instead of being written to Render's temporary filesystem. Files uploaded locally or to the previous Supabase bucket must be uploaded again or migrated into Cloudinary.

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
