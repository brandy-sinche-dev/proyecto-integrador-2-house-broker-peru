export interface NormalizedApiError {
  userMessage?: string
  status?: number
}

/** Devuelve un mensaje de error amigable para mostrar en la UI. */
export function getErrorMessage(error: unknown, fallback = 'Algo salió mal. Inténtalo de nuevo.'): string {
  const normalized = error as NormalizedApiError | undefined
  if (normalized?.userMessage) return normalized.userMessage
  if (error instanceof Error && error.message) return error.message
  return fallback
}