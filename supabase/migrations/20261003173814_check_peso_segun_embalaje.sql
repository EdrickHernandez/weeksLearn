-- Fix 1: el peso mínimo depende del tipo de embalaje.
-- Regla de negocio: un pallet puede pesar 0 kg (no se pesa por unidad);
-- una caja siempre debe pesar más de 0.
--
-- El constraint original (peso_kg > 0, sin nombre → auto-nombrado
-- "despachos_peso_kg_check") ya está aplicado en remoto y es inmutable:
-- se reemplaza con DROP + ADD, nunca se edita.

alter table public.despachos
  drop constraint despachos_peso_kg_check;

alter table public.despachos
  add constraint despachos_peso_kg_check
  check (
    (tipo_embalaje = 'pallet' and peso_kg >= 0)
    or
    (tipo_embalaje = 'caja' and peso_kg > 0)
  );
