# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

Three services run independently — start each in its own terminal:

```bash
# 1. Database (PostgreSQL 16 + pgvector in Docker)
cd express-api && docker-compose up -d

# 2. Backend (Express on port 3000)
cd express-api && npx tsx src/index.ts

# 3. Frontend (Angular on port 4200)
cd angular-client && npm start
```

To stop without wiping data: `docker-compose down`  
To wipe all data: `docker-compose down -v`

## Backend dev commands

All run from `express-api/`:

```bash
# Run the server
npx tsx src/index.ts

# Prisma: apply a new migration
npx prisma migrate dev --name <migration-name>

# Prisma: regenerate client after schema changes
npx prisma generate

# Prisma: open database browser
npx prisma studio
```

There are no tests yet (`npm test` exits with an error).

## Frontend dev commands

All run from `angular-client/`:

```bash
npm start          # dev server on :4200
npm run build      # production build
ng test            # Karma unit tests
```

## Architecture

### Backend (`express-api/`)

The backend is a TypeScript Express 5 app run directly with `tsx` (no build step). Prisma 7 uses the `@prisma/adapter-pg` driver adapter — database URL lives in `prisma.config.ts` (not in `schema.prisma`), which reads `DATABASE_URL` from `.env`.

**Document ingestion pipeline** (triggered in the background after upload):
1. `POST /upload` → upload file to S3, create `Document` record (PENDING), extract text synchronously (EXTRACTED), then fire-and-forget `processDocument()`
2. `processDocument()` in `src/services/processing.ts` → chunks text (CHUNKING → CHUNKED), then embeds each chunk via AWS Bedrock (EMBEDDING → READY / ERROR)
3. Chunking: `gpt-tokenizer` at 512 tokens with 64-token overlap (`src/services/chunking.ts`)
4. Embedding: AWS Bedrock Titan Text Embeddings V2, 1024-dimensional vectors stored in pgvector via raw SQL (`src/services/embedding.ts`)

**RAG query** (`POST /chat` → `src/services/rag.ts`):
- Embeds query with Bedrock Titan, cosine similarity search via pgvector (`<=>` operator), retrieves top 5 chunks user-scoped, sends to Claude Sonnet via Bedrock Converse API

**Auth flow**: Google OAuth 2.0 via Passport → JWT signed with `JWT_SECRET`, returned as query param to Angular `/auth/callback`. `requireAuth` middleware validates the Bearer token on all protected routes, attaching `{ userId, email }` to `req.user`.

**pgvector limitation**: Prisma doesn't support the `vector` type natively, so `embedding` is `Unsupported("vector(1024)")` in the schema and all reads/writes use `$executeRawUnsafe` / `$queryRawUnsafe`.

### Frontend (`angular-client/`)

Angular 18, module-based (not standalone), no SSR. The `AuthService` holds the JWT in memory only (not persisted to localStorage) — refreshing the page logs the user out. An `authGuard` protects `/dashboard`, `/documents`, and `/chat`.

The `DocumentsComponent` polls `GET /documents` every 3 seconds to track processing status.

## Environment variables

`express-api/.env` (not committed):

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/docagent"
CORS_ORIGIN=http://localhost:4200
JWT_SECRET=<secret>
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET_NAME=<bucket>
```

## Key constraints

- **Supported file types**: `.pdf` and `.docx` only (enforced in `extractText()` — other types throw)
- **Document ownership**: all queries filter by `userId` from the JWT; users only see their own documents
- **No TypeScript build step on backend**: `tsx` runs `.ts` files directly; imports use `.js` extensions (ESM convention with `"type": "module"`)
