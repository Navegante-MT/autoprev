import { useEffect, useState } from 'react'
import { obterVeiculo } from '../lib/veiculos.js'

export default function useVeiculo(id) {
  const [resultado, setResultado] = useState({ id, status: 'carregando', veiculo: null, erro: '' })
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      try {
        const veiculo = await obterVeiculo(id, controller.signal)
        if (!controller.signal.aborted) setResultado({ id, status: veiculo ? 'pronto' : 'ausente', veiculo, erro: '' })
      } catch (error) {
        if (!controller.signal.aborted) setResultado({ id, status: 'erro', veiculo: null, erro: error.message })
      }
    }
    carregar()
    return () => controller.abort()
  }, [id, tentativa])
  function tentarNovamente() {
    setResultado({ id, status: 'carregando', veiculo: null, erro: '' })
    setTentativa(atual => atual + 1)
  }
  return { ...(resultado.id === id ? resultado : { status: 'carregando', veiculo: null, erro: '' }), tentarNovamente }
}
