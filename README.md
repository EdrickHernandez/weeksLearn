# Fullstack Starter — Proyecto de 10 semanas

Base full-stack con defaults fuertes: cada semana del roadmap añade una feature sin redecidir tooling. TanStack Start para SSR y RPC tipado, Supabase para datos con RLS, y convenciones de estado y seguridad que se aplican solas (Zod en boundaries, ESLint protegiendo el código de servidor, CI en cada push).

## Stack

| Herramienta                     | Rol                                                   |
| ------------------------------- | ----------------------------------------------------- |
| TanStack Start v1               | Framework: SSR + Server Functions (RPC tipado)        |
| TanStack Query 5                | Estado de servidor (cache, retries, mutaciones)       |
| Redux Toolkit                   | Estado local de UI compleja (store vacía a propósito) |
| Supabase / PostgreSQL           | Datos, auth y Row Level Security                      |
| Zod 4                           | Validación en todos los boundaries                    |
| Vite 8 + Nitro                  | Build y deploy en Vercel con previews por PR          |
| Vitest 5 + Testing Library      | Tests unitarios y de componentes                      |
| ESLint 10 + Prettier + lefthook | Lint, formato y git hooks (pre-commit / pre-push)     |
| GitHub Actions                  | CI: lint, typecheck, test y build                     |

## Requisitos

- **Node >= 22**
- **pnpm** — si no lo tienes: `corepack enable`
- **Docker** (opcional, solo para la base de datos local de Supabase)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env   # completar los valores
pnpm dev               # http://localhost:3000
```

Base de datos local (opcional):

```bash
pnpm exec supabase start   # requiere Docker
pnpm db:reset              # aplica todas las migraciones desde cero
```

## Scripts

| Script              | Comando                         | Qué hace                                          |
| ------------------- | ------------------------------- | ------------------------------------------------- |
| `pnpm dev`          | `vite dev`                      | Servidor de desarrollo                            |
| `pnpm build`        | `vite build`                    | Build de producción (Nitro → `.output/`)          |
| `pnpm typecheck`    | `tsc --noEmit`                  | Typecheck con TS7 nativo                          |
| `pnpm lint`         | `eslint .`                      | Lint del proyecto                                 |
| `pnpm format`       | `prettier --write .`            | Formatea todos los archivos                       |
| `pnpm format:check` | `prettier --check .`            | Verifica formato sin escribir                     |
| `pnpm test`         | `vitest run`                    | Ejecuta la suite de tests una vez                 |
| `pnpm test:watch`   | `vitest`                        | Tests en modo watch                               |
| `pnpm preview`      | `vite preview`                  | Preview local del build                           |
| `pnpm start`        | `node .output/server/index.mjs` | Sirve el build de producción (Nitro)              |
| `pnpm db:new`       | `supabase migration new`        | Crea una migración nueva con timestamp            |
| `pnpm db:reset`     | `supabase db reset`             | Reconstruye la BD local aplicando las migraciones |
| `pnpm db:push`      | `supabase db push`              | Aplica migraciones pendientes a la BD remota      |
| `pnpm db:pull`      | `supabase db pull`              | Trae cambios del dashboard remoto como migración  |
| `pnpm db:diff`      | `supabase db diff`              | Muestra el diff entre migraciones y la BD         |

## Estructura

```
.
├── src/
│   ├── features/            # Features verticales: schemas, service, functions, queries, mutations, components
│   │   └── example-feature/ # Ejemplo de referencia que demuestra todas las convenciones
│   ├── server/              # SOLO-SERVIDOR: clientes Supabase SSR/admin y sesión. Protegido por ESLint
│   ├── store/               # Store Redux Toolkit (vacía) + hooks tipados
│   ├── lib/                 # Env tipada fail-fast, cliente Supabase del navegador, Query client
│   ├── routes/              # Rutas de TanStack Router
│   └── test/                # Setup de Vitest
├── docs/                    # Convenciones, migraciones, plantillas y design docs semanales
│   └── decisions/           # ADRs
├── supabase/                # Config y migraciones de la base de datos
└── vite.config.ts           # Vite + Nitro (target de deploy Vercel)
```

## Convenciones y migraciones

- [docs/conventions.md](docs/conventions.md) — propiedad del estado, límites de request, estructura de feature y reglas de frontera servidor.
- [docs/migrations.md](docs/migrations.md) — workflow de migraciones (crear, aplicar local, promover a remoto). Una migración aplicada jamás se edita.

## Deploy (Vercel)

1. Sube el repositorio a GitHub.
2. Impórtalo en [vercel.com/new](https://vercel.com/new): detecta TanStack Start automáticamente (Nitro ya está en `vite.config.ts`).
3. Configura las variables de entorno en el dashboard para **Production y Preview**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (solo-servidor; nunca con prefijo `VITE_`)
4. Cada PR genera un **preview automático**; el merge a `main` despliega a **producción**.

## CI

GitHub Actions ejecuta **lint, typecheck, test y build** en cada push y pull request. El merge requiere CI en verde.

## Roadmap

Proyecto de 10 semanas guiado por el roadmap (`.opencode/skills/roadmap/SKILL.MD`): cada semana entrega un PR, un diagrama de arquitectura y un design doc.

- Semana 0 (esta base): [docs/week-0-foundation.md](docs/week-0-foundation.md)
