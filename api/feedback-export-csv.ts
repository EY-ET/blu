import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildFeedbackCsv, staffTokenError } from '../server/feedback-core';
import { createSupabaseStore } from '../server/supabase-store';

const store = createSupabaseStore();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    const tokenError = staffTokenError(request.headers.authorization);
    if (tokenError === 'Feedback staff access is not configured.') {
      return response.status(503).json({ error: tokenError });
    }
    if (tokenError) return response.status(401).json({ error: tokenError });

    const csv = buildFeedbackCsv(await store.listAllFeedback());
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="laphto-mall-feedback.csv"');
    return response.send(csv);
  } catch (error) {
    console.error('Feedback CSV export error:', error);
    return response.status(500).json({ error: 'Feedback service is temporarily unavailable.' });
  }
}
