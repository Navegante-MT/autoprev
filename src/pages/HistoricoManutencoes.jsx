import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { consultarHistorico, listarTiposManutencao, validarPeriodo } from '../lib/manutencoes.js'
import { formatarData, listarVeiculos } from '../lib/veiculos.js'
import './Painel.css'
import './Historico.css'
import './Manutencao.css'

function FiltrosHistorico({ filtros, opcoes, aplicar, limpar }) {
  const [campos, setCampos] = useState(filtros)
  const [erro, setErro] = useState('')
  function alterar(event) { setCampos(atuais => ({ ...atuais, [event.target.name]: event.target.value })) }
  function filtrar(event) {
    event.preventDefault()
    const validacao = validarPeriodo(campos.inicio, campos.fim)
    setErro(validacao)
    if (!validacao) aplicar(campos)
  }
  return (
    <form className="historico-filtros" onSubmit={filtrar}>
      <div><label htmlFor="filtro-veiculo">Veículo</label><select id="filtro-veiculo" name="veiculoId" value={campos.veiculoId} onChange={alterar}>
        <option value="">Todos os meus veículos</option>
        {opcoes.veiculos.map(v => <option key={v.id} value={v.id}>{v.apelido || `${v.marca} ${v.modelo}`} · {v.ano}</option>)}
      </select></div>
      <div><label htmlFor="filtro-tipo">Tipo de manutenção</label><select id="filtro-tipo" name="tipoId" value={campos.tipoId} onChange={alterar}>
        <option value="">Todos os tipos</option>{opcoes.tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select></div>
      <div><label htmlFor="filtro-inicio">De</label><input id="filtro-inicio" name="inicio" type="date" value={campos.inicio} onChange={alterar} /></div>
      <div><label htmlFor="filtro-fim">Até</label><input id="filtro-fim" name="fim" type="date" value={campos.fim} onChange={alterar} /></div>
      {erro && <p role="alert" className="painel-error">{erro}</p>}
      <button type="submit">Aplicar filtros</button><button type="button" onClick={limpar}>Limpar filtros</button>
    </form>
  )
}

function HistoricoManutencoes() {
  const [params, setParams] = useSearchParams()
  const chave = params.toString()
  const veiculoId = params.get('veiculo') || ''
  const tipoId = params.get('tipo') || ''
  const inicio = params.get('inicio') || ''
  const fim = params.get('fim') || ''
  const numero = Number(params.get('pagina') || 1)
  const pagina = Number.isSafeInteger(numero) && numero > 0 && numero <= 1000000 ? numero : 1
  const [opcoes, setOpcoes] = useState({ status: 'carregando', veiculos: [], tipos: [], erro: '' })
  const [resultado, setResultado] = useState({ chave, status: 'carregando', itens: [], total: 0, erro: '' })
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      try {
        const [veiculos, tipos] = await Promise.all([listarVeiculos(controller.signal), listarTiposManutencao(controller.signal)])
        if (!controller.signal.aborted) setOpcoes({ status: 'pronto', veiculos, tipos, erro: '' })
      } catch (error) {
        if (!controller.signal.aborted) setOpcoes({ status: 'erro', veiculos: [], tipos: [], erro: error.message })
      }
    }
    carregar()
    return () => controller.abort()
  }, [tentativa])

  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      try {
        const dados = await consultarHistorico({ veiculoId, tipoId, inicio, fim }, pagina, controller.signal)
        if (!controller.signal.aborted) setResultado({ chave, status: 'pronto', ...dados, erro: '' })
      } catch (error) {
        if (!controller.signal.aborted) setResultado({ chave, status: 'erro', itens: [], total: 0, erro: error.message })
      }
    }
    carregar()
    return () => controller.abort()
  }, [chave, veiculoId, tipoId, inicio, fim, pagina, tentativa])

  function aplicar(campos) {
    const novos = {}
    if (campos.veiculoId) novos.veiculo = campos.veiculoId
    if (campos.tipoId) novos.tipo = campos.tipoId
    if (campos.inicio) novos.inicio = campos.inicio
    if (campos.fim) novos.fim = campos.fim
    setParams(novos)
  }
  function mudarPagina(proxima) {
    const novos = new URLSearchParams(params)
    novos.set('pagina', String(proxima))
    setParams(novos)
  }
  function tentarNovamente() {
    setResultado({ chave, status: 'carregando', itens: [], total: 0, erro: '' })
    setOpcoes({ status: 'carregando', veiculos: [], tipos: [], erro: '' })
    setTentativa(atual => atual + 1)
  }
  const atual = resultado.chave === chave ? resultado : { status: 'carregando' }
  const paginas = Math.max(1, Math.ceil((atual.total || 0) / 20))
  return (
    <main className="painel-page veiculo-page">
      <h1>Histórico de manutenções</h1>
      <p>Consulte seus serviços, incluindo os antigos. Os resultados aparecem da data mais recente para a mais antiga.</p>
      {opcoes.status === 'carregando' ? <p role="status">Carregando filtros…</p> : opcoes.status === 'erro' ? (
        <><p role="alert" className="painel-error">{opcoes.erro}</p><button type="button" onClick={tentarNovamente}>Tentar novamente</button></>
      ) : <FiltrosHistorico key={chave} filtros={{ veiculoId, tipoId, inicio, fim }} opcoes={opcoes} aplicar={aplicar} limpar={() => setParams({})} />}
      {atual.status === 'carregando' ? <p role="status">Carregando manutenções…</p> : atual.status === 'erro' ? (
        <><p role="alert" className="painel-error">{atual.erro}</p><button type="button" onClick={tentarNovamente}>Tentar novamente</button></>
      ) : (
        <>
          <p role="status">{atual.total} registro(s) encontrado(s).</p>
          {atual.itens.length === 0 ? <p>Nenhuma manutenção nesta página com os filtros escolhidos.</p> : (
            <ul className="painel-cards">
              {atual.itens.map(item => (
                <li className="painel-card" key={item.id}>
                  <h2>{item.tipos_manutencao?.nome || 'Manutenção'}</h2>
                  <p>{item.veiculos?.apelido || `${item.veiculos?.marca || ''} ${item.veiculos?.modelo || ''}`} · {item.veiculos?.ano}</p>
                  <p>{formatarData(item.data_manutencao)} · {item.quilometragem.toLocaleString('pt-BR')} km</p>
                  {item.valor_pago !== null && <p>{Number(item.valor_pago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                  {item.oficina && <p>Oficina: {item.oficina}</p>}
                  {item.observacoes && <p className="manutencao-observacoes">{item.observacoes}</p>}
                  <Link to={`/veiculos/${item.veiculo_id}`}>Ver veículo</Link>
                </li>
              ))}
            </ul>
          )}
          <nav className="historico-paginacao" aria-label="Páginas do histórico">
            <button type="button" disabled={pagina <= 1} onClick={() => mudarPagina(pagina - 1)}>Anterior</button>
            <p>Página {pagina} · {paginas} página(s) disponível(is)</p>
            <button type="button" disabled={pagina >= paginas} onClick={() => mudarPagina(pagina + 1)}>Próxima</button>
            {pagina > paginas && <button type="button" onClick={() => mudarPagina(1)}>Ir para a primeira página</button>}
          </nav>
        </>
      )}
      <Link to="/painel">Voltar ao painel</Link>
    </main>
  )
}
export default HistoricoManutencoes
