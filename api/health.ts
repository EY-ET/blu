import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseStore } from '../server/supabase-store';

const store = createSupabaseStore();

export default async function handler(_request: VercelRequest, response: VercelResponse) {
  try {
    await store.ping();
    return response.json({ status: 'ok' });
  } catch (error) {
    console.error('Health check failed:', error);
    return response.status(500).json({ status: 'error' });
  }
}
