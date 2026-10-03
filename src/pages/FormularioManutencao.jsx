import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dataLocalHoje, obterVeiculo } from '../lib/veiculos.js'
import { existeManutencaoSemelhante, editarManutencao, registrarManutencao, validarManutencao } from '../lib/manutencoes.js'
import './Cadastro.css'
import './Manutencao.css'

function FormularioManutencao({ id, veiculos, tipos, manutencao, onBusyChange }) {
  const [campos, setCampos] = useState(manutencao ? { veiculoId: manutencao.veiculo_id, tipoId: manutencao.tipo_manutencao_id, data: manutencao.data_manutencao, quilometragem: String(manutencao.quilometragem), valor: manutencao.valor_pago === null ? '' : String(manutencao.valor_pago), oficina: manutencao.oficina || '', observacoes: manutencao.observacoes || '' } : { veiculoId: id || '', tipoId: '', data: dataLocalHoje(), quilometragem: '', valor: '', oficina: '', observacoes: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const enviando = useRef(false)
  const navigate = useNavigate()
  const destino = id ? `/veiculos/${id}` : '/painel'
  function alterar(event) { setCampos(atuais => ({ ...atuais, [event.target.name]: event.target.value })) }
  async function salvar(event) {
    event.preventDefault()
    if (enviando.current) return
    setErro('')
    const validacao = validarManutencao(campos)
    if (validacao) { setErro(validacao); return }
    enviando.current = true
    setSalvando(true); onBusyChange?.(true)
    try {
      const veiculo = await obterVeiculo(campos.veiculoId)
      if (!veiculo) throw new Error('Veículo não encontrado ou indisponível para sua conta.')
      const atual = veiculo.registros_quilometragem?.[0]
      const semelhante = await existeManutencaoSemelhante(campos, manutencao?.id)
      if (semelhante && !window.confirm('Já existe um serviço com o mesmo veículo, tipo, data e quilometragem. Deseja registrar outro mesmo assim?')) {
        enviando.current = false; setSalvando(false); onBusyChange?.(false); return
      }
      if (atual && Number(campos.quilometragem) < atual.quilometragem && !window.confirm(`O serviço foi realizado com km menor que a leitura atual de ${atual.quilometragem.toLocaleString('pt-BR')} km. Confira a data e o valor. Deseja continuar? O histórico será preservado.`)) {
        enviando.current = false; setSalvando(false); onBusyChange?.(false); return
      }
      if (manutencao) {
        if (!window.confirm('Salvar as alterações deste serviço? As leituras de km registradas permanecem iguais. Se precisar corrigir o km do veículo, use Atualizar quilometragem.')) { enviando.current = false; setSalvando(false); onBusyChange?.(false); return }
        await editarManutencao(manutencao, campos)
      } else await registrarManutencao(campos)
      navigate(`/veiculos/${campos.veiculoId}`, { replace: true, state: { mensagem: manutencao ? 'Manutenção atualizada com sucesso.' : 'Manutenção registrada com sucesso.' } })
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar. Tente novamente.')
      enviando.current = false; setSalvando(false); onBusyChange?.(false)
    }
  }
  return (
    <>
      <form className="cadastro-form manutencao-form" onSubmit={salvar} aria-busy={salvando}>
        <label htmlFor="servico-veiculo">Veículo</label>
        <select id="servico-veiculo" name="veiculoId" value={campos.veiculoId} onChange={alterar} required disabled={salvando || Boolean(id)}>
          <option value="">Selecione um veículo</option>
          {veiculos.map(v => <option key={v.id} value={v.id}>{v.apelido || `${v.marca} ${v.modelo}`} · {v.ano}</option>)}
        </select>
        <label htmlFor="servico-tipo">Tipo de manutenção</label>
        <select id="servico-tipo" name="tipoId" value={campos.tipoId} onChange={alterar} required disabled={salvando}>
          <option value="">Selecione um tipo</option>
          {tipos.map(tipo => <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>)}
        </select>
        <label htmlFor="servico-data">Data da manutenção</label>
        <input id="servico-data" name="data" type="date" max={dataLocalHoje()} required disabled={salvando} value={campos.data} onChange={alterar} />
        <label htmlFor="servico-km">Quilometragem no dia do serviço (km)</label>
        <input id="servico-km" name="quilometragem" type="number" min={0} max={2147483647} step={1} required disabled={salvando} value={campos.quilometragem} onChange={alterar} aria-describedby="servico-ajuda" />
        <p id="servico-ajuda" className="cadastro-help">Serviços antigos são permitidos. Informe o km conhecido daquela data, sem separadores.</p>
        <label htmlFor="servico-valor">Valor pago em R$ (opcional)</label>
        <input id="servico-valor" name="valor" type="text" inputMode="decimal" placeholder="Ex.: 250,50" disabled={salvando} value={campos.valor} onChange={alterar} />
        <label htmlFor="servico-oficina">Oficina (opcional)</label>
        <input id="servico-oficina" name="oficina" disabled={salvando} value={campos.oficina} onChange={alterar} />
        <label htmlFor="servico-observacoes">Observações (opcional)</label>
        <textarea id="servico-observacoes" name="observacoes" rows={4} disabled={salvando} value={campos.observacoes} onChange={alterar} />
        {erro && <p className="cadastro-message cadastro-error" role="alert">{erro}</p>}
        <button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : manutencao ? 'Salvar alterações' : 'Salvar manutenção'}</button>
      </form>
      {salvando ? <p role="status">Aguarde a confirmação do registro.</p> : <Link to={destino}>Cancelar e voltar</Link>}
    </>
  )
}

export default FormularioManutencao