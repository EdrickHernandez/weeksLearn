-- Semana 3 — Datos de entrega: relación 1:1 con `despachos`.
--
-- Una fila en `entregas` significa que el despacho ya fue entregado.
-- Si todavía no existe una fila hija, el despacho sigue pendiente.

create table public.entregas (
  id uuid primary key default gen_random_uuid (),
  despacho_id uuid not null
    references public.despachos (id) on delete cascade,
  nombre text not null,
  rut text not null,
  orden_compra text not null,
  entregado_at timestamptz not null,
  unique (despacho_id)
);

-- La tabla hija también necesita su propia protección RLS
-- (Row Level Security, seguridad a nivel de fila).
alter table public.entregas enable row level security;

-- Admin y observador pueden consultar las entregas de despachos visibles.
create policy entregas_select_conocidas
on public.entregas
for select
using (
  mi_rol() in ('admin', 'observador')
);

-- Solo el admin puede crear una entrega y únicamente para un despacho propio.
create policy entregas_insert_admin
on public.entregas
for insert
with check (
  mi_rol() = 'admin'
  and exists (
    select 1
    from public.despachos d
    where d.id = despacho_id
      and d.user_id = auth.uid()
  )
);

-- Solo el admin puede editar una entrega de un despacho propio.
create policy entregas_update_admin
on public.entregas
for update
using (
  mi_rol() = 'admin'
  and exists (
    select 1
    from public.despachos d
    where d.id = despacho_id
      and d.user_id = auth.uid()
  )
)
with check (
  mi_rol() = 'admin'
  and exists (
    select 1
    from public.despachos d
    where d.id = despacho_id
      and d.user_id = auth.uid()
  )
);

-- Solo el admin puede eliminar una entrega de un despacho propio.
create policy entregas_delete_admin
on public.entregas
for delete
using (
  mi_rol() = 'admin'
  and exists (
    select 1
    from public.despachos d
    where d.id = despacho_id
      and d.user_id = auth.uid()
  )
);

-- Las políticas no sustituyen los permisos SQL: la tabla necesita sus grants.
grant select, insert, update, delete
on public.entregas
to anon, authenticated;
