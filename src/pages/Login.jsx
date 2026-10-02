import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    if (entrando) return

    setErro('')
    setEntrando(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      })

      if (error) {
        if (error.code === 'invalid_credentials') {
          setErro('E-mail ou senha incorretos. Confira os dados e tente novamente.')
        } else if (error.code === 'email_not_confirmed') {
          setErro('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.')
        } else if (error.status === 429) {
          setErro('Muitas tentativas de acesso. Aguarde um pouco e tente novamente.')
        } else {
          setErro('Não foi possível entrar agora. Verifique sua conexão e tente novamente.')
        }
        return
      }

      if (!data.session) {
        setErro('Não foi possível iniciar sua sessão. Tente novamente.')
        return
      }

      setSenha('')
      navigate('/painel', { replace: true })
    } catch {
      setErro('Não foi possível conectar. Verifique sua conexão e tente novamente.')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <main className="login-page">
      <h1>Entrar no AutoPrev</h1>
      <p>Use o e-mail e a senha da sua conta.</p>

      <form className="login-form" onSubmit={handleSubmit} aria-busy={entrando}>
        <label htmlFor="login-email">E-mail</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={entrando}
        />

        <label htmlFor="login-senha">Senha</label>
        <input
          id="login-senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          required
          disabled={entrando}
        />

        {erro && <p className="login-error" role="alert">{erro}</p>}

        <button type="submit" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <Link to="/recuperar-senha">Esqueci minha senha</Link>
      <p>Ainda não tem conta? <Link to="/cadastro">Criar conta</Link></p>
      <Link to="/">Voltar ao início</Link>
    </main>
  )
}

export default Login
