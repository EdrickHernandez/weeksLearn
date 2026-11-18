const ZONA_CHILE = 'America/Santiago'

const FORMATO_OFFSET = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA_CHILE,
  timeZoneName: 'longOffset',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function offsetChileEn(date: Date): number {
  const zona = FORMATO_OFFSET.formatToParts(date).find(
    (parte) => parte.type === 'timeZoneName',
  )?.value

  if (!zona || zona === 'GMT') return 0

  const coincidencia = /^GMT([+-])(\d{2}):(\d{2})$/.exec(zona)
  if (!coincidencia) throw new Error(`No se pudo leer el offset de ${ZONA_CHILE}: ${zona}`)

  const [, signo, horas, minutos] = coincidencia
  const totalMinutos = Number(horas) * 60 + Number(minutos)
  return (signo === '+' ? 1 : -1) * totalMinutos * 60_000
}

function componentesValidos(local: string): boolean {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!coincidencia) return false

  const [, anio, mes, dia, hora, minuto] = coincidencia
  const fecha = new Date(
    Date.UTC(Number(anio), Number(mes) - 1, Number(dia), Number(hora), Number(minuto)),
  )

  return (
    fecha.getUTCFullYear() === Number(anio) &&
    fecha.getUTCMonth() === Number(mes) - 1 &&
    fecha.getUTCDate() === Number(dia) &&
    fecha.getUTCHours() === Number(hora) &&
    fecha.getUTCMinutes() === Number(minuto)
  )
}

/** Convierte YYYY-MM-DDTHH:mm local de Chile en ISO UTC. */
export function fechaHoraChileAISO(local: string): string {
  if (!componentesValidos(local)) {
    throw new Error('La fecha y hora de entrega no son válidas')
  }

  const [fecha, hora] = local.split('T')
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const [horas, minutos] = hora.split(':').map(Number)
  const relojSinZona = Date.UTC(anio, mes - 1, dia, horas, minutos)

  // Primera aproximación: el offset se obtiene con la misma fecha aproximada.
  const offsetInicial = offsetChileEn(new Date(relojSinZona))
  const primeraAproximacion = new Date(relojSinZona - offsetInicial)

  // Segunda lectura: cubre cambios de horario de verano cerca de la fecha.
  const offsetReal = offsetChileEn(primeraAproximacion)
  return new Date(relojSinZona - offsetReal).toISOString()
}

/** Convierte y rechaza instantes posteriores al reloj recibido. */
export function fechaEntregaAISO(local: string, ahora = new Date()): string {
  const iso = fechaHoraChileAISO(local)
  if (new Date(iso).getTime() > ahora.getTime()) {
    throw new Error('La fecha de entrega no puede estar en el futuro')
  }
  return iso
}
