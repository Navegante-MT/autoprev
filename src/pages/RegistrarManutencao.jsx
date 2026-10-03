import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { dataLocalHoje, listarVeiculos, obterVeiculo } from '../lib/veiculos.js'
import { existeManutencaoSemelhante, listarTiposManutencao, registrarManutencao, validarManutencao } from '../lib/manutencoes.js'
import './Cadastro.css'
import './Manutencao.css'

function FormularioManutencao({ id, veiculos, tipos }) {
  const [campos, setCampos] = useState({ veiculoId: id || '', tipoId: '', data: dataLocalHoje(), quilometragem: '', valor: '', oficina: '', observacoes: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const enviando = useRef(false)
  const navigate = useNavigate()
  const destino = id ? `/veiculos/${id}` : '/painel'
  function alterar(event) { setCampos(atuais => ({ ...atuais, [event.target.name]: event.target.value })) }
  async function salvar(event) {
    event.preventDefault()
    if (enviando.current) return
    setErro('')
    const validacao = validarManutencao(campos)
    if (validacao) { setErro(validacao); return }
    enviando.current = true
    setSalvando(true)
    try {
      const veiculo = await obterVeiculo(campos.veiculoId)
      if (!veiculo) throw new Error('Veículo não encontrado ou indisponível para sua conta.')
      const atual = veiculo.registros_quilometragem?.[0]
      const semelhante = await existeManutencaoSemelhante(campos)
      if (semelhante && !window.confirm('Já existe um serviço com o mesmo veículo, tipo, data e quilometragem. Deseja registrar outro mesmo assim?')) {
        enviando.current = false; setSalvando(false); return
      }
      if (atual && Number(campos.quilometragem) < atual.quilometragem && !window.confirm(`O serviço foi realizado com km menor que a leitura atual de ${atual.quilometragem.toLocaleString('pt-BR')} km. Confira a data e o valor. Deseja continuar? O histórico será preservado.`)) {
        enviando.current = false; setSalvando(false); return
      }
      await registrarManutencao(campos)
      navigate(`/veiculos/${campos.veiculoId}`, { replace: true, state: { mensagem: 'Manutenção registrada com sucesso.' } })
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar. Tente novamente.')
      enviando.current = false; setSalvando(false)
    }
  }
  return (
    <>
      <form className="cadastro-form manutencao-form" onSubmit={salvar} aria-busy={salvando}>
        <label htmlFor="servico-veiculo">Veículo</label>
        <select id="servico-veiculo" name="veiculoId" value={campos.veiculoId} onChange={alterar} required disabled={salvando || Boolean(id)}>
          <option value="">Selecione um veículo</option>
          {veiculos.map(v => <option key={v.id} value={v.id}>{v.apelido || `${v.marca} ${v.modelo}`} · {v.ano}</option>)}
        </select>
        <label htmlFor="servico-tipo">Tipo de manutenção</label>
        <select id="servico-tipo" name="tipoId" value={campos.tipoId} onChange={alterar} required disabled={salvando}>
          <option value="">Selecione um tipo</option>
          {tipos.map(tipo => <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>)}
        </select>
        <label htmlFor="servico-data">Data da manutenção</label>
        <input id="servico-data" name="data" type="date" max={dataLocalHoje()} required disabled={salvando} value={campos.data} onChange={alterar} />
        <label htmlFor="servico-km">Quilometragem no dia do serviço (km)</label>
        <input id="servico-km" name="quilometragem" type="number" min={0} max={2147483647} step={1} required disabled={salvando} value={campos.quilometragem} onChange={alterar} aria-describedby="servico-ajuda" />
        <p id="servico-ajuda" className="cadastro-help">Serviços antigos são permitidos. Informe o km conhecido daquela data, sem separadores.</p>
        <label htmlFor="servico-valor">Valor pago em R$ (opcional)</label>
        <input id="servico-valor" name="valor" type="text" inputMode="decimal" placeholder="Ex.: 250,50" disabled={salvando} value={campos.valor} onChange={alterar} />
        <label htmlFor="servico-oficina">Oficina (opcional)</label>
        <input id="servico-oficina" name="oficina" disabled={salvando} value={campos.oficina} onChange={alterar} />
        <label htmlFor="servico-observacoes">Observações (opcional)</label>
        <textarea id="servico-observacoes" name="observacoes" rows={4} disabled={salvando} value={campos.observacoes} onChange={alterar} />
        {erro && <p className="cadastro-message cadastro-error" role="alert">{erro}</p>}
        <button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar manutenção'}</button>
      </form>
      {salvando ? <p role="status">Aguarde a confirmação do registro.</p> : <Link to={destino}>Cancelar e voltar</Link>}
    </>
  )
}

function RegistrarManutencao() {
  const { id } = useParams()
  const [resultado, setResultado] = useState({ status: 'carregando', veiculos: [], tipos: [], erro: '' })
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      try {
        const [veiculos, tipos] = await Promise.all([listarVeiculos(controller.signal), listarTiposManutencao(controller.signal)])
        if (!controller.signal.aborted) setResultado({ status: 'pronto', veiculos, tipos, erro: '' })
      } catch (error) {
        if (!controller.signal.aborted) setResultado({ status: 'erro', veiculos: [], tipos: [], erro: error.message })
      }
    }
    carregar()
    return () => controller.abort()
  }, [tentativa])
  function tentarNovamente() {
    setResultado({ status: 'carregando', veiculos: [], tipos: [], erro: '' })
    setTentativa(atual => atual + 1)
  }
  const disponivel = !id || resultado.veiculos.some(v => v.id === id)
  return (
    <main className="cadastro-page">
      <h1>Registrar manutenção</h1>
      {resultado.status === 'carregando' ? <p role="status">Carregando veículos e tipos de serviço…</p> : resultado.status === 'erro' ? (
        <><p className="cadastro-message cadastro-error" role="alert">{resultado.erro}</p><button type="button" onClick={tentarNovamente}>Tentar novamente</button><Link to="/painel">Voltar ao painel</Link></>
      ) : !disponivel ? <><p role="alert">Veículo não encontrado ou indisponível para sua conta.</p><Link to="/painel">Voltar ao painel</Link></> : resultado.veiculos.length === 0 ? (
        <><p>Cadastre um veículo antes de registrar uma manutenção.</p><Link to="/veiculos/novo">Cadastrar veículo</Link></>
      ) : resultado.tipos.length === 0 ? <><p role="alert">Nenhum tipo de manutenção disponível.</p><Link to="/painel">Voltar ao painel</Link></> : <FormularioManutencao key={id || 'selecionar'} id={id} veiculos={resultado.veiculos} tipos={resultado.tipos} />}
    </main>
  )
}
export default RegistrarManutencao
