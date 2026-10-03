import { Link } from 'react-router-dom'
import { montarAvisos } from '../lib/avisosPrevisoes.js'
import './AvisosPrevisoes.css'

function AvisosPrevisoes({ dados, id }) {
  const avisos = montarAvisos(dados)
  const destinos = { km: `/veiculos/${id}/quilometragem`, historico: `/veiculos/${id}`, servico: `/veiculos/${id}/manutencoes/nova` }
  const rotulos = { km: 'Atualizar quilometragem', historico: 'Consultar histórico do veículo', servico: 'Registrar serviço realizado' }
  return (
    <section className="previsoes-avisos" aria-labelledby="avisos-titulo">
      <h2 id="avisos-titulo">Avisos para acompanhamento</h2>
      {avisos.length ? <ul>{avisos.map(aviso => <li key={aviso.id}><h3>{aviso.titulo}</h3><p>{aviso.texto}</p><Link to={destinos[aviso.acao]}>{rotulos[aviso.acao]}</Link></li>)}</ul> : <p>Não há avisos gerados pelos dados disponíveis. Confira os cartões abaixo: poucos registros podem impedir uma estimativa.</p>}
    </section>
  )
}
export default AvisosPrevisoes
