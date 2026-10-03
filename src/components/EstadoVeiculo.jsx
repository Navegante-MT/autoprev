function EstadoVeiculo({ status, erro, tentarNovamente }) {
  if (status === 'carregando') return <p role="status">Carregando veículo…</p>
  if (status === 'ausente') return <p role="alert">Veículo não encontrado ou indisponível para sua conta.</p>
  if (status === 'erro') return (
    <>
      <p className="painel-error" role="alert">{erro}</p>
      <button type="button" onClick={tentarNovamente}>Tentar novamente</button>
    </>
  )
  return null
}
export default EstadoVeiculo
