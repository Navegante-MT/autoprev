import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import './Cadastro.css'

function Cadastro() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [criando, setCriando] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    if (criando) return
    setErro('')
    setMensagem('')

    if (senha !== confirmarSenha) {
      setErro('As senhas não são iguais. Confira a confirmação da senha.')
      return
    }

    setCriando(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          emailRedirectTo: new URL('/login', window.location.origin).href,
        },
      })

      if (error) {
        if (error.code === 'user_already_exists' || error.code === 'email_exists') {
          setErro('Este e-mail já possui uma conta. Use a opção Já tenho uma conta para entrar.')
        } else if (error.code === 'weak_password') {
          setErro('A senha não atende aos requisitos de segurança. Use uma senha mais forte, com letras, números e símbolos.')
        } else if (error.code === 'email_address_invalid') {
          setErro('Confira o endereço de e-mail informado.')
        } else if (error.status === 429) {
          setErro('Muitas tentativas de cadastro. Aguarde um pouco e tente novamente.')
        } else if (error.code === 'signup_disabled') {
          setErro('O cadastro está temporariamente indisponível. Tente novamente mais tarde.')
        } else {
          setErro('Não foi possível criar a conta agora. Verifique sua conexão e tente novamente.')
        }
        return
      }

      if (!data.user) {
        setErro('Não foi possível concluir a solicitação de cadastro. Tente novamente.')
        return
      }
      setSenha('')
      setConfirmarSenha('')
      if (data.session) {
        navigate('/painel', { replace: true })
        return
      }
      // O Supabase pode ocultar se uma conta já existe; evite afirmar que foi criada.
      setMensagem('Solicitação recebida. Confira seu e-mail, incluindo a pasta de spam, para concluir o cadastro. Se já possui uma conta, vá para o login.')
    } catch {
      setErro('Não foi possível conectar. Verifique sua conexão e tente novamente.')
    } finally {
      setCriando(false)
    }
  }

  return (
    <main className="cadastro-page">
      <h1>Criar conta no AutoPrev</h1>
      <p>Comece a organizar o histórico de manutenção dos seus veículos.</p>
      <form className="cadastro-form" onSubmit={handleSubmit} aria-busy={criando}>
        <label htmlFor="cadastro-email">E-mail</label>
        <input id="cadastro-email" name="email" type="email" autoComplete="username"
          value={email} onChange={(event) => setEmail(event.target.value)} required disabled={criando} />

        <label htmlFor="cadastro-senha">Senha</label>
        <input id="cadastro-senha" name="senha" type="password" autoComplete="new-password"
          value={senha} onChange={(event) => setSenha(event.target.value)} minLength={6}
          aria-describedby="cadastro-senha-ajuda" required disabled={criando} />
        <p id="cadastro-senha-ajuda" className="cadastro-help">
          Use pelo menos 6 caracteres. Prefira uma senha longa com letras, números e símbolos.
        </p>

        <label htmlFor="cadastro-confirmar">Confirmar senha</label>
        <input id="cadastro-confirmar" name="confirmarSenha" type="password" autoComplete="new-password"
          value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)}
          minLength={6} required disabled={criando} />

        {erro && <p className="cadastro-message cadastro-error" role="alert">{erro}</p>}
        {mensagem && <p className="cadastro-message" role="status">{mensagem}</p>}
        <button type="submit" disabled={criando}>{criando ? 'Criando conta…' : 'Criar conta'}</button>
      </form>
      <Link to="/login">Já tenho uma conta</Link>
      <Link to="/">Voltar ao início</Link>
    </main>
  )
}

export default Cadastro
