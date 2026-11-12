import { useState } from 'react'
import { formatarTelefone, normalizarTelefone } from '../../../lib/telefone'
import Mensagem from './Mensagem'

// Dados da barbearia (2.13 §1): aparecem na página pública, no .ics e no WhatsApp.
export default function SeccaoBarbearia({ settings, gravar }) {
  const [campos, setCampos] = useState({
    business_name: settings.business_name ?? '',
    owner_name: settings.owner_name ?? '',
    address: settings.address ?? '',
    map_url: settings.map_url ?? '',
    whatsapp: formatarTelefone(settings.whatsapp_phone),
  })
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [aGravar, setAGravar] = useState(false)

  const mudar = (k) => (e) => {
    setOk('')
    setCampos({ ...campos, [k]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setOk('')
    if (!campos.business_name.trim()) return setErro('Indique o nome da barbearia.')
    if (!campos.owner_name.trim()) return setErro('Indique o nome do barbeiro.')
    const whatsapp = campos.whatsapp.trim() ? normalizarTelefone(campos.whatsapp) : null
    if (campos.whatsapp.trim() && !whatsapp) return setErro('Número de WhatsApp inválido (ex.: 912 345 678).')
    if (campos.map_url.trim() && !/^https:\/\//.test(campos.map_url.trim()))
      return setErro('O link do mapa tem de começar por https://')

    setAGravar(true)
    const { error } = await gravar({
      business_name: campos.business_name.trim(),
      owner_name: campos.owner_name.trim(),
      address: campos.address.trim() || null,
      map_url: campos.map_url.trim() || null,
      whatsapp_phone: whatsapp,
    })
    setAGravar(false)
    if (error) return setErro('Não foi possível gravar.')
    setCampos((c) => ({ ...c, whatsapp: formatarTelefone(whatsapp) }))
    setOk('Dados gravados.')
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <h2 className="card-title">Barbearia</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nome da barbearia" value={campos.business_name} onChange={mudar('business_name')} />
        <Campo label="Nome do barbeiro" ajuda="Aparece na saudação do Início." value={campos.owner_name} onChange={mudar('owner_name')} />
      </div>
      <Campo label="Morada" value={campos.address} onChange={mudar('address')} placeholder="Rua…, Albufeira" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          label="WhatsApp"
          ajuda="Para os botões “Contacte o barbeiro”."
          value={campos.whatsapp}
          onChange={mudar('whatsapp')}
          placeholder="912 345 678"
          inputMode="tel"
        />
        <Campo
          label="Link do mapa (Google Maps)"
          value={campos.map_url}
          onChange={mudar('map_url')}
          placeholder="https://maps.app.goo.gl/…"
        />
      </div>

      <Mensagem erro={erro} ok={ok} />
      <button type="submit" disabled={aGravar} className="btn-primary w-fit">
        {aGravar ? 'A gravar…' : 'Gravar'}
      </button>
    </form>
  )
}

function Campo({ label, ajuda, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted">{label}</span>
      <input {...props} className="field mt-1.5" />
      {ajuda && <span className="mt-1 block text-xs text-muted-2">{ajuda}</span>}
    </label>
  )
}
