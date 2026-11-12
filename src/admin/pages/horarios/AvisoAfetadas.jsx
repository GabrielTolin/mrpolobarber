import { MessageCircle } from 'lucide-react'
import { formatarInstante } from '../../../lib/datas'

// Aviso de marcações afetadas (2.12 regra 4): lista, WhatsApp e confirmação.
// Nada é cancelado automaticamente; o barbeiro decide marcação a marcação na Agenda.
export default function AvisoAfetadas({ marcacoes, mensagemWhatsapp, onConfirmar, onCancelar, aGravar }) {
  return (
    <div className="rounded-lg border border-warn/40 bg-warn/5 p-4">
      <p className="text-sm font-semibold text-warn">
        {marcacoes.length === 1 ? '1 marcação fica' : `${marcacoes.length} marcações ficam`} dentro deste período
      </p>
      <p className="mt-1 text-xs text-muted">
        Não são canceladas automaticamente. Se gravar, ficam marcadas como sobreposição e pode cancelá-las ou
        mantê-las na Agenda.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {marcacoes.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span className="font-semibold">{formatarInstante(m.start_at)}</span> · {m.client_name}
              {m.services ? <span className="text-muted"> · {m.services}</span> : null}
            </span>
            {m.client_phone && (
              <a
                href={`https://wa.me/${m.client_phone.replace('+', '')}?text=${encodeURIComponent(
                  mensagemWhatsapp(m)
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1 text-[13px] text-gold-2 hover:underline"
              >
                <MessageCircle size={14} strokeWidth={1.8} aria-hidden />
                Avisar
              </a>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-3">
        <button type="button" onClick={onConfirmar} disabled={aGravar} className="btn-gold px-4">
          {aGravar ? 'A gravar…' : 'Gravar mesmo assim'}
        </button>
        <button type="button" onClick={onCancelar} className="btn-ghost px-4">
          Voltar
        </button>
      </div>
    </div>
  )
}
