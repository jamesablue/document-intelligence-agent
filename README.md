# Document Intelligence Agent

A full-stack monorepo for uploading and interacting with government documents via an AI agent.

## Current Status

_Last updated: 2026-10-18_

**Working:** Google sign-in, upload to S3, PDF/DOCX text extraction, background chunking and embedding (Titan to pgvector), documents list with live status, and a tool-calling agent on Bedrock Converse (`search_documents`, `summarize_document`) whose tool calls and markdown answers show in the chat UI. Backend unit tests run offline with `npm test` in `express-api/`.

**Next up:**
1. [#17](https://github.com/jamesablue/document-intelligence-agent/issues/17) GitHub Actions CI for typecheck, tests and build
2. [#16](https://github.com/jamesablue/document-intelligence-agent/issues/16) DB integration tests with real pgvector, including per-user scoping
3. [Opportunity discovery](https://github.com/jamesablue/document-intelligence-agent/milestone/3) milestone

**Backlog:** [auth persistence, conversation memory and streaming](https://github.com/jamesablue/document-intelligence-agent/milestone/2), plus more test coverage in [#18](https://github.com/jamesablue/document-intelligence-agent/issues/18)–[#20](https://github.com/jamesablue/document-intelligence-agent/issues/20).

Design notes and decisions live in [`_dev-notes/`](_dev-notes/). Update this section at the end of each work session.

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

- Node.js 24 (pinned in [`.nvmrc`](.nvmrc); run `nvm use` from the repo root)
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

### Backend tests pass
```bash
cd express-api
npm test
```
Expected: all Vitest suites pass. They need no database, network or AWS credentials (Bedrock is mocked with `aws-sdk-client-mock`). Use `npm run test:watch` while developing.

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

Routes marked **Bearer** require an `Authorization: Bearer <token>` header, where the token is the JWT issued by the Google sign-in flow (valid for 7 days). A missing or invalid token returns `401 {"error": "Missing token"}` or `401 {"error": "Invalid token"}`. All data is scoped to the user in the token.

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/health` | none | — | `{"status":"ok"}` |
| GET | `/auth/google` | none | — | Redirects to Google's consent screen |
| GET | `/auth/google/callback` | none | Google's redirect | Redirects to `<client>/auth/callback?token=<JWT>`, or to `<client>/login?error=auth_failed` on failure |
| POST | `/upload` | Bearer | `multipart/form-data` with a `file` field (`.pdf` or `.docx`) | `{"documentId": "<id>"}`. Chunking and embedding continue in the background. |
| GET | `/documents` | Bearer | — | `[{id, filename, status, createdAt, _count: {chunks}}]`, newest first |
| GET | `/documents/:id` | Bearer | — | `{id, filename, status, createdAt, chunks: [{id, chunkIndex, content}]}`, or `404 {"error": "Document not found"}` |
| POST | `/chat` | Bearer | `{"query": "<question>"}` | `{"answer": "<text>", "toolCalls": [{"tool": "<name>", "input": {...}}]}`, or `400 {"error": "query is required"}` |

**Document status** moves through `PENDING → EXTRACTED → CHUNKING → CHUNKED → EMBEDDING → READY`, or ends in `ERROR`. `summarize_document` only works on `READY` documents, and search only returns chunks that have been embedded.

---

## Agent Architecture

`POST /chat` hands the query to `runAgent()` (`express-api/src/agent/loop.ts`), which runs a tool-use loop on the AWS Bedrock Converse API (Claude Sonnet):

1. Send the conversation and the registered tool specs to the model.
2. If the model asks to call tools, run each one, append the results to the conversation, and go back to step 1.
3. Otherwise return the model's text as `answer`, along with every tool call it made as `toolCalls`.

The loop stops after `MAX_TURNS` (10) model calls and returns a fallback message. A tool that throws returns its error to the model as an error result instead of failing the request. Each request starts fresh, with no conversation memory yet.

| Tool | What it does |
|---|---|
| `search_documents` | Semantic search: embeds the query with Titan, runs a pgvector cosine search over the user's chunks, and returns up to 10 chunks (default 5) with document ID, filename, and similarity |
| `summarize_document` | Returns one document's full text (truncated to about 8000 characters) for summarizing or comparing; takes a document ID from `search_documents` |
| `ping` | Test tool used to prove the loop works |

Every tool receives `{ userId }` from the JWT and must scope its queries to it. To add a tool, implement the `AgentTool` interface (`agent/tools/types.ts`), put it in `agent/tools/`, and register it in `agent/tools/index.ts`.

For the design rationale (why Bedrock Converse rather than the Anthropic SDK, and the build order), see [`_dev-notes/week-03-agent-loop.md`](_dev-notes/week-03-agent-loop.md).
