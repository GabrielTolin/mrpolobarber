import { useState } from 'react'
import Mensagem from './Mensagem'

// Regras de marcação (2.13 §3). Os limites são os mesmos da base de dados (3.5).
// Os campos em horas são guardados em minutos.
const REGRAS = [
  { campo: 'min_notice_minutes', label: 'Antecedência mínima', unidade: 'horas', emHoras: true, min: 0, max: 48, passo: 0.5, ajuda: 'Tempo mínimo entre a marcação online e o atendimento.' },
  { campo: 'max_days_ahead', label: 'Marcar até', unidade: 'dias no futuro', min: 1, max: 180, passo: 1 },
  { campo: 'slot_step_minutes', label: 'Grelha de horários', unidade: 'min', min: 5, max: 60, passo: 5, ajuda: 'Além da grelha, o fim de cada marcação também aparece como horário (encaixe).' },
  { campo: 'buffer_minutes', label: 'Intervalo entre marcações', unidade: 'min', min: 0, max: 60, passo: 5 },
  { campo: 'max_active_per_phone', label: 'Marcações futuras por telemóvel', unidade: 'no máximo', min: 1, max: 10, passo: 1, ajuda: 'Proteção contra marcações falsas.' },
  { campo: 'cancel_notice_minutes', label: 'O cliente pode cancelar até', unidade: 'horas antes', emHoras: true, min: 0, max: 48, passo: 0.5 },
  { campo: 'late_tolerance_minutes', label: 'Tolerância de atraso', unidade: 'min', min: 0, max: 30, passo: 1, ajuda: '“Registar falta” só aparece depois deste tempo.' },
  { campo: 'no_show_flag_threshold', label: 'Assinalar cliente ⚠️ a partir de', unidade: 'faltas', min: 1, max: 10, passo: 1 },
]

export default function SeccaoRegras({ settings, gravar }) {
  const [proprioDia, setProprioDia] = useState(settings.allow_same_day)
  const [valores, setValores] = useState(() =>
    Object.fromEntries(
      REGRAS.map((r) => [r.campo, String(r.emHoras ? settings[r.campo] / 60 : settings[r.campo]).replace('.', ',')])
    )
  )
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [aGravar, setAGravar] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setOk('')
    const campos = { allow_same_day: proprioDia }
    for (const r of REGRAS) {
      const n = Number(valores[r.campo].replace(',', '.'))
      if (!Number.isFinite(n) || n < r.min || n > r.max)
        return setErro(`${r.label}: tem de estar entre ${r.min} e ${r.max} ${r.unidade}.`)
      const guardado = r.emHoras ? Math.round(n * 60) : n
      if (!Number.isInteger(guardado)) return setErro(`${r.label}: use um número inteiro.`)
      campos[r.campo] = guardado
    }
    setAGravar(true)
    const { error } = await gravar(campos)
    setAGravar(false)
    if (error) return setErro('Não foi possível gravar as regras.')
    setOk('Regras gravadas. Valem já para a página de marcações; as marcações existentes não mudam.')
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <h2 className="card-title">Regras de marcação</h2>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={proprioDia}
          onChange={(e) => {
            setOk('')
            setProprioDia(e.target.checked)
          }}
          className="h-4 w-4 accent-[var(--color-gold)]"
        />
        <span className="text-sm">Permitir marcar para o próprio dia</span>
      </label>

      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {REGRAS.map((r) => (
          <label key={r.campo} className="block">
            <span className="text-sm font-medium text-muted">{r.label}</span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                inputMode="decimal"
                value={valores[r.campo]}
                onChange={(e) => {
                  setOk('')
                  setValores({ ...valores, [r.campo]: e.target.value })
                }}
                className="field w-24"
              />
              <span className="text-sm text-muted-2">{r.unidade}</span>
            </div>
            {r.ajuda && <span className="mt-1 block text-xs text-muted-2">{r.ajuda}</span>}
          </label>
        ))}
      </div>

      <p className="text-xs text-muted-2">
        Serviços por marcação: <span className="text-muted">1</span>. Mais do que um serviço na mesma marcação fica para
        uma versão futura.
      </p>

      <Mensagem erro={erro} ok={ok} />
      <button type="submit" disabled={aGravar} className="btn-primary w-fit">
        {aGravar ? 'A gravar…' : 'Gravar regras'}
      </button>
    </form>
  )
}
