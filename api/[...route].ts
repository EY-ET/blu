import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import {
  buildFeedbackCsv,
  parseFeedbackLimit,
  staffTokenError,
  validateFeedbackSubmission,
} from '../server/feedback-core';
import { createSupabaseStore } from '../server/supabase-store';

const store = createSupabaseStore();

function sendError(response: VercelResponse, status: number, message: string) {
  return response.status(status).json({ error: message });
}

function handleStaffAccess(request: VercelRequest, response: VercelResponse): boolean {
  const tokenError = staffTokenError(request.headers.authorization);
  if (tokenError === 'Feedback staff access is not configured.') {
    sendError(response, 503, tokenError);
    return false;
  }
  if (tokenError) {
    sendError(response, 401, tokenError);
    return false;
  }
  return true;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const url = new URL(request.url || '/api', `https://${request.headers.host || 'blu.local'}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/api';

  try {
    if (pathname === '/api/health' && request.method === 'GET') {
      await store.ping();
      return response.json({ status: 'ok' });
    }

    if (pathname === '/api/feedback' && request.method === 'POST') {
      const result = validateFeedbackSubmission(request.body);
      if ('error' in result) return sendError(response, 400, result.error);
      const entry = { id: randomUUID(), ...result, createdAt: new Date().toISOString() };
      await store.insertFeedback(entry);
      return response.status(201).json({ entry });
    }

    if (pathname === '/api/feedback' && request.method === 'GET') {
      if (!handleStaffAccess(request, response)) return;
      const limit = parseFeedbackLimit(url.searchParams.get('limit'));
      const entries = await store.listFeedback(limit);
      const summary = await store.feedbackSummary();
      return response.json({ entries, summary });
    }

    if (pathname === '/api/feedback/export.csv' && request.method === 'GET') {
      if (!handleStaffAccess(request, response)) return;
      const csv = buildFeedbackCsv(await store.listAllFeedback());
      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
      response.setHeader('Content-Disposition', 'attachment; filename="laphto-mall-feedback.csv"');
      return response.send(csv);
    }

    return sendError(response, 404, 'Not found.');
  } catch (error) {
    console.error('Feedback API error:', error);
    return sendError(response, 500, 'Feedback service is temporarily unavailable.');
  }
}
