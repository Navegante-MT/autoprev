import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import ResumoPrevisoes from '../components/ResumoPrevisoes.jsx'
import { listarVeiculos } from '../lib/veiculos.js'
import './Painel.css'

function Painel() {
  const [saindo, setSaindo] = useState(false)
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)
  const envioSaida = useRef(false)
  const botaoSair = useRef(null)
  const botaoCancelar = useRef(null)

  useEffect(() => {
    if (confirmandoSaida) botaoCancelar.current?.focus()
  }, [confirmandoSaida])

  function cancelarSaida() {
    if (envioSaida.current) return
    setConfirmandoSaida(false)
    setErro('')
    botaoSair.current?.focus()
  }
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
    if (envioSaida.current) return
    envioSaida.current = true
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
      envioSaida.current = false
      setSaindo(false)
    }
  }

  return (
    <main className="painel-page">
      <header className="painel-header">
        <h1>Painel principal</h1>
        <button type="button" ref={botaoSair} onClick={() => { setErro(''); setConfirmandoSaida(true) }} disabled={saindo} aria-expanded={confirmandoSaida}>
          {saindo ? 'Saindo…' : 'Sair'}
        </button>
      </header>
      {confirmandoSaida && (
        <section className="painel-confirmar-saida" aria-labelledby="confirmar-saida-titulo" aria-busy={saindo}>
          <h2 id="confirmar-saida-titulo">Deseja sair do AutoPrev?</h2>
          <p>Seus registros continuarão salvos. Para acessar o painel novamente, será necessário entrar na conta.</p>

          {erro && <p className="painel-error" role="alert">{erro}</p>}
          <div className="painel-saida-acoes">
            <button type="button" ref={botaoCancelar} onClick={cancelarSaida} disabled={saindo}>Cancelar</button>
            <button type="button" onClick={sair} disabled={saindo}>{saindo ? 'Saindo…' : 'Confirmar saída'}</button>
          </div>
          {saindo && <p role="status">Encerrando sua sessão…</p>}
        </section>
      )}
      <p>Bem-vindo ao AutoPrev.</p>
      <Link className="painel-action" to="/historico">Histórico de manutenções</Link>
      <Link className="painel-action" to="/oficinas">Oficinas</Link>
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
                    <Link className="painel-action" to={`/veiculos/${veiculo.id}/previsoes`}>Estimativas e avisos</Link>
                    <ResumoPrevisoes id={veiculo.id} />
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

    </main>
  )
}

export default Painel
