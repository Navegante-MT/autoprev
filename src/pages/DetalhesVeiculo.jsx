import { Link, useLocation, useParams } from 'react-router-dom'
import useVeiculo from '../hooks/useVeiculo.js'
import ExcluirVeiculo from '../components/ExcluirVeiculo.jsx'
import EstadoVeiculo from '../components/EstadoVeiculo.jsx'
import { formatarData } from '../lib/veiculos.js'
import './Painel.css'
import './Veiculo.css'
import './Manutencao.css'
import ManutencoesVeiculo from '../components/ManutencoesVeiculo.jsx'

function DetalhesVeiculo() {
  const { id } = useParams()
  const location = useLocation()
  const resultado = useVeiculo(id)
  const veiculo = resultado.veiculo
  const leituras = veiculo?.registros_quilometragem || []
  return (
    <main className="painel-page veiculo-page">
      <h1>Detalhes do veículo</h1>
      <EstadoVeiculo {...resultado} />
      {resultado.status === 'pronto' && (
        <>
          {location.state?.mensagem && <p className="painel-success" role="status">{location.state.mensagem}</p>}
          <h2>{veiculo.apelido || `${veiculo.marca} ${veiculo.modelo}`}</h2>
          <p>{veiculo.marca} {veiculo.modelo} · {veiculo.ano}</p>
          <p>{leituras[0] ? `Quilometragem atual: ${leituras[0].quilometragem.toLocaleString('pt-BR')} km, registrada em ${formatarData(leituras[0].data_registro)}.` : 'Quilometragem não registrada.'}</p>
          <Link className="painel-action" to={`/veiculos/${id}/quilometragem`}>Atualizar quilometragem</Link>
          <Link className="painel-action" to={`/veiculos/${id}/manutencoes/nova`}>Registrar manutenção</Link>
          <Link className="painel-action" to={`/historico?veiculo=${id}`}>Ver histórico completo deste veículo</Link>
          <ManutencoesVeiculo id={id} />
          <section aria-labelledby="leituras-titulo">
            <h2 id="leituras-titulo">Últimas leituras de quilometragem</h2>
            <p>Exibimos até 20 leituras, da data mais recente para a mais antiga.</p>
            {leituras.length ? (
              <ul className="veiculo-leituras">
                {leituras.map(leitura => <li key={leitura.id}>{formatarData(leitura.data_registro)} — {leitura.quilometragem.toLocaleString('pt-BR')} km</li>)}
              </ul>
            ) : <p>Nenhuma leitura registrada.</p>}
          </section>
          <ExcluirVeiculo key={id} veiculo={veiculo} />
        </>
      )}
      <Link to="/painel">Voltar ao painel</Link>
    </main>
  )
}
export default DetalhesVeiculo
