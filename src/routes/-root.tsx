import * as React from 'react'
import type { ReactNode } from 'react'
import { Outlet, HeadContent, Scripts } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Provider as ReduxProvider } from 'react-redux'
import { createQueryClient } from '~/lib/query-client'
import { store } from '~/store'

/** Raíz de la app: monta los providers globales sobre el Outlet del router. */
export function RootComponent() {
  const [queryClient] = React.useState(() => createQueryClient())

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <ReduxProvider store={store}>
          <Outlet />
          {import.meta.env.DEV ? (
            <>
              <TanStackRouterDevtools position="bottom-right" />
              <ReactQueryDevtools initialIsOpen={false} />
            </>
          ) : null}
        </ReduxProvider>
      </QueryClientProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
