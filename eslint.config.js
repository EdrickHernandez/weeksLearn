import js from '@eslint/js'
import tanstackRouter from '@tanstack/eslint-plugin-router'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default [
  // 1. Ignorados globales: artefactos generados y state de tooling.
  {
    ignores: [
      'dist',
      '.output',
      '.tanstack',
      '.vercel',
      'node_modules',
      'coverage',
      'src/routeTree.gen.ts',
      '.opencode',
      'pnpm-lock.yaml',
    ],
  },

  // 2. Base para todo JS/TS: recomendado de ESLint + typescript-eslint
  //    (sin type-checked: rápido y compatible con TS 7 nativo).
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. Globals según el entorno de cada archivo.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['vite.config.ts', 'vitest.config.ts', 'eslint.config.js', 'scripts/**'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // 4. Reglas de hooks de React.
  {
    ...reactHooks.configs.flat.recommended,
    files: ['src/**/*.{ts,tsx}'],
  },

  // 5. Fast Refresh: solo componentes (tsx), permitiendo export de constantes.
  //    allowExportNames: 'Route' es el patrón obligatorio de TanStack Router
  //    (export const Route junto al componente en archivos de ruta).
  {
    files: ['src/**/*.tsx'],
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['Route'] },
      ],
    },
  },

  // 6. Convenciones de TanStack Router en archivos de rutas.
  {
    ...tanstackRouter.configs['flat/recommended'][0],
    files: ['src/routes/**/*.{ts,tsx}'],
  },

  // 7. REGLA DE ARQUITECTURA: src/server/** es SOLO-SERVIDOR.
  //    Únicamente los Server Functions (functions.ts) pueden importarlo.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/server/**', 'src/**/functions.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/server/**', '~/server/**'],
              message:
                'src/server/** es código solo-servidor. Solo los Server Functions (functions.ts) pueden importarlo.',
            },
          ],
        },
      ],
    },
  },

  // 8. Tests: sin restricciones de fast-refresh (no son componentes de UI).
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // Prettier al final: desactiva reglas de formato que le corresponden a Prettier.
  eslintConfigPrettier,
]
