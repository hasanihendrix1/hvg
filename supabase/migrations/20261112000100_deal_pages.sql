-- Link-only deal pages (dotato DOT-512). dotato writes these rows with the service role; nobody else reads the table.
--
-- bridge_deals (created 2026-08-12, outside this repo) stays the public inventory row: anon reads every active row
-- in full, so nothing on it may name the street. A page's content lives here instead, and deal_page() hands one page
-- to whoever names its exact slug, so pages cannot be listed.

create table if not exists public.bridge_deal_pages (
  source_lead_id text primary key references public.bridge_deals (source_lead_id) on delete cascade,
  slug text not null unique
    check (length(slug) between 16 and 96 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  state text not null default 'live' check (state in ('live', 'unavailable')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bridge_deal_pages enable row level security;
revoke all on public.bridge_deal_pages from anon, authenticated;
grant select, insert, update, delete on public.bridge_deal_pages to service_role;

-- Only a live page hands out its content; a Pending or closed deal answers "unavailable" and nothing else.
create or replace function public.deal_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.state = 'live' then jsonb_build_object('state', 'live', 'content', p.content)
    else jsonb_build_object('state', 'unavailable')
  end
  from public.bridge_deal_pages p
  where p.slug = p_slug
$$;

revoke all on function public.deal_page(text) from public;
grant execute on function public.deal_page(text) to anon, authenticated, service_role;

-- The inventory row stays public, but only the columns /investors shows (getDeals.js names them): a photo or
-- media link written by mistake, or dotato's lead id, is never readable with the publishable key.
revoke select on public.bridge_deals from anon;
grant select (id, created_at, updated_at, address, price, bedrooms, bathrooms, sqft, status, active)
  on public.bridge_deals to anon;

-- The front photo, copied here by dotato under the page's slug: public by URL, never listable by anon.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('deal-photos', 'deal-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
