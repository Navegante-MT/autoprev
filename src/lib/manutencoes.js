import { supabase } from './supabaseClient.js'
import { validarQuilometragem } from './veiculos.js'

export function validarManutencao(campos) {
  if (!campos.veiculoId || !campos.tipoId) return 'Escolha o veículo e o tipo de manutenção.'
  const erro = validarQuilometragem(campos.quilometragem, campos.data)
  if (erro) return erro
  const valor = campos.valor.trim().replace(',', '.')
  if (valor && (!/^\d+(\.\d{1,2})?$/.test(valor) || Number(valor) > 9999999999.99)) {
    return 'Informe um valor não negativo com até duas casas decimais, sem separador de milhares.'
  }
  return ''
}

function mensagemErro(error) {
  if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(error?.code)) return 'A estrutura de manutenções não está disponível. Confira o segundo SQL da Etapa 8 no Supabase.'
  if (error?.code === '42501') return 'Não foi possível acessar este veículo. Confira sua sessão e as permissões no Supabase.'
  if (error?.code === '22023') return 'O tipo de manutenção está indisponível. Recarregue a página e selecione novamente.'
  if (['23514', '23502', '22P02', '22003'].includes(error?.code)) return 'Confira a data, a quilometragem e o valor informado.'
  return 'Não foi possível concluir a operação. Confira sua conexão e tente novamente.'
}

export async function listarTiposManutencao(signal) {
  const { data, error } = await supabase.from('tipos_manutencao').select('id, nome, codigo').eq('ativo', true).order('nome').abortSignal(signal)
  if (error) throw new Error(mensagemErro(error))
  return data ?? []
}

export async function listarManutencoes(veiculoId, signal) {
  const { data, error } = await supabase.from('manutencoes')
    .select('id, data_manutencao, quilometragem, valor_pago, oficina, observacoes, tipos_manutencao(nome)')
    .eq('veiculo_id', veiculoId).order('data_manutencao', { ascending: false })
    .order('criado_em', { ascending: false }).order('id', { ascending: false }).limit(20).abortSignal(signal)
  if (error) throw new Error(mensagemErro(error))
  return data ?? []
}

export async function existeManutencaoSemelhante(campos, ignorarId) {
  let consulta = supabase.from('manutencoes').select('id')
    .eq('veiculo_id', campos.veiculoId).eq('tipo_manutencao_id', campos.tipoId)
    .eq('data_manutencao', campos.data).eq('quilometragem', Number(campos.quilometragem)).limit(1)
  if (ignorarId) consulta = consulta.neq('id', ignorarId)
  const { data, error } = await consulta.maybeSingle()
  if (error) throw new Error(mensagemErro(error))
  return Boolean(data)
}

export async function registrarManutencao(campos) {
  const validacao = validarManutencao(campos)
  if (validacao) throw new Error(validacao)
  const valor = campos.valor.trim().replace(',', '.')
  const { data, error } = await supabase.rpc('registrar_manutencao', {
    p_veiculo_id: campos.veiculoId, p_tipo_manutencao_id: campos.tipoId,
    p_data_manutencao: campos.data, p_quilometragem: Number(campos.quilometragem),
    p_valor_pago: valor === '' ? null : Number(valor),
    p_oficina: campos.oficina.trim() || null, p_observacoes: campos.observacoes.trim() || null,
  })
  if (error) throw new Error(mensagemErro(error))
  if (!data) throw new Error('Não foi possível confirmar o registro da manutenção.')
  return data
}

export function validarPeriodo(inicio, fim) {
  for (const data of [inicio, fim]) {
    if (!data) continue
    const dia = new Date(`${data}T12:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(dia.getTime()) || dia.toISOString().slice(0, 10) !== data) {
      return 'Informe datas válidas para o período.'
    }
  }
  return inicio && fim && inicio > fim ? 'A data inicial não pode ser posterior à data final.' : ''
}

export async function consultarHistorico(filtros, pagina, signal) {
  const validacao = validarPeriodo(filtros.inicio, filtros.fim)
  if (validacao) throw new Error(validacao)
  if (!Number.isSafeInteger(pagina) || pagina < 1) throw new Error('Página inválida.')
  let consulta = supabase.from('manutencoes').select(
    'id, veiculo_id, data_manutencao, quilometragem, valor_pago, oficina, observacoes, tipos_manutencao(nome), veiculos(marca, modelo, ano, apelido)',
    { count: 'exact' },
  )
  if (filtros.veiculoId) consulta = consulta.eq('veiculo_id', filtros.veiculoId)
  if (filtros.tipoId) consulta = consulta.eq('tipo_manutencao_id', filtros.tipoId)
  if (filtros.inicio) consulta = consulta.gte('data_manutencao', filtros.inicio)
  if (filtros.fim) consulta = consulta.lte('data_manutencao', filtros.fim)
  const inicio = (pagina - 1) * 20
  const { data, count, error } = await consulta
    .order('data_manutencao', { ascending: false }).order('criado_em', { ascending: false })
    .order('id', { ascending: false }).range(inicio, inicio + 19).abortSignal(signal)
  if (error) throw new Error(mensagemErro(error))
  return { itens: data ?? [], total: count ?? 0 }
}

export async function obterManutencao(id, signal) {
  const { data, error } = await supabase.from('manutencoes')
    .select('id, veiculo_id, tipo_manutencao_id, data_manutencao, quilometragem, valor_pago, oficina, observacoes, atualizado_em, tipos_manutencao(id, nome)')
    .eq('id', id).maybeSingle().abortSignal(signal)
  if (error) throw new Error(mensagemErro(error))
  return data
}

export async function editarManutencao(original, campos) {
  const validacao = validarManutencao(campos)
  if (validacao) throw new Error(validacao)
  if (campos.veiculoId !== original.veiculo_id) throw new Error('O veículo desta manutenção não pode ser alterado.')
  const valor = campos.valor.trim().replace(',', '.')
  const { data, error } = await supabase.from('manutencoes').update({
    tipo_manutencao_id: campos.tipoId, data_manutencao: campos.data,
    quilometragem: Number(campos.quilometragem), valor_pago: valor === '' ? null : Number(valor),
    oficina: campos.oficina.trim() || null, observacoes: campos.observacoes.trim() || null,
  }).eq('id', original.id).eq('atualizado_em', original.atualizado_em).select('id').maybeSingle()
  if (error) throw new Error(mensagemErro(error))
  if (!data) throw new Error('A manutenção foi alterada, excluída ou ficou indisponível. Reabra a página antes de tentar novamente.')
  return data.id
}

export async function excluirManutencao(original) {
  const { data, error } = await supabase.from('manutencoes').delete()
    .eq('id', original.id).eq('atualizado_em', original.atualizado_em).select('id').maybeSingle()
  if (error) throw new Error(mensagemErro(error))
  if (!data) throw new Error('A manutenção foi alterada, excluída ou ficou indisponível. Reabra a página antes de tentar novamente.')
  return data.id
}
