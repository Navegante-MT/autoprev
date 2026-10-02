import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import './Login.css'
import './Recuperacao.css'

function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (enviando) return
    setErro('')
    setMensagem('')
    setEnviando(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: new URL('/redefinir-senha', window.location.origin).href,
      })
      if (error) {
        setErro(error.status === 429
          ? 'Muitas tentativas. Aguarde um pouco antes de solicitar outro e-mail.'
          : 'Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.')
        return
      }
      setMensagem('Se existe uma conta com esse e-mail, você receberá um link para redefinir a senha. Confira também a pasta de spam.')
    } catch {
      setErro('Não foi possível conectar. Verifique sua conexão e tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login-page">
      <h1>Recuperar senha</h1>
      <p>Informe o e-mail da sua conta para receber o link de recuperação.</p>
      <form className="login-form" onSubmit={handleSubmit} aria-busy={enviando}>
        <label htmlFor="recuperar-email">E-mail</label>
        <input id="recuperar-email" name="email" type="email" autoComplete="username"
          value={email} onChange={(event) => setEmail(event.target.value)} required disabled={enviando} />
        {erro && <p className="login-error" role="alert">{erro}</p>}
        {mensagem && <p className="recuperacao-status" role="status">{mensagem}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar link de recuperação'}
        </button>
      </form>
      <Link to="/login">Voltar ao login</Link>
    </main>
  )
}

export default RecuperarSenha
