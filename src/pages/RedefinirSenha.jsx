import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import './Login.css'
import './Recuperacao.css'

function RedefinirSenha() {
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [acesso, setAcesso] = useState('verificando')
  const [linkComErro] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    return hash.has('error') || hash.has('error_code') || query.has('error') || query.has('error_code')
  })

  useEffect(() => {
    let ativo = true

    // O SDK valida o link e cria a sessão antes de permitir a alteração.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (ativo) setAcesso(linkComErro ? 'invalido' : session ? 'permitido' : 'invalido')
    })

    async function verificarSessao() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (ativo) {
          setAcesso(linkComErro || error || !data.session ? 'invalido' : 'permitido')
        }
      } catch {
        if (ativo) setAcesso('falha')
      }
    }
    verificarSessao()

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [linkComErro])

  async function handleSubmit(event) {
    event.preventDefault()
    if (salvando || concluido || acesso !== 'permitido') return
    setErro('')
    if (senha !== confirmarSenha) {
      setErro('As senhas não são iguais. Confira a confirmação da senha.')
      return
    }
    setSalvando(true)

    try {
      const { error } = await supabase.auth.updateUser({ password: senha })
      if (error) {
        if (error.code === 'weak_password') {
          setErro('A senha não atende aos requisitos de segurança. Use uma senha mais forte, com letras, números e símbolos.')
        } else if (error.code === 'same_password') {
          setErro('Escolha uma senha diferente da senha atual.')
        } else if (error.status === 401 || error.status === 403 || error.code === 'session_not_found' || error.code === 'refresh_token_not_found') {
          setAcesso('invalido')
        } else if (error.status === 429) {
          setErro('Muitas tentativas. Aguarde um pouco e tente novamente.')
        } else {
          setErro('Não foi possível salvar a nova senha agora. Tente novamente.')
        }
        return
      }
      setSenha('')
      setConfirmarSenha('')
      setConcluido(true)
    } catch {
      setErro('Não foi possível conectar. Verifique sua conexão e tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="login-page">
      <h1>Definir nova senha</h1>
      {concluido ? (
        <>
          <p className="recuperacao-status" role="status">Senha atualizada com sucesso. Use a nova senha nos próximos acessos.</p>
          <Link to="/painel">Continuar para o painel</Link>
        </>
      ) : acesso === 'verificando' ? (
        <p role="status">Verificando o link de recuperação…</p>
      ) : acesso !== 'permitido' ? (
        <>
          <p className="login-error" role="alert">
            {acesso === 'falha'
              ? 'Não foi possível verificar o acesso. Confira sua conexão e abra novamente o link recebido.'
              : 'O link de recuperação está inválido ou expirou. Solicite um novo link para continuar.'}
          </p>
          <Link to="/recuperar-senha">Solicitar novo link</Link>
        </>
      ) : (
        <>
          <p>Escolha uma nova senha para a sua conta.</p>
          <form className="login-form" onSubmit={handleSubmit} aria-busy={salvando}>
            <label htmlFor="redefinir-senha">Nova senha</label>
            <input id="redefinir-senha" name="senha" type="password" autoComplete="new-password"
              value={senha} onChange={(event) => setSenha(event.target.value)} minLength={6}
              aria-describedby="redefinir-ajuda" required disabled={salvando} />
            <p id="redefinir-ajuda" className="recuperacao-help">Use pelo menos 6 caracteres. Prefira uma senha longa com letras, números e símbolos.</p>
            <label htmlFor="redefinir-confirmar">Confirmar nova senha</label>
            <input id="redefinir-confirmar" name="confirmarSenha" type="password" autoComplete="new-password"
              value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)}
              minLength={6} required disabled={salvando} />
            {erro && <p className="login-error" role="alert">{erro}</p>}
            <button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar nova senha'}</button>
          </form>
        </>
      )}
      <Link to="/login">Voltar ao login</Link>
    </main>
  )
}

export default RedefinirSenha
