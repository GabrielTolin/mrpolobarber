// "Lembrar neste dispositivo" (Especificação 2.10, Arquitetura 3.9 §2).
// Fica SÓ no navegador do cliente; nunca vai para o servidor.
//   mpb.cliente   → { nome, telefone }            (telefone em E.164)
//   mpb.marcacoes → [{ codigo, inicio, fim, servico }]
// Todo o acesso é protegido: em navegação privada ou com armazenamento
// bloqueado, a página funciona na mesma — só não se lembra de nada.

const CLIENTE = 'mpb.cliente'
const MARCACOES = 'mpb.marcacoes'
const MAXIMO = 10

function ler(chave, valorPorDefeito) {
  try {
    const texto = window.localStorage.getItem(chave)
    return texto ? JSON.parse(texto) : valorPorDefeito
  } catch {
    return valorPorDefeito
  }
}

// Devolve true se ficou mesmo guardado (false com o armazenamento bloqueado).
function escrever(chave, valor) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}

function apagar(chave) {
  try {
    window.localStorage.removeItem(chave)
  } catch {
    /* idem */
  }
}

export function lerCliente() {
  const c = ler(CLIENTE, null)
  return c && typeof c.nome === 'string' && typeof c.telefone === 'string' ? c : null
}

export const guardarCliente = ({ nome, telefone }) => escrever(CLIENTE, { nome, telefone })
export const esquecerCliente = () => apagar(CLIENTE)

export function lerMarcacoes() {
  const lista = ler(MARCACOES, [])
  return Array.isArray(lista) ? lista.filter((m) => m && typeof m.codigo === 'string' && m.inicio) : []
}

export function guardarMarcacoes(lista) {
  if (lista.length) return escrever(MARCACOES, lista.slice(-MAXIMO))
  apagar(MARCACOES)
  return true
}

export function juntarMarcacao(marcacao) {
  const lista = lerMarcacoes().filter((m) => m.codigo !== marcacao.codigo)
  return guardarMarcacoes([...lista, marcacao])
}

// "Não sou eu / esquecer": apaga tudo deste dispositivo.
export function esquecerTudo() {
  apagar(CLIENTE)
  apagar(MARCACOES)
}
