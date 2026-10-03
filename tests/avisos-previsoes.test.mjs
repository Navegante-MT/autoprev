import test from 'node:test'
import assert from 'node:assert/strict'
import { montarAvisos } from '../src/lib/avisosPrevisoes.js'
const dados = (comparacao = {}, status = 'estimativa_inicial') => ({hoje:'2026-10-03',uso:{status:'disponivel'},previsoes:[{tipoId:'oleo',nome:'Óleo',status,proximoKm:status === 'dados_insuficientes'?null:1000,comparacao}]})
test('poucos dados não viram alerta de manutenção',()=>assert.equal(montarAvisos(dados({},'dados_insuficientes')).length,0))
test('tempo e km alcançados geram um único aviso',()=>{const a=montarAvisos(dados({atingidoPorKm:true,atingidoPorTempo:true}));assert.equal(a.length,1);assert.equal(a[0].acao,'servico');assert.match(a[0].texto,/leitura registrada e a data/)})
test('projeção passada solicita leitura, não afirma marco observado',()=>{const a=montarAvisos(dados({dataEstimada:'2026-10-02',atingidoPorKm:false,atingidoPorTempo:false}));assert.equal(a[0].acao,'km');assert.match(a[0].texto,/projeção/);assert.doesNotMatch(a[0].titulo,/alcançado/)})
test('projeção futura próxima avisa sem afirmar marco alcançado',()=>{const a=montarAvisos(dados({dataEstimada:'2026-10-04'}));assert.equal(a.length,1);assert.match(a[0].titulo,/próxima/);assert.doesNotMatch(a[0].titulo,/alcançado/)})
test('uso desatualizado e serviço inconsistente pedem revisão',()=>{const d=dados({},'historico_inconsistente');d.uso.status='desatualizado';d.previsoes[0].motivo='Confira datas';const a=montarAvisos(d);assert.deepEqual(a.map(x=>x.acao),['km','historico'])})

test('avisa exatamente 90 dias antes, mas não 91 dias antes',()=>{
  for (const [data,quantidade] of [['2027-01-01',1],['2027-01-02',0]]) {
    const d=dados();d.previsoes[0].proximaData=data
    assert.equal(montarAvisos(d).length,quantidade)
  }
})
test('sem ritmo usa marco por tempo e explica origem',()=>{
  const d=dados({criterio:'indeterminado'});d.uso.status='dados_insuficientes';d.previsoes[0].proximaData='2026-12-01'
  const a=montarAvisos(d);assert.equal(a.length,1);assert.match(a[0].texto,/por tempo/)
})
test('projeção por km anterior ao tempo inicia aviso primeiro',()=>{
  const d=dados({criterio:'quilometragem',dataEstimada:'2026-12-01'});d.previsoes[0].proximaData='2027-05-01'
  const a=montarAvisos(d);assert.equal(a.length,1);assert.match(a[0].texto,/01\/12\/2026/);assert.match(a[0].texto,/quilometragem/)
})
test('tempo anterior à projeção km usa tempo',()=>{
  const d=dados({criterio:'tempo',dataEstimada:'2026-12-01'});d.previsoes[0].proximaData='2026-12-01'
  assert.match(montarAvisos(d)[0].texto,/por tempo/)
})
test('aviso alcançado continua após data, sem aviso próximo duplicado',()=>{
  const d=dados({atingidoPorTempo:true});d.previsoes[0].proximaData='2026-09-01'
  const a=montarAvisos(d);assert.equal(a.length,1);assert.match(a[0].titulo,/alcançado/)
})
test('novo marco após troca recalculada deixa de gerar aviso antigo',()=>{
  const d=dados();d.previsoes[0].proximaData='2026-12-01';assert.equal(montarAvisos(d).length,1)
  d.previsoes[0].proximaData='2027-05-01';assert.equal(montarAvisos(d).length,0)
})

test('aviso persistente sobrevive a projeção fora da janela e falta de dados',()=>{
  const d=dados();d.previsoes[0].proximaData='2028-01-01'
  d.avisosPersistentes=[{tipo_manutencao_id:'oleo',data_estimada_ativacao:'2026-12-01'}]
  assert.equal(montarAvisos(d).length,1);assert.match(montarAvisos(d)[0].titulo,/ativo até/)
  d.previsoes[0].proximoKm=null;d.previsoes[0].status='dados_insuficientes'
  assert.equal(montarAvisos(d).length,1)
})
test('persistência não duplica o aviso de marco alcançado',()=>{
  const d=dados({atingidoPorKm:true});d.avisosPersistentes=[{tipo_manutencao_id:'oleo',data_estimada_ativacao:'2026-12-01'}]
  assert.equal(montarAvisos(d).length,1)
})
test('aviso persistente não desaparece com ritmo desatualizado',()=>{
  const d=dados();d.uso.status='desatualizado';d.avisosPersistentes=[{tipo_manutencao_id:'oleo',data_estimada_ativacao:'2026-12-01'}]
  assert.equal(montarAvisos(d).filter(a=>a.id.startsWith('persistente')).length,1)
})
