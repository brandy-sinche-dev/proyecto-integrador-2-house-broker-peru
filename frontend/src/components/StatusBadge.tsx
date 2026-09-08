import './StatusBadge.css'

interface StatusBadgeProps {
  active: boolean
}

export function StatusBadge({ active }: StatusBadgeProps) {
  return <span className={`hstatus ${active ? 'hstatus--active' : 'hstatus--inactive'}`}>{active ? 'Activo' : 'Inactivo'}</span>
}
