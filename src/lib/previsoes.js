import { supabase } from './supabaseClient.js'

export async function consultarPrevisoes(veiculoId, signal) {
  const { data, error } = await supabase.functions.invoke('previsoes-veiculo', { body: { veiculoId }, signal })
  if (error) {
    let status = error.context?.status
    if (status === 401) throw new Error('Sua sessão expirou. Entre novamente.')
    if (status === 404) {
      const body = await error.context.json().catch(() => null)
      throw new Error(body?.erro || 'O serviço de previsões ainda não está publicado no Supabase.')
    }
    throw new Error('Não foi possível consultar as estimativas. Confira sua conexão e se a função foi publicada no Supabase.')
  }
  if (!data?.veiculo || !Array.isArray(data.previsoes) || !data.uso) throw new Error('Não foi possível confirmar as estimativas recebidas.')
  return data
}
