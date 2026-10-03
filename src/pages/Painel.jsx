import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { listarVeiculos } from '../lib/veiculos.js'
import './Painel.css'

function Painel() {
  const [saindo, setSaindo] = useState(false)
  const [erro, setErro] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const [lista, setLista] = useState({ status: 'carregando', veiculos: [], erro: '' })
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      try {
        const veiculos = await listarVeiculos(controller.signal)
        if (!controller.signal.aborted) setLista({ status: 'pronto', veiculos, erro: '' })
      } catch (error) {
        if (!controller.signal.aborted) setLista({ status: 'erro', veiculos: [], erro: error.message })
      }
    }
    carregar()
    return () => controller.abort()
  }, [tentativa])

  function tentarNovamente() {
    setLista({ status: 'carregando', veiculos: [], erro: '' })
    setTentativa((atual) => atual + 1)
  }

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
      <Link className="painel-action" to="/historico">Histórico de manutenções</Link>
      {location.state?.mensagem && <p className="painel-success" role="status">{location.state.mensagem}</p>}
      <section className="painel-veiculos" aria-labelledby="meus-veiculos">
        <h2 id="meus-veiculos">Meus veículos</h2>
        {lista.status === 'carregando' ? <p role="status">Carregando seus veículos…</p> : lista.status === 'erro' ? (
          <>
            <p className="painel-error" role="alert">{lista.erro}</p>
            <button type="button" onClick={tentarNovamente}>Tentar novamente</button>
          </>
        ) : lista.veiculos.length === 0 ? (
          <>
            <p>Você ainda não cadastrou veículos.</p>
            <Link className="painel-action" to="/veiculos/novo">Cadastrar primeiro veículo</Link>
          </>
        ) : (
          <>
            <Link className="painel-action" to="/veiculos/novo">Cadastrar veículo</Link>
            <Link className="painel-action" to="/manutencoes/nova">Registrar manutenção</Link>
            <ul className="painel-cards">
              {lista.veiculos.map((veiculo) => {
                const leitura = veiculo.registros_quilometragem?.[0]
                return (
                  <li key={veiculo.id} className="painel-card">
                    <h3>{veiculo.apelido || `${veiculo.marca} ${veiculo.modelo}`}</h3>
                    <p>{veiculo.marca} {veiculo.modelo} · {veiculo.ano}</p>
                    <p>{leitura ? `${leitura.quilometragem.toLocaleString('pt-BR')} km` : 'Quilometragem não registrada'}</p>
                    <Link className="painel-action" to={`/veiculos/${veiculo.id}`}>Ver veículo</Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>
      {erro && <p className="painel-error" role="alert">{erro}</p>}
    </main>
  )
}

export default Painel
