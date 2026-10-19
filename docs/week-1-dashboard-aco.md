Semana 1 — Tracker de Despachos
Problema
Gestionar los despachos de mercadería (envíos a clientes y retiros en bodega) hoy se hace de forma manual y dispersa: cada registro de boleta/factura, guía, transporte, comuna, valor y datos de contacto se lleva en papel o planillas sueltas. Sin un historial centralizado es imposible responder rápido "¿qué se despachó esta semana?", "¿quién retiró el pedido X?" o "¿cuánto se movió en valor?". Se construye un dashboard personal donde el usuario autenticado registra, consulta, edita y elimina despachos con datos consistentes y validados.
Alcance
Incluido:

- CRUD completo end-to-end de la entidad despachos (crear, listar, editar, eliminar).
- Nueva tabla despachos en una migración SQL con enums, índices, RLS y políticas own-row.
- Validación Zod en cada Server Function (.validator): única puerta de entrada al servidor.
- Autenticación mínima con Supabase Auth (email/password): página de login, protección de ruta en beforeLoad y sesión vía getUser().
- Estados de UI completos: loading, empty, error (con reintento) y pending de mutaciones.
- Invalidación de cache de TanStack Query tras cada mutación.
- Formulario con UX para datos repetitivos: datalist para transporte (sugerencias del historial propio + lista base) y comuna (lista completa de comunas de Chile), y formateo del valor en CLP.
- Deploy: preview por PR en Vercel + migración promovida al proyecto Supabase remoto con db:push.
- Artefactos de cierre: PR, diagrama de arquitectura y design doc.
  Excluido explícitamente:
- Tiempo real, pagos, AI, OAuth de terceros, colaboración multiusuario.
- Reportes/exportación (PDF, contabilidad) y filtros avanzados: semanas posteriores.
- Tablas de lookup con FK (comunas, transportes): el dato queda como text normalizado en el servidor; el trade-off se documenta abajo.
- Slices de Redux: no existe estado local de UI complejo que lo justifique en este MVP.
- Remitos/órdenes de transporte asociadas, adjuntos de documentos y historial de auditoría por despacho.
  Arquitectura
  Componentes que participan, siguiendo el patrón vertical de feature del repo:
  Rutas + componentes (UI)
  → hooks de TanStack Query (queries / mutations)
  → TanStack Start Server Functions (RPC same-origin, POST/GET)
  → .validator(Zod) + getUser() (cookie de sesión)
  → service.ts (lógica pura de dominio)
  → cliente Supabase SSR (respeta RLS)
  → PostgreSQL
  → respuesta tipada
  → invalidación de query → re-render
- El navegador (azul) nunca habla directo con la base: todo pasa por una Server Function autenticada y validada.
- El servidor (verde) accede a Supabase con las cookies del request vía src/server/db/supabase-server.ts; getSupabaseAdminClient() no se usa en esta feature.
- Supabase Auth + PostgreSQL (morado) almacena identidad, sesión y filas del tracker.
- La frontera de confianza (borde rojo) vive entre el componente React y la .validator de cada Server Function.
  Modelo de datos
  Una migración nueva (pnpm db:new crear_despachos), normalizada:
  despachos
  Columna Tipo Restricciones
  id uuid PK, default gen_random_uuid()
  user_id uuid NOT NULL, FK → auth.users(id) ON DELETE CASCADE
  despachado_at timestamptz NOT NULL (fecha y hora del despacho)
  tipo_documento text NOT NULL, CHECK factura | boleta
  numero_documento text NOT NULL
  numero_guia text NOT NULL
  transporte text NOT NULL (normalizado en service.ts)
  comuna text NOT NULL (validación soft contra comunas.json)
  valor_clp integer NOT NULL, CHECK > 0 (sin decimales: el peso chileno no los usa)
  bultos integer NOT NULL, CHECK >= 0
  tipo_embalaje text NOT NULL, CHECK caja | pallet | alusado
  peso_kg numeric(10,2) NOT NULL, CHECK > 0
  direccion text (nullable: si es retiro no aplica)
  telefono text (nullable)
  contacto text (nullable)
  retirado_por text (nullable: nombre de quien retira)
  vehiculo text (nullable) CHECK moto | furgon | camion | otro
  created_at timestamptz NOT NULL, default now()
  updated_at timestamptz NOT NULL, default now()
- Dominios cerrados implementados con constraints CHECK (equivale a enums nativos de PG en comportamiento; CHECK mantiene el SQL más simple de migrar y evita el costo de ALTER TYPE en futuras correcciones).
- RLS habilitada + políticas own-row (select, insert with check, update using/with check), estilo profiles: user_id = auth.uid().
- Índice (user_id, despachado_at desc) para el listado principal.
- Delete duro en este MVP (no soft delete); se documenta en la sección "Rollback plan" del PR.
- Reglas de docs/migrations.md: migración inmutable, probada con pnpm db:reset antes de promover con db:push; toda tabla nueva nace con RLS.
  Seguridad
- Autenticación: Supabase Auth con email/password. Página /login con estados de error y pending; redirect a rutas protegidas en beforeLoad.
- Autorización: getUser() en cada handler + políticas RLS own-row — doble capa: la app no puede ver filas de otros usuarios aunque su código falle.
- Secretos: SUPABASE_SERVICE_ROLE_KEY no se usa en esta feature; jamás con prefijo VITE_.
- Validación: Zod en el boundary de cada Server Function. Enums coarced de string a valor válido con mensaje útil ante payload inválido (4xx; sin retry por los defaults de createQueryClient).
- Normalización en servidor: comuna (trim + match case-insensitive contra la lista de comunas.json), transporte (trim + capitalización primera letra), telefono (limpieza de separadores, límite de longitud) — evita "Providencia", "providencia " y "(+569) 1234-5678" como registros distintos de lo mismo.
  Propiedad del estado
- TanStack Query — listado de despachos cacheado, estado de mutaciones, invalidación por query keys tras cada write; sesión del usuario expuesta vía hook.
- Redux Toolkit — store queda vacía, sin caso de uso esta semana.
- Estado de componente — campos del formulario antes del submit, visibilidad del diálogo de confirmación de delete.
- Parámetros de URL — filtro de búsqueda por texto libre (comuna/transporte/número) como params marcables y compartibles.
- Base de datos — todas las filas de despachos (estado durable de negocio).
- Solo servidor — SUPABASE_SERVICE_ROLE_KEY nunca en el bundle cliente.
  Modos de falla
- Sesión expirada: error 401 desde el Server Function lleva a redirect a /login; se distingue de un error de red (que muestra UI con botón reintentar).
- Mutación falla en el servidor: sin retry (defaults de mutaciones en createQueryClient), el usuario ve el error y no se duplica la escritura.
- Payload inválido en .validator: 4xx con mensaje útil del enum esperado, error inline en el formulario cerca del campo.
- Comuna fuera del catálogo: se guarda igual (flexibilidad MVP) y se marca con badge en la UI. No bloquea el flujo.
- Tabla sin grants de API (descubierto en esta semana): las migraciones aplicadas vía CLI al proyecto hosted no heredan los default privileges de Supabase (dependen del rol que crea la tabla) — PostgREST falla con "permission denied for table" ANTES de evaluar RLS. Síntoma clave: RLS deniega devolviendo 0 filas silenciosas; este error es de la capa de GRANTs, una capa debajo. Fix: migración 20261003161839 con grant select/insert/update/delete a anon y authenticated. Lección: los permisos en Supabase tienen dos capas (GRANTs de rol, luego RLS de filas) y se verifican en ese orden.
- Migración defectuosa: pnpm db:reset local; corrección con migración nueva, jamás editando una aplicada.
- CI en rojo: el PR no se mergea; el preview de Vercel se genera igual, pero el gate es CI verde.
- Deploy roto: revert del merge restaura el deploy anterior.
  Trade-offs

1. text + normalización en servicio vs tabla de lookup con FK para transporte/comuna: la FK es más correcta a largo plazo (reportes agrupados, integridad), pero es over-engineering en Semana 1: la entrada del usuario es fuzzy y una FK obligaría a gestionar altas de catálogo. Mitigación: normalización en service.ts + validación soft contra comunas.json. Si aparece la necesidad de reportes, se crea la tabla de lookup y se remigra — está registrado como deuda formal.
2. datalist vs <select> para transporte/comuna: datalist mantiene texto libre con sugerencias (el usuario puede aportar valores nuevos); select filtra exacto pero bloquea datos no catalogados. Si el volumen de datos crece, migrar a select con datos normalizados es trivial.
3. constraints CHECK vs enums nativos de PostgreSQL: mismo comportamiento de integridad, pero las CHECK son más simples de crear/alterar en migraciones (un enum nativo tras un cambio de dominio requiere ALTER TYPE ... ADD VALUE que no corre dentro de transaction blocks fácilmente). Costo aceptado: el enum vive más en código (Zod) que en la base.
4. Auth email/password vs magic link: email/password porque es el wiring mínimo directo para probar RLS con dos usuarios distintos esta semana; magic link queda registrado como upgrade natural de UX.
5. Sugerencias de transporte desde el historial del usuario (decisión confirmada con el producto): alimentar el datalist con los valores únicos ya usados, derivados del listado cacheado de TanStack Query — sin Server Function distinct dedicada. Si el listado se vuelve lento, se migra a un select distinct transporte expuesto como Server Function propia (deuda registrada).
6. CRUD en una sola tabla sin relación con clientes/pedidos: la Semana 1 exige validar el flujo completo de CRUD en una sola entidad; la relación despacho ↔ cliente (entidad contacto, FKs, unique constraints) es la evolución natural de la Semana 2.
   Respuestas de entrevista
7. ¿Por qué Server Functions y no una API REST propia? Son RPC tipado end-to-end sin generar ni mantener una capa de endpoints. Viven same-origin y asumen caller autenticado con cookie — exactamente lo que esta app necesita. Lo que rompe ese presupuesto (webhooks, callbacks OAuth) requerirá server routes públicas desde la Semana 2.
8. ¿Por qué TanStack Query y no Redux para estos datos? El listado y las mutaciones necesitan cache, staleTime, retries con backoff, dedupe y estado de pending; implementar todo eso a mano en slices es boilerplate propenso a desincronizarse. Redux queda para estado de UI complejo que esta feature aún no tiene.
9. ¿Cómo mantiene consistencia la UI la invalidación de query tras una mutación? Tras onSuccess se llama invalidateQueries sobre las query keys de la feature. Evitamos setQueryData manual: el servidor es el dueño de la verdad de los datos (normalización de comuna/transporte, valores generados en DB como created_at) y un refetch al servidor es la única garantía de que el cache refleja exactamente lo persistido. Los componentes que observan esas keys refetchean automáticamente.
10. ¿Cuándo desnormalizarías y por qué? Cuando el costo de lookup tables/FKs supera el beneficio de integridad: con input fuzzy del usuario y sin reportes agrupados todavía, guardar transporte/comuna como texto normalizado es proporcional. Desnormalizar para performance (ej: contradores materializados en columns extra) solo si hay un problema real medido, no especulativo.
11. ¿Por qué RLS own-row en vez de confiar solo en la app? Defensa en profundidad: un bug en el frontend o en una Server Function que se olvide de llamar getUser() no debería poder exponer datos de otro usuario. El nivel de base de datos es la última frontera y es independiente de la calidad del código de aplicación.
    Plan de trabajo (3 bloques)
    Bloque 1 — Alcance y backend
12. Design doc inicial + rama week-1-despachos.
13. Migración: tabla + CHECK constraints + índice + RLS + políticas; verificar con pnpm db:reset.
14. src/features/despachos/: schemas.ts (Zod), service.ts (puro y testable), functions.ts (Server Functions CRUD con .validator).
15. Autenticación mínima: /login, protección de rutas en beforeLoad.
    Bloque 2 — Frontend e integración
16. queries/ y mutations/ con invalidación por keys.
17. Rutas y componentes: listado, formulario de alta, edición, delete con confirmación; estados loading/empty/error/pending.
18. Tests de service.ts (normalización, formato CLP, extractor de únicos) + esquemas; checklist manual; PR + self-review.
    Bloque 3 — Checkpoint
19. Deploy de preview + pnpm db:push al proyecto remoto.
20. Diagrama final con el lenguaje visual del repo + design doc completo (este documento).
21. Merge del PR.
    Definition of done

- CRUD end-to-end funciona (crear, listar, editar, eliminar despacho) con usuario autenticado
- Esquema representado en migración, verificado con pnpm db:reset
- Validación server-side con Zod en cada Server Function
- Queries y mutaciones tipadas end-to-end (inferencia desde schemas.ts)
- Datalists funcionando (comuna con catálogo completo, transporte con historial + base)
- Estados de UI: loading, empty, error, pending
- URL de deploy funcionando (preview)
- PR + diagrama + design doc completos

## Follow-up work (registrado, fuera de alcance de esta semana)

**Roles: viewer read-only y admin humano** — objetivo: Semana 2 (seguridad y tenancy).

- Rol en `app_metadata` (editable solo vía service role key desde el servidor); jamás en `user_metadata` (el usuario se lo auto-asignaría).
- Helper SQL `mi_rol()` (`security definer`, `search_path = ''`) que lee `auth.jwt() -> 'app_metadata' ->> 'rol'`.
- Políticas RLS condicionales: escrituras exigen `mi_rol() in ('operador', 'admin')`; el admin escribe sobre cualquier fila.
- **Decisión de negocio pendiente**: ¿el viewer ve (a) todos los despachos o (b) solo los propios? Cambia la política `select` y el modelo "dueño + audiencia".
- Trade-off registrado: rol en JWT = stale hasta refresh del token (~1h); revocación inmediata requeriría tabla `user_roles` consultada por las políticas (+1 JOIN).
- La UI oculta botones para viewer — es UX, no seguridad: la única barrera real es RLS.
- La asignación de roles se hace con la service role key (operación de sistema); un admin humano nunca usa esa key — es un usuario con claim `rol: 'admin'` que RLS reconoce.
