# Convenciones del repositorio

Regla central de arquitectura: TanStack Query para estado remoto/servidor, Redux Toolkit solo para estado local de UI complejo, TanStack Start Server Functions para RPC autenticado same-origin, y server routes públicas para webhooks y callbacks OAuth externos.

## 1. Propiedad del estado

| Tipo de estado                                                    | Dónde vive                           |
| ----------------------------------------------------------------- | ------------------------------------ |
| Registros de BD, resultados de API, datos del usuario autenticado | TanStack Query                       |
| Estado de mutaciones, listas/detalles cacheados, datos optimistas | TanStack Query                       |
| Visibilidad de modales, paneles, layout local, command palette    | Redux Toolkit o estado de componente |
| Campos de formulario antes del submit                             | Estado local de componente           |
| Filtros/búsqueda compartibles o marcables                         | Parámetros de URL                    |
| Estado durable de negocio, entitlements, permisos                 | PostgreSQL/Supabase                  |
| Refresh tokens de OAuth y secretos de pagos                       | Solo servidor/base de datos          |

Ante la duda: si el dato viene del servidor o vuelve al servidor, es de TanStack Query; si solo existe en la pantalla, es de Redux Toolkit o del componente.

## 2. Límites de request

| Tipo de request                      | Canal                                    |
| ------------------------------------ | ---------------------------------------- |
| Acciones same-origin autenticadas    | TanStack Start Server Functions          |
| Lecturas y mutaciones de páginas/API | TanStack Query + Server Functions/routes |
| Callbacks de proveedores OAuth       | Server routes públicas                   |
| Webhooks de Telegram/Mercado Pago    | Server routes públicas                   |
| Trabajo de larga duración            | Capa de jobs/workers cuando se necesite  |

El navegador nunca llama directo a proveedores externos con secretos; todo cruce de frontera pasa por el servidor.

## 3. Estructura de una feature

Cada feature vive en `src/features/<nombre>/` con esta forma:

```
src/features/<nombre>/
├── components/   # UI (React)
├── queries/      # Hooks de TanStack Query que llaman Server Functions
├── mutations/    # Hooks de mutación
├── schemas.ts    # Esquemas Zod compartidos: la ÚNICA fuente de verdad de tipos de la feature
├── service.ts    # Lógica de dominio PURA: sin imports de red, base de datos ni servidor; testeable de forma aislada
└── functions.ts  # Server Functions de la feature: el ÚNICO puente permitido hacia src/server/**
```

Reglas:

- `schemas.ts` es la única fuente de verdad de tipos: componentes, hooks y funciones consumen los tipos inferidos de los esquemas Zod.
- `service.ts` contiene la lógica de negocio pura y no sabe cómo llegan los datos ni a dónde van.
- `functions.ts` valida entradas en el boundary y delega la lógica en `service.ts`.

## 4. Reglas de frontera servidor

- `src/server/**` es **solo-servidor** y jamás se importa desde `components/`, `queries/`, `mutations/` ni `routes/`. El único puente son las Server Functions de cada feature (`functions.ts`).
- `service.ts` nunca importa infraestructura (red, base de datos, servidor): solo tipos y esquemas.
- Los secretos viven solo en el servidor; nunca en código cliente, bundles ni localStorage.
- La validación de entradas se hace con Zod en el boundary usando `.validator()` de las Server Functions: nada entra al servidor sin validar.
