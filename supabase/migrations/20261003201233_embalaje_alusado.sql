-- Fix 3: nuevo tipo de embalaje "alusado" (paquetes sueltos, sin caja ni pallet).
--
-- El constraint de tipo_embalaje ya aplicado solo conoce caja|pallet, así que
-- un despacho alusado violaría la CHECK existente: se reemplaza (DROP + ADD),
-- nunca se edita la migración aplicada.
--
-- Nota de orden: este migration corre DESPUÉS de 20261003193626, que elimina
-- la columna peso_kg (y su CHECK condicional caja/pallet). Con la columna fuera,
-- ampliar este dominio ya no choca con la regla del peso: esa vive en Zod
-- ("solo el pallet puede pesar 0").

alter table public.despachos
  drop constraint despachos_tipo_embalaje_check;

alter table public.despachos
  add constraint despachos_tipo_embalaje_check
  check (tipo_embalaje in ('caja', 'pallet', 'alusado'));
