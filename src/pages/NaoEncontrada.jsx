import { Link } from 'react-router-dom'
import './Painel.css'

function NaoEncontrada() {
  return (
    <main className="painel-page">
      <h1>Página não encontrada</h1>
      <p>O endereço pode estar incorreto ou não estar mais disponível.</p>
      <Link className="painel-action" to="/">Voltar ao início</Link>
      <Link to="/painel">Ir para o painel</Link>
    </main>
  )
}

export default NaoEncontrada
