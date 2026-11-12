import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Download, Share2 } from 'lucide-react'

// Link de marcações (2.13 §2): o endereço do próprio site. Não se edita no painel
// (depende da Vercel). Copiar, partilhar e QR para o balcão.
const LINK = window.location.origin

export default function SeccaoLink({ nomeBarbearia }) {
  const [qr, setQr] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    QRCode.toDataURL(LINK, { width: 480, margin: 2, color: { dark: '#000000', light: '#ffffff' } }).then(setQr)
  }, [])

  async function copiar() {
    await navigator.clipboard.writeText(LINK)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function partilhar() {
    if (navigator.share) {
      try {
        await navigator.share({ title: nomeBarbearia, text: `Marque o seu horário no ${nomeBarbearia}:`, url: LINK })
      } catch {
        // partilha cancelada pelo utilizador
      }
    } else {
      copiar()
    }
  }

  return (
    <section className="card flex flex-col gap-4">
      <h2 className="card-title">Link de marcações</h2>
      <p className="text-sm text-muted">Partilhe este endereço no WhatsApp, no Instagram ou imprima o código QR para o balcão.</p>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {qr && <img src={qr} alt="Código QR do link de marcações" width="140" height="140" className="rounded-lg" />}
        <div className="flex min-w-0 flex-col gap-3">
          <p className="truncate font-serif text-2xl font-semibold text-gold">{LINK.replace(/^https?:\/\//, '')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copiar} className="btn-ghost flex items-center gap-2 px-4">
              <Copy size={16} strokeWidth={1.8} aria-hidden /> {copiado ? 'Copiado!' : 'Copiar'}
            </button>
            <button type="button" onClick={partilhar} className="btn-ghost flex items-center gap-2 px-4">
              <Share2 size={16} strokeWidth={1.8} aria-hidden /> Partilhar
            </button>
            {qr && (
              <a href={qr} download="mrpolobarber-qr.png" className="btn-ghost flex items-center gap-2 px-4">
                <Download size={16} strokeWidth={1.8} aria-hidden /> Descarregar QR
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
