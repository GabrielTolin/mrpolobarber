import { Link } from 'react-router-dom'
import { dataPorExtenso, saudacao } from '../../lib/datas'
import CabecalhoPagina from '../CabecalhoPagina'
import { useSettings } from './configuracoes/useSettings'

// Estrutura do Início segundo o handoff do design. Os dados reais
// (marcações, próxima, pendências) entram na subetapa do Dashboard.
export default function Inicio() {
  // Nome do barbeiro vem das Configurações (settings.owner_name).
  const { settings } = useSettings()
  const nome = settings?.owner_name

  return (
    <>
      <CabecalhoPagina
        eyebrow={dataPorExtenso()}
        titulo={nome ? `${saudacao()}, ${nome}` : saudacao()}
        poste
      >
        <Link to="/admin/agenda" className="btn-primary">
          + Nova marcação
        </Link>
      </CabecalhoPagina>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="card">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="card-title">Marcações do dia</h2>
            <Link to="/admin/agenda" className="text-[13px] text-gold-2 hover:underline">
              Ver agenda →
            </Link>
          </div>
          <p className="py-6 text-sm text-muted">Ainda não há marcações para hoje.</p>
        </section>

        <div className="flex flex-col gap-7">
          <section className="card card-gold flex flex-col gap-3.5">
            <p className="eyebrow tracking-[0.16em]">Próxima marcação</p>
            <p className="text-sm text-muted">Sem mais marcações hoje.</p>
          </section>

          <section className="card">
            <h2 className="card-title mb-3">Pendências</h2>
            <p className="border-t border-line-soft pt-3 text-sm text-muted">Sem pendências.</p>
          </section>
        </div>
      </div>
    </>
  )
}
