import React, { useEffect } from 'react'

export function ImageGalleryModal({ images, initialIndex = 0, onClose }: { images: string[], initialIndex?: number, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, images.length])

  if (!images || images.length === 0) return null

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', fontSize: '48px', cursor: 'pointer' }}>&times;</button>
      
      <div style={{ position: 'relative', width: '90%', height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {images.length > 1 && <button onClick={(e) => { e.stopPropagation(); prev(); }} style={{ position: 'absolute', left: '10px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '32px', padding: '10px 20px', cursor: 'pointer', borderRadius: '50%' }}>&#10094;</button>}
        
        <img src={images[currentIndex]} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Galería de inmueble" />
        
        {images.length > 1 && <button onClick={(e) => { e.stopPropagation(); next(); }} style={{ position: 'absolute', right: '10px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '32px', padding: '10px 20px', cursor: 'pointer', borderRadius: '50%' }}>&#10095;</button>}
      </div>
      
      <div style={{ color: 'white', marginTop: '20px', fontSize: '16px' }}>{currentIndex + 1} / {images.length}</div>
    </div>
  )
}
