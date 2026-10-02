import { Link } from 'react-router-dom'
import './Entrada.css'

function Entrada() {
  return (
    <main className="entrada-page">
      <p className="entrada-brand">AutoPrev</p>
      <h1>Cuide do seu veículo com mais planejamento.</h1>
      <p>Organize o histórico de manutenções do seu veículo e acompanhe estimativas para planejar as próximas revisões.</p>
      <nav className="entrada-actions" aria-label="Acesso ao AutoPrev">
        <Link className="entrada-primary" to="/cadastro">Criar conta</Link>
        <Link className="entrada-secondary" to="/login">Entrar</Link>
      </nav>
      <p className="entrada-note">Um histórico organizado é o primeiro passo para cuidar da manutenção preventiva.</p>
    </main>
  )
}

export default Entrada
