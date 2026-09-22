# Plantilla — Design Doc: Semana N — [Feature]

> Copia esta plantilla a `docs/week-N-[feature].md` y complétala antes de empezar la implementación.
> Un design doc corto y honesto vale más que uno largo y especulativo.

## Problema

¿Qué problema de usuario se aborda?

## Alcance

Qué se incluye y qué se excluye explícitamente.

## Arquitectura

Qué componentes participan y por qué.

## Modelo de datos

Tablas, propiedad, relaciones, índices y constraints.

## Seguridad

Autenticación, autorización, RLS, secretos, validación y rate limits.

## Propiedad del estado

Marca dónde vive cada pieza de estado de esta feature:

- [ ] **TanStack Query** — registros de BD, resultados de API, datos del usuario autenticado; estado de mutaciones; listas/detalles cacheados; datos optimistas.
- [ ] **Redux Toolkit** — estado local de UI complejo (visibilidad de modales, paneles, layout, command palette).
- [ ] **Estado de componente** — visibilidad de modales/paneles, layout local, campos de formulario antes del submit.
- [ ] **Parámetros de URL** — filtros/búsqueda compartibles o marcables.
- [ ] **Base de datos** — estado durable de negocio, entitlements, permisos (PostgreSQL/Supabase).
- [ ] **Solo servidor** — refresh tokens de OAuth y secretos de pagos (servidor/base de datos únicamente).

## Modos de falla

Qué puede fallar, qué ve el usuario y cómo se recupera el sistema.

## Trade-offs

Qué alternativa se rechazó y por qué.

## Respuestas de entrevista

Respuestas a las preguntas de comprobación de conocimiento de la semana.
