# Flujo de migraciones de Supabase

Guía de trabajo con migraciones para la base de datos local y remota del proyecto.

## Prerrequisitos

- **pnpm**: gestor de paquetes del proyecto. La CLI de Supabase ya está instalada como devDependency.
- **Docker Desktop**: necesario solo para levantar la base de datos local (la CLI de Supabase corre Postgres en contenedores).

## Comandos

| Comando                    | Qué hace                                                            |
| -------------------------- | ------------------------------------------------------------------- |
| `pnpm exec supabase start` | Levanta la base de datos local (Docker).                            |
| `pnpm db:new <nombre>`     | Crea una migración vacía en `supabase/migrations/`.                 |
| `pnpm db:reset`            | Reconstruye la BD local aplicando todas las migraciones desde cero. |
| `pnpm db:diff`             | Genera el SQL diff del esquema actual.                              |
| `pnpm db:pull`             | Trae cambios del proyecto Supabase remoto como migración.           |
| `pnpm db:push`             | Aplica migraciones pendientes al proyecto remoto.                   |

## Reglas de seguridad

1. **Nunca edites una migración ya aplicada.** Para corregir un error, crea una migración nueva que la reemplace (_supersede_).
2. **Prueba siempre con `db:reset` antes de `db:push`.** Si el reset no pasa limpio de punta a punta, el push tampoco pasará.
3. **Las migraciones son la única fuente de verdad del esquema.** Nada que exista solo en el dashboard remoto cuenta: si no está en `supabase/migrations/`, no existe.
4. **Toda tabla nueva debe habilitar RLS y definir políticas explícitas.** Sin políticas, la tabla queda bloqueada para clientes con anon key — pero RLS sin políticas explícitas significa que ni siquiera el usuario autenticado puede leerla: define siempre quién puede hacer qué.

## Flujo recomendado

1. **Local**: levanta la BD con `pnpm exec supabase start`.
2. **Nueva migración**: crea el archivo con `pnpm db:new <nombre>` y escribe el SQL (tablas, índices, constraints, RLS y políticas).
3. **Verifica**: aplica todo desde cero con `pnpm db:reset` y confirma que el esquema y las políticas quedan como esperas.
4. **Commit**: incluye la migración en el mismo PR que el código que la usa, y documenta el cambio en la sección "Datos y migraciones" del PR.
5. **Push remoto**: tras merge, aplica las migraciones pendientes al proyecto remoto con `pnpm db:push`.

Si otro developer aplicó cambios desde el dashboard remoto, recupéralos con `pnpm db:pull` y conviértelos en migración antes de seguir.

## Conectar el proyecto remoto (hosted)

1. `pnpm exec supabase login` (una vez, abre el navegador)
2. `pnpm exec supabase link --project-ref <ref>` (el ref está en Supabase Dashboard → Settings → General)
3. Luego `pnpm db:push` / `pnpm db:pull` ya operan contra el proyecto remoto.
