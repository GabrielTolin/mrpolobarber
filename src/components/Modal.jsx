import { useEffect } from 'react'
import { X } from 'lucide-react'

// Janela sobre a página: folha que sobe de baixo no telemóvel, centrada no computador.
export default function Modal({ titulo, onFechar, children, largura = 'max-w-lg' }) {
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
    }
  }, [onFechar])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/70" onClick={onFechar} />
      <div
        className={`relative max-h-[92vh] w-full ${largura} overflow-y-auto rounded-t-2xl border border-line bg-bg p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl sm:p-6`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="card-title">{titulo}</h2>
          <button type="button" aria-label="Fechar" onClick={onFechar} className="rounded-lg p-2 text-muted hover:bg-hover hover:text-fg">
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
