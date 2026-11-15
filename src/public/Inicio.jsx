import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Entrada from './ui/Entrada'
import { horarioEmLinhas, horarioResumo, obterInfo } from './publicApi'
import { linkWhatsapp } from '../lib/telefone'

// Página de entrada (/) com os dados reais da barbearia (public_info, 6.1).
// Se a leitura falhar, a página aparece na mesma, sem horário nem contactos.

// PROVISÓRIO: Instagram do barbeiro (o Gabriel confirma o perfil; depois passa para as Configurações).
const INSTAGRAM = { handle: '@[instagram]', url: 'https://www.instagram.com/' }
export default function Inicio() {
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)

  useEffect(() => {
    const vivo = { atual: true }
    obterInfo()
      .then((dados) => vivo.atual && setInfo(dados))
      .catch(() => vivo.atual && setInfo({}))
    return () => {
      vivo.atual = false
    }
  }, [])

  const semanal = info?.weekly_hours ?? []

  return (
    <Entrada
      nome={info?.business_name ?? 'Mr. Polo Barber Shop'}
      barbeiro={info?.owner_name ?? 'Matheus'}
      morada={info?.address}
      mapa={info?.map_url}
      whatsapp={info?.whatsapp_phone ? linkWhatsapp(info.whatsapp_phone, 'Olá! ') : null}
      instagram={INSTAGRAM}
      foto="/hero-barbeiro.webp"
      horario={horarioEmLinhas(semanal)}
      resumoHorario={info ? horarioResumo(semanal) : ['…', '']}
      onMarcar={() => navigate('/marcar')}
    />
  )
}
