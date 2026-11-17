-- Semana 3 — Diferenciar cliente final y transporte tercerizado.
--
-- La primera migración creó campos genéricos. Como el dominio distingue dos
-- actores, reemplazamos esos campos por columnas específicas y hacemos que
-- PostgreSQL exija el conjunto correcto según `tipo_entrega`.

do $$
begin
  if exists (select 1 from public.entregas) then
    raise exception
      'No se puede cambiar el contrato de entregas: ya existen filas. Migra esos datos primero.';
  end if;
end $$;

alter table public.entregas
  drop column nombre,
  drop column rut,
  drop column orden_compra,
  drop column entregado_at;

alter table public.entregas
  add column tipo_entrega text not null
    check (tipo_entrega in ('cliente_final', 'transporte_tercerizado')),

  -- Datos del cliente final. La fecha es estimada y la ingresa el admin.
  add column nombre_cliente text,
  add column apellido_cliente text,
  add column rut_cliente text,
  add column entrega_estimada_at timestamptz,

  -- Datos del transporte tercero. La fecha representa la recepción real.
  add column nombre_transporte text,
  add column orden_compra text,
  add column rut_transporte text,
  add column recibido_at timestamptz,
  add column nombre_recibio text;

alter table public.entregas
  add constraint entregas_datos_segun_tipo_check
  check (
    (
      tipo_entrega = 'cliente_final'
      and nullif(btrim(nombre_cliente), '') is not null
      and nullif(btrim(apellido_cliente), '') is not null
      and nullif(btrim(rut_cliente), '') is not null
      and entrega_estimada_at is not null
      and nombre_transporte is null
      and orden_compra is null
      and rut_transporte is null
      and recibido_at is null
      and nombre_recibio is null
    )
    or
    (
      tipo_entrega = 'transporte_tercerizado'
      and nullif(btrim(nombre_transporte), '') is not null
      and nullif(btrim(orden_compra), '') is not null
      and nullif(btrim(rut_transporte), '') is not null
      and recibido_at is not null
      and nombre_cliente is null
      and apellido_cliente is null
      and rut_cliente is null
      and entrega_estimada_at is null
    )
  );
