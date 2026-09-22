# ADR-0002: Estrategia de estado y límites de frontera

## Estado

Aceptado

## Fecha

2026-09-21

## Contexto

Un starter de 10 semanas necesita una regla de arquitectura que resuelva dos preguntas en cada feature: dónde vive cada tipo de estado y por dónde cruzan los requests. Sin una regla explícita, cada feature improvisa (estado de servidor copiado a Redux, secretos importados desde el cliente, validaciones dispersas) y la deuda crece semana a semana. Además, `src/server/**` contiene clientes con privilegios (service role, cookies) que no deben llegar jamás al bundle del navegador.

## Decisión

Usamos **TanStack Query** para todo el estado de servidor (cache, retries, mutaciones, datos optimistas) y **Redux Toolkit** solo para estado local de UI compleja —la store queda configurada pero vacía hasta que una feature lo justifique—. Validamos con **Zod en todos los boundaries** (`.validator` de las Server Functions). Una regla ESLint `no-restricted-imports` protege `src/server/**`: solo los `functions.ts` de cada feature pueden importarlo. Cada feature sigue la estructura `schemas.ts / service.ts / functions.ts / queries/ / mutations/ / components/`.

## Consecuencias

- No hay duplicación entre cache de Query y store global: un solo dueño por dato.
- La validación de entradas es automática y visible: el tipo del input de la Server Function nace del esquema Zod de la feature.
- La frontera servidor se aplica en el editor: un import prohibido es un error de lint inmediato, no una revisión de PR.
- Añadir un slice de RTK es opt-in y por-feature; los hooks tipados ya existen, así que el coste futuro es mínimo.
- La estructura de feature exige disciplina inicial (separar lógica pura de IO), pero hace cada feature testeable de forma aislada.

## Alternativas consideradas

- **RTK Query**: cubre cache y fetching, pero duplica el rol de TanStack Query y mantendría dos sistemas de datos de servidor; rechazado porque Query ya está en el stack por los hooks de lectura.
- **tRPC**: da tipado end-to-end, pero las Server Functions de TanStack Start ya lo proporcionan de forma nativa con el router del proyecto; añadir tRPC sería una segunda capa de RPC redundante.
- **zustand**: válido para estado local de UI; no se adopta por defecto porque RTK ya está integrado con hooks tipados. Si una feature puntual necesita una store mínima sin ceremony, se puede añadir por-feature sin romper la convención.
- **Validación manual en cada handler**: rechazada por inconsistente; `.validator` centraliza la validación en el boundary y elimina el caso "este endpoint se olvidó de validar".
