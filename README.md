# PlacementGPT

PlacementGPT is a RAG-based placement preparation assistant for students. It combines personal document retrieval with global interview prep knowledge to support four preparation modes: mock interview, resume review, company prep, and PYQ analysis.

## Live Demo
- App URL: https://your-app.vercel.app

## Screenshot
- Add screenshot here: docs/screenshot-placeholder.png

## Tech Stack

| Tool | Purpose |
| --- | --- |
| Next.js | Fullstack app framework |
| Tailwind CSS | UI styling |
| Clerk | Authentication and sessions |
| NeonDB (PostgreSQL) | Relational data storage |
| Drizzle ORM | Type-safe database access |
| Groq API (Llama 3.3 70B) | LLM inference |
| ChromaDB | Vector database |
| LangChain.js | RAG orchestration helpers |
| Cloudinary | File storage for uploaded PDFs |
| Vercel AI SDK | Streaming model responses |
| Axios | HTTP client |
| Railway | ChromaDB hosting |
| Vercel | Next.js deployment |
| GitHub Actions | CI/CD |

## Features
- Authenticated user dashboard and session tracking.
- File upload, parsing, embedding, and retrieval.
- Four AI modes:
  - Mock Interview
  - Resume Review
  - Company Prep
  - PYQ Analyzer
- Weak-area tracking with auto-detection from interview feedback.
- Hybrid retrieval from personal and global collections.
- Data ingestion pipeline for external interview prep sources.

## Local Development Setup

### Prerequisites
- Node.js 20+
- npm 10+
- Python 3.11+ (for local ChromaDB)

### 1. Clone
```bash
git clone https://github.com/your-username/placementgpt.git
cd placementgpt
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment variables
```bash
cp .env.example .env.local
```
Fill values in .env.local.

### 4. Start ChromaDB locally
```bash
pip install chromadb
chroma run --path ./chroma_db
```

### 5. Run Drizzle migrations
```bash
npm run db:push
```

### 6. Run ingestion pipeline
```bash
npm run pipeline
```

### 7. Start dev server
```bash
npm run dev
```

## Deployment Guide

### Deploy ChromaDB on Railway
1. Create Railway project from this repo.
2. Use Dockerfile.chroma and railway.toml.
3. Add persistent volume mounted to /chroma_db.
4. Deploy and copy service URL.
5. Set CHROMA_URL in Vercel to Railway URL.

### Deploy Next.js on Vercel
1. Import repo on Vercel.
2. Framework preset: Next.js.
3. Add environment variables from .env.example.
4. Deploy and note production URL.

### Configure Clerk for production
1. Add production domain in Clerk dashboard.
2. Update redirect URLs to production domain.
3. Use production Clerk keys in Vercel env variables.

### Run production migrations
```bash
DATABASE_URL=your_neon_url npm run db:push
```

### Run production ingestion
```bash
CHROMA_URL=your_railway_url npm run pipeline
```

## API Documentation

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| GET | /api/health | No | - | Overall service status |
| POST | /api/auth/sync | Yes | - | Sync user to DB |
| POST | /api/upload | Yes | multipart form | Uploaded record + parsed text |
| POST | /api/embed | Yes | documentId, parsedText, title, type, company | Chunks stored |
| GET | /api/documents | Yes | - | User documents and resumes |
| DELETE | /api/documents/:id | Yes | - | Delete success |
| POST | /api/chat | Yes | message, mode, company, role, sessionId | Streamed assistant response |
| GET | /api/chat/history | Yes | query sessionId optional | Session messages or last 5 sessions |
| GET | /api/dashboard/stats | Yes | - | Dashboard stats |
| GET | /api/dashboard/sessions | Yes | - | Last 5 sessions summary |
| GET | /api/weak-areas | Yes | - | Weak areas list |
| POST | /api/weak-areas | Yes | topic | Upserted weak area |
| DELETE | /api/weak-areas/:id | Yes | - | Delete success |
| POST | /api/admin/ingest | Admin key | source, company | Streaming ingestion logs |

## Project Structure

```text
app/
  api/
  (auth)/
  (dashboard)/
components/
  chat/
  dashboard/
  upload/
lib/
  chromadb.ts
  embeddings.ts
  globalRag.ts
  rag.ts
scripts/
  scrape-gfg.ts
  scrape-ambitionbox.ts
  scrape-github.ts
  clean-data.ts
  ingest.ts
  pre-deploy-check.ts
data/
  raw/
  processed/
```

## Contributing
1. Create a feature branch.
2. Run checks before PR:
```bash
npm run lint
npm run type-check
npm run pre-deploy
```
3. Open PR to main.

## License
MIT
