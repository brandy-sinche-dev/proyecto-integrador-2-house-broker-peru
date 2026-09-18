import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Diálogo de confirmación accesible: rol `alertdialog`, cierre con Esc,
 * foco gestionado (se mueve al abrir y se restaura al cerrar) y Tab encerrado.
 * Sustituye al `window.confirm()` nativo.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const onCancelRef = useRef(onCancel)
  const onConfirmRef = useRef(onConfirm)

  useEffect(() => {
    onCancelRef.current = onCancel
    onConfirmRef.current = onConfirm
  })

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const focusables = () =>
      dialogRef.current
        ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button'))
        : []
    focusables()[0]?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancelRef.current()
        return
      }
      if (e.key === 'Tab') {
        const items = focusables()
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="hdialog" role="presentation">
      <div
        className="hdialog__overlay"
        onClick={onCancel}
        aria-hidden="true"
        data-testid="confirm-dialog-overlay"
      />
      <div
        ref={dialogRef}
        className="hdialog__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <h2 id={titleId} className="hdialog__title">
          {title}
        </h2>
        <div id={descId} className="hdialog__message">
          {message}
        </div>
        <div className="hdialog__actions">
          <Button type="button" variant="neutral" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}