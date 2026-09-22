import '@testing-library/jest-dom/vitest'

// Valores de entorno de prueba: permiten importar módulos que validan
// variables públicas al cargar (fail-fast) sin romper los tests.
import { vi } from 'vitest'

vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
