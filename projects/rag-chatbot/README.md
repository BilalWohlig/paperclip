# RAG Chatbot

A full-stack Retrieval-Augmented Generation (RAG) chatbot that answers questions grounded in a local PDF document.

**Stack:** Node.js + Express (backend) · PostgreSQL + pgvector (vector store) · OpenAI embeddings · Claude claude-sonnet-4-6 (LLM) · React + Vite (frontend)

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ with the `pgvector` extension
- An OpenAI API key (for embeddings)
- An Anthropic API key (for Claude chat)

### Install pgvector

**macOS (Homebrew):**
```bash
brew install pgvector
```

Or build from source:
```bash
git clone https://github.com/pgvector/pgvector.git
cd pgvector && make && make install
```

---

## Setup

### 1. Clone and install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start PostgreSQL

If PostgreSQL is not already running, start it first:

**macOS (Homebrew):**
```bash
# For the default postgres formula:
brew services start postgresql

# Or if you installed a versioned formula (e.g. postgresql@14):
brew services start postgresql@14
```

> **Check if it's running:** `pg_isready` should print `accepting connections`.

### 3. Create PostgreSQL database

```bash
createdb rag_chatbot
psql -d rag_chatbot -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql -d rag_chatbot -f backend/src/db/schema.sql
```

### 4. Configure environment variables

**Backend:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env:
#   DATABASE_URL=postgresql://localhost:5432/rag_chatbot
#   OPENAI_API_KEY=sk-...
#   ANTHROPIC_API_KEY=sk-ant-...
#   PORT=3001
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env
# Default: VITE_API_URL=http://localhost:3001
```

### 5. Generate the sample PDF

```bash
cd scripts
npm install
npx tsx generate-pdf.ts
# Produces: docs/ai-engineering-handbook.pdf
```

### 6. Ingest the sample document

```bash
curl -X POST http://localhost:3001/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/absolute/path/to/projects/rag-chatbot/docs/ai-engineering-handbook.pdf"}'
```

---

## Running the App

### Start the backend

```bash
cd backend
npm run dev
# Server starts on http://localhost:3001
```

### Start the frontend

```bash
cd frontend
npm run dev
# App opens on http://localhost:5173
```

Open http://localhost:5173 in your browser and start asking questions about the AI Engineering Handbook.

---

## Architecture

```
User question
     │
     ▼
Frontend (React/Vite :5173)
     │  POST /api/chat
     ▼
Backend (Express :3001)
     ├─ Embed query (OpenAI text-embedding-3-small)
     ├─ Retrieve top-5 chunks (pgvector cosine similarity)
     ├─ Build prompt with retrieved context
     └─ Stream response from Claude claude-sonnet-4-6 (SSE)
          │
          ▼
     Frontend renders tokens + collapses sources panel
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/ingest` | Parse PDF, embed chunks, store in pgvector |
| `POST` | `/api/chat` | Query → retrieve → stream Claude answer (SSE) |

### SSE Event Format

```
data: {"type": "chunk", "content": "token..."}
data: {"type": "sources", "sources": [{content, chunkIndex, sourceFile}]}
data: {"type": "done"}
```

---

## Project Structure

```
rag-chatbot/
├── backend/
│   ├── src/
│   │   ├── index.ts          Express server
│   │   ├── db/
│   │   │   ├── client.ts     PostgreSQL connection
│   │   │   └── schema.sql    pgvector table schema
│   │   ├── routes/
│   │   │   ├── chat.ts       /api/chat streaming endpoint
│   │   │   └── ingest.ts     /api/ingest endpoint
│   │   └── services/
│   │       ├── embedding.ts  OpenAI embeddings
│   │       ├── pdf.ts        PDF parsing + chunking
│   │       ├── retrieval.ts  pgvector similarity search
│   │       └── llm.ts        Claude streaming
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx           Chat UI
│   │   ├── main.tsx
│   │   └── components/
│   │       ├── ChatWindow.tsx
│   │       ├── MessageBubble.tsx
│   │       └── SourceChunks.tsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   └── generate-pdf.ts       Sample PDF generator
├── docs/
│   └── ai-engineering-handbook.pdf   (generated)
└── README.md
```
