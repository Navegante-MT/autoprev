import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import './Painel.css'

function Painel() {
  const [saindo, setSaindo] = useState(false)
  const [erro, setErro] = useState('')
  const navigate = useNavigate()

  async function sair() {
    if (saindo) return
    if (!window.confirm('Deseja sair do AutoPrev?')) return
    setErro('')
    setSaindo(true)

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        setErro('Não foi possível sair agora. Tente novamente.')
        return
      }
      navigate('/', { replace: true })
    } catch {
      setErro('Não foi possível conectar. Confira sua conexão e tente novamente.')
    } finally {
      setSaindo(false)
    }
  }

  return (
    <main className="painel-page">
      <header className="painel-header">
        <h1>Painel principal</h1>
        <button type="button" onClick={sair} disabled={saindo}>
          {saindo ? 'Saindo…' : 'Sair'}
        </button>
      </header>
      <p>Bem-vindo ao AutoPrev.</p>
      {erro && <p className="painel-error" role="alert">{erro}</p>}
    </main>
  )
}

export default Painel
