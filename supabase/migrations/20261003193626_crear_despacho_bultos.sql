-- Fix 2: peso por bulto — relación 1:N entre despachos y sus bultos.
--
-- Diseño (decidido en pareja):
--   * Tabla hija normalizada en vez de jsonb: constraints por elemento,
--     tipado y consultabilidad (fuente: trade-off de esta semana).
--   * ON DELETE CASCADE: sin despacho, no hay bultos huérfanos.
--   * UNIQUE (despacho_id, numero): no puede existir dos veces "bulto 2"
--     del mismo despacho (la FK solo garantiza que el padre exista).
--   * RLS sin user_id propio: la política usa EXISTS contra el despacho
--     padre — un bulto pasa si su despacho es del usuario actual.
--   * Grants: los permisos NO se heredan por FK (lección de la migración
--     20261003161839) — la tabla hija necesita los suyos.
--   * El total (ex peso_kg en despachos) se calcula al LEER (sum al hacer join):
--     no desnormalizamos sin problema medido (principio del design doc).
--     La CHECK condicional de la columna eliminada muere con ella.

create table public.despacho_bultos (
  id uuid primary key default gen_random_uuid (),
  despacho_id uuid not null references public.despachos (id) on delete cascade,
  numero integer not null check (numero >= 1),
  -- Piso de sanidad en la base (>= 0); la regla condicional
  -- "caja > 0, pallet puede 0" cruza tablas (embalaje vive en el padre)
  -- y vive en la capa de aplicación (Zod), que sí ve ambas tablas.
  peso_kg numeric(10, 2) not null check (peso_kg >= 0),
  unique (despacho_id, numero)
);

alter table public.despacho_bultos enable row level security;

-- Políticas own-row por PERTENENCIA del padre (EXISTS, no auth.uid() directo).
create policy "despacho_bultos_select_own" on public.despacho_bultos
  for select using (
    exists (
      select 1
      from public.despachos d
      where d.id = despacho_id
        and d.user_id = auth.uid ()
    )
  );

create policy "despacho_bultos_insert_own" on public.despacho_bultos
  for insert with check (
    exists (
      select 1
      from public.despachos d
      where d.id = despacho_id
        and d.user_id = auth.uid ()
    )
  );

create policy "despacho_bultos_update_own" on public.despacho_bultos
  for update using (
    exists (
      select 1
      from public.despachos d
      where d.id = despacho_id
        and d.user_id = auth.uid ()
    )
  )
  with check (
    exists (
      select 1
      from public.despachos d
      where d.id = despacho_id
        and d.user_id = auth.uid ()
    )
  );

create policy "despacho_bultos_delete_own" on public.despacho_bultos
  for delete using (
    exists (
      select 1
      from public.despachos d
      where d.id = despacho_id
        and d.user_id = auth.uid ()
    )
  );

-- Capa 1 de permisos: sin esto, "permission denied for table" (42501).
grant select, insert, update, delete on public.despacho_bultos to anon, authenticated;

-- El embed del listado filtra por despacho y ordena por numero.
create index despacho_bultos_despacho_id_numero_idx
  on public.despacho_bultos (despacho_id, numero);

-- El peso por bulto reemplaza al total: la columna (y su CHECK) salen de despachos.
alter table public.despachos drop column peso_kg;
