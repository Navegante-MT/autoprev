import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2'
import { candidatoAviso } from './ativacaoAviso.ts'
import { calcularPrevisao, calcularUso, compararMarcos } from './previsoes.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Injeta cliente do usuário: nunca usar service_role para estas consultas.
export function criarHandler(criarCliente: (authorization: string) => SupabaseClient, agora = () => new Date()) {
  return async (req: Request): Promise<Response> => {
    const responder = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
    if (req.method !== 'POST') return responder({ erro: 'Método não permitido.' }, 405)
    const authorization = req.headers.get('Authorization') ?? ''
    if (!/^Bearer \S+$/i.test(authorization)) return responder({ erro: 'Entre na sua conta novamente.' }, 401)
    let veiculoId: string
    try {
      const body = await req.json()
      veiculoId = body?.veiculoId
      if (typeof veiculoId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(veiculoId)) return responder({ erro: 'Veículo inválido.' }, 400)
    } catch { return responder({ erro: 'Pedido inválido.' }, 400) }
    try {
      const cliente = criarCliente(authorization)
      const { data: auth, error: authError } = await cliente.auth.getUser()
      if (authError || !auth.user) return responder({ erro: 'Entre na sua conta novamente.' }, 401)
      const { data: veiculo, error } = await cliente.from('veiculos').select('id, marca, modelo, ano, apelido')
        .eq('id', veiculoId).eq('usuario_id', auth.user.id).maybeSingle().abortSignal(req.signal)
      if (error) throw error
      if (!veiculo) return responder({ erro: 'Veículo não encontrado ou indisponível para sua conta.' }, 404)
      async function lerTudo(tabela: string, campos: string) {
        const itens = []
        for (let offset = 0; ; offset += 500) {
          const { data, count, error } = await cliente.from(tabela).select(campos, { count: 'exact' })
            .eq('veiculo_id', veiculoId).order('id').range(offset, offset + 499).abortSignal(req.signal)
          if (error || count === null) throw error ?? new Error('Não foi possível confirmar histórico completo.')
          itens.push(...(data ?? []))
          if (itens.length >= count) return itens
          if (!data?.length || data.length < 500) throw new Error('Histórico incompleto. Não calcular sobre dados truncados.')
        }
      }
      const [servicos, leituras, catalogo] = await Promise.all([
        lerTudo('manutencoes', 'id, veiculo_id, tipo_manutencao_id, data_manutencao, quilometragem, criado_em'),
        lerTudo('registros_quilometragem', 'id, veiculo_id, data_registro, quilometragem, criado_em'),
        cliente.from('tipos_manutencao').select('id, nome, ativo').order('nome').abortSignal(req.signal),
      ])
      if (catalogo.error) throw catalogo.error
      const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Cuiaba', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora())
      const uso = calcularUso(leituras, veiculoId, hoje)
      const tipos = (catalogo.data ?? []).filter(t => t.ativo || servicos.some(s => s.tipo_manutencao_id === t.id))
      const previsoes = tipos.map(tipo => {
        const previsao = calcularPrevisao(servicos, veiculoId, tipo.id, hoje)
        return { tipoId: tipo.id, nome: tipo.nome, ...previsao, comparacao: compararMarcos(previsao, uso, hoje) }
      })
      // Só a primeira ativação é guardada; futuras projeções não a sobrescrevem.
      for (const previsao of previsoes) {
        const candidato = candidatoAviso(previsao, hoje)
        if (!candidato) continue
        const base = servicos.filter(s => s.tipo_manutencao_id === previsao.tipoId).sort((a, b) =>
          b.data_manutencao.localeCompare(a.data_manutencao)
          || Date.parse(b.criado_em) - Date.parse(a.criado_em) || b.id.localeCompare(a.id))[0]
        if (!base) continue
        const { data: ativou, error: erroAtivacao } = await cliente.rpc('ativar_aviso_manutencao', {
          p_veiculo_id: veiculoId, p_tipo_id: previsao.tipoId, p_manutencao_base_id: base.id,
          p_data_estimada: candidato.data, p_motivo: candidato.motivo,
        }).abortSignal(req.signal)
        if (erroAtivacao) throw erroAtivacao
        if (!ativou) return responder({ erro: 'O histórico mudou durante o cálculo. Recalcule as estimativas.' }, 409)
      }
      const { data: avisosPersistentes, error: erroAvisos } = await cliente.from('avisos_manutencao')
        .select('tipo_manutencao_id, data_estimada_ativacao, motivo, ativado_em')
        .eq('veiculo_id', veiculoId).order('tipo_manutencao_id').abortSignal(req.signal)
      if (erroAvisos) throw erroAvisos
      return responder({ veiculo, hoje, uso, previsoes, avisosPersistentes: avisosPersistentes ?? [] })
    } catch { return responder({ erro: 'Não foi possível calcular. Confira sua conexão e tente novamente.' }, 500) }
  }
}
