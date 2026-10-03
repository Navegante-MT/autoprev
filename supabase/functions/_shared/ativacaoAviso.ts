// Escolhe a primeira data relevante; não retira avisos que já foram ativados.
export function candidatoAviso(previsao: {
  proximoKm: number | null
  proximaData: string | null
  comparacao: { atingidoPorKm: boolean | null; dataEstimada: string | null; criterio: string }
}, hoje: string) {
  if (previsao.proximoKm === null || previsao.proximaData === null) return null
  if (previsao.comparacao.atingidoPorKm === true) return { data: hoje, motivo: 'quilometragem' }
  const datas = [previsao.proximaData, previsao.comparacao.dataEstimada].filter((d): d is string => Boolean(d)).sort()
  const data = datas[0]
  const dias = (Date.parse(`${data}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86400000
  if (!Number.isFinite(dias) || dias > 90) return null
  const motivo = data === previsao.comparacao.dataEstimada ? previsao.comparacao.criterio : 'tempo'
  return { data, motivo: ['tempo', 'quilometragem', 'ambos'].includes(motivo) ? motivo : 'tempo' }
}
