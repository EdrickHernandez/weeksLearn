# ADR-0003: TypeScript 7 nativo con alias side-by-side de TS6 para tooling

## Estado

Aceptado

## Fecha

2026-09-21

## Contexto

TypeScript 7 (el compilador nativo en Go, publicado como paquete `typescript` v7) es drásticamente más rápido para `tsc`, pero **no expone JavaScript API**: toda su superficie es CLI. `typescript-eslint` depende de la JS API del compilador para construir su AST y no puede soportar TS7 todavía (issue typescript-eslint#10940, abierto a la fecha de este ADR). El proyecto quiere velocidad de typecheck y a la vez necesita eslint-plugin-react-hooks, @tanstack/eslint-plugin-router y typescript-eslint en el pre-commit y en CI.

## Decisión

Mantenemos un alias **side-by-side** en `package.json`:

- `@typescript/native` → `npm:typescript@^7.0.2`: el `tsc` del proyecto (`pnpm typecheck` ejecuta el TS7 nativo).
- `typescript` → `npm:@typescript/typescript6@^6.0.2`: la versión con JS API que usan typescript-eslint y el resto de la tooling.

## Consecuencias

- `pnpm typecheck` corre con TS7 nativo: typechecks completos en una fracción del tiempo, lo que hace viable el check en pre-push y en cada push de CI.
- ESLint y sus plugins siguen funcionando sin cambios contra la API de TS6.
- Coexisten dos versiones del compilador en `package.json`; es un alias explícito y documentado, no una instalación accidental.
- Las features de lenguaje se verifican con TS7 (el compilador que compila), y las reglas de lint con el AST de TS6; desalineaciones temporales entre ambos son posibles pero improbables dentro de la misma major de lenguaje.
- Revisar este ADR cuando typescript-eslint publique soporte de TS7 para eliminar el alias y dejar un solo compilador.

## Alternativas consideradas

- **Solo TS6** (`typescript` estándar): máxima compatibilidad con la tooling, pero se pierde la velocidad del compilador nativo y se paga typechecks lentos en cada push durante las 10 semanas.
- **Solo TS7 y prescindir de typescript-eslint**: rompe reglas críticas del proyecto (react-hooks, boundaries de imports); el lint no es negociable en un starter cuyo valor son los defaults fuertes.
- **Pinar TS7 con `expect.typeErrors` en pruebas**: convertir los typechecks en tests es frágil y opaco comparado con `tsc --noEmit` directo.
