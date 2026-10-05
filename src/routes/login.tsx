import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionUserFn } from '~/features/auth/functions'
import { LoginPage } from './-login'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    // Ya autenticado: no tiene sentido ver el login.
    const user = await getSessionUserFn()
    if (user) throw redirect({ to: '/' })
  },
  component: LoginPage,
})
