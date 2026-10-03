import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import useVeiculo from '../hooks/useVeiculo.js'
import EstadoVeiculo from '../components/EstadoVeiculo.jsx'
import { dataLocalHoje, obterVeiculo, registrarQuilometragem, validarQuilometragem } from '../lib/veiculos.js'
import './Cadastro.css'
import './Painel.css'

function FormularioQuilometragem({ id, veiculo }) {
  const [quilometragem, setQuilometragem] = useState('')
  const [data, setData] = useState(dataLocalHoje)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const enviando = useRef(false)
  const navigate = useNavigate()
  const leitura = veiculo.registros_quilometragem?.[0]
  async function salvar(event) {
    event.preventDefault()
    if (enviando.current) return
    setErro('')
    const validacao = validarQuilometragem(quilometragem, data)
    if (validacao) { setErro(validacao); return }
    enviando.current = true
    setSalvando(true)
    try {
      // Confere novamente a leitura atual antes de gravar.
      const atualizado = await obterVeiculo(id)
      if (!atualizado) throw new Error('Veículo não encontrado ou indisponível para sua conta.')
      const atual = atualizado.registros_quilometragem?.[0]
      if (atual && Number(quilometragem) < atual.quilometragem && !window.confirm(`O valor informado é menor que a leitura atual de ${atual.quilometragem.toLocaleString('pt-BR')} km. Deseja registrar essa leitura mesmo assim? O histórico anterior será mantido.`)) {
        enviando.current = false
        setSalvando(false)
        return
      }
      await registrarQuilometragem(id, quilometragem, data)
      navigate(`/veiculos/${id}`, { replace: true, state: { mensagem: 'Quilometragem registrada com sucesso.' } })
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar. Tente novamente.')
      enviando.current = false
      setSalvando(false)
    }
  }
  return (
    <>
      <p>{veiculo.marca} {veiculo.modelo} · {veiculo.ano}</p>
      <p>{leitura ? `Leitura atual: ${leitura.quilometragem.toLocaleString('pt-BR')} km.` : 'Este veículo ainda não tem uma leitura de km.'}</p>
      <form className="cadastro-form" onSubmit={salvar} aria-busy={salvando}>
        <label htmlFor="atualizar-km">Quilometragem (km)</label>
        <input id="atualizar-km" type="number" min={0} max={2147483647} step={1} required disabled={salvando} value={quilometragem} onChange={event => setQuilometragem(event.target.value)} aria-describedby="km-ajuda" />
        <p id="km-ajuda" className="cadastro-help">Informe um número inteiro sem separadores, por exemplo: 50800.</p>
        <label htmlFor="atualizar-data">Data da leitura</label>
        <input id="atualizar-data" type="date" max={dataLocalHoje()} required disabled={salvando} value={data} onChange={event => setData(event.target.value)} />
        <p className="cadastro-help">O histórico será preservado. Uma data anterior não substitui a leitura de data mais recente.</p>
        {erro && <p className="cadastro-message cadastro-error" role="alert">{erro}</p>}
        <button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar quilometragem'}</button>
      </form>
      {salvando ? <p role="status">Aguarde a confirmação do registro.</p> : <Link to={`/veiculos/${id}`}>Cancelar e voltar ao veículo</Link>}
    </>
  )
}

function AtualizarQuilometragem() {
  const { id } = useParams()
  const resultado = useVeiculo(id)
  return (
    <main className="cadastro-page">
      <h1>Atualizar quilometragem</h1>
      <EstadoVeiculo {...resultado} />
      {resultado.status === 'pronto' ? <FormularioQuilometragem key={id} id={id} veiculo={resultado.veiculo} /> : <Link to="/painel">Voltar ao painel</Link>}
    </main>
  )
}
export default AtualizarQuilometragem
