import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Entrada from './pages/Entrada.jsx'
import Login from './pages/Login.jsx'
import Cadastro from './pages/Cadastro.jsx'
import Painel from './pages/Painel.jsx'
import CadastrarVeiculo from './pages/CadastrarVeiculo.jsx'
import DetalhesVeiculo from './pages/DetalhesVeiculo.jsx'
import AtualizarQuilometragem from './pages/AtualizarQuilometragem.jsx'
import RegistrarManutencao from './pages/RegistrarManutencao.jsx'
import HistoricoManutencoes from './pages/HistoricoManutencoes.jsx'
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
          <Route path="/veiculos/novo" element={<CadastrarVeiculo />} />
          <Route path="/veiculos/:id" element={<DetalhesVeiculo />} />
          <Route path="/veiculos/:id/quilometragem" element={<AtualizarQuilometragem />} />
          <Route path="/veiculos/:id/manutencoes/nova" element={<RegistrarManutencao />} />
          <Route path="/manutencoes/nova" element={<RegistrarManutencao />} />
          <Route path="/historico" element={<HistoricoManutencoes />} />
        </Route>
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
