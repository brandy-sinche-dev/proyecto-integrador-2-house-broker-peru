import { memo } from 'react'

interface FavoriteButtonProps {
  saved: boolean
  propertyTitle: string
  onToggle: () => void
  className?: string
}

function IconHeart() {
  return (
    <svg viewBox="0 0 20 18" aria-hidden="true">
      <path 
        d="M10 16.4S2.6 11.8 2.6 6.9A3.8 3.8 0 0 1 10 4.5a3.8 3.8 0 0 1 7.4 2.4c0 4.9-7.4 9.5-7.4 9.5Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.6" 
        strokeLinejoin="round" 
      />
    </svg>
  )
}

export const FavoriteButton = memo(function FavoriteButton({
  saved,
  propertyTitle,
  onToggle,
  className = 'hpc__icon-btn',
}: FavoriteButtonProps) {
  return (
    <button
      type="button"
      className={`${className} ${saved ? 'is-saved' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={saved}
      aria-label={saved ? `Quitar ${propertyTitle} de guardados` : `Guardar ${propertyTitle}`}
    >
      <IconHeart />
    </button>
  )
})
