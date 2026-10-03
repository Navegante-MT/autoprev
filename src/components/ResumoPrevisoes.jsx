import { useEffect, useState } from 'react'
import { consultarPrevisoes } from '../lib/previsoes.js'
import { montarAvisos } from '../lib/avisosPrevisoes.js'

function ResumoPrevisoes({ id }) {
  const [resultado, setResultado] = useState({ id, status: 'carregando' })
  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      try {
        const dados = await consultarPrevisoes(id, controller.signal)
        if (!controller.signal.aborted) setResultado({ id, status: 'pronto', dados, avisos: montarAvisos(dados) })
      } catch {
        if (!controller.signal.aborted) setResultado({ id, status: 'erro' })
      }
    }
    carregar()
    return () => controller.abort()
  }, [id])
  const atual = resultado.id === id ? resultado : { status: 'carregando' }
  if (atual.status === 'carregando') return <p role="status">Calculando avisos deste veículo…</p>
  if (atual.status === 'erro') return <p>Não foi possível consultar os avisos. Abra Estimativas e avisos para tentar novamente.</p>
  if (atual.avisos.length) return <div><p>{atual.avisos.length} aviso(s) para acompanhar:</p><ul>{atual.avisos.map(aviso => <li key={aviso.id}>{aviso.titulo}</li>)}</ul></div>
  const comPrevisao = atual.dados.previsoes.filter(p => p.proximoKm !== null).length
  return <p>{comPrevisao ? 'Sem avisos nos dados disponíveis. Consulte as estimativas para ver os próximos marcos.' : 'Ainda não há histórico suficiente para estimar as manutenções.'}</p>
}
export default ResumoPrevisoes
