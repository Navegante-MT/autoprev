import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { excluirVeiculo } from '../lib/veiculos.js'

function ExcluirVeiculo({ veiculo }) {
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')
  const trava = useRef(false)
  const navigate = useNavigate()
  const nome = veiculo.apelido ? `${veiculo.apelido} (${veiculo.marca} ${veiculo.modelo}, ${veiculo.ano})` : `${veiculo.marca} ${veiculo.modelo}, ${veiculo.ano}`
  async function excluir() {
    if (trava.current) return
    if (!window.confirm(`Excluir definitivamente o veículo ${nome}? Todas as manutenções e leituras de quilometragem desse veículo também serão apagadas. Os outros veículos e sua conta serão preservados. Esta ação não pode ser desfeita pela tela.`)) return
    trava.current = true
    setExcluindo(true)
    setErro('')
    try {
      await excluirVeiculo(veiculo.id)
      navigate('/painel', { replace: true, state: { mensagem: 'Veículo excluído junto com suas manutenções e leituras de quilometragem.' } })
    } catch (error) {
      setErro(error.message || 'Não foi possível excluir o veículo. Tente novamente.')
      trava.current = false
      setExcluindo(false)
    }
  }
  return (
    <section className="veiculo-exclusao" aria-labelledby="excluir-veiculo-titulo">
      <h2 id="excluir-veiculo-titulo">Excluir veículo</h2>
      <p>A exclusão apaga este veículo e todo o histórico dele: manutenções e leituras de quilometragem. Seus outros veículos e sua conta permanecem.</p>
      <p>Esta ação não pode ser desfeita pela tela. Para apenas corrigir uma manutenção, use Editar ou excluir no serviço correspondente.</p>
      {erro && <p className="painel-error" role="alert">{erro}</p>}
      <button type="button" onClick={excluir} disabled={excluindo}>{excluindo ? 'Excluindo…' : 'Excluir veículo e seu histórico'}</button>
      {excluindo && <p role="status">Aguarde a confirmação da exclusão.</p>}
    </section>
  )
}
export default ExcluirVeiculo
