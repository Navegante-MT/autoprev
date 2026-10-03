import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { corrigirLeitura, formatarData, obterLeitura, validarQuilometragem } from '../lib/veiculos.js'
import './Cadastro.css'

function FormularioCorrecao({ leitura }) {
  const [km, setKm] = useState(String(leitura.quilometragem))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const trava = useRef(false)
  const navigate = useNavigate()
  async function salvar(event) {
    event.preventDefault()
    if (trava.current) return
    const validacao = validarQuilometragem(km, leitura.data_registro)
    setErro(validacao)
    if (validacao) return
    if (Number(km) === leitura.quilometragem) { setErro('Informe o km corrigido; o valor continua igual.'); return }
    if (!window.confirm(`Corrigir a leitura de ${formatarData(leitura.data_registro)} de ${leitura.quilometragem.toLocaleString('pt-BR')} para ${Number(km).toLocaleString('pt-BR')} km? Isso corrige somente esta leitura, preservando a data. As manutenções não serão alteradas. As estimativas usarão o valor corrigido na próxima consulta.`)) return
    trava.current = true
    setSalvando(true)
    try {
      await corrigirLeitura(leitura, km)
      navigate(`/veiculos/${leitura.veiculo_id}`, { replace: true, state: { mensagem: 'Leitura de km corrigida. Reabra as estimativas para recalcular.' } })
    } catch (error) {
      setErro(error.message || 'Não foi possível corrigir a leitura.')
      trava.current = false
      setSalvando(false)
    }
  }
  return <>
    <p>Data da leitura: {formatarData(leitura.data_registro)}. Valor registrado: {leitura.quilometragem.toLocaleString('pt-BR')} km.</p>
    <p>Use esta opção para corrigir um erro de digitação numa leitura existente. Para registrar o km de outro dia, use Atualizar quilometragem.</p>
    <form className="cadastro-form" onSubmit={salvar} aria-busy={salvando}>
      <label htmlFor="corrigir-km">Quilometragem correta (km)</label>
      <input id="corrigir-km" type="number" min={0} max={2147483647} step={1} required value={km} disabled={salvando} onChange={e => setKm(e.target.value)} />
      <p className="cadastro-help">Digite sem pontos ou vírgulas. A data e os demais registros serão preservados.</p>
      {erro && <p className="cadastro-error" role="alert">{erro}</p>}
      <button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar correção da leitura'}</button>
    </form>
    {salvando ? <p role="status">Aguarde a confirmação da correção.</p> : <Link to={`/veiculos/${leitura.veiculo_id}`}>Cancelar e voltar</Link>}
  </>
}

function CorrigirQuilometragem() {
  const { id, leituraId } = useParams()
  const chave = `${id}/${leituraId}`
  const [resultado, setResultado] = useState({ chave, status: 'carregando' })
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      try {
        const leitura = await obterLeitura(id, leituraId, controller.signal)
        if (!controller.signal.aborted) setResultado({ chave, status: 'pronto', leitura })
      } catch (error) {
        if (!controller.signal.aborted) setResultado({ chave, status: 'erro', erro: error.message })
      }
    }
    carregar()
    return () => controller.abort()
  }, [chave, id, leituraId, tentativa])
  function tentarNovamente() { setResultado({ chave, status: 'carregando' }); setTentativa(t => t + 1) }
  const atual = resultado.chave === chave ? resultado : { status: 'carregando' }
  return <main className="cadastro-page">
    <h1>Corrigir leitura de quilometragem</h1>
    {atual.status === 'carregando' ? <p role="status">Carregando leitura…</p> : atual.status === 'erro' ? <><p role="alert">{atual.erro}</p><button onClick={tentarNovamente}>Tentar novamente</button><Link to={`/veiculos/${id}`}>Voltar ao veículo</Link></> : !atual.leitura ? <><p role="alert">Leitura não encontrada ou indisponível para sua conta.</p><Link to={`/veiculos/${id}`}>Voltar ao veículo</Link></> : <FormularioCorrecao key={`${chave}-${tentativa}`} leitura={atual.leitura} />}
  </main>
}
export default CorrigirQuilometragem
