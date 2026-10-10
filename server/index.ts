import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildFeedbackCsv,
  parseFeedbackLimit,
  validateFeedbackSubmission,
} from './feedback-core';
import { createSqliteStore } from './sqlite-store';

const app = express();
const port = Number(process.env.PORT || 3001);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databasePath = path.resolve(process.env.FEEDBACK_DB_PATH || path.join(rootDir, 'data', 'blu-feedback.sqlite'));
const store = createSqliteStore(databasePath);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

app.use(express.json({ limit: '20kb' }));

const requireAdmin: express.RequestHandler = async (request, response, next) => {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return response.status(503).json({ error: 'Admin access is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
  }
  if (!token) return response.status(401).json({ error: 'Sign in with a valid admin account.' });
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return response.status(401).json({ error: 'Sign in with a valid admin account.' });
    return next();
  } catch {
    return response.status(500).json({ error: 'Admin access check failed.' });
  }
};

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));

app.post('/api/admin-login', async (request, response) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return response.status(503).json({ error: 'Admin sign-in is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.' });
  }
  const body = request.body as { action?: string; email?: string; password?: string; refreshToken?: string };
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
  try {
    const grant = body.action === 'refresh'
      ? { url: `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, payload: { refresh_token: body.refreshToken || '' } }
      : { url: `${SUPABASE_URL}/auth/v1/token?grant_type=password`, payload: { email: body.email, password: body.password } };
    const res = await fetch(grant.url, { method: 'POST', headers, body: JSON.stringify(grant.payload) });
    if (!res.ok) return response.status(res.status === 400 ? 401 : res.status).json({ error: res.status === 400 ? 'Invalid email or password.' : 'Auth endpoint failed.' });
    const tokens = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number; user: { id: string; email: string } };
    return response.json({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresIn: tokens.expires_in, user: { id: tokens.user.id, email: tokens.user.email } });
  } catch {
    return response.status(500).json({ error: 'Admin sign-in is temporarily unavailable.' });
  }
});

app.post('/api/admin-logout', async (request, response) => {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (SUPABASE_URL && token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY || '', Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  return response.json({ signedOut: true });
});

app.post('/api/feedback', async (request, response) => {
  const result = validateFeedbackSubmission(request.body);
  if ('error' in result) return response.status(400).json({ error: result.error });

  const entry = { id: randomUUID(), ...result, createdAt: new Date().toISOString() };
  await store.insertFeedback(entry);
  return response.status(201).json({ entry });
});

app.get('/api/feedback', requireAdmin, async (request, response) => {
  const limit = parseFeedbackLimit(request.query.limit);
  const entries = await store.listFeedback(limit);
  const summary = await store.feedbackSummary();
  return response.json({ entries, summary });
});

app.get('/api/feedback/export.csv', requireAdmin, async (_request, response) => {
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
