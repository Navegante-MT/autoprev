import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AvisosPrevisoes from '../components/AvisosPrevisoes.jsx'
import { consultarPrevisoes } from '../lib/previsoes.js'
import { formatarData } from '../lib/veiculos.js'
import './Painel.css'
import './Veiculo.css'

const numero = valor => valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const criterios = { quilometragem: 'quilometragem', tempo: 'tempo', ambos: 'tempo e quilometragem' }

function PrevisoesVeiculo() {
  const { id } = useParams()
  const [resultado, setResultado] = useState({ id, status: 'carregando' })
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      try {
        const dados = await consultarPrevisoes(id, controller.signal)
        if (!controller.signal.aborted) setResultado({ id, status: 'pronto', dados })
      } catch (error) {
        if (!controller.signal.aborted) setResultado({ id, status: 'erro', erro: error.message })
      }
    }
    carregar()
    return () => controller.abort()
  }, [id, tentativa])
  function recalcular() { setResultado({ id, status: 'carregando' }); setTentativa(t => t + 1) }
  const atual = resultado.id === id ? resultado : { status: 'carregando' }
  return (
    <main className="painel-page veiculo-page">
      <h1>Estimativas de manutenção</h1>
      <p>Calculadas pelo histórico deste veículo. São estimativas de planejamento, não uma avaliação da condição das peças ou um intervalo recomendado pelo fabricante.</p>
      {atual.status === 'carregando' ? <p role="status">Consultando histórico e calculando…</p> : atual.status === 'erro' ? <><p className="painel-error" role="alert">{atual.erro}</p><button onClick={recalcular}>Tentar novamente</button></> : (
        <>
          <h2>{atual.dados.veiculo.apelido || `${atual.dados.veiculo.marca} ${atual.dados.veiculo.modelo}`}</h2>
          <p>Referência: {formatarData(atual.dados.hoje)}</p>
          <p>{atual.dados.uso.motivo}</p>
          {atual.dados.uso.kmPorDia !== null && <p>Uso médio: {numero(atual.dados.uso.kmPorDia)} km/dia; equivalente a {numero(atual.dados.uso.kmEm30Dias)} km em 30 dias.</p>}
          <Link className="painel-action" to={`/veiculos/${id}/quilometragem`}>Atualizar quilometragem</Link>
          <AvisosPrevisoes dados={atual.dados} id={id} />
          <ul className="painel-cards">
            {atual.dados.previsoes.map(p => (
              <li className="painel-card" key={p.tipoId}>
                <h2>{p.nome}</h2>
                <p>{p.motivo}</p>
                <p>{p.registros} serviço(s) considerado(s).</p>
                {p.proximoKm !== null && <>
                  <p>Intervalo médio: {numero(p.mediaKm)} km e {numero(p.mediaDias)} dias.</p>
                  <p>Marco estimado: {numero(p.proximoKm)} km ou {formatarData(p.proximaData)}.</p>
                  {p.comparacao.atingidoPorKm === true && <p>O km registrado já alcançou o marco estimado.</p>}
                  {p.comparacao.atingidoPorTempo === true && <p>A data de referência já alcançou o marco por tempo.</p>}
                  {p.comparacao.dataEstimada ? <p>Primeiro marco projetado: {formatarData(p.comparacao.dataEstimada)}, por {criterios[p.comparacao.criterio]}. A projeção de km não confirma o hodômetro atual.</p> : p.comparacao.criterio === 'indeterminado' && <p>Não há dados suficientes para comparar qual marco ocorrerá primeiro.</p>}
                </>}
              </li>
            ))}
          </ul>
          {atual.dados.previsoes.length === 0 && <p>Nenhum tipo de manutenção disponível.</p>}
          <button type="button" onClick={recalcular}>Recalcular estimativas</button>
          <Link className="painel-action" to={`/veiculos/${id}/manutencoes/nova`}>Registrar manutenção</Link>
        </>
      )}
      <Link to={`/veiculos/${id}`}>Voltar ao veículo</Link>
    </main>
  )
}
export default PrevisoesVeiculo
