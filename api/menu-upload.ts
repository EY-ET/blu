import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });

    const expectedToken = process.env.FEEDBACK_ADMIN_TOKEN;
    if (!expectedToken) return response.status(503).json({ error: 'Staff access is not configured.' });
    const suppliedToken = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (suppliedToken !== expectedToken) return response.status(401).json({ error: 'Enter a valid staff access token.' });
    if (!SUPABASE_URL || !SERVICE_KEY) return response.status(500).json({ error: 'Menu service is not configured.' });

    const body = (request.body ?? {}) as { dataUrl?: unknown; filename?: unknown };
    const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : '';
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) return response.status(400).json({ error: 'Provide a base64 JPEG, PNG, or WebP image.' });

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      return response.status(400).json({ error: 'Image must be between 1 byte and 4 MB.' });
    }

    const slug = (typeof body.filename === 'string' ? body.filename : 'image')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image';
    const objectPath = `${Date.now()}-${slug}.${ALLOWED_TYPES[mimeType]}`;

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/menu-images/${objectPath}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': mimeType,
        'x-upsert': 'false',
      },
      body: new Uint8Array(buffer),
    });
    if (!uploadRes.ok) throw new Error(`Storage upload failed: ${uploadRes.status} ${await uploadRes.text()}`);

    return response.status(201).json({ url: `${SUPABASE_URL}/storage/v1/object/public/menu-images/${objectPath}` });
  } catch (error) {
    console.error('Menu image upload error:', error);
    return response.status(500).json({ error: 'Image upload failed.' });
  }
}
