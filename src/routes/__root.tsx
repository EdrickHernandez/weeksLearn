import { createRootRoute } from '@tanstack/react-router'
import { RootComponent } from './-root'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Tracker de Despachos' },
    ],
    links: [
      // Fuentes del sistema visual (ADR-0004): Barlow Semi Condensed nace de la
      // señalética vial (mundo despachos); Plex Mono para los valores estampados.
      // preconnect abre la conexión al CDN antes de que el CSS lo pida.
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
})
