import { useState } from 'react'
import { horaCurta } from '../../../lib/datas'
import Mensagem from './Mensagem'

// Preferências de notificações (1.9, 2.9, 2.13 §4). O envio chega na etapa das
// notificações; as escolhas ficam já guardadas.
export default function SeccaoNotificacoes({ settings, gravar }) {
  const [v, setV] = useState({
    notify_new_booking: settings.notify_new_booking,
    notify_client_cancelled: settings.notify_client_cancelled,
    daily_summary_enabled: settings.daily_summary_enabled,
    daily_summary_time: horaCurta(settings.daily_summary_time),
    reminder_enabled: settings.reminder_enabled,
    reminder_minutes: String(settings.reminder_minutes),
  })
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [aGravar, setAGravar] = useState(false)

  const mudar = (k, valor) => {
    setOk('')
    setV({ ...v, [k]: valor })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setOk('')
    const minutos = Number(v.reminder_minutes)
    if (!Number.isInteger(minutos) || minutos < 5 || minutos > 120)
      return setErro('A antecedência do lembrete tem de estar entre 5 e 120 minutos.')
    if (!v.daily_summary_time) return setErro('Indique a hora do resumo do dia.')
    setAGravar(true)
    const { error } = await gravar({ ...v, reminder_minutes: minutos })
    setAGravar(false)
    if (error) return setErro('Não foi possível gravar.')
    setOk('Preferências gravadas.')
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <h2 className="card-title">Notificações</h2>
      <p className="text-sm text-muted">
        Escolha o que quer receber no telemóvel. As notificações são ativadas numa etapa própria; estas escolhas já
        ficam guardadas.
      </p>

      <Opcao label="Nova marcação online" checked={v.notify_new_booking} onChange={(c) => mudar('notify_new_booking', c)} />
      <Opcao label="Cliente cancelou" checked={v.notify_client_cancelled} onChange={(c) => mudar('notify_client_cancelled', c)} />
      <div className="flex flex-wrap items-center gap-3">
        <Opcao label="Resumo do dia às" checked={v.daily_summary_enabled} onChange={(c) => mudar('daily_summary_enabled', c)} />
        <input type="time" value={v.daily_summary_time} onChange={(e) => mudar('daily_summary_time', e.target.value)} className="field w-28" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Opcao label="Lembrete antes de cada marcação," checked={v.reminder_enabled} onChange={(c) => mudar('reminder_enabled', c)} />
        <input inputMode="numeric" value={v.reminder_minutes} onChange={(e) => mudar('reminder_minutes', e.target.value)} className="field w-20" />
        <span className="text-sm text-muted-2">min antes</span>
      </div>

      <Mensagem erro={erro} ok={ok} />
      <button type="submit" disabled={aGravar} className="btn-primary w-fit">
        {aGravar ? 'A gravar…' : 'Gravar'}
      </button>
    </form>
  )
}

function Opcao({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--color-gold)]" />
      <span className="text-sm">{label}</span>
    </label>
  )
}
