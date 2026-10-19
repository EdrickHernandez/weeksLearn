-- Grants para service_role: el canal del importador (ETL de sistema).
--
-- Síntoma: el script con service role key falla vacío al hacer el
-- conteo de guard ("No se pudo verificar el estado del lote: ").
-- Causa: los grants anteriores (20261003161839 y 20261003193626) cubrieron
-- anon/authenticated, pero en proyectos de keys nuevas NADIE tiene grants
-- por defecto — y el script habla a la base como service_role.
-- Lección (tercera vez esta semana): GRANTs son por (tabla, rol) — cada
-- cliente nuevo del sistema exige revisar sus dos capas: grants → RLS.

grant select, insert, update, delete on public.despachos to service_role;
grant select, insert, update, delete on public.despacho_bultos to service_role;
