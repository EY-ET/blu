import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(_request: VercelRequest, response: VercelResponse) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Supabase is not configured.');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback_submissions?select=id&limit=1`, {
      method: 'HEAD',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!res.ok) throw new Error(`Supabase ping failed: ${res.status}`);
    return response.json({ status: 'ok' });
  } catch (error) {
    console.error('Health check failed:', error);
    return response.status(500).json({ status: 'error' });
  }
}
