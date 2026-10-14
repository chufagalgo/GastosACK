-- GASTOSACK: instalación completa para pegar en Supabase → SQL Editor → New query → Run.
-- Es la unión de supabase/migrations/*.sql en orden. Solo hay que ejecutarlo una vez, en un proyecto vacío.

-- ═══════ 20261014000000_init.sql ═══════

-- Esquema de GASTOSACK.
-- Importes en céntimos (enteros); km con un decimal; tarifa €/km con tres decimales.
-- Todas las tablas tienen RLS: cada usuario solo ve y modifica sus filas.

-- ─────────────────────────── Perfil y ajustes ───────────────────────────

create table public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null default '',
  company        text not null default 'ACK Logic',
  origin_address text not null default '',
  km_rate        numeric(6, 3) not null default 0.110 check (km_rate >= 0),
  updated_at     timestamptz not null default now()
);

-- Crea el perfil al dar de alta el usuario en Supabase Auth.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────── Clientes ───────────────────────────

create table public.clients (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  address          text not null default '',
  town             text not null default '',
  round_trip_km    numeric(7, 1) check (round_trip_km >= 0),
  km_calculated_at timestamptz,
  archived         boolean not null default false,
  created_at       timestamptz not null default now()
);

create unique index clients_user_name_key on public.clients (user_id, lower(name));

-- ─────────────────────────── Gastos ───────────────────────────

create type public.expense_category as enum ('km', 'autopistes', 'dietes', 'allotjaments', 'bitllets', 'altres');

create table public.expenses (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date               date not null,
  category           public.expense_category not null,
  client_id          uuid references public.clients (id) on delete restrict,
  project            text not null default '',
  place              text not null default '',
  km                 numeric(7, 1),
  km_rate            numeric(6, 3),
  amount_cents       integer not null check (amount_cents > 0),
  vendor_name        text,
  vendor_tax_id      text,
  receipt_path       text,
  receipt_image_path text,
  ai_raw             jsonb,
  notes              text,
  created_at         timestamptz not null default now(),
  -- Desplazamiento: cliente, km y tarifa obligatorios. Resto: ticket obligatorio y sin km.
  constraint expenses_km_fields check (
    case when category = 'km'
      then client_id is not null and km > 0 and km_rate is not null
      else km is null and km_rate is null and receipt_path is not null
    end
  )
);

create index expenses_user_date_idx on public.expenses (user_id, date);
create index expenses_client_idx on public.expenses (client_id);

-- ─────────────────────────── Cierre de mes ───────────────────────────

create table public.month_closings (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year         smallint not null check (year between 2000 and 2100),
  month        smallint not null check (month between 1 and 12),
  itm_hours    boolean not null default false,
  time_control boolean not null default false,
  primary key (user_id, year, month)
);

create table public.advances (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year         smallint not null check (year between 2000 and 2100),
  month        smallint not null check (month between 1 and 12),
  position     smallint not null check (position between 1 and 4),
  date         date not null,
  amount_cents integer not null check (amount_cents > 0),
  unique (user_id, year, month, position)
);

-- ─────────────────────────── RLS ───────────────────────────

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.expenses enable row level security;
alter table public.month_closings enable row level security;
alter table public.advances enable row level security;

create policy "own rows" on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.clients for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.month_closings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.advances for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- En gastos, además, el cliente tiene que ser del mismo usuario.
create policy "own rows" on public.expenses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (client_id is null or exists (
      select 1 from public.clients c where c.id = client_id and c.user_id = (select auth.uid())
    ))
  );

-- ─────────────────────────── Storage (fotos de tickets) ───────────────────────────
-- Bucket privado. Ruta: <user_id>/<año>/<mes>/<uuid>.<ext>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "receipts own folder" on storage.objects for all to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ═══════ 20261014100000_default_origin.sql ═══════

-- Dirección de la oficina de ACK Logic como origen por defecto de los km.
alter table public.profiles
  alter column origin_address set default 'Carrer dels Argenters, 2, 08290 Cerdanyola del Vallès';

update public.profiles set origin_address = 'Carrer dels Argenters, 2, 08290 Cerdanyola del Vallès'
where origin_address = '';

-- ═══════ 20261014200000_drop_ai_raw.sql ═══════

-- Sin lectura automática de tickets: los datos se escriben a mano.
alter table public.expenses drop column ai_raw;
