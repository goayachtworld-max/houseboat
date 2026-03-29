# Houseboat — Deployment Guide

**Architecture:**
```
Browser → cPanel (static React build)
              ↓ API calls (HTTPS)
         VPS (Express + Node.js)
              ↓ SQL
         cPanel (MySQL)
```

---

## Prerequisites

| Where | What |
|-------|------|
| Your machine | Node.js 18+, pnpm (`npm i -g pnpm`) |
| VPS | Node.js 24, PM2 (`npm i -g pm2`), PostgreSQL **or** MySQL |
| cPanel | MySQL database + user created, File Manager access |

> **Database note:** The app currently uses PostgreSQL via Drizzle ORM.
> If your cPanel MySQL is the DB target, see Phase 1 (DB Migration) —
> that is a separate task. For now this guide assumes you run PostgreSQL
> on the VPS itself (simplest setup) and cPanel MySQL is for future migration.

---

## Part 1 — Build & Deploy the Frontend (cPanel)

### 1.1 Set environment variables

```bash
# Inside  artifacts/houseboat/
cp .env.example .env.production
```

Edit `.env.production`:
```
VITE_API_URL=https://api.yourdomain.com   # your VPS backend URL — no trailing slash
BASE_PATH=/                                # change if deploying to a subdirectory
```

### 1.2 Install dependencies & build

Run from the **repo root**:

```bash
pnpm install
pnpm --filter @workspace/houseboat build
```

Build output is at:
```
artifacts/houseboat/dist/public/
```

### 1.3 Upload to cPanel

1. Zip the contents of `artifacts/houseboat/dist/public/` (not the folder itself — zip its **contents**)
2. In cPanel → **File Manager** → navigate to `public_html/` (or your domain's document root)
3. Upload and extract the zip there
4. Your `index.html` must be directly inside `public_html/`

### 1.4 Configure cPanel for React Router (SPA routing)

Create a `.htaccess` file in `public_html/` with:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
```

This ensures that refreshing `/packages` or `/admin/login` doesn't 404.

---

## Part 2 — Deploy the Backend (VPS)

### 2.1 Clone the repo on VPS

```bash
git clone https://github.com/goayachtworld-max/houseboat.git
cd houseboat
```

### 2.2 Install dependencies

```bash
npm install -g pnpm
pnpm install
```

### 2.3 Set environment variables

```bash
cd artifacts/api-server
cp .env.example .env
nano .env
```

Fill in `.env`:
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://dbuser:dbpassword@localhost:5432/houseboat_db
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
LOG_LEVEL=info
```

> **CORS_ORIGIN** must exactly match what the browser sends as the `Origin` header.
> Check your browser DevTools → Network tab if login/API calls are blocked.

### 2.4 Build the backend

From repo root:
```bash
pnpm --filter @workspace/api-server build
```

Output: `artifacts/api-server/dist/index.mjs`

### 2.5 Run database migrations

```bash
# From repo root — pushes schema to your DB
pnpm --filter @workspace/db exec drizzle-kit push
```

Or if you want proper migration files:
```bash
pnpm --filter @workspace/db exec drizzle-kit generate
pnpm --filter @workspace/db exec drizzle-kit migrate
```

### 2.6 Start with PM2

```bash
cd artifacts/api-server

# Start
pm2 start dist/index.mjs --name houseboat-api \
  --env production \
  --interpreter node

# Save so it restarts on reboot
pm2 save
pm2 startup
```

Check it's running:
```bash
pm2 status
pm2 logs houseboat-api
```

### 2.7 Point a subdomain at the VPS API (Nginx reverse proxy)

Add to your Nginx config (e.g. `/etc/nginx/sites-available/api.yourdomain.com`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:
```bash
ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Then get SSL (required — cookies need HTTPS in production):
```bash
certbot --nginx -d api.yourdomain.com
```

---

## Part 3 — Verify Everything Works

### Checklist

- [ ] `https://api.yourdomain.com/api/health` returns `{"ok":true}` (or similar)
- [ ] `https://yourdomain.com` loads the React app
- [ ] `https://yourdomain.com/packages` loads without 404 on refresh
- [ ] `https://yourdomain.com/admin/login` — login works (cookie set)
- [ ] Admin dashboard loads data from VPS API
- [ ] Browser DevTools → Network → no CORS errors

### Common issues

| Symptom | Fix |
|---------|-----|
| CORS error in browser | Check `CORS_ORIGIN` in backend `.env` matches your cPanel domain exactly |
| Login works but session lost on refresh | Cookie `sameSite=none` requires HTTPS on both ends. Ensure SSL on VPS subdomain |
| 404 on page refresh | Add the `.htaccess` RewriteRule (Part 1.4) |
| API returns 502 | PM2 process crashed — run `pm2 logs houseboat-api` |
| `DATABASE_URL` error on start | Verify PostgreSQL is running and credentials are correct |

---

## Part 4 — Updating After Code Changes

### Frontend update
```bash
# Edit code, then:
pnpm --filter @workspace/houseboat build
# Re-upload artifacts/houseboat/dist/public/ to cPanel
```

### Backend update
```bash
pnpm --filter @workspace/api-server build
pm2 restart houseboat-api
```

---

## Environment Variables Reference

### Frontend (`artifacts/houseboat/.env.production`)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | ✅ | `https://api.yourdomain.com` | VPS backend origin |
| `BASE_PATH` | optional | `/` | Vite base path (if in subdirectory) |

### Backend (`artifacts/api-server/.env`)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ | `production` | Enables secure cookies, disables dev logging |
| `PORT` | ✅ | `3001` | Port Express listens on |
| `DATABASE_URL` | ✅ | `postgresql://...` | DB connection string |
| `CORS_ORIGIN` | ✅ | `https://yourdomain.com` | Allowed frontend origin(s), comma-separated |
| `LOG_LEVEL` | optional | `info` | Pino log level |
