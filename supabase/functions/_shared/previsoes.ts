// Cálculo puro: não consulta o banco, não grava dados e não usa IA.
export type ServicoParaPrevisao = {
  veiculo_id: string
  tipo_manutencao_id: string
  data_manutencao: string
  quilometragem: number
}

type Resultado = {
  status: 'dados_insuficientes' | 'historico_inconsistente' | 'estimativa_inicial' | 'estimativa_personalizada'
  registros: number
  intervalos: number
  motivo: string
  mediaKm: number | null
  mediaDias: number | null
  proximoKm: number | null
  proximaData: string | null
}

const DIA = 86400000

function diaValido(data: string): number | null {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data) || data < '0001-01-01') return null
  const instante = Date.parse(`${data}T00:00:00Z`)
  return Number.isFinite(instante) && new Date(instante).toISOString().slice(0, 10) === data ? instante : null
}

export function calcularPrevisao(
  servicos: readonly ServicoParaPrevisao[],
  veiculoId: string,
  tipoId: string,
  hoje: string,
): Resultado {
  const referencia = diaValido(hoje)
  if (!veiculoId || !tipoId || referencia === null) throw new Error('Informe veículo, tipo e data de referência válidos.')
  const escolhidos = servicos.filter(s => s.veiculo_id === veiculoId && s.tipo_manutencao_id === tipoId)
  const vazio = (status: Resultado['status'], motivo: string, registros = escolhidos.length): Resultado => ({
    status, motivo, registros, intervalos: 0, mediaKm: null, mediaDias: null, proximoKm: null, proximaData: null,
  })
  for (const servico of escolhidos) {
    const dia = diaValido(servico.data_manutencao)
    if (dia === null || dia > referencia || !Number.isInteger(servico.quilometragem) || servico.quilometragem < 0 || servico.quilometragem > 2147483647) {
      return vazio('historico_inconsistente', 'Confira as datas e quilometragens dos serviços antes de calcular.')
    }
  }
  // Duplicatas do mesmo dia/km permanecem no histórico, mas contam uma vez no cálculo.
  const unicos = [...new Map(escolhidos.map(s => [`${s.data_manutencao}:${s.quilometragem}`, s])).values()]
    .sort((a, b) => a.data_manutencao.localeCompare(b.data_manutencao) || a.quilometragem - b.quilometragem)
  if (unicos.length < 2) return vazio('dados_insuficientes', 'São necessários pelo menos dois serviços em datas diferentes.', unicos.length)
  let somaKm = 0
  let somaDias = 0
  for (let i = 1; i < unicos.length; i++) {
    const km = unicos[i].quilometragem - unicos[i - 1].quilometragem
    const dias = (diaValido(unicos[i].data_manutencao)! - diaValido(unicos[i - 1].data_manutencao)!) / DIA
    if (km <= 0 || dias <= 0) {
      return vazio('historico_inconsistente', 'Há serviços no mesmo dia ou sem aumento de km. Confira o histórico; uma correção de hodômetro precisa ser tratada antes da estimativa.', unicos.length)
    }
    somaKm += km
    somaDias += dias
  }
  const intervalos = unicos.length - 1
  const mediaKm = somaKm / intervalos
  const mediaDias = somaDias / intervalos
  const ultimo = unicos.at(-1)!
  const proximoDia = diaValido(ultimo.data_manutencao)! + Math.round(mediaDias) * DIA
  const data = new Date(proximoDia).toISOString()
  if (!/^\d{4}-/.test(data)) return vazio('historico_inconsistente', 'O próximo marco está fora do intervalo de datas permitido.', unicos.length)
  return {
    status: unicos.length === 2 ? 'estimativa_inicial' : 'estimativa_personalizada',
    registros: unicos.length, intervalos,
    motivo: unicos.length === 2 ? 'Estimativa inicial baseada em apenas um intervalo; poucos dados.' : 'Estimativa baseada na média dos intervalos do histórico.',
    mediaKm, mediaDias, proximoKm: Math.round(ultimo.quilometragem + mediaKm), proximaData: data.slice(0, 10),
  }
}

export type LeituraParaUso = {
  id: string
  veiculo_id: string
  data_registro: string
  quilometragem: number
  criado_em: string
}

type Uso = {
  status: 'disponivel' | 'dados_insuficientes' | 'historico_inconsistente' | 'desatualizado' | 'sem_aumento'
  motivo: string
  kmPorDia: number | null
  kmEm30Dias: number | null
  ultimaLeitura: LeituraParaUso | null
}

export function calcularUso(leituras: readonly LeituraParaUso[], veiculoId: string, hoje: string): Uso {
  const referencia = diaValido(hoje)
  if (!veiculoId || referencia === null) throw new Error('Informe veículo e data de referência válidos.')
  const escolhidas = leituras.filter(l => l.veiculo_id === veiculoId)
  const resultado = (status: Uso['status'], motivo: string, ultimaLeitura: LeituraParaUso | null = null): Uso => ({
    status, motivo, kmPorDia: null, kmEm30Dias: null, ultimaLeitura,
  })
  for (const leitura of escolhidas) {
    const dia = diaValido(leitura.data_registro)
    if (dia === null || dia > referencia || !Number.isInteger(leitura.quilometragem) || leitura.quilometragem < 0 || leitura.quilometragem > 2147483647 || !leitura.id || !Number.isFinite(Date.parse(leitura.criado_em))) {
      return resultado('historico_inconsistente', 'Confira datas, km e identificação das leituras.')
    }
  }
  // No mesmo dia, vale a leitura criada por último, como nos detalhes do veículo.
  const ordenadas = [...escolhidas].sort((a, b) => a.data_registro.localeCompare(b.data_registro)
    || Date.parse(a.criado_em) - Date.parse(b.criado_em) || a.id.localeCompare(b.id))
  const dias = [...new Map(ordenadas.map(l => [l.data_registro, l])).values()]
  const ultima = dias.at(-1) ?? null
  if (dias.length < 2) return resultado('dados_insuficientes', 'Atualize o km em pelo menos duas datas diferentes.', ultima)
  for (let i = 1; i < dias.length; i++) {
    if (dias[i].quilometragem < dias[i - 1].quilometragem) {
      return resultado('historico_inconsistente', 'Há redução de km entre datas. Confira as leituras antes de estimar o uso.', ultima)
    }
  }
  if ((referencia - diaValido(ultima!.data_registro)!) / DIA >= 30) {
    return resultado('desatualizado', 'Atualize a quilometragem: a última leitura tem 30 dias ou mais.', ultima)
  }
  const primeira = dias[0]
  const diferencaKm = ultima!.quilometragem - primeira.quilometragem
  if (diferencaKm === 0) return resultado('sem_aumento', 'Não há aumento de km para projetar uma data por quilometragem.', ultima)
  const diferencaDias = (diaValido(ultima!.data_registro)! - diaValido(primeira.data_registro)!) / DIA
  const kmPorDia = diferencaKm / diferencaDias
  return { status: 'disponivel', motivo: 'Média de uso entre a primeira e a última leitura válida, sem garantir o ritmo futuro.', kmPorDia, kmEm30Dias: kmPorDia * 30, ultimaLeitura: ultima }
}

export function compararMarcos(previsao: Resultado, uso: Uso, hoje: string) {
  const referencia = diaValido(hoje)
  if (referencia === null) throw new Error('Data de referência inválida.')
  const vazio = { criterio: 'indeterminado', dataEstimada: null, dataPorKm: null, atingidoPorKm: null, atingidoPorTempo: null } as {
    criterio: 'indeterminado' | 'quilometragem' | 'tempo' | 'ambos'
    dataEstimada: string | null
    dataPorKm: string | null
    atingidoPorKm: boolean | null
    atingidoPorTempo: boolean | null
  }
  if (previsao.proximoKm === null || previsao.proximaData === null) return vazio
  const diaTempo = diaValido(previsao.proximaData)
  if (diaTempo === null) return vazio
  const ultima = uso.ultimaLeitura
  const atingidoPorKm = ultima ? ultima.quilometragem >= previsao.proximoKm : null
  const atingidoPorTempo = referencia >= diaTempo
  if (atingidoPorKm) {
    return { ...vazio, criterio: atingidoPorTempo ? 'ambos' as const : 'quilometragem' as const, atingidoPorKm, atingidoPorTempo }
  }
  if (uso.status !== 'disponivel' || !ultima || !uso.kmPorDia || uso.kmPorDia <= 0) {
    // Sem ritmo, o marco por tempo existe, mas não sabemos qual ocorreria primeiro.
    return { ...vazio, atingidoPorKm, atingidoPorTempo }
  }
  const diasRestantes = Math.ceil((previsao.proximoKm - ultima.quilometragem) / uso.kmPorDia)
  const diaKm = diaValido(ultima.data_registro)! + diasRestantes * DIA
  const dataPorKm = new Date(diaKm).toISOString()
  if (!/^\d{4}-/.test(dataPorKm)) return { ...vazio, atingidoPorKm, atingidoPorTempo }
  const criterio = diaKm < diaTempo ? 'quilometragem' : diaTempo < diaKm ? 'tempo' : 'ambos'
  return {
    criterio, dataEstimada: new Date(Math.min(diaKm, diaTempo)).toISOString().slice(0, 10),
    dataPorKm: dataPorKm.slice(0, 10), atingidoPorKm, atingidoPorTempo,
  }
}
