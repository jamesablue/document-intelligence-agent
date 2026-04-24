# Document Intelligence Agent

A full-stack monorepo for uploading and interacting with government documents via an AI agent.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular (module-based, CSS, no SSR) |
| Backend | Express + Node.js + TypeScript |
| Database | PostgreSQL 16 with pgvector extension |
| ORM | Prisma 7 |
| Runtime | tsx (TypeScript ESM runner) |
| Infrastructure | Docker (database only) |

## Monorepo Structure

```
document-intelligence-agent/
├── angular-client/       # Angular frontend (port 4200)
└── express-api/          # Express backend (port 3000)
    ├── src/
    │   └── index.ts      # App entry point
    ├── prisma/
    │   └── schema.prisma # Database models
    ├── prisma.config.ts   # Prisma 7 connection config
    ├── docker-compose.yml # Postgres container
    └── .env              # Local environment variables (not committed)
```

## Prerequisites

- Node.js 18+
- Docker Desktop (running)
- Angular CLI: `npm install -g @angular/cli`

---

## Starting the App

Each of the three services runs independently. Open a separate terminal tab for each.

### 1. Database

```bash
cd express-api
docker-compose up -d
```

This starts a PostgreSQL 16 container with the pgvector extension on port 5432. Data is persisted in a Docker volume (`pgdata`) so it survives container restarts.

To stop without wiping data:
```bash
docker-compose down
```

To stop and wipe all data:
```bash
docker-compose down -v
```

### 2. Backend

```bash
cd express-api
npx tsx src/index.ts
```

Starts the Express server on **http://localhost:3000**.

### 3. Frontend

```bash
cd angular-client
npm start
```

Starts the Angular dev server on **http://localhost:4200**.

---

## Verifying Everything Works

### Database is running
```bash
docker ps --filter name=express-api-db-1 --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
Expected: `express-api-db-1` listed as `Up` on port `5432`.

### User table exists
```bash
docker exec -it express-api-db-1 psql -U postgres -d docagent -c "\d \"User\""
```
Expected: table with columns `id`, `email`, `googleId`, `createdAt`.

### Backend is responding
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok"}`

### Frontend is running

Open **http://localhost:4200** in a browser. Expected: default Angular welcome page.

---

## Database

### Connection details (local)

| Setting | Value |
|---|---|
| Host | localhost |
| Port | 5432 |
| User | postgres |
| Password | postgres |
| Database | docagent |

Connection string: `postgresql://postgres:postgres@localhost:5432/docagent`

### Models

**User**

| Field | Type | Notes |
|---|---|---|
| id | String | Primary key, cuid() |
| email | String | Unique |
| googleId | String | Unique |
| createdAt | DateTime | Defaults to now() |

### Prisma commands

```bash
# Apply schema changes as a new migration
npx prisma migrate dev --name <migration-name>

# Regenerate the Prisma client after schema changes
npx prisma generate

# Open Prisma Studio (visual database browser)
npx prisma studio
```

### How Prisma 7 config works

Prisma 7 no longer allows the database URL inside `schema.prisma`. Instead it lives in `prisma.config.ts`, which reads `DATABASE_URL` from `.env` via `dotenv/config`. The schema file defines only models and the generator.

---

## Environment Variables

`express-api/.env` is not committed to git. Its current contents:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/docagent"
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /health | Returns `{"status":"ok"}` — confirms the server is up |
