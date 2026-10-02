import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Entrada from './pages/Entrada.jsx'
import Login from './pages/Login.jsx'
import Cadastro from './pages/Cadastro.jsx'
import Painel from './pages/Painel.jsx'
import RotaProtegida from './components/RotaProtegida.jsx'
import RecuperarSenha from './pages/RecuperarSenha.jsx'
import RedefinirSenha from './pages/RedefinirSenha.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Entrada />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route element={<RotaProtegida />}>
          <Route path="/painel" element={<Painel />} />
        </Route>
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
