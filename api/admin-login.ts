import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

interface AuthUser {
  id: string;
  email: string;
}

interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: AuthUser;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
    if (!SUPABASE_URL || !ANON_KEY) return response.status(503).json({ error: 'Admin sign-in is not configured.' });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' };

    let tokenRes: Response;
    if (body.action === 'refresh') {
      const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : '';
      if (!refreshToken) return response.status(400).json({ error: 'A refresh token is required.' });
      tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } else {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || !password) return response.status(400).json({ error: 'Enter your email and password.' });
      tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password }),
      });
    }

    if (!tokenRes.ok) {
      if (tokenRes.status === 400) return response.status(401).json({ error: 'Invalid email or password.' });
      throw new Error(`Auth endpoint failed: ${tokenRes.status}`);
    }

    const tokens = (await tokenRes.json()) as AuthTokenResponse;
    return response.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      user: { id: tokens.user.id, email: tokens.user.email },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return response.status(500).json({ error: 'Admin sign-in is temporarily unavailable.' });
  }
}
