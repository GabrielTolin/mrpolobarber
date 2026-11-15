import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { verMarcacao } from '../publicApi'
import { guardarMarcacoes, lerMarcacoes } from '../lembrar'
import { formatarInstante } from '../../lib/datas'

// "As suas próximas marcações" (2.10 regra 8): as marcações feitas NESTE dispositivo.
// Cada uma é confirmada no servidor (get_booking), por isso uma marcação cancelada
// ou mudada pelo barbeiro aparece como está. As passadas saem da lista sozinhas.
export default function ProximasMarcacoes({ onEsquecer }) {
  const [lista, setLista] = useState(() => lerMarcacoes().filter((m) => new Date(m.fim ?? m.inicio) > new Date()))

  useEffect(() => {
    const vivo = { atual: true }
    const guardadas = lerMarcacoes().filter((m) => new Date(m.fim ?? m.inicio) > new Date())
    if (!guardadas.length) {
      guardarMarcacoes([])
      return
    }
    Promise.all(guardadas.map((m) => verMarcacao(m.codigo).then((r) => [m, r]))).then((pares) => {
      const novas = []
      for (const [m, r] of pares) {
        if (r.ok) {
          if (r.status === 'completed' || r.status === 'no_show') continue
          novas.push({ ...m, inicio: r.start_at, fim: r.end_at, servico: r.service_name, estado: r.status })
        } else if (r.error !== 'NOT_FOUND') {
          novas.push(m) // sem ligação / limite de pedidos: mostra o que está guardado
        }
      }
      guardarMarcacoes(novas.map(({ estado: _estado, ...m }) => m))
      if (vivo.atual) setLista(novas)
    })
    return () => {
      vivo.atual = false
    }
  }, [])

  if (!lista.length) return null

  return (
    <section className="card card-gold mb-6 bg-bg/70">
      <p className="eyebrow">{lista.length === 1 ? 'A sua próxima marcação' : 'As suas próximas marcações'}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {[...lista]
          .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
          .map((m) => (
            <li key={m.codigo}>
              <Link to={`/m/${m.codigo}`} className="flex items-center justify-between gap-3 text-[15px] hover:opacity-90">
                <span className="min-w-0">
                  <b className="capitalize">{formatarInstante(m.inicio)}</b> <span className="text-muted">· {m.servico}</span>
                  {m.estado === 'cancelled' && <span className="ml-2 text-[13px] text-warn">Cancelada</span>}
                </span>
                <span className="shrink-0 text-[13px] text-gold-2">Ver →</span>
              </Link>
            </li>
          ))}
      </ul>
      <button type="button" onClick={onEsquecer} className="mt-3 text-xs text-muted-2 underline hover:text-muted">
        Não sou eu / esquecer os meus dados
      </button>
    </section>
  )
}
