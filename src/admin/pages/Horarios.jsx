import CabecalhoPagina from '../CabecalhoPagina'
import HorarioSemanal from './horarios/HorarioSemanal'
import DiasEspeciais from './horarios/DiasEspeciais'
import Bloqueios from './horarios/Bloqueios'
import Feriados from './horarios/Feriados'

// Horários e bloqueios (Especificação 2.12): tudo o que define quando se pode marcar.
export default function Horarios() {
  return (
    <>
      <CabecalhoPagina titulo="Horários e bloqueios" />
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-7">
          <HorarioSemanal />
          <DiasEspeciais />
        </div>
        <div className="flex flex-col gap-7">
          <Bloqueios />
          <Feriados />
        </div>
      </div>
    </>
  )
}
