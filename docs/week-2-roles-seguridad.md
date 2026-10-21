# Semana 2 — Sprint: Roles y Seguridad (app Tracker de Despachos)

> Feature completado entre el 14 y el 20 de octubre de 2026, como primera unidad
> de la Semana 2. Decisión de producto: el negocio necesita usuarios con dos
> roles (admin = carga la operación; observador/vendedor = consulta y filtra).
> El sprint se resolvió EN la app de despachos (la aplicación real), no en un
> sandbox.

## 1. Decisión: dónde vive el rol

- **Rol como atributo del usuario** en `app_metadata` (Supabase Auth) — no hay
  tabla de roles ni roles de Postgres custom.
- **Los dos estantes** (lección central de la semana):
  - `user_metadata`: editable por el propio usuario desde el cliente → si el rol
    viviera ahí, cualquier vendedor se auto-promociona — estante decorativo.
  - `app_metadata`: solo lo escribe el servidor con service role (Admin API) —
    estante que define la responsabilidad.
- La claim viaja **dentro del JWT** (firma nace en el login). Corolario en vivo:
  asignar un rol **no** afecta sesiones abiertas — el usuario debe re-loguearse
  para que el token nuevo traiga la claim. El gotcha se vivió dos veces en el
  debugging del observador.

## 2. El helper `mi_rol()`

```sql
create or replace function public.mi_rol()
returns text language sql stable
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', '(sin rol)'); $$;
```

- `stable` + llamada envuelta en `select` dentro de las policies → evaluación
  una vez por query (no por fila).
- **Fail-closed**: sin rol, devuelve `'(sin rol)'` — cadena que no matchea
  ninguna policy → el usuario sin asignación no ve nada. Decisión consciente:
  los datos son sensibles; sin rol asignado, no hay acceso.

## 3. Las policies (migración `20261017232412_roles_mi_rol_y_policies.sql`)

| Policy                               | Condición                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| SELECT (despachos y despacho_bultos) | `mi_rol() in ('admin', 'observador')` — todos los conocidos ven TODAS las filas |
| INSERT / UPDATE / DELETE (padre)     | `mi_rol() = 'admin' and user_id = auth.uid()`                                   |
| INSERT / UPDATE / DELETE (hijo)      | `mi_rol() = 'admin' and exists (… el padre del bulto es del usuario …)`         |

Notas de diseño:

- **Los dos estantes** de una policy: `using` examina la fila que YA existe
  (el "antes" — la única honesta); `with check` examina la fila que NACE (el
  "después" — su contenido lo escribe quien la envía). UPDATE lleva ambos;
  DELETE solo `using` (no hay fila después); INSERT solo `with check`.
- **Contra el secuestro de filas**: mantener `user_id = auth.uid()` en el
  `using` del UPDATE/DELETE impide reescribir el `user_id` de filas ajenas — el
  examen sobre la fila VIEJA es el que frena el robo, no el de la nueva.
- **El hijo hereda la propiedad del padre**: `despacho_bultos` no tiene
  `user_id`; su pertenencia se checa vía `exists` contra `despachos` por la FK.
- **Coherencia del embed**: si el vendedor ve el despacho, sus policies de
  bultos deben dejar ver los bultos embebidos — si no, el embed vuelve vacío
  en silencio (el peor bug: sin error, peso total = 0).

## 4. La capa de código (regla de capas)

- **Lecturas delegan en la RLS**: el explicit filter `.eq('user_id', userId)` de
  `listDespachos` y `getDespacho` **mascaba** el diseño (a) — el observador
  (sin filas propias) recibía 0 filas aunque la policy lo dejaba pasar.
  Regla registrada: **el filtro del código nunca es más estricto que la
  policy** — si lo es, esconde el diseño y silencia la seguridad real. Puede
  ser igual (doble cerco) o delegar (policy manda).
- **Escrituras mantienen doble cerco**: `.eq('user_id', uid)` en el repo +
  policy (admin + own-row) — mismos criterios, capas independientes.

## 5. Contract drift — dos incidentes de la semana (material de estudio)

1. **Camioneta**: la migración `20261007` evolucionó el enum de la DB y el
   contrato Zod + el form nunca se enteraron → UNA sola fila con
   `vehiculo='camioneta'` tumaba el listado completo (ZodError → 500). Regla:
   _un cambio de esquema = todas sus capas hermanas en el mismo PR_, o
   deferencia consciente y registrada.
2. **La impostora del form**: una option del select con `label: 'Camioneta'`
   pero `value: 'furgon'` — keys de React duplicadas y, peor, **corrupción de
   datos** (guardaba `furgon` creyendo guardar camioneta).

## 6. Evidencia del muro (probado el 20-oct)

- Admin (`admined@`): ve el listado + CRUD completo ✓
- Observador (`observador@`): ve el listado (todas las filas) ✓; su intento de
  crear NO insertó ninguna fila (0 filas propias en la tabla, verificado por
  REST con service role) — RLS rechazó ✓
- El rechazo es **silencioso a nivel de datos** (empty result, sin excepción):
  el fail-closed no grita.

## 7. Pendientes (registrados para próximas sesiones)

- UX del error: el vendedor que intenta escribir merece feedback visible y
  humano (hoy el rechazo es invisible para la UI — sesión UX aparte).
- Estado del pedido (en camino / entregado): ejercicio auto-dirigido — es el
  patrón `tipo_embalaje` (columna + CHECK + default + filtrado UI).
- Los pendientes del sprint de la app real (staging separado, paginación,
  refactor por lotes del importador) siguen vivos en el tracker.
