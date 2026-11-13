import { useEffect, useState } from 'react'

// Hora atual que se atualiza sozinha (estados "em curso", "registar falta",
// espaços livres de hoje dependem da hora, Arquitetura 3.8).
export function useAgora(intervaloMs = 30000) {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), intervaloMs)
    return () => clearInterval(t)
  }, [intervaloMs])
  return agora
}
