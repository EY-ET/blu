import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildFeedbackCsv,
  parseFeedbackLimit,
  staffTokenError,
  validateFeedbackSubmission,
} from './feedback-core';
import { createSqliteStore } from './sqlite-store';

const app = express();
const port = Number(process.env.PORT || 3001);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databasePath = path.resolve(process.env.FEEDBACK_DB_PATH || path.join(rootDir, 'data', 'blu-feedback.sqlite'));
const store = createSqliteStore(databasePath);

app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));

app.post('/api/feedback', async (request, response) => {
  const result = validateFeedbackSubmission(request.body);
  if ('error' in result) return response.status(400).json({ error: result.error });

  const entry = { id: randomUUID(), ...result, createdAt: new Date().toISOString() };
  await store.insertFeedback(entry);
  return response.status(201).json({ entry });
});

app.get('/api/feedback', async (request, response) => {
  const tokenError = staffTokenError(request.header('authorization'));
  if (tokenError === 'Feedback staff access is not configured.') return response.status(503).json({ error: tokenError });
  if (tokenError) return response.status(401).json({ error: tokenError });

  const limit = parseFeedbackLimit(request.query.limit);
  const entries = await store.listFeedback(limit);
  const summary = await store.feedbackSummary();
  return response.json({ entries, summary });
});

app.get('/api/feedback/export.csv', async (request, response) => {
  const tokenError = staffTokenError(request.header('authorization'));
  if (tokenError === 'Feedback staff access is not configured.') return response.status(503).json({ error: tokenError });
  if (tokenError) return response.status(401).json({ error: tokenError });

  const csv = buildFeedbackCsv(await store.listAllFeedback());
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', 'attachment; filename="laphto-mall-feedback.csv"');
  return response.send(csv);
});

const distDir = path.join(rootDir, 'dist');
app.use(express.static(distDir));
app.get('*', (_request, response) => response.sendFile(path.join(distDir, 'index.html')));

app.listen(port, '0.0.0.0', () => {
  console.log(`Blu app/API listening on port ${port}`);
});
