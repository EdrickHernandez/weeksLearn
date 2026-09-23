import { ExampleFeature } from '~/features/example-feature/components/example-feature'

export function ExamplePage() {
  return (
    <main className="container">
      <h1>Feature de ejemplo</h1>
      <p>
        Demuestra la convención de las 10 semanas: schemas Zod, service puro, Server Functions y
        hooks de TanStack Query.........
      </p>
      <ExampleFeature />
    </main>
  )
}
