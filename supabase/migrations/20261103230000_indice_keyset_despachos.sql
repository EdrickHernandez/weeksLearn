-- Keyset pagination ordena globalmente los despachos visibles por
-- (despachado_at DESC, id DESC). La policy select_conocidos permite a admin
-- y observador consultar todos los despachos, así que el índice anterior
-- encabezado por user_id no sirve para este listado global.
create index despachos_listado_keyset_idx
  on public.despachos (despachado_at desc, id desc);
