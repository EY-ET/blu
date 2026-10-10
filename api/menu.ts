import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface MenuRow {
  id: string;
  category: string;
  sub_category: string;
  title: string;
  description: string;
  price: string;
  image: string;
  is_vegan: boolean;
  is_available: boolean;
  sort_order: number;
}

export interface AdminMenuItem {
  id: string;
  category: string;
  subCategory: string;
  title: string;
  description: string;
  price: string;
  image: string;
  isVegan: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

function supabaseHeaders(): Record<string, string> {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Menu service is not configured.');
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
}

function staffTokenError(authorization: string | undefined | null): string | null {
  const expectedToken = process.env.FEEDBACK_ADMIN_TOKEN;
  const suppliedToken = authorization?.replace(/^Bearer\s+/i, '');
  if (!expectedToken) return 'Staff access is not configured.';
  if (suppliedToken !== expectedToken) return 'Enter a valid staff access token.';
  return null;
}

function toMenuItem(row: MenuRow): AdminMenuItem {
  return {
    id: row.id,
    category: row.category,
    subCategory: row.sub_category,
    title: row.title,
    description: row.description,
    price: row.price,
    image: row.image,
    isVegan: row.is_vegan,
    isAvailable: row.is_available,
    sortOrder: row.sort_order,
  };
}

const MENU_COLUMNS = 'id,category,sub_category,title,description,price,image,is_vegan,is_available,sort_order';

async function listMenuRows(all: boolean): Promise<MenuRow[]> {
  const filter = all ? '' : '&is_available=eq.true';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/menu_items?select=${MENU_COLUMNS}&order=sort_order.asc${filter}`, {
    headers: supabaseHeaders(),
  });
  if (!res.ok) throw new Error(`Menu select failed: ${res.status}`);
  return (await res.json()) as MenuRow[];
}

function validateMenuFields(body: Record<string, unknown>, partial: boolean): Record<string, unknown> | { error: string } {
  const fields: Record<string, unknown> = {};
  const has = (name: string) => Object.prototype.hasOwnProperty.call(body, name);

  if (!partial || has('category')) {
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    if (!category || category.length > 60) return { error: 'Choose a category (max 60 characters).' };
    fields.category = category;
  }
  if (!partial || has('subCategory')) {
    const subCategory = typeof body.subCategory === 'string' ? body.subCategory.trim() : '';
    if (subCategory.length > 80) return { error: 'Subcategory must be under 80 characters.' };
    fields.sub_category = subCategory || '';
  }
  if (!partial || has('title')) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title || title.length > 120) return { error: 'Enter a title under 120 characters.' };
    fields.title = title;
  }
  if (has('description')) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (description.length > 1000) return { error: 'Description must be under 1,000 characters.' };
    fields.description = description;
  }
  if (has('price')) {
    const price = typeof body.price === 'string' ? body.price.trim() : '';
    if (price.length > 80) return { error: 'Price must be under 80 characters.' };
    fields.price = price;
  }
  if (has('image')) {
    const image = typeof body.image === 'string' ? body.image.trim() : '';
    if (image.length > 500) return { error: 'Image reference must be under 500 characters.' };
    fields.image = image;
  }
  if (has('isVegan')) fields.is_vegan = body.isVegan === true;
  if (has('isAvailable')) fields.is_available = body.isAvailable === true;
  if (has('sortOrder')) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) return { error: 'Invalid sort order.' };
    fields.sort_order = sortOrder;
  }
  if (partial) fields.updated_at = new Date().toISOString();
  return fields;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const url = new URL(request.url || '/api/menu', `https://${request.headers.host || 'blu.local'}`);

  try {
    if (request.method === 'GET') {
      const wantsAll = url.searchParams.get('all') === '1';
      const rows = await listMenuRows(wantsAll);
      if (!wantsAll) {
        response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
      }
      return response.json({ items: rows.map(toMenuItem) });
    }

    const tokenError = staffTokenError(request.headers.authorization);
    if (tokenError === 'Staff access is not configured.') return response.status(503).json({ error: tokenError });
    if (tokenError) return response.status(401).json({ error: tokenError });

    if (request.method === 'POST') {
      const result = validateMenuFields((request.body ?? {}) as Record<string, unknown>, false);
      if ('error' in result) return response.status(400).json({ error: result.error });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/menu_items`, {
        method: 'POST',
        headers: { ...supabaseHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error(`Menu insert failed: ${res.status}`);
      const rows = (await res.json()) as MenuRow[];
      return response.status(201).json({ item: toMenuItem(rows[0]) });
    }

    if (request.method === 'PATCH') {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const id = typeof body.id === 'string' ? body.id : '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) return response.status(400).json({ error: 'A valid item id is required.' });
      const result = validateMenuFields(body, true);
      if ('error' in result) return response.status(400).json({ error: result.error });
      delete (result as Record<string, unknown>).id;
      if (Object.keys(result).length === 0) return response.status(400).json({ error: 'Nothing to update.' });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/menu_items?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...supabaseHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error(`Menu update failed: ${res.status}`);
      const rows = (await res.json()) as MenuRow[];
      if (!rows.length) return response.status(404).json({ error: 'Menu item not found.' });
      return response.json({ item: toMenuItem(rows[0]) });
    }

    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id') || '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) return response.status(400).json({ error: 'A valid item id is required.' });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/menu_items?id=eq.${id}`, {
        method: 'DELETE',
        headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
      });
      if (!res.ok) throw new Error(`Menu delete failed: ${res.status}`);
      const rows = (await res.json()) as MenuRow[];
      if (!rows.length) return response.status(404).json({ error: 'Menu item not found.' });
      return response.json({ deleted: true });
    }

    return response.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Menu API error:', error);
    return response.status(500).json({ error: 'Menu service is temporarily unavailable.' });
  }
}
