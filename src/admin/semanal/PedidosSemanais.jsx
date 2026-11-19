import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Repeat } from 'lucide-react'
import { decidirSerie, listarPendentes, resumoGeracao, textoSerie } from './semanalApi'

// Pedidos de marcação semanal à espera do barbeiro (Início, S.3). Só aparece
// quando há pedidos ou acabou de tratar um.
export default function PedidosSemanais({ onMudou }) {
  const [pedidos, setPedidos] = useState([])
  const [aTratar, setATratar] = useState(null)
  const [mensagem, setMensagem] = useState(null) // { ok, texto }

  const carregar = useCallback(async () => {
    try {
      setPedidos(await listarPendentes())
    } catch {
      /* sem pedidos visíveis; o resto do Início continua */
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  async function decidir(p, aprovar) {
    if (!aprovar && !window.confirm(`Recusar a marcação semanal de ${p.clients?.name}? A marcação que já fez continua.`)) return
    setATratar(p.id)
    setMensagem(null)
    try {
      const r = await decidirSerie(p.id, aprovar)
      setMensagem({
        ok: true,
        texto: aprovar
          ? `${p.clients?.name}: semanal aprovada (${textoSerie(p)}). ${resumoGeracao(r)}.`
          : `${p.clients?.name}: pedido recusado.`,
      })
      onMudou?.()
    } catch (e) {
      setMensagem({ ok: false, texto: e.message })
    }
    setATratar(null)
    carregar()
  }

  if (pedidos.length === 0 && !mensagem) return null

  return (
    <section className="card card-gold mb-7 flex flex-col gap-3">
      <h2 className="card-title flex items-center gap-2">
        <Repeat size={18} strokeWidth={1.8} className="text-gold" aria-hidden /> Pedidos de marcação semanal
      </h2>
      {mensagem && (
        <p role="status" className={`text-sm ${mensagem.ok ? 'text-ok' : 'text-warn'}`}>
          {mensagem.texto}
        </p>
      )}
      {pedidos.map((p) => (
        <div key={p.id} className="flex flex-col gap-3 border-t border-line-soft pt-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Link to={`/admin/clientes/${p.client_id}`} className="block truncate text-[15px] font-semibold hover:underline">
              {p.clients?.name}
            </Link>
            <span className="text-[13px] text-muted">
              {textoSerie(p)} · {p.services?.name}
            </span>
          </div>
          <div className="flex gap-2.5">
            <button type="button" disabled={aTratar === p.id} onClick={() => decidir(p, true)} className="btn-gold flex-1 px-4 sm:flex-none">
              {aTratar === p.id ? 'Um momento…' : 'Aprovar'}
            </button>
            <button type="button" disabled={aTratar === p.id} onClick={() => decidir(p, false)} className="btn-ghost flex-1 px-4 sm:flex-none">
              Recusar
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
