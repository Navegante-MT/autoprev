import { useEffect, useState } from 'react'
import { listarManutencoes } from '../lib/manutencoes.js'
import { formatarData } from '../lib/veiculos.js'

function ManutencoesVeiculo({ id }) {
  const [resultado, setResultado] = useState({ id, status: 'carregando', itens: [], erro: '' })
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      try {
        const itens = await listarManutencoes(id, controller.signal)
        if (!controller.signal.aborted) setResultado({ id, status: 'pronto', itens, erro: '' })
      } catch (error) {
        if (!controller.signal.aborted) setResultado({ id, status: 'erro', itens: [], erro: error.message })
      }
    }
    carregar()
    return () => controller.abort()
  }, [id, tentativa])
  function tentarNovamente() {
    setResultado({ id, status: 'carregando', itens: [], erro: '' })
    setTentativa(atual => atual + 1)
  }
  const atual = resultado.id === id ? resultado : { status: 'carregando' }
  return (
    <section aria-labelledby="servicos-titulo">
      <h2 id="servicos-titulo">Últimas manutenções</h2>
      {atual.status === 'carregando' ? <p role="status">Carregando manutenções…</p> : atual.status === 'erro' ? (
        <><p className="painel-error" role="alert">{atual.erro}</p><button type="button" onClick={tentarNovamente}>Tentar novamente</button></>
      ) : atual.itens.length === 0 ? <p>Nenhuma manutenção registrada para este veículo.</p> : (
        <>
          <p>Até 20 serviços, da data mais recente para a mais antiga.</p>
          <ul className="painel-cards">
            {atual.itens.map(item => (
              <li className="painel-card" key={item.id}>
                <h3>{item.tipos_manutencao?.nome || 'Manutenção'}</h3>
                <p>{formatarData(item.data_manutencao)} · {item.quilometragem.toLocaleString('pt-BR')} km</p>
                {item.valor_pago !== null && <p>Valor: {Number(item.valor_pago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                {item.oficina && <p>Oficina: {item.oficina}</p>}
                {item.observacoes && <p className="manutencao-observacoes">{item.observacoes}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
export default ManutencoesVeiculo
