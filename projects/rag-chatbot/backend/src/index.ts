import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import ingestRouter from './routes/ingest';
import chatRouter from './routes/chat';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/ingest', ingestRouter);
app.use('/api/chat', chatRouter);

// Start server (skip when imported by test runner)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`RAG Chatbot backend running on http://localhost:${PORT}`);
  });
}

export default app;
