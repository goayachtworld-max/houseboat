# Shubhangi The Boat House

Full-stack luxury houseboat booking website built with React + Vite (frontend) and Express + Node.js (backend), targeting foreign tourists visiting Goa.

## Features

- Public website with packages, gallery, activities, events, blog & about pages
- WhatsApp & inquiry booking buttons
- Real-time live chat
- Currency switcher
- FAQ accordion
- Admin panel (bookings, inquiries, chat, content, gallery, activities, events, awards, FAQs, settings)
- Deployment configuration (PostgreSQL / MySQL, domain, image storage)

---

## Project Structure

```
.
├── artifacts/
│   ├── api-server/       # Express REST API (Node.js)
│   └── houseboat/        # React + Vite frontend
├── lib/
│   ├── db/               # Drizzle ORM schema & database client
│   ├── api-spec/         # OpenAPI spec
│   └── api-client-react/ # Auto-generated React Query hooks
└── .env.example          # Environment variable reference
```

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+ **or** MySQL 8+

---

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your database credentials, ports, etc.
```

### 3. Push database schema

```bash
pnpm --filter @workspace/db run push
```

### 4. Start development servers

In two separate terminals:

```bash
# Terminal 1 — API server (default port 8080)
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (default port 5173)
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/houseboat run dev
```

Open `http://localhost:5173` in your browser.

Admin panel: `http://localhost:5173/admin`
Default credentials: `admin` / `admin123`

---

## Production Build

```bash
# Build the frontend
PORT=80 BASE_PATH=/ pnpm --filter @workspace/houseboat run build

# Build the API server
pnpm --filter @workspace/api-server run build
```

The frontend static files will be in `artifacts/houseboat/dist/public/`.
The API server bundle will be in `artifacts/api-server/dist/`.

---

## cPanel / Shared Hosting Deployment

1. Upload `artifacts/houseboat/dist/public/` to your `public_html/` folder.
2. Run the API server via Node.js (PM2 recommended):
   ```bash
   PORT=8080 DATABASE_URL="mysql://..." node artifacts/api-server/dist/index.mjs
   ```
3. Configure your domain to proxy `/api/*` requests to the API server port.
4. In the admin panel → Settings → Deployment tab, set your MySQL credentials, domain, and image upload path.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL or MySQL connection string | — |
| `PORT` | Server port | `8080` (API) / `5173` (frontend) |
| `BASE_PATH` | Frontend base path | `/` |
| `SESSION_SECRET` | Cookie session secret | — |
| `UPLOAD_DIR` | Server path for image uploads | — |
| `UPLOAD_BASE_URL` | Public URL prefix for uploaded images | — |
