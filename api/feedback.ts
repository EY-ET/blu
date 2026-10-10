import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface FeedbackEntry {
  id: string;
  name: string;
  email: string | null;
  rating: number;
  message: string;
  createdAt: string;
}

interface FeedbackExportRow extends FeedbackEntry {
  source: string;
}

interface SubmissionRow {
  id: string;
  name: string;
  email: string | null;
  rating: number;
  message: string;
  created_at: string;
}

interface ExportRow extends SubmissionRow {
  source: string;
}

function supabaseHeaders(): Record<string, string> {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Feedback service is not configured.');
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
}

function validateFeedbackSubmission(body: unknown): { name: string; email: string | null; rating: number; message: string } | { error: string } {
  const record = (body ?? {}) as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const email = typeof record.email === 'string' ? record.email.trim() : '';
  const message = typeof record.message === 'string' ? record.message.trim() : '';
  const rating = Number(record.rating);

  if (!name || name.length > 120) return { error: 'Enter a name under 120 characters.' };
  if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: 'Enter a valid email address.' };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Choose a rating from 1 to 5.' };
  }
  if (!message || message.length > 5000) return { error: 'Enter a comment under 5,000 characters.' };

  return { name, email: email || null, rating, message };
}

function staffTokenError(authorization: string | undefined | null): string | null {
  const expectedToken = process.env.FEEDBACK_ADMIN_TOKEN;
  const suppliedToken = authorization?.replace(/^Bearer\s+/i, '');
  if (!expectedToken) return 'Feedback staff access is not configured.';
  if (suppliedToken !== expectedToken) return 'Enter a valid staff access token.';
  return null;
}

function parseFeedbackLimit(rawLimit: unknown): number {
  const parsedLimit = Number(rawLimit || 100);
  if (!Number.isFinite(parsedLimit)) return 100;
  return Math.min(Math.max(Math.floor(parsedLimit), 1), 500);
}

function toEntry(row: SubmissionRow): FeedbackEntry {
  return { id: row.id, name: row.name, email: row.email, rating: row.rating, message: row.message, createdAt: row.created_at };
}

function buildFeedbackCsv(entries: FeedbackExportRow[]): string {
  const escapeCsv = (value: string | number | null) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const columns = ['id', 'name', 'email', 'rating', 'message', 'source', 'createdAt'];
  const lines = [columns.join(','), ...entries.map((entry) => columns.map((column) => escapeCsv(entry[column as keyof FeedbackExportRow])).join(','))];
  return lines.join('\r\n');
}

async function fetchFeedbackPage(offset: number): Promise<ExportRow[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/feedback_submissions?select=id,name,email,rating,message,source,created_at&order=created_at.desc&limit=1000&offset=${offset}`,
    { headers: supabaseHeaders() },
  );
  if (!res.ok) throw new Error(`Supabase select failed: ${res.status}`);
  return (await res.json()) as ExportRow[];
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const url = new URL(request.url || '/api/feedback', `https://${request.headers.host || 'blu.local'}`);
  const isCsvExport = url.searchParams.get('export') === 'csv' || url.pathname === '/api/feedback/export.csv';

  try {
    if (isCsvExport && request.method === 'GET') {
      const tokenError = staffTokenError(request.headers.authorization);
      if (tokenError === 'Feedback staff access is not configured.') return response.status(503).json({ error: tokenError });
      if (tokenError) return response.status(401).json({ error: tokenError });

      const rows: FeedbackExportRow[] = [];
      for (let offset = 0; ; offset += 1000) {
        const page = await fetchFeedbackPage(offset);
        rows.push(...page.map((row) => ({ ...toEntry(row), source: row.source })));
        if (page.length < 1000) break;
      }
      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
      response.setHeader('Content-Disposition', 'attachment; filename="laphto-mall-feedback.csv"');
      return response.send(buildFeedbackCsv(rows));
    }

    if (request.method === 'POST') {
      const result = validateFeedbackSubmission(request.body);
      if ('error' in result) return response.status(400).json({ error: result.error });

      const entry = { id: randomUUID(), ...result, createdAt: new Date().toISOString() };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback_submissions`, {
        method: 'POST',
        headers: { ...supabaseHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ id: entry.id, name: entry.name, email: entry.email, rating: entry.rating, message: entry.message, created_at: entry.createdAt }),
      });
      if (!res.ok) throw new Error(`Supabase insert failed: ${res.status}`);
      return response.status(201).json({ entry });
    }

    if (request.method === 'GET') {
      const tokenError = staffTokenError(request.headers.authorization);
      if (tokenError === 'Feedback staff access is not configured.') return response.status(503).json({ error: tokenError });
      if (tokenError) return response.status(401).json({ error: tokenError });

      const limit = parseFeedbackLimit(url.searchParams.get('limit'));
      const listRes = await fetch(
        `${SUPABASE_URL}/rest/v1/feedback_submissions?select=id,name,email,rating,message,created_at&order=created_at.desc&limit=${limit}`,
        { headers: supabaseHeaders() },
      );
      if (!listRes.ok) throw new Error(`Supabase select failed: ${listRes.status}`);
      const rows = (await listRes.json()) as SubmissionRow[];

      const summaryRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/feedback_summary`, {
        method: 'POST',
        headers: { ...supabaseHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!summaryRes.ok) throw new Error(`Supabase summary failed: ${summaryRes.status}`);
      const summaryData = await summaryRes.json();
      const summaryRow = Array.isArray(summaryData) ? summaryData[0] : summaryData;
      const summary = {
        total: Number(summaryRow?.total ?? 0),
        averageRating: summaryRow?.average_rating === null || summaryRow?.average_rating === undefined ? null : Number(summaryRow.average_rating),
      };

      return response.json({ entries: rows.map(toEntry), summary });
    }

    return response.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Feedback API error:', error);
    return response.status(500).json({ error: 'Feedback service is temporarily unavailable.' });
  }
}
