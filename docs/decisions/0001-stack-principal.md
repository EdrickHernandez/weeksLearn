# ADR-0001: Stack principal — TanStack Start + Vite + React 19 sobre Nitro, con pnpm

## Estado

Aceptado

## Fecha

2026-09-21

## Contexto

El proyecto es un starter full-stack para un roadmap de 10 semanas que entregará features con SSR, Server Functions, base de datos PostgreSQL y previews de despliegue por PR. Se necesita un framework React que soporte RPC tipado end-to-end (cliente ↔ servidor), una experiencia Vite moderna y una ruta de despliegue que no consuma tiempo de sprint en configuración de infraestructura. El roadmap fija además que las acciones autenticadas same-origin van por Server Functions, lo que descarta stacks sin esa primitiva.

## Decisión

Usamos **TanStack Start v1 + Vite 8 + React 19** como stack de aplicación, con **Nitro** configurado en `vite.config.ts` como target de build para desplegar en **Vercel** con previews automáticos por PR. Usamos **pnpm** (fijado en `packageManager`) como único gestor de paquetes.

## Consecuencias

- Las Server Functions dan RPC same-origin tipado end-to-end sin mantener una capa de API a mano; los endpoints públicos (webhooks, OAuth) se añadirán como server routes explícitas cuando lleguen.
- Vercel detecta el proyecto sin configuración adicional y cada PR genera un preview aislado, lo que valida visualmente cada semana del roadmap.
- pnpm garantiza installs rápidos y reproducibles vía `pnpm-lock.yaml` y `corepack` en CI.
- Nitro añade una capa de abstracción sobre el build; aceptamos ese coste a cambio del deploy zero-config.
- TanStack Start es un producto v1: aceptamos una superficie de cambios más activa que en alternativas más maduras.

## Alternativas consideradas

- **Next.js**: el framework React más establecido y con mayor mercado laboral; rechazado porque su capa de servidor (route handlers, server actions) acopla el proyecto a su ecosistema y su enfoque de datos, mientras que el roadmap estandariza TanStack Router/Query como núcleo y App Router habría duplicado decisiones de estado de servidor.
- **Remix / React Router en modo framework**: excelente modelo de loaders/actions; rechazado porque las Server Functions de TanStack Start cubren el mismo caso (RPC tipado) manteniendo un solo ecosistema TanStack para router, datos y servidor.
- **npm / yarn**: npm no requiere instalación pero es más lento y menos estricto con el grafo de dependencias; yarn clásico aporta poco sobre pnpm. pnpm gana en velocidad, uso de disco y garantías de aislamiento.
