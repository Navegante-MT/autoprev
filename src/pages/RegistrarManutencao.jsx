import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listarVeiculos } from '../lib/veiculos.js'
import { listarTiposManutencao } from '../lib/manutencoes.js'
import FormularioManutencao from './FormularioManutencao.jsx'
import './Cadastro.css'
import './Manutencao.css'
function RegistrarManutencao() {
  const { id } = useParams()
  const [resultado, setResultado] = useState({ status: 'carregando', veiculos: [], tipos: [], erro: '' })
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      try {
        const [veiculos, tipos] = await Promise.all([listarVeiculos(controller.signal), listarTiposManutencao(controller.signal)])
        if (!controller.signal.aborted) setResultado({ status: 'pronto', veiculos, tipos, erro: '' })
      } catch (error) {
        if (!controller.signal.aborted) setResultado({ status: 'erro', veiculos: [], tipos: [], erro: error.message })
      }
    }
    carregar()
    return () => controller.abort()
  }, [tentativa])
  function tentarNovamente() {
    setResultado({ status: 'carregando', veiculos: [], tipos: [], erro: '' })
    setTentativa(atual => atual + 1)
  }
  const disponivel = !id || resultado.veiculos.some(v => v.id === id)
  return (
    <main className="cadastro-page">
      <h1>Registrar manutenção</h1>
      {resultado.status === 'carregando' ? <p role="status">Carregando veículos e tipos de serviço…</p> : resultado.status === 'erro' ? (
        <><p className="cadastro-message cadastro-error" role="alert">{resultado.erro}</p><button type="button" onClick={tentarNovamente}>Tentar novamente</button><Link to="/painel">Voltar ao painel</Link></>
      ) : !disponivel ? <><p role="alert">Veículo não encontrado ou indisponível para sua conta.</p><Link to="/painel">Voltar ao painel</Link></> : resultado.veiculos.length === 0 ? (
        <><p>Cadastre um veículo antes de registrar uma manutenção.</p><Link to="/veiculos/novo">Cadastrar veículo</Link></>
      ) : resultado.tipos.length === 0 ? <><p role="alert">Nenhum tipo de manutenção disponível.</p><Link to="/painel">Voltar ao painel</Link></> : <FormularioManutencao key={id || 'selecionar'} id={id} veiculos={resultado.veiculos} tipos={resultado.tipos} />}
    </main>
  )
}
export default RegistrarManutencao
