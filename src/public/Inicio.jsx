import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Entrada from './ui/Entrada'
import { horarioEmLinhas, horarioResumo, obterInfo } from './publicApi'
import { linkWhatsapp } from '../lib/telefone'

// Página de entrada (/) com os dados reais da barbearia (public_info, 6.1).
// Se a leitura falhar, a página aparece na mesma, sem horário nem contactos.
export default function Inicio() {
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)

  useEffect(() => {
    let ativo = true
    obterInfo()
      .then((dados) => ativo && setInfo(dados))
      .catch(() => ativo && setInfo({}))
    return () => {
      ativo = false
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
      horario={horarioEmLinhas(semanal)}
      resumoHorario={info ? horarioResumo(semanal) : ['…', '']}
      onMarcar={() => navigate('/marcar')}
    />
  )
}
