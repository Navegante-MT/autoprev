import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import '../pages/Painel.css'

function RotaProtegida() {
  const [acesso, setAcesso] = useState({ status: 'verificando', destino: '/login' })
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true
    let recebeuEvento = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!ativo) return
      recebeuEvento = true
      setAcesso({
        status: session?.user ? 'permitido' : 'anonimo',
        destino: event === 'SIGNED_OUT' ? '/' : '/login',
      })
    })

    async function verificarSessao() {
      try {
        const { data, error } = await supabase.auth.getSession()
        // Um evento mais recente tem prioridade sobre a consulta inicial.
        if (!ativo || recebeuEvento) return
        setAcesso({
          status: error ? 'falha' : data.session?.user ? 'permitido' : 'anonimo',
          destino: '/login',
        })
      } catch {
        if (ativo && !recebeuEvento) setAcesso({ status: 'falha', destino: '/login' })
      }
    }
    verificarSessao()

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [tentativa])

  function tentarNovamente() {
    setAcesso({ status: 'verificando', destino: '/login' })
    setTentativa((atual) => atual + 1)
  }

  if (acesso.status === 'verificando') {
    return <main className="painel-page"><p role="status">Verificando seu acesso…</p></main>
  }
  if (acesso.status === 'falha') {
    return (
      <main className="painel-page">
        <p className="painel-error" role="alert">Não foi possível verificar sua sessão. Confira sua conexão e tente novamente.</p>
        <button type="button" onClick={tentarNovamente}>Tentar novamente</button>
      </main>
    )
  }
  if (acesso.status === 'anonimo') return <Navigate to={acesso.destino} replace />

  return <Outlet />
}

export default RotaProtegida
