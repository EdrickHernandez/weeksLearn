create or replace function public.mi_rol()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', '(sin rol)');
$$;

drop policy if exists "despachos_select_own" on public.despachos;
create policy select_conocidos
on public.despachos
for select 
using (
(mi_rol() in ('admin', 'observador')));

drop policy if exists "despachos_insert_own" on public.despachos;
create policy despachos_insert_admin
on public.despachos
for insert 
with check (
    mi_rol() = 'admin'
    and user_id = auth.uid());

drop policy if exists "despachos_update_own" on public.despachos;
create policy despachos_update_admin
on public.despachos
for update
using (mi_rol() = 'admin' and user_id = auth.uid())
with check( mi_rol()= 'admin' and user_id = auth.uid());

drop policy if exists "despachos_delete_own" on public.despachos;
create policy despachos_delete_admin
on public.despachos
for delete
using (mi_rol ()= 'admin' and user_id = auth.uid());




drop policy if exists "despacho_bultos_select_own" on public.despacho_bultos;
create policy select_bultos_conocidos
on public.despacho_bultos
for select 
using (
(mi_rol() in ('admin', 'observador')));

drop policy if exists "despacho_bultos_insert_own" on public.despacho_bultos;
create policy despacho_bultos_insert_admin
on public.despacho_bultos
for insert 
with check (
    mi_rol() = 'admin'
    and exists (
    select 1 from public.despachos d
    where d.id = despacho_id
    and d.user_id = auth.uid()
    )
  );
drop policy if exists "despacho_bultos_update_own" on public.despacho_bultos;
create policy despacho_bultos_update_admin
on public.despacho_bultos
for update
using (mi_rol() = 'admin' and exists (
    select 1 from public.despachos d
    where d.id = despacho_id
    and d.user_id = auth.uid()
    )
  )
with check( mi_rol()= 'admin' and exists (
    select 1 from public.despachos d
    where d.id = despacho_id
    and d.user_id = auth.uid()
    )
  );
drop policy if exists "despacho_bultos_delete_own" on public.despacho_bultos;
create policy despacho_bultos_delete_admin
on public.despacho_bultos
for delete
using (mi_rol ()= 'admin' and exists (
    select 1 from public.despachos d
    where d.id = despacho_id
    and d.user_id = auth.uid()
    )
  );

