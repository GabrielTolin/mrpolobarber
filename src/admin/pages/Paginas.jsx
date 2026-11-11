import EmConstrucao from '../../components/EmConstrucao'

// Páginas provisórias do painel (Etapa 4.6). Cada uma passa a ficheiro próprio
// quando a funcionalidade for implementada (Especificação 2.2 / 2.8).
export function Dashboard() {
  return <EmConstrucao titulo="Início" descricao="Marcações do dia, próxima marcação e pendências (2.8)." />
}

export function Agenda() {
  return <EmConstrucao titulo="Agenda" descricao="Vista diária e semanal, marcações manuais (2.2)." />
}

export function Clientes() {
  return <EmConstrucao titulo="Clientes" descricao="Fichas, habituais, histórico e faltas (2.10)." />
}

export function Notificacoes() {
  return <EmConstrucao titulo="Notificações" descricao="Novas marcações, cancelamentos e resumo do dia (2.9)." />
}

export function Servicos() {
  return <EmConstrucao titulo="Serviços e preços" descricao="Serviços, durações e preços (2.11)." />
}

export function Horarios() {
  return <EmConstrucao titulo="Horários e bloqueios" descricao="Horário semanal, folgas, férias e feriados (2.12)." />
}

export function Configuracoes() {
  return <EmConstrucao titulo="Configurações" descricao="Dados da barbearia e regras de marcação (2.13)." />
}
