import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { excluirManutencao, listarTiposManutencao, obterManutencao } from '../lib/manutencoes.js'
import { listarVeiculos, formatarData } from '../lib/veiculos.js'
import FormularioManutencao from './FormularioManutencao.jsx'
import './Cadastro.css'
import './Manutencao.css'

function AcoesManutencao({ manutencao, veiculos, tipos }) {
  const [erro, setErro] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const trava = useRef(false)
  const navigate = useNavigate()
  async function excluir() {
    if (trava.current || salvando) return
    if (!window.confirm(`Excluir definitivamente ${manutencao.tipos_manutencao?.nome || 'esta manutenção'} de ${formatarData(manutencao.data_manutencao)} (${manutencao.quilometragem.toLocaleString('pt-BR')} km)? As leituras de km serão preservadas. Esta exclusão não pode ser desfeita pela tela.`)) return
    trava.current = true
    setExcluindo(true)
    setErro('')
    try {
      await excluirManutencao(manutencao)
      navigate(`/veiculos/${manutencao.veiculo_id}`, { replace: true, state: { mensagem: 'Manutenção excluída. Leituras de km preservadas.' } })
    } catch (error) {
      setErro(error.message)
      setExcluindo(false)
      trava.current = false
    }
  }
  const opcoes = tipos.some(t => t.id === manutencao.tipo_manutencao_id) ? tipos : [...tipos, { id: manutencao.tipo_manutencao_id, nome: manutencao.tipos_manutencao?.nome || 'Tipo atual' }]
  return (
    <>
      <p>Corrija os dados do serviço abaixo. O veículo permanece o mesmo.</p>
      <p>Editar ou excluir este serviço preserva as leituras de km já registradas. Para corrigir o km atual do veículo, use Atualizar quilometragem nos detalhes dele.</p>
      <fieldset disabled={excluindo} className="manutencao-edicao">
        <FormularioManutencao id={manutencao.veiculo_id} veiculos={veiculos} tipos={opcoes} manutencao={manutencao} onBusyChange={setSalvando} />
      </fieldset>
      <section className="manutencao-exclusao" aria-label="Excluir manutenção">
        <h2>Excluir manutenção</h2>
        <p>Apaga somente este serviço do histórico, após sua confirmação.</p>
        {erro && <p className="cadastro-error" role="alert">{erro}</p>}
        <button type="button" disabled={excluindo || salvando} onClick={excluir}>{excluindo ? 'Excluindo…' : 'Excluir manutenção'}</button>
      </section>
    </>
  )
}

function EditarManutencao() {
  const { id } = useParams()
  const [resultado, setResultado] = useState({ id, status: 'carregando' })
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      try {
        const [manutencao, veiculos, tipos] = await Promise.all([obterManutencao(id, controller.signal), listarVeiculos(controller.signal), listarTiposManutencao(controller.signal)])
        if (!controller.signal.aborted) setResultado({ id, status: 'pronto', manutencao, veiculos, tipos })
      } catch (error) {
        if (!controller.signal.aborted) setResultado({ id, status: 'erro', erro: error.message })
      }
    }
    carregar()
    return () => controller.abort()
  }, [id, tentativa])
  function tentarNovamente() { setResultado({ id, status: 'carregando' }); setTentativa(t => t + 1) }
  const atual = resultado.id === id ? resultado : { status: 'carregando' }
  return (
    <main className="cadastro-page">
      <h1>Editar manutenção</h1>
      {atual.status === 'carregando' ? <p role="status">Carregando manutenção…</p> : atual.status === 'erro' ? <><p role="alert">{atual.erro}</p><button onClick={tentarNovamente}>Tentar novamente</button></> : !atual.manutencao ? <p role="alert">Manutenção não encontrada ou indisponível para sua conta.</p> : <AcoesManutencao key={`${id}-${tentativa}`} manutencao={atual.manutencao} veiculos={atual.veiculos} tipos={atual.tipos} />}
      <Link to="/historico">Voltar ao histórico</Link>
    </main>
  )
}
export default EditarManutencao
