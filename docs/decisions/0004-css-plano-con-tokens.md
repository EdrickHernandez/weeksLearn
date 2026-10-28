# ADR-0004: CSS plano con tokens de diseño (sin framework de utilities)

## Estado

Aceptado

## Fecha

2026-10-23

## Contexto

La Semana 0 dejó la decisión de estilos explícitamente diferida ("Tailwind o cualquier sistema de estilos: se decide en su semana"). La rama `week-2-ui-admin` es esa semana: el dashboard admin desktop pasa de CSS plano heredado (~161 líneas, sin sistema) a una identidad visual propia. Fuerzas en juego: superficie pequeña y cohesiva (login, dashboard, tabla de 12 columnas, formulario de ~17 campos), un desarrollador cuyo objetivo es dominar los mecanismos de la plataforma (cascada, herencia, especificidad, accesibilidad) para entrevistas, y un starter cuya filosofía es no redecidir tooling ni acumular dependencias sin justificación. El alcance actual es un MVP de un solo producto, no una biblioteca de superficies heterogéneas.

## Decisión

Usamos **CSS plano con tokens de diseño** (`src/styles/tokens.css`): custom properties semánticas (`--papel`, `--tinta`, `--senal`) como única fuente de verdad visual, consumidas por clases con nombre de significado (`.btn-primario`, no `bg-orange-600`). Los componentes nunca escriben valores crudos: el hex vive solo en `tokens.css`.

## Consecuencias

- Cambiar una decisión visual es tocar una línea: el valor se propaga por herencia en cascada a todo componente que consuma el token.
- El JSX queda legible: los nombres dicen para qué sirve cada pieza (`.fila-despacho`), no qué propiedades aplican — relevante en un formulario de ~17 campos donde las utilities producirían 4–6 clases por elemento.
- Los mecanismos quedan a la vista y aprendibles: foco de teclado, `prefers-reduced-motion` y contraste se escriben y entienden, no llegan ocultos detrás de una utility.
- Riesgo aceptado: al escalar superficies nuevas y heterogéneas, componer layout a mano será más lento que utilities (costo de velocidad en páginas nuevas, no en cambiar decisiones). Mitigación: la migración a un framework de utilities es un refactor contenido — los tokens se mapean 1:1 al `@theme` de Tailwind 4. La decisión es reversible.
- Riesgo aceptado: nada impide técnicamente escribir un hex crudo fuera de `tokens.css` (los tokens son convención, no un linter). Mitigación: revisión en PR; el archivo de tokens es pequeño y auditable.

## Alternativas consideradas

- **Tailwind 4**: velocidad de composición para páginas nuevas y consistencia forzada por escala. Se rechaza por tres razones: el costo de adopción toca todos los archivos existentes; la acumulación de utilities degrada la legibilidad en formularios y tablas densas; y oculta los mecanismos de plataforma que este proyecto busca anclar. Queda registrado como camino de migración si la fricción aparece.
- **CSS-in-JS (styled-components)**: alcance por componente sin convenciones de nombres. Se rechaza porque añade runtime y complejidad de SSR sobre Vite/Nitro para una superficie que no lo necesita, y una dependencia más que el starter tendría que sostener las 8 semanas restantes.
- **CSS Modules**: encapsulamiento por archivo sin runtime. Se descarta por ahora porque la superficie es un solo producto cohesivo — no una biblioteca multi-equipo — y las clases semánticas globales con tokens ya resuelven el conflicto de nombres a este tamaño. Re-evaluable si aparecen superficies independientes.
