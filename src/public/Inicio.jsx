import { useEffect, useState } from 'react'
import Entrada from './ui/Entrada'
import EscolhaCliente from './ui/EscolhaCliente'
import { horarioEmLinhas, horarioResumo, obterInfo } from './publicApi'
import { linkWhatsapp } from '../lib/telefone'

// Página de entrada (/) com os dados reais da barbearia (public_info, 6.1).
// Se a leitura falhar, a página aparece na mesma, sem horário nem contactos.

// Instagram do barbeiro (dado pelo Gabriel a 2026-11-15). Ainda não há campo nas
// Configurações; se mudar, altera-se aqui (ou cria-se a coluna em settings).
const INSTAGRAM = { handle: '@mathybarber', url: 'https://www.instagram.com/mathybarber/' }
export default function Inicio() {
  const [info, setInfo] = useState(null)
  const [escolher, setEscolher] = useState(false) // janela "Visitante / Tenho cadastro" (P-01)

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

  const whatsapp = info?.whatsapp_phone ? linkWhatsapp(info.whatsapp_phone, 'Olá! ') : null

  return (
    <>
    <Entrada
      nome={info?.business_name ?? 'Mr. Polo Barber Shop'}
      barbeiro={info?.owner_name ?? 'Matheus'}
      morada={info?.address}
      mapa={info?.map_url}
      whatsapp={whatsapp}
      instagram={INSTAGRAM}
      foto="/hero-barbeiro.webp"
      horario={horarioEmLinhas(semanal)}
      resumoHorario={info ? horarioResumo(semanal) : ['…', '']}
      onMarcar={() => setEscolher(true)}
    />
    {escolher && <EscolhaCliente whatsapp={whatsapp} onFechar={() => setEscolher(false)} />}
    </>
  )
}
