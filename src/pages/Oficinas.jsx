import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Painel.css'
import './Oficinas.css'

const estados = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'],
  ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'],
  ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'],
  ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'],
  ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'],
  ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins'],
]

function Oficinas() {
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')

  return (
    <main className="painel-page oficinas-page">
      <header className="oficinas-introducao">
        <h1>Oficinas</h1>
        <p>Encontre oficinas na cidade onde você pretende fazer a manutenção.</p>
      </header>

      <section className="oficinas-aviso" aria-labelledby="oficinas-preparacao">
        <h2 id="oficinas-preparacao">Funcionalidade futura</h2>
        <p>A busca de oficinas e o mapa estão previstos para uma implementação futura. Esta versão permite organizar veículos e manutenções e consultar estimativas.</p>
      </section>

      <section className="oficinas-secao" aria-labelledby="oficinas-cidade">
        <h2 id="oficinas-cidade">Onde procurar?</h2>
        <p>Informe a cidade e o estado. Você poderá buscar sem compartilhar sua localização atual.</p>
        <form className="oficinas-form" onSubmit={event => event.preventDefault()} aria-describedby="oficinas-indisponivel">
          <div className="oficinas-campos">
            <div>
              <label htmlFor="oficinas-nome-cidade">Cidade</label>
              <input id="oficinas-nome-cidade" name="cidade" autoComplete="address-level2"
                placeholder="Ex.: Rondonópolis" maxLength={120} value={cidade}
                onChange={event => setCidade(event.target.value)} />
            </div>
            <div>
              <label htmlFor="oficinas-estado">Estado</label>
              <select id="oficinas-estado" name="estado" autoComplete="address-level1"
                value={estado} onChange={event => setEstado(event.target.value)}>
                <option value="">Selecione o estado</option>
                {estados.map(([uf, nome]) => <option key={uf} value={uf}>{nome} ({uf})</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled>Buscar oficinas — em versão futura</button>
          <p id="oficinas-indisponivel" className="oficinas-ajuda">Preencher os campos ainda não envia consultas. Os dados digitados não são salvos.</p>
        </form>
      </section>

      <section className="oficinas-secao" aria-labelledby="oficinas-localizacao">
        <h2 id="oficinas-localizacao">Perto de mim</h2>
        <p>Esta opção estará disponível quando a busca estiver pronta. Sua localização só será solicitada ao clicar no botão e autorizar no navegador.</p>
        <button type="button" disabled>Usar minha localização — em versão futura</button>
      </section>

      <section className="oficinas-secao" aria-labelledby="oficinas-resultados">
        <h2 id="oficinas-resultados">Mapa e resultados</h2>
        <p>Quando a busca estiver disponível, as oficinas encontradas aparecerão aqui, em lista e no mapa.</p>
        <p className="oficinas-ajuda">Nenhuma consulta foi realizada. Esta mensagem não significa que não existam oficinas na região.</p>
      </section>
      <Link to="/painel">Voltar ao painel</Link>
    </main>
  )
}

export default Oficinas
