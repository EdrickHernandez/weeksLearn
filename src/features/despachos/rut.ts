/**
 * Quita el formato de lectura y conserva solo cuerpo + dígito verificador.
 * Ejemplo: "12.345.678-k" → "12345678K".
 */
function quitarFormato(raw: string): string {
  return raw.replace(/[.\-\s]/g, '').toUpperCase()
}

/** Calcula el dígito verificador chileno para el cuerpo numérico. */
function digitoVerificador(cuerpo: string): string {
  let suma = 0
  let factor = 2

  for (let indice = cuerpo.length - 1; indice >= 0; indice -= 1) {
    suma += Number(cuerpo[indice]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }

  const resto = 11 - (suma % 11)
  if (resto === 11) return '0'
  if (resto === 10) return 'K'
  return String(resto)
}

/** Indica si el RUT tiene cuerpo y dígito verificador coherentes. */
export function isRutValido(raw: string): boolean {
  const limpio = quitarFormato(raw)
  const coincidencia = /^(\d{1,8})([\dK])$/.exec(limpio)
  if (!coincidencia) return false

  const [, cuerpo, verificador] = coincidencia
  return digitoVerificador(cuerpo) === verificador
}

/** Devuelve el RUT canónico para persistir en la base de datos. */
export function normalizeRut(raw: string): string {
  const limpio = quitarFormato(raw)
  if (!isRutValido(limpio)) {
    throw new Error(`normalizeRut: RUT inválido ("${raw}")`)
  }
  return limpio
}
