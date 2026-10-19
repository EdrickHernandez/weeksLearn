-- Fix: grants de la tabla despachos para los roles de la API.
--
-- Síntoma: "permission denied for table despachos" (Postgres 42501) al listar.
-- Causa: la migración 20260930194607 aplicada vía CLI al proyecto hosted no
-- heredó los default privileges de Supabase (dependen del rol que crea la
-- tabla), así que los roles anon/authenticated quedaron sin GRANT y PostgREST
-- falla ANTES de evaluar las políticas RLS.
--
-- RLS sigue siendo la barrera de filas: estos grants habilitan el acceso a la
-- tabla, y las políticas own-row deciden qué filas pasa cada usuario.

grant select, insert, update, delete on public.despachos to anon, authenticated;
