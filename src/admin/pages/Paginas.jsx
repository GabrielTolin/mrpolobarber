import EmConstrucao from '../../components/EmConstrucao'
import CabecalhoPagina from '../CabecalhoPagina'

// Páginas ainda provisórias do painel. Cada uma passa a ficheiro próprio
// quando a funcionalidade for implementada (Etapa 5).
export function Agenda() {
  return (
    <>
      <CabecalhoPagina titulo="Agenda" />
      <EmConstrucao descricao="Vista diária e semanal, marcações manuais (2.2)." />
    </>
  )
}

export function Clientes() {
  return (
    <>
      <CabecalhoPagina titulo="Clientes" />
      <EmConstrucao descricao="Fichas, habituais, histórico e faltas (2.10)." />
    </>
  )
}

export function Notificacoes() {
  return (
    <>
      <CabecalhoPagina titulo="Notificações" />
      <EmConstrucao descricao="Novas marcações, cancelamentos e resumo do dia (2.9)." />
    </>
  )
}

export function Servicos() {
  return (
    <>
      <CabecalhoPagina titulo="Serviços e preços" />
      <EmConstrucao descricao="Serviços, durações e preços (2.11)." />
    </>
  )
}

export function Horarios() {
  return (
    <>
      <CabecalhoPagina titulo="Horários e bloqueios" />
      <EmConstrucao descricao="Horário semanal, folgas, férias e feriados (2.12)." />
    </>
  )
}

export function Configuracoes() {
  return (
    <>
      <CabecalhoPagina titulo="Configurações" />
      <EmConstrucao descricao="Dados da barbearia e regras de marcação (2.13)." />
    </>
  )
}
