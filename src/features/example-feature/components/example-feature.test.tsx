import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '~/lib/query-client'
// El mock sustituye el boundary del servidor: los tests ejercitan los hooks
// reales de TanStack Query y el componente, sin tocar código de servidor.
import { shoutGreetingFn } from '../functions'
import { ExampleFeature } from './example-feature'

const { baseGreeting, shoutedGreeting } = vi.hoisted(() => {
  const baseGreeting = {
    message: 'Hola, Ada! Este saludo vino del servidor.',
    shouted: false,
    createdAt: '2026-09-21T10:00:00.000Z',
  }
  return {
    baseGreeting,
    shoutedGreeting: {
      ...baseGreeting,
      message: `${baseGreeting.message.toUpperCase()}!!!`,
      shouted: true,
    },
  }
})

vi.mock('../functions', () => ({
  getGreeting: vi.fn().mockResolvedValue(baseGreeting),
  shoutGreetingFn: vi.fn().mockResolvedValue(shoutedGreeting),
}))

function renderExampleFeature() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <ExampleFeature />
    </QueryClientProvider>,
  )
}

describe('ExampleFeature', () => {
  beforeEach(() => {
    vi.mocked(shoutGreetingFn).mockClear()
  })

  it('muestra el saludo del servidor al escribir un nombre', async () => {
    renderExampleFeature()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Tu nombre'), 'Ada')

    expect(await screen.findByText(baseGreeting.message)).toBeInTheDocument()
  })

  it('muestra el saludo gritado al pulsar "¡GRITAR!"', async () => {
    renderExampleFeature()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Tu nombre'), 'Ada')
    await screen.findByText(baseGreeting.message)
    await user.click(screen.getByRole('button', { name: '¡GRITAR!' }))

    expect(await screen.findByText(shoutedGreeting.message)).toBeInTheDocument()
    expect(shoutGreetingFn).toHaveBeenCalledWith({ data: baseGreeting })
  })
})
