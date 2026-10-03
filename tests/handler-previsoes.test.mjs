import test from 'node:test'
import assert from 'node:assert/strict'
import { criarHandler } from '../supabase/functions/_shared/handlerPrevisoes.ts'
const id = '00000000-0000-0000-0000-000000000001'
function setup({ authenticated = true, owner = true, fails = false, total = 0, truncated = false, services = null, persistent = [], rpcError = false, rpcResult = true } = {}) {
  const calls = []
  const ativacoes = []
  const cliente = { rpc(name,args) { ativacoes.push({name,args});return {abortSignal() {return Promise.resolve({data:rpcResult,error:rpcError?{message:'failed'}:null})}} }, auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'user1' } : null } }) }, from(table) {
    let offset = 0
    const filters = []
    const query = { select() { return this }, eq(k,v) { filters.push([k,v]); return this }, order() { return this }, range(start) { offset = start; return this }, maybeSingle() { return this }, abortSignal() { return this }, then(resolve,reject) {
      calls.push({table,offset,filters})
      if (fails) return Promise.resolve({error: {message:'failed'}}).then(resolve,reject)
      if (table === 'veiculos') return Promise.resolve({data:owner?{id}:null}).then(resolve,reject)
      if (table === 'tipos_manutencao') return Promise.resolve({data:[{id:'oleo',nome:'Óleo',ativo:true}]}).then(resolve,reject)
      if (table === 'avisos_manutencao') return Promise.resolve({data:persistent}).then(resolve,reject)
      if (table === 'registros_quilometragem') return Promise.resolve({data:[],count:0}).then(resolve,reject)
      if (services) return Promise.resolve({data:services.slice(offset,offset+500),count:services.length}).then(resolve,reject)
      const length = truncated ? 1 : Math.max(0,Math.min(500,total-offset))
      const data = Array.from({length},(_,i) => ({id:String(offset+i),veiculo_id:id,tipo_manutencao_id:'oleo',data_manutencao:'2026-01-01',quilometragem:100}))
      return Promise.resolve({data,count:total}).then(resolve,reject)
    } }
    return query
  } }
  const handler = criarHandler(authorization => { assert.equal(authorization,'Bearer fake');return cliente }, () => new Date('2026-10-03T02:00:00Z'))
  const req = (body = {veiculoId:id}, token = true, method = 'POST') => new Request('https://example.invalid',{method,headers: token?{Authorization:'Bearer fake'}:{},...(method==='POST'?{body:JSON.stringify(body)}:{})})
  return {handler,req,calls,ativacoes}
}
test('preflight e método inválido não consultam banco', async()=>{const s=setup();assert.equal((await s.handler(s.req({},false,'OPTIONS'))).status,204);assert.equal((await s.handler(s.req({},false,'GET'))).status,405);assert.equal(s.calls.length,0)})
test('sem token ou sessão inválida é 401',async()=>{let s=setup();assert.equal((await s.handler(s.req({},false))).status,401);s=setup({authenticated:false});assert.equal((await s.handler(s.req())).status,401);assert.equal(s.calls.length,0)})
test('pedido com ID inválido é 400',async()=>{const s=setup();assert.equal((await s.handler(s.req({veiculoId:'invalid'}))).status,400);assert.equal(s.calls.length,0)})
test('outro dono/veículo ausente é 404 e não lê históricos',async()=>{const s=setup({owner:false});assert.equal((await s.handler(s.req())).status,404);assert.equal(s.calls.length,1);assert.deepEqual(s.calls[0].filters,[['id',id],['usuario_id','user1']])})
test('erro de banco não vira previsão vazia',async()=>{const s=setup({fails:true});assert.equal((await s.handler(s.req())).status,500)})
test('consulta mais de 500 registros e usa data Cuiabá',async()=>{const s=setup({total:501});const response=await s.handler(s.req());assert.equal(response.status,200);const body=await response.json();assert.equal(body.hoje,'2026-10-02');assert.equal(body.previsoes[0].status,'dados_insuficientes');assert.deepEqual(s.calls.filter(c=>c.table==='manutencoes').map(c=>c.offset),[0,500]);assert.equal(response.headers.get('Cache-Control'),'no-store')})
test('página truncada é erro em vez de média parcial',async()=>{const s=setup({total:501,truncated:true});assert.equal((await s.handler(s.req())).status,500)})
test('histórico vazio devolve estados insuficientes por tipo',async()=>{const s=setup();const body=await (await s.handler(s.req())).json();assert.equal(body.previsoes[0].status,'dados_insuficientes');assert.equal(body.uso.status,'dados_insuficientes')})

const ciclo = [
  {id:'base1',veiculo_id:id,tipo_manutencao_id:'oleo',data_manutencao:'2026-08-01',quilometragem:100,criado_em:'2026-08-01T12:00:00Z'},
  {id:'base2',veiculo_id:id,tipo_manutencao_id:'oleo',data_manutencao:'2026-09-01',quilometragem:200,criado_em:'2026-09-01T12:00:00Z'},
]
test('ativação usa o ciclo mais recente e lê aviso persistente',async()=>{
  const persistent=[{tipo_manutencao_id:'oleo',data_estimada_ativacao:'2026-10-02',motivo:'tempo'}]
  const s=setup({services:ciclo,persistent});const response=await s.handler(s.req());assert.equal(response.status,200)
  assert.equal(s.ativacoes.length,1);assert.equal(s.ativacoes[0].name,'ativar_aviso_manutencao')
  assert.equal(s.ativacoes[0].args.p_manutencao_base_id,'base2');assert.equal(s.ativacoes[0].args.p_veiculo_id,id)
  assert.deepEqual((await response.json()).avisosPersistentes,persistent)
})
test('erro ao guardar aviso não é escondido como sucesso',async()=>{const s=setup({services:ciclo,rpcError:true});assert.equal((await s.handler(s.req())).status,500)})
test('troca concorrente pede recálculo sem afirmar ativação',async()=>{const s=setup({services:ciclo,rpcResult:false});assert.equal((await s.handler(s.req())).status,409)})
test('aviso anterior continua na resposta mesmo sem previsão atual',async()=>{const persistent=[{tipo_manutencao_id:'oleo',data_estimada_ativacao:'2026-09-01'}];const s=setup({persistent});const response=await s.handler(s.req());assert.equal(response.status,200);assert.deepEqual((await response.json()).avisosPersistentes,persistent);assert.equal(s.ativacoes.length,0)})
