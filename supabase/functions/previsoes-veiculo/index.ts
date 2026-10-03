import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { criarHandler } from '../_shared/handlerPrevisoes.ts'

Deno.serve(criarHandler(authorization => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !key) throw new Error('Configuração indisponível.')
  return createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}))
