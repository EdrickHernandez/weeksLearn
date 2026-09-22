import { configureStore } from '@reduxjs/toolkit'

/**
 * Semana 0: la store está VACÍA a propósito.
 * Añade slices SOLO para estado local complejo de UI (modales, paneles,
 * layout del workspace). El estado de servidor vive en TanStack Query;
 * el estado durable de negocio vive en PostgreSQL/Supabase.
 */
export const makeStore = () =>
  configureStore({
    reducer: {},
  })

export const store = makeStore()

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
