import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarPlus, Check, Copy, MessageCircle } from 'lucide-react'
import Passo from './ui/Passo'
import ListaServicos from './ui/ListaServicos'
import Calendario from './ui/Calendario'
import GrelhaHoras from './ui/GrelhaHoras'
import ResumoMarcacao from './ui/ResumoMarcacao'
import Entrada from './ui/Entrada'

// SÓ EM DESENVOLVIMENTO (/design?ecra=0…7): pré-visualização do design da área
// pública com dados de exemplo, para validar antes de ligar ao backend (6.0).
const SERVICOS = [
  { id: 'a', name: 'Cabelo e barba', duration_minutes: 45 },
  { id: 'b', name: 'Corte de cabelo na tesoura', duration_minutes: 50 },
  { id: 'c', name: 'Corte de cabelo com máquina', duration_minutes: 35 },
  { id: 'd', name: 'Barba', duration_minutes: 25 },
  { id: 'e', name: 'Corte de criança', duration_minutes: 35 },
]
const LIVRES = new Set(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-30'])
const HORAS = ['09:00', '09:15', '09:35', '09:45', '10:00', '10:15', '11:30', '11:45', '12:00', '14:00', '14:15', '14:30', '15:20', '15:30', '16:45', '17:00', '17:15', '18:00']

export default function DesignPreview() {
  const [params, setParams] = useSearchParams()
  const ecra = Number(params.get('ecra') ?? 0)
  const [lembrar, setLembrar] = useState(true)

  const ir = (n) => setParams({ ecra: String(n) })

  return (
    <>
      {/* Na página de entrada (0) não aparecem: só no fluxo, depois de "Marcar horário" */}
      {ecra !== 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button key={n} type="button" onClick={() => ir(n)} className={`rounded-md px-2.5 py-1 text-xs ${n === ecra ? 'bg-gold text-on-gold' : 'bg-hover text-muted'}`}>
              {n}
            </button>
          ))}
        </div>
      )}

      {ecra === 0 && (
        <Entrada
          nome="Mr. Polo Barber Shop"
          barbeiro="Matheus"
          morada="[Morada], Albufeira"
          mapa="#"
          whatsapp="#"
          resumoHorario={['Seg a Sáb', '09:00–19:00']}
          horario={[
            ['Segunda a sexta', '09:00–13:00 · 14:00–19:00'],
            ['Sábado', '09:00–13:00'],
            ['Domingo', 'Fechado'],
          ]}
          onMarcar={() => ir(1)}
        />
      )}

      {ecra === 1 && (
        <>
          <div className="card mb-6 border-line-gold bg-bg/70">
            <p className="eyebrow">As suas próximas marcações</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[15px]"><b>Ter, 17 nov · 10:00</b> <span className="text-muted">· Barba</span></span>
              <span className="text-[13px] text-gold-2">Ver →</span>
            </div>
          </div>
          <Passo numero={1} titulo="Escolha o serviço" subtitulo="O preço aparece no fim, antes de confirmar." />
          <ListaServicos servicos={SERVICOS} selecionado="c" onEscolher={() => ir(2)} />
        </>
      )}

      {ecra === 2 && (
        <>
          <Passo numero={2} titulo="Escolha o dia" subtitulo="Corte de cabelo com máquina · 35 min" onVoltar={() => ir(1)} />
          <Calendario mes="2026-11" disponiveis={LIVRES} selecionado="2026-11-17" onEscolher={() => ir(3)} onMudarMes={() => {}} podeAnterior={false} podeSeguinte />
        </>
      )}

      {ecra === 3 && (
        <>
          <Passo numero={3} titulo="Escolha a hora" subtitulo="Terça-feira, 17 de novembro" onVoltar={() => ir(2)} />
          <GrelhaHoras horas={HORAS} selecionada="10:00" onEscolher={() => ir(4)} />
        </>
      )}

      {ecra === 4 && (
        <>
          <Passo numero={4} titulo="Os seus dados" subtitulo="Terça, 17 nov · 10:00 · Corte com máquina" onVoltar={() => ir(3)} />
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm font-medium text-muted">Nome</span>
              <input defaultValue="João Silva" className="field mt-1.5 bg-bg/70" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-muted">Telemóvel</span>
              <div className="mt-1.5 flex gap-2">
                <span className="field w-[74px] shrink-0 bg-bg/70 text-center">+351</span>
                <input defaultValue="912 345 678" inputMode="tel" className="field bg-bg/70" />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-muted">Observações (opcional)</span>
              <input placeholder="Ex.: é para o meu filho" className="field mt-1.5 bg-bg/70" />
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} className="h-4 w-4 accent-[var(--color-gold)]" />
              Lembrar os meus dados neste dispositivo
            </label>
            <p className="text-xs text-muted-2">
              Os seus dados são usados apenas para gerir a marcação. <span className="text-gold-2 underline">Política de privacidade</span>
            </p>
            <button type="button" onClick={() => ir(5)} className="btn-primary mt-1 w-full">Continuar</button>
          </div>
        </>
      )}

      {ecra === 5 && (
        <>
          <Passo numero={5} titulo="Confirme a marcação" onVoltar={() => ir(4)} />
          <ResumoMarcacao servico="Corte de cabelo com máquina" dataTexto="Terça-feira, 17 de novembro" hora="10:00" duracao={35} precoCentimos={1700} destaque>
            <p className="text-sm text-muted">João Silva · +351 912 345 678</p>
          </ResumoMarcacao>
          <button type="button" onClick={() => ir(6)} className="btn-primary mt-5 w-full">Confirmar marcação</button>
          <p className="mt-3 text-center text-xs text-muted-2">Pode cancelar até 2 horas antes.</p>
        </>
      )}

      {ecra === 6 && (
        <>
          <div className="mb-5 flex flex-col items-center text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-on-gold">
              <Check size={28} strokeWidth={2.2} aria-hidden />
            </span>
            <h1 className="font-serif text-[34px] leading-tight font-semibold">Marcação confirmada</h1>
            <p className="mt-1 text-sm text-muted">Até já, João!</p>
          </div>
          <ResumoMarcacao servico="Corte de cabelo com máquina" dataTexto="Terça-feira, 17 de novembro" hora="10:00" duracao={35} precoCentimos={1700} />
          <div className="card mt-5 flex flex-col gap-3 bg-bg/70">
            <p className="text-sm font-semibold">O seu link pessoal</p>
            <p className="text-xs text-muted">Guarde-o para ver ou cancelar a marcação.</p>
            <div className="flex gap-2">
              <span className="field truncate bg-bg/70 text-[13px] text-muted">mrpolobarber.vercel.app/m/Xk3…9fA</span>
              <button type="button" className="btn-ghost shrink-0 px-3" aria-label="Copiar"><Copy size={16} strokeWidth={1.8} /></button>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            <button type="button" className="btn-gold flex items-center justify-center gap-2"><CalendarPlus size={16} strokeWidth={1.8} /> Adicionar ao calendário</button>
            <button type="button" className="btn-ghost flex items-center justify-center gap-2"><MessageCircle size={16} strokeWidth={1.8} /> Falar com o barbeiro</button>
          </div>
        </>
      )}

      {ecra === 7 && (
        <>
          <p className="eyebrow">A sua marcação</p>
          <h1 className="mt-1 mb-5 font-serif text-[34px] leading-tight font-semibold">Olá, João</h1>
          <ResumoMarcacao servico="Corte de cabelo com máquina" dataTexto="Terça-feira, 17 de novembro" hora="10:00" duracao={35} precoCentimos={1700}>
            <p className="text-sm font-semibold text-ok">Confirmada</p>
          </ResumoMarcacao>
          <div className="mt-5 flex flex-col gap-2.5">
            <button type="button" className="btn-ghost text-warn">Cancelar marcação</button>
            <p className="text-center text-xs text-muted-2">Pode cancelar até terça, 17 nov, às 08:00.</p>
            <button type="button" className="btn-ghost flex items-center justify-center gap-2"><MessageCircle size={16} strokeWidth={1.8} /> Falar com o barbeiro</button>
          </div>
        </>
      )}
    </>
  )
}
