import { createFileRoute } from '@tanstack/react-router'
import { ExamplePage } from './-example-page'

export const Route = createFileRoute('/example')({
  component: ExamplePage,
})
