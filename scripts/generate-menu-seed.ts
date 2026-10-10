import { writeFileSync } from 'node:fs';
import { MENU_ITEMS } from '../src/data/menu';

const escapeSql = (value: string) => value.replaceAll("'", "''");

const values = MENU_ITEMS.map((item, index) => {
  return `  ('${escapeSql(item.category)}', '${escapeSql(item.subCategory)}', '${escapeSql(item.title)}', '${escapeSql(item.description ?? '')}', '${escapeSql(item.price)}', '${escapeSql(item.image)}', ${item.isVegan ? 'true' : 'false'}, true, ${index})`;
});

const ddl = `create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  sub_category text not null default '',
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  price text not null default '',
  image text not null default '',
  is_vegan boolean not null default false,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_items enable row level security;

create index if not exists menu_items_sort_idx on public.menu_items (category, sort_order);
`;

const seed = `insert into public.menu_items (category, sub_category, title, description, price, image, is_vegan, is_available, sort_order) values\n${values.join(',\n')};\n`;

writeFileSync('supabase/migrations/0002_menu_items.sql', ddl + '\n' + seed);
console.log(`Wrote migration with ${MENU_ITEMS.length} items.`);
