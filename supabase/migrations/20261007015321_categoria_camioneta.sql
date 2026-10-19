-- Fix 4: nueva categoría de vehículo "camioneta".
--
-- Datos reales del tracker (importación CSV): camión y camioneta dominan el
-- historial; mapear camioneta a "otro" traicionaría el dato. Se amplía el
-- dominio con el mismo patrón de embalaje_alusado (DROP + ADD, jamás edit).

alter table public.despachos
  drop constraint despachos_vehiculo_check;

alter table public.despachos
  add constraint despachos_vehiculo_check
  check (vehiculo in ('moto', 'furgon', 'camion', 'camioneta', 'otro'));
