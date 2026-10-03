import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularPrevisao, calcularUso, compararMarcos } from '../supabase/functions/_shared/previsoes.ts'

const servico = (data, km, veiculo = 'v1', tipo = 'oleo') => ({ veiculo_id: veiculo, tipo_manutencao_id: tipo, data_manutencao: data, quilometragem: km })
const calcular = dados => calcularPrevisao(dados, 'v1', 'oleo', '2026-10-03')

test('zero ou um serviço não produz previsão', () => {
  for (const dados of [[], [servico('2026-01-01', 40000)]]) {
    const resultado = calcular(dados)
    assert.equal(resultado.status, 'dados_insuficientes')
    assert.equal(resultado.proximoKm, null)
    assert.equal(resultado.proximaData, null)
  }
})
test('dois serviços produzem estimativa inicial de km e dias', () => {
  const resultado = calcular([servico('2026-01-01', 40000), servico('2026-01-11', 48000)])
  assert.equal(resultado.status, 'estimativa_inicial')
  assert.equal(resultado.mediaKm, 8000)
  assert.equal(resultado.mediaDias, 10)
  assert.equal(resultado.proximoKm, 56000)
  assert.equal(resultado.proximaData, '2026-01-21')
})
test('três serviços: exemplo didático chega a 65.500 km', () => {
  const resultado = calcular([servico('2026-01-01', 40000), servico('2026-01-11', 48000), servico('2026-01-31', 57000)])
  assert.equal(resultado.status, 'estimativa_personalizada')
  assert.equal(resultado.mediaKm, 8500)
  assert.equal(resultado.mediaDias, 15)
  assert.equal(resultado.proximoKm, 65500)
  assert.equal(resultado.proximaData, '2026-02-15')
  assert.equal(resultado.intervalos, 2)
})
test('não mistura veículos ou tipos', () => {
  const dados = [servico('2026-01-01', 100), servico('2026-01-11', 200)]
  assert.deepEqual(calcular([...dados, servico('inválida', -1, 'v2'), servico('2026-01-15', 50000, 'v1', 'bateria')]), calcular(dados))
})
test('ordena retroativos sem alterar a entrada', () => {
  const dados = [servico('2026-01-11', 200), servico('2026-01-01', 100)]
  const original = structuredClone(dados)
  assert.equal(calcular(dados).proximoKm, 300)
  assert.deepEqual(dados, original)
})
test('duplicata exata não distorce a média nem vira intervalo zero', () => {
  const a = servico('2026-01-01', 100), b = servico('2026-01-11', 200)
  assert.equal(calcular([a, a]).status, 'dados_insuficientes')
  assert.deepEqual(calcular([a, b, b]), calcular([a, b]))
})
test('mesmo dia com km diferentes bloqueia previsão', () => {
  assert.equal(calcular([servico('2026-01-01', 100), servico('2026-01-01', 200)]).status, 'historico_inconsistente')
})
test('km igual ou decrescente bloqueia previsão sem inventar intervalo', () => {
  for (const km of [100, 90]) assert.equal(calcular([servico('2026-01-01', 100), servico('2026-01-11', km)]).proximoKm, null)
})
test('dados inválidos e datas futuras bloqueiam previsão', () => {
  for (const registro of [servico('2026-02-30', 200), servico('2027-01-01', 200), servico('2026-02-01', NaN), servico('2026-02-01', -1), servico('2026-02-01', 1.5)]) {
    assert.equal(calcular([servico('2026-01-01', 100), registro]).status, 'historico_inconsistente')
  }
})
test('dias em ano bissexto e mudança de ano independem do fuso', () => {
  const resultado = calcular([servico('2024-02-28', 100), servico('2024-03-01', 200)])
  assert.equal(resultado.mediaDias, 2)
  assert.equal(resultado.proximaData, '2024-03-03')
  assert.equal(calcular([servico('2025-12-21', 100), servico('2025-12-31', 200)]).proximaData, '2026-01-10')
})
test('arredonda apenas os marcos finais, preserva a média fracionária', () => {
  const resultado = calcular([servico('2026-01-01', 100), servico('2026-01-02', 110), servico('2026-01-04', 121)])
  assert.equal(resultado.mediaKm, 10.5)
  assert.equal(resultado.mediaDias, 1.5)
  assert.equal(resultado.proximoKm, 132)
  assert.equal(resultado.proximaData, '2026-01-06')
})
test('exige parâmetros de contexto válidos', () => {
  assert.throws(() => calcularPrevisao([], '', 'oleo', '2026-10-03'))
  assert.throws(() => calcularPrevisao([], 'v1', 'oleo', '2026-02-30'))
})

const leitura = (dia, km, id = dia, veiculo = 'v1', criado = `${dia}T12:00:00Z`) => ({ id, veiculo_id: veiculo, data_registro: dia, quilometragem: km, criado_em: criado })
const uso = dados => calcularUso(dados, 'v1', '2026-10-03')
const marco = (km = 1600, data = '2026-10-12') => ({ status: 'estimativa_inicial', proximoKm: km, proximaData: data })

test('ritmo de 100 km/dia e projeção equivalente de 3.000 km em 30 dias', () => {
  const r = uso([leitura('2026-09-20', 1000), leitura('2026-09-25', 1500)])
  assert.equal(r.kmPorDia, 100)
  assert.equal(r.kmEm30Dias, 3000)
})
test('leituras de outro veículo não afetam uso', () => {
  const dados = [leitura('2026-09-20', 1000), leitura('2026-09-25', 1500)]
  assert.deepEqual(uso([...dados, leitura('inválida', -1, 'x', 'v2')]), uso(dados))
})
test('mesmo dia usa último criado; ID desempata e entrada preservada', () => {
  const dados = [leitura('2026-09-25', 1700, 'a'), leitura('2026-09-20', 1000), leitura('2026-09-25', 1500, 'b')]
  const original = structuredClone(dados)
  assert.equal(uso(dados).kmPorDia, 100)
  assert.deepEqual(dados, original)
  assert.equal(uso([leitura('2026-09-20', 1000), leitura('2026-09-25', 1700, 'a'), leitura('2026-09-25', 1500, 'b', 'v1', '2026-09-25T13:00:00Z')]).ultimaLeitura.id, 'b')
})
test('uma única data não permite ritmo', () => {
  assert.equal(uso([]).status, 'dados_insuficientes')
  assert.equal(uso([leitura('2026-09-25', 1000), leitura('2026-09-25', 1500, 'b')]).status, 'dados_insuficientes')
})
test('km decrescente não projeta, mesmo com aumento posterior', () => {
  assert.equal(uso([leitura('2026-09-20', 1000), leitura('2026-09-21', 900), leitura('2026-09-25', 1500)]).status, 'historico_inconsistente')
})
test('sem aumento ou leitura desatualizada não produz ritmo', () => {
  assert.equal(uso([leitura('2026-09-20', 1000), leitura('2026-09-25', 1000)]).status, 'sem_aumento')
  assert.equal(uso([leitura('2026-08-01', 1000), leitura('2026-09-03', 1500)]).status, 'desatualizado')
  assert.equal(uso([leitura('2026-08-01', 1000), leitura('2026-09-04', 1500)]).status, 'disponivel')
})
test('leituras inválidas/futuras bloqueiam uso', () => {
  for (const l of [leitura('2026-02-30', 500), leitura('2027-01-01', 500), leitura('2026-09-20', -1), leitura('2026-09-20', 500, 'x', 'v1', 'inválido')]) assert.equal(uso([l]).status, 'historico_inconsistente')
})
test('km pode acontecer antes de tempo, tempo antes de km ou no mesmo dia', () => {
  const r = uso([leitura('2026-09-20', 1000), leitura('2026-09-25', 1500)])
  assert.equal(compararMarcos(marco(), r, '2026-10-03').criterio, 'quilometragem')
  assert.equal(compararMarcos(marco(3500), r, '2026-10-03').criterio, 'tempo')
  assert.equal(compararMarcos(marco(3200), r, '2026-10-03').criterio, 'ambos')
  assert.equal(compararMarcos(marco(), r, '2026-10-03').dataPorKm, '2026-09-26')
})
test('km atingido em leitura é distinto de projeção; ambos atingidos não inventam data', () => {
  const r = uso([leitura('2026-09-20', 1000), leitura('2026-09-25', 1500)])
  const resultado = compararMarcos(marco(1400, '2026-09-26'), r, '2026-10-03')
  assert.equal(resultado.criterio, 'ambos')
  assert.equal(resultado.atingidoPorKm, true)
  assert.equal(resultado.dataEstimada, null)
})
test('sem ritmo não afirma qual marco ocorre primeiro', () => {
  const resultado = compararMarcos(marco(1400, '2026-09-26'), uso([]), '2026-10-03')
  assert.equal(resultado.criterio, 'indeterminado')
  assert.equal(resultado.atingidoPorTempo, true)
  assert.equal(resultado.atingidoPorKm, null)
})
test('sem previsão personalizada não compara marcos', () => {
  assert.equal(compararMarcos(calcular([]), uso([]), '2026-10-03').criterio, 'indeterminado')
})
