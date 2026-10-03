// Avisos derivados dos resultados; não definem intervalos mecânicos novos.
export function montarAvisos(dados) {
  const avisos = []
  const persistentes = new Set()
  for (const aviso of dados.avisosPersistentes ?? []) {
    persistentes.add(aviso.tipo_manutencao_id)
    const tipo = dados.previsoes.find(p => p.tipoId === aviso.tipo_manutencao_id)
    const nome = tipo?.nome || 'Manutenção'
    const [ano, mes, dia] = aviso.data_estimada_ativacao.split('-')
    avisos.push({ id: `persistente-${aviso.tipo_manutencao_id}`, titulo: `${nome}: aviso ativo até registrar nova troca`, texto: `Este aviso foi ativado com o marco estimado de ${dia}/${mes}/${ano}. Novas leituras podem antecipar ou adiar a data projetada, mas não retiram este aviso. Registre uma nova troca deste tipo e veículo quando ela for realizada.`, acao: 'servico' })
  }
  if (dados.uso.status === 'desatualizado') avisos.push({ id: 'km-desatualizado', titulo: 'Atualize a quilometragem', texto: 'A última leitura tem 30 dias ou mais. Registre o km atual para voltar a projetar o ritmo de uso.', acao: 'km' })
  if (dados.uso.status === 'historico_inconsistente') avisos.push({ id: 'km-inconsistente', titulo: 'Confira as leituras de km', texto: dados.uso.motivo, acao: 'historico' })
  for (const p of dados.previsoes) {
    if (p.status === 'historico_inconsistente') {
      avisos.push({ id: `revisar-${p.tipoId}`, titulo: `${p.nome}: confira o histórico`, texto: p.motivo, acao: 'historico' })
      continue
    }
    if (persistentes.has(p.tipoId) || p.proximoKm === null) continue
    const km = p.comparacao.atingidoPorKm === true
    const tempo = p.comparacao.atingidoPorTempo === true
    if (km || tempo) {
      avisos.push({ id: `marco-${p.tipoId}`, titulo: `${p.nome}: marco estimado alcançado`, texto: km && tempo ? 'A leitura registrada e a data de referência alcançaram os marcos calculados pelo histórico.' : km ? 'A leitura registrada alcançou o marco de quilometragem calculado pelo histórico.' : 'A data de referência alcançou o marco por tempo calculado pelo histórico.', acao: 'servico' })
    } else if (p.comparacao.dataEstimada && p.comparacao.dataEstimada <= dados.hoje) {
      avisos.push({ id: `projecao-${p.tipoId}`, titulo: `${p.nome}: confira o km atual`, texto: 'Pelo ritmo médio, o marco de km pode ter sido alcançado. Isso é uma projeção; atualize a leitura para conferir.', acao: 'km' })
    } else {
      // A data por tempo permanece disponível mesmo sem ritmo de uso.
      const datas = [p.proximaData, p.comparacao.dataEstimada].filter(data => typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)).sort()
      const primeira = datas[0]
      if (primeira) {
        const dias = (Date.parse(`${primeira}T00:00:00Z`) - Date.parse(`${dados.hoje}T00:00:00Z`)) / 86400000
        if (dias >= 0 && dias <= 90) {
          const porKm = p.comparacao.criterio === 'quilometragem' && primeira === p.comparacao.dataEstimada
          const porAmbos = p.comparacao.criterio === 'ambos' && primeira === p.comparacao.dataEstimada
          const origem = porAmbos ? 'tempo e quilometragem' : porKm ? 'quilometragem, projetada pelo ritmo de uso' : 'tempo'
          const [ano, mes, dia] = primeira.split('-')
          avisos.push({ id: `proximo-${p.tipoId}`, titulo: `${p.nome}: manutenção próxima`, texto: `O primeiro marco estimado é ${dia}/${mes}/${ano}, por ${origem}, em ${dias} dia(s). O aviso começa 90 dias antes. Registre a nova troca quando ela for realizada para recalcular a próxima estimativa.`, acao: 'servico' })
        }
      }    }
  }
  return avisos
}
