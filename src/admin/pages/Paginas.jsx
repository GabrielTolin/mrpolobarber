import EmConstrucao from '../../components/EmConstrucao'
import CabecalhoPagina from '../CabecalhoPagina'

// Páginas ainda provisórias do painel. Cada uma passa a ficheiro próprio
// quando a funcionalidade for implementada (Etapa 5).
export function Notificacoes() {
  return (
    <>
      <CabecalhoPagina titulo="Notificações" />
      <EmConstrucao descricao="Novas marcações, cancelamentos e resumo do dia (2.9)." />
    </>
  )
}
