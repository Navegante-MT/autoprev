import { supabase } from './supabaseClient.js'

export function dataLocalHoje() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
}

export function validarVeiculo(campos) {
  if (!campos.marca.trim() || !campos.modelo.trim()) return 'Informe a marca e o modelo do veículo.'
  const ano = Number(campos.ano)
  if (!campos.ano.trim() || !Number.isInteger(ano) || ano < 1886 || ano > new Date().getFullYear() + 1) {
    return 'Informe um ano válido, entre 1886 e o próximo ano.'
  }
  const km = Number(campos.quilometragem)
  if (!campos.quilometragem.trim() || !Number.isInteger(km) || km < 0 || km > 2147483647) {
    return 'Informe a quilometragem inicial como número inteiro, sem pontos ou vírgulas, e não negativo.'
  }
  return ''
}

export function mensagemErroVeiculos(error) {
  if (error?.code === 'PGRST202' || error?.code === 'PGRST205' || error?.code === '42P01' || error?.code === '42883') {
    return 'A estrutura de veículos ainda não está disponível no Supabase. Confira a execução do SQL da Etapa 8.'
  }
  if (error?.code === '42501' || error?.status === 401 || error?.status === 403) {
    return 'Não foi possível acessar seus veículos. Confira seu login e as permissões no Supabase.'
  }
  if (error?.code === '23514' || error?.code === '23502' || error?.code === '22P02' || error?.code === '22003') {
    return 'Confira os campos: marca e modelo são obrigatórios; ano e quilometragem devem ser válidos.'
  }
  return 'Não foi possível concluir a operação. Confira sua conexão e tente novamente.'
}

export async function cadastrarVeiculo(campos) {
  const validacao = validarVeiculo(campos)
  if (validacao) throw new Error(validacao)
  const { data, error } = await supabase.rpc('cadastrar_veiculo', {
    p_marca: campos.marca.trim(),
    p_modelo: campos.modelo.trim(),
    p_ano: Number(campos.ano),
    p_quilometragem: Number(campos.quilometragem),
    p_apelido: campos.apelido.trim() || null,
    p_data_registro: dataLocalHoje(),
  })
  if (error) throw new Error(mensagemErroVeiculos(error))
  if (!data) throw new Error('Não foi possível confirmar o cadastro do veículo.')
  return data
}

export async function listarVeiculos(signal) {
  // O banco devolve somente a última leitura de cada veículo, respeitando RLS.
  const { data, error } = await supabase.from('veiculos')
    .select('id, marca, modelo, ano, apelido, registros_quilometragem(quilometragem, data_registro)')
    .order('criado_em', { ascending: false })
    .order('data_registro', { referencedTable: 'registros_quilometragem', ascending: false })
    .order('criado_em', { referencedTable: 'registros_quilometragem', ascending: false })
    .order('id', { referencedTable: 'registros_quilometragem', ascending: false })
    .limit(1, { referencedTable: 'registros_quilometragem' })
    .abortSignal(signal)
  if (error) throw new Error(mensagemErroVeiculos(error))
  return data ?? []
}

export function validarQuilometragem(quilometragem, data) {
  const km = Number(quilometragem)
  if (!quilometragem.trim() || !Number.isInteger(km) || km < 0 || km > 2147483647) {
    return 'Informe uma quilometragem inteira e não negativa, sem pontos ou vírgulas.'
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return 'Informe uma data válida.'
  const dia = new Date(`${data}T12:00:00Z`)
  if (Number.isNaN(dia.getTime()) || dia.toISOString().slice(0, 10) !== data || data > dataLocalHoje()) {
    return 'Informe uma data válida que não esteja no futuro.'
  }
  return ''
}

export function formatarData(data) {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

export async function obterVeiculo(id, signal) {
  const { data, error } = await supabase.from('veiculos')
    .select('id, marca, modelo, ano, apelido, registros_quilometragem(id, quilometragem, data_registro, criado_em)')
    .eq('id', id)
    .order('data_registro', { referencedTable: 'registros_quilometragem', ascending: false })
    .order('criado_em', { referencedTable: 'registros_quilometragem', ascending: false })
    .order('id', { referencedTable: 'registros_quilometragem', ascending: false })
    .limit(20, { referencedTable: 'registros_quilometragem' })
    .maybeSingle()
    .abortSignal(signal)
  if (error) throw new Error(mensagemErroVeiculos(error))
  return data
}

export async function registrarQuilometragem(id, quilometragem, dataRegistro) {
  const erroValidacao = validarQuilometragem(quilometragem, dataRegistro)
  if (erroValidacao) throw new Error(erroValidacao)
  const { error } = await supabase.from('registros_quilometragem').insert({
    veiculo_id: id,
    quilometragem: Number(quilometragem),
    data_registro: dataRegistro,
  })
  if (error) throw new Error(mensagemErroVeiculos(error))
}

export async function excluirVeiculo(id) {
  const { data, error } = await supabase.from('veiculos').delete().eq('id', id).select('id').maybeSingle()
  if (error) throw new Error(mensagemErroVeiculos(error))
  if (!data) throw new Error('Veículo não encontrado ou indisponível para sua conta. Recarregue o painel.')
  return data.id
}
