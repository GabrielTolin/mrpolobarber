import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Carregando from '../../components/Carregando'
import CabecalhoPagina from '../CabecalhoPagina'
import SeccaoBarbearia from './configuracoes/SeccaoBarbearia'
import SeccaoConta from './configuracoes/SeccaoConta'
import SeccaoDispositivo from './configuracoes/SeccaoDispositivo'
import SeccaoLink from './configuracoes/SeccaoLink'
import SeccaoNotificacoes from './configuracoes/SeccaoNotificacoes'
import SeccaoRegras from './configuracoes/SeccaoRegras'
import { useSettings } from './configuracoes/useSettings'

// Configurações (Especificação 2.13; Conta da 2.14).
export default function Configuracoes() {
  const { settings, erro, gravar } = useSettings()
  const { hash } = useLocation()

  // Vindo do aviso do Início (#notificacoes-dispositivo): leva até à secção quando já existe.
  useEffect(() => {
    if (settings && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [settings, hash])

  return (
    <>
      <CabecalhoPagina titulo="Configurações" />
      <div className="grid gap-7 xl:grid-cols-2">
        {settings ? (
          <>
            <div className="flex flex-col gap-7">
              <SeccaoBarbearia settings={settings} gravar={gravar} />
              <SeccaoLink nomeBarbearia={settings.business_name} />
              <SeccaoDispositivo />
              <SeccaoNotificacoes settings={settings} gravar={gravar} />
            </div>
            <div className="flex flex-col gap-7">
              <SeccaoRegras settings={settings} gravar={gravar} />
              <SeccaoConta />
            </div>
          </>
        ) : (
          <section className="card xl:col-span-2">
            {erro ? <p className="text-sm text-warn">{erro}</p> : <Carregando />}
          </section>
        )}
      </div>
      {!settings && erro && (
        <div className="mt-7 max-w-2xl">
          <SeccaoConta />
        </div>
      )}
    </>
  )
}
