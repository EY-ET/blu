import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { parseFeedbackLimit, staffTokenError, validateFeedbackSubmission } from '../server/feedback-core';
import { createSupabaseStore } from '../server/supabase-store';

const store = createSupabaseStore();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    if (request.method === 'POST') {
      const result = validateFeedbackSubmission(request.body);
      if ('error' in result) return response.status(400).json({ error: result.error });
      const entry = { id: randomUUID(), ...result, createdAt: new Date().toISOString() };
      await store.insertFeedback(entry);
      return response.status(201).json({ entry });
    }

    if (request.method === 'GET') {
      const tokenError = staffTokenError(request.headers.authorization);
      if (tokenError === 'Feedback staff access is not configured.') {
        return response.status(503).json({ error: tokenError });
      }
      if (tokenError) return response.status(401).json({ error: tokenError });

      const url = new URL(request.url || '/api/feedback', `https://${request.headers.host || 'blu.local'}`);
      const limit = parseFeedbackLimit(url.searchParams.get('limit'));
      const entries = await store.listFeedback(limit);
      const summary = await store.feedbackSummary();
      return response.json({ entries, summary });
    }

    return response.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Feedback API error:', error);
    return response.status(500).json({ error: 'Feedback service is temporarily unavailable.' });
  }
}
