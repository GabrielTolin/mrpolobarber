import CabecalhoPagina from '../CabecalhoPagina'
import SeccaoConta from './configuracoes/SeccaoConta'

// Configurações (2.13). Nesta fase só a secção Conta (5.2);
// dados da barbearia, regras e link de marcações chegam na 5.5.
export default function Configuracoes() {
  return (
    <>
      <CabecalhoPagina titulo="Configurações" />
      <div className="flex max-w-2xl flex-col gap-7">
        <SeccaoConta />
      </div>
    </>
  )
}
