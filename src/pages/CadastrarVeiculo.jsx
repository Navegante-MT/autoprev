import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cadastrarVeiculo, validarVeiculo } from '../lib/veiculos.js'
import './Cadastro.css'

function CadastrarVeiculo() {
  const [campos, setCampos] = useState({ marca: '', modelo: '', ano: '', apelido: '', quilometragem: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const envioEmAndamento = useRef(false)
  const navigate = useNavigate()
  const anoMaximo = new Date().getFullYear() + 1

  function alterar(event) {
    setCampos((atuais) => ({ ...atuais, [event.target.name]: event.target.value }))
  }

  async function salvar(event) {
    event.preventDefault()
    if (envioEmAndamento.current) return
    setErro('')
    const validacao = validarVeiculo(campos)
    if (validacao) { setErro(validacao); return }
    envioEmAndamento.current = true
    setSalvando(true)
    try {
      await cadastrarVeiculo(campos)
      navigate('/painel', { replace: true, state: { mensagem: 'Veículo cadastrado com sucesso.' } })
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar. Tente novamente.')
      envioEmAndamento.current = false
      setSalvando(false)
    }
  }

  return (
    <main className="cadastro-page">
      <h1>Cadastrar veículo</h1>
      <p>Informe os dados do veículo e a quilometragem indicada no painel dele.</p>
      <form className="cadastro-form" onSubmit={salvar} aria-busy={salvando}>
        <label htmlFor="veiculo-marca">Marca</label>
        <input id="veiculo-marca" name="marca" value={campos.marca} onChange={alterar} required disabled={salvando} />
        <label htmlFor="veiculo-modelo">Modelo</label>
        <input id="veiculo-modelo" name="modelo" value={campos.modelo} onChange={alterar} required disabled={salvando} />
        <label htmlFor="veiculo-ano">Ano</label>
        <input id="veiculo-ano" name="ano" type="number" min={1886} max={anoMaximo} step={1} value={campos.ano} onChange={alterar} required disabled={salvando} />
        <label htmlFor="veiculo-apelido">Apelido (opcional)</label>
        <input id="veiculo-apelido" name="apelido" value={campos.apelido} onChange={alterar} disabled={salvando} />
        <label htmlFor="veiculo-km">Quilometragem inicial (km)</label>
        <input id="veiculo-km" name="quilometragem" type="number" min={0} max={2147483647} step={1} value={campos.quilometragem} onChange={alterar} required disabled={salvando} aria-describedby="veiculo-km-ajuda" />
        <p id="veiculo-km-ajuda" className="cadastro-help">Use um número inteiro, sem separadores. Por exemplo: 50000 para 50 mil km.</p>
        {erro && <p className="cadastro-message cadastro-error" role="alert">{erro}</p>}
        <button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar veículo'}</button>
      </form>
      {salvando ? <p role="status">Aguarde a confirmação do cadastro.</p> : <Link to="/painel">Cancelar e voltar ao painel</Link>}
    </main>
  )
}

export default CadastrarVeiculo
