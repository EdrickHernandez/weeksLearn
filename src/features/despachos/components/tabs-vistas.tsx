import * as React from 'react'
import type { DespachoFiltrosUrl } from '../schemas'

export type VistaTemporal = 'general' | 'anio' | 'mes' | 'semana' | 'dia'

const OPCIONES: readonly { valor: VistaTemporal; etiqueta: string }[] = [
  { valor: 'general', etiqueta: 'General' },
  { valor: 'anio', etiqueta: 'Año' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'dia', etiqueta: 'Día' },
]

export type TabsVistasProps = {
  filtros: DespachoFiltrosUrl
  ahora: Date
  onCambiar: (cambios: Partial<DespachoFiltrosUrl>) => void
}

function fechaTexto(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

function rangoDe(vista: Exclude<VistaTemporal, 'general'>, ahora: Date) {
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth()

  if (vista === 'dia') {
    return { desde: fechaTexto(ahora), hasta: fechaTexto(ahora) }
  }

  if (vista === 'mes') {
    return {
      desde: fechaTexto(new Date(anio, mes, 1)),
      hasta: fechaTexto(new Date(anio, mes + 1, 0)),
    }
  }

  if (vista === 'anio') {
    return {
      desde: fechaTexto(new Date(anio, 0, 1)),
      hasta: fechaTexto(new Date(anio, 11, 31)),
    }
  }

  const diasDesdeLunes = (ahora.getDay() + 6) % 7
  const lunes = new Date(anio, mes, ahora.getDate() - diasDesdeLunes)
  const domingo = new Date(anio, mes, ahora.getDate() - diasDesdeLunes + 6)
  return { desde: fechaTexto(lunes), hasta: fechaTexto(domingo) }
}

export function TabsVistas({ filtros, ahora, onCambiar }: TabsVistasProps) {
  const diaActivo = filtros.vista === 'dia'
  const fechaDia = diaActivo ? (filtros.desde ?? fechaTexto(ahora)) : fechaTexto(ahora)

  function seleccionar(vista: VistaTemporal) {
    if (vista === 'general') {
      onCambiar({ vista: undefined, desde: undefined, hasta: undefined, pagina: undefined })
      return
    }

    onCambiar({ vista, ...rangoDe(vista, ahora), pagina: undefined })
  }

  function cambiarDia(fecha: string) {
    if (!fecha) return
    onCambiar({ vista: 'dia', desde: fecha, hasta: fecha, pagina: undefined })
  }

  return (
    <nav className="tabs-vistas" aria-label="Rango temporal">
      {OPCIONES.map(({ valor, etiqueta }) => {
        const activo =
          valor === 'general'
            ? !filtros.vista && !filtros.desde && !filtros.hasta
            : filtros.vista === valor

        if (valor === 'dia') {
          return (
            <label
              className={`tabs-vistas-dia${activo ? ' activo' : ''}`}
              aria-current={activo ? 'page' : undefined}
              key={valor}
            >
              <span>{etiqueta}</span>
              <input
                type="date"
                value={fechaDia}
                onFocus={() => {
                  if (!diaActivo) seleccionar('dia')
                }}
                onChange={(evento) => cambiarDia(evento.target.value)}
                aria-label="Fecha de la vista Día"
              />
            </label>
          )
        }

        return (
          <button
            key={valor}
            type="button"
            className={activo ? 'activo' : ''}
            aria-current={activo ? 'page' : undefined}
            onClick={() => seleccionar(valor)}
          >
            {etiqueta}
          </button>
        )
      })}
    </nav>
  )
}
