-- Semana 1 — Tracker de Despachos: tabla `despachos` (CRUD own-row con RLS).
-- Diseño completo en docs/week-1-dashboard-aco.md.
-- Dominios cerrados con constraints CHECK (trade-off documentado: CHECK vs enums nativos).

create table public.despachos (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  despachado_at timestamptz not null,
  tipo_documento text not null check (tipo_documento in ('factura', 'boleta')),
  numero_documento text not null,
  numero_guia text not null,
  transporte text not null,
  comuna text not null,
  valor_clp integer not null check (valor_clp > 0),
  bultos integer not null check (bultos >= 0),
  tipo_embalaje text not null check (tipo_embalaje in ('caja', 'pallet')),
  peso_kg numeric(10, 2) not null check (peso_kg > 0),
  direccion text,
  telefono text,
  contacto text,
  retirado_por text,
  vehiculo text check (vehiculo in ('moto', 'furgon', 'camion', 'otro')),
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

-- RLS: obligatoria en toda tabla del starter.
alter table public.despachos enable row level security;

-- Políticas own-row: cada usuario solo ve/crea/edita/borra sus propios despachos.
create policy "despachos_select_own" on public.despachos
  for select using (auth.uid () = user_id);

create policy "despachos_insert_own" on public.despachos
  for insert with check (auth.uid () = user_id);

create policy "despachos_update_own" on public.despachos
  for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "despachos_delete_own" on public.despachos
  for delete using (auth.uid () = user_id);

-- Índice del listado principal: despachos del usuario, más reciente primero.
create index despachos_user_id_despachado_at_idx on public.despachos (user_id, despachado_at desc);
