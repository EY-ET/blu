import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
    if (!token) return response.status(401).json({ error: 'Not signed in.' });
    if (!SUPABASE_URL || !SERVICE_KEY) return response.status(503).json({ error: 'Admin sign-in is not configured.' });

    const res = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) console.warn(`Logout endpoint returned ${res.status}`);
    return response.json({ signedOut: true });
  } catch (error) {
    console.error('Admin logout error:', error);
    return response.status(500).json({ error: 'Sign-out is temporarily unavailable.' });
  }
}
