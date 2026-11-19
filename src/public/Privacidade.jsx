import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { obterInfo } from './publicApi'
import { formatarTelefone, linkWhatsapp } from '../lib/telefone'

// Política de privacidade (6.6, Requisitos 1.7, P-03/P-04).
// Descreve o que o sistema faz DE FACTO (ver Arquitetura 3.7–3.9).
// Responsável, morada e contacto vêm das Configurações → Barbearia (public_info),
// decisão do Gabriel a 2026-11-16: sem NIF, sem dados escritos duas vezes.
// O que ainda não estiver preenchido no painel aparece como marcador [ … ].

const DATA_POLITICA = '16 de novembro de 2026'

// Marcador por preencher: bem visível para não escapar na revisão.
function Falta({ children }) {
  return <mark className="rounded bg-warn/15 px-1 text-warn">[{children}]</mark>
}

function Seccao({ titulo, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-serif text-[22px] leading-tight font-semibold">{titulo}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-fg/80">{children}</div>
    </section>
  )
}

export default function Privacidade() {
  const [info, setInfo] = useState(null)

  useEffect(() => {
    const vivo = { atual: true }
    obterInfo()
      .then((dados) => vivo.atual && setInfo(dados ?? {}))
      .catch(() => vivo.atual && setInfo({}))
    return () => {
      vivo.atual = false
    }
  }, [])

  const nome = info?.business_name || 'Mr. Polo Barber Shop'
  const aCarregar = info === null

  return (
    <article className="flex flex-col gap-7">
      <header>
        <p className="eyebrow">{nome}</p>
        <h1 className="mt-1 font-serif text-[34px] leading-tight font-semibold">Política de privacidade</h1>
        <p className="mt-2 text-xs text-muted-2">Última atualização: {DATA_POLITICA}</p>
      </header>

      <p className="text-sm leading-relaxed text-fg/80">
        Esta página explica que dados pessoais usamos quando marca um horário online, para quê, durante quanto tempo e quais são os seus
        direitos. Pedimos só o necessário para gerir a sua marcação.
      </p>

      <Seccao titulo="Quem é o responsável">
        {aCarregar ? (
          <p className="text-muted-2">A carregar…</p>
        ) : (
          <>
            <p>
              A <b>{nome}</b>, com morada em {info.address ? info.address : <Falta>MORADA (Configurações → Barbearia)</Falta>}.
            </p>
            <p>
              Contacto para questões de privacidade:{' '}
              {info.whatsapp_phone ? (
                <a href={linkWhatsapp(info.whatsapp_phone, 'Olá! ')} target="_blank" rel="noreferrer" className="text-gold-2 underline">
                  {formatarTelefone(info.whatsapp_phone)} (WhatsApp)
                </a>
              ) : (
                <Falta>WHATSAPP (Configurações → Barbearia)</Falta>
              )}
              , ou pessoalmente na barbearia.
            </p>
          </>
        )}
      </Seccao>

      <Seccao titulo="Que dados usamos">
        <ul className="list-disc pl-5">
          <li>
            <b>Os que nos dá ao marcar:</b> nome, número de telemóvel e, se quiser, observações.
          </li>
          <li>
            <b>Os da marcação:</b> serviço, dia, hora, duração, preço e estado (por exemplo, confirmada ou cancelada).
          </li>
          <li>
            <b>Histórico no salão:</b> marcações anteriores, faltas e cancelamentos, e notas que o barbeiro registe sobre o serviço.
          </li>
          <li>
            <b>Dados técnicos de segurança:</b> para evitar abusos, contamos os pedidos feitos ao site. O endereço IP e o telemóvel são
            guardados apenas de forma cifrada (não legível) e apagados ao fim de 24 horas.
          </li>
        </ul>
        <p>Não pedimos email, não enviamos SMS nem publicidade, e não usamos cookies de publicidade nem de estatística.</p>
      </Seccao>

      <Seccao titulo="Para que os usamos">
        <ul className="list-disc pl-5">
          <li>
            <b>Gerir a sua marcação</b> — confirmar, mostrar, alterar ou cancelar, e reconhecê-lo pelo telemóvel numa próxima visita.
            Fundamento: o pedido de serviço que nos faz (artigo 6.º, n.º 1, alínea b) do RGPD).
          </li>
          <li>
            <b>Proteger o site</b> contra marcações falsas e abusos. Fundamento: interesse legítimo em manter o serviço seguro (artigo
            6.º, n.º 1, alínea f) do RGPD).
          </li>
        </ul>
        <p>Não há decisões automáticas sobre si nem criação de perfis para publicidade.</p>
      </Seccao>

      <Seccao titulo="O que fica no seu telemóvel">
        <p>
          Se deixar ligada a opção <b>"Lembrar os meus dados neste dispositivo"</b>, o seu navegador guarda o nome, o telemóvel e os links
          das suas marcações, para os preencher e mostrar na próxima visita. Estes dados ficam <b>só no seu aparelho</b> e não são
          enviados para nós.
        </p>
        <p>
          Pode apagá-los a qualquer momento em <b>"Não sou eu / esquecer os meus dados"</b>, na página de marcação, ou limpando os dados do
          navegador.
        </p>
      </Seccao>

      <Seccao titulo="Quem tem acesso">
        <p>Só o barbeiro, através do painel de gestão protegido por palavra-passe. Não vendemos nem partilhamos os seus dados.</p>
        <p>Usamos dois prestadores de serviços que tratam os dados apenas por nossa conta:</p>
        <ul className="list-disc pl-5">
          <li>
            <b>Supabase</b> — base de dados, alojada na União Europeia (Irlanda).
          </li>
          <li>
            <b>Vercel</b> — alojamento do site.
          </li>
        </ul>
        <p>
          Os botões para o Google Maps, Instagram e WhatsApp levam a serviços de outras empresas, que só recebem dados se os abrir; aplicam-se
          as políticas de privacidade delas.
        </p>
      </Seccao>

      <Seccao titulo="Durante quanto tempo">
        <ul className="list-disc pl-5">
          <li>
            <b>Ficha de cliente e marcações:</b> enquanto for cliente. Se não fizer nenhuma marcação durante <b>2 anos</b>, o nome, o
            telemóvel e as notas são apagados automaticamente; as marcações ficam sem dados que o identifiquem, só para estatística.
          </li>
          <li>
            <b>Registos de segurança</b> (contagem de pedidos): 24 horas.
          </li>
        </ul>
      </Seccao>

      <Seccao titulo="Os seus direitos">
        <p>
          Pode pedir para <b>ver</b>, <b>corrigir</b> ou <b>apagar</b> os seus dados, <b>limitar</b> ou <b>opor-se</b> ao seu uso, e
          receber uma cópia num formato digital. Basta contactar-nos (ver "Quem é o responsável"). Respondemos no prazo máximo de um mês.
        </p>
        <p>
          Se achar que os seus dados não estão a ser bem tratados, pode apresentar reclamação à{' '}
          <a href="https://www.cnpd.pt" target="_blank" rel="noreferrer" className="text-gold-2 underline">
            Comissão Nacional de Proteção de Dados (CNPD)
          </a>
          .
        </p>
      </Seccao>

      <Seccao titulo="Alterações">
        <p>Se esta política mudar, a nova versão é publicada nesta página, com a data de atualização no topo.</p>
      </Seccao>

      <Link to="/" className="btn-ghost mt-2 block text-center">
        Voltar ao início
      </Link>
    </article>
  )
}
