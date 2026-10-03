# Etapa 9 - motor de estimativas, primeiro passo

Implementado cálculo puro em supabase/functions/_shared/previsoes.ts. TypeScript prepara o módulo para futura Edge Function. Ainda não há endpoint publicado nem tela de previsões.

Entrada: lista completa de serviços, veículo, tipo e data de referência YYYY-MM-DD. O cálculo filtra apenas o veículo/tipo pedidos e ordena por data sem modificar a lista original. A futura consulta deve carregar todo o histórico necessário, não somente os 20 registros de uma página.

Regras adotadas nesta implementação:
- Menos de dois serviços únicos: dados insuficientes.
- Dois: estimativa inicial com aviso de poucos dados.
- Três ou mais: média dos intervalos entre serviços consecutivos.
- Duplicatas exatas de data/km contam uma vez no cálculo; continuam guardadas no histórico.
- Mesmo dia com km distintos, km igual/decrescente, datas inválidas/futuras ou km inválido: histórico inconsistente, sem previsão. Correções de hodômetro precisam de tratamento posterior antes de calcular.
- Média em km e dias calculada separadamente; soma ao último serviço para gerar marcos. Médias preservam frações, marcos finais arredondam para inteiro mais próximo.
- Datas são calculadas em dias UTC, sem alteração por horário de verão ou fuso. Referência é fornecida explicitamente pelo chamador.

O motor não estabelece intervalo recomendado pelo fabricante nem diagnóstico de peças. Ele resume os intervalos observados no histórico. A estimativa inicial ainda tem apenas um intervalo; quantidade de registros não garante precisão estatística.

Exemplo fictício: 40.000, 48.000, 57.000 km => intervalos 8.000 e 9.000 => média 8.500 => próximo marco 65.500 km.

Testes: npm run test:previsoes, requer Node com suporte a TypeScript nativo (ambiente atual Node24). Doze cenários incluem cálculo, agrupamento, retroativos, duplicatas, inconsistências, calendário e validação de parâmetros. Execução nativa remove anotações de tipo; não equivale a checagem estática TypeScript. Lint do projeto continua cobrindo JavaScript/React, não este arquivo TS.

Próximos passos: estimar ritmo de uso com leituras válidas, comparar data e km pelo que ocorrer primeiro, definir alertas, criar Edge Function autenticada com RLS e integrar telas. Não persistir previsões inicialmente. Não usar IA para as contas. Não foi alterado banco remoto nem realizado commit/push.

## Segundo passo: ritmo de uso e comparação

calcularUso usa leituras de um único veículo, ordena por data/criado_em/id e escolhe a última criada em cada dia. Calcula km/dia entre primeira e última data válidas; kmEm30Dias é a equivalência em 30 dias, não uma medição de mês calendário. Exige duas datas distintas, nenhum decréscimo de km e aumento total positivo. Última leitura com 30 dias ou mais solicita atualização e suspende projeção, conforme lembrete previsto. Leituras reais são preservadas.

compararMarcos converte a distância restante em dias usando o ritmo médio. A projeção começa na data da última leitura, não hoje, para não adiar artificialmente um marco. Arredonda dias para cima e compara com proximaData; resultado pode indicar km, tempo ou ambos. Uma projeção passada não confirma que o hodômetro real chegou ao marco. atingidoPorKm usa apenas o km observado; atingidoPorTempo usa a data de referência. Quando ambos já foram atingidos, não inventa a data exata em que o km foi alcançado. Sem ritmo, informa critério indeterminado, preservando a indicação de tempo atingido.

23 testes passaram (12 originais e 11 novos), lint e build passaram. Ainda não há endpoint, tela, alertas por proximidade ou checagem estática TypeScript. Banco remoto inalterado. Próximo passo: consulta autenticada do histórico completo e integração da previsão às telas.

## Integração preparada (publicação pendente)

Função previsoes-veiculo/index.ts importa o handler compartilhado. O handler confirma usuário via getUser, usa cliente com Authorization do usuário e chave anon padrão do ambiente da função, preserva RLS e verifica proprietário. Consulta páginas de 500 registros ordenadas por id com contagem exata; interrompe com erro se a consulta truncar. Consultas separadas não são uma transação de snapshot; alterações simultâneas podem exigir recalcular. Nenhum dado é gravado.

A tela /veiculos/:id/previsoes consulta a função ao abrir e permite recalcular. Link nos detalhes. Apresenta uso, avisos de dados insuficientes, marcos, projeção e distinção de km observado. Critérios de alerta por proximidade ainda pendentes. Não chama IA.

8 testes do handler em tests/handler-previsoes.test.mjs passaram (node --test tests/handler-previsoes.test.mjs). Função Deno e publicação remota ainda não verificadas. Arquivo único para editor do painel em D:/Chat GPT/AutoPrev/PUBLICAR_PREVISOES_VEICULO.ts, derivado dos três arquivos técnicos; regenerar se houver mudanças.

Publicação manual: Supabase > Edge Functions > criar/deploy via editor, nome previsoes-veiculo. Colar o arquivo único inteiro e manter verificação JWT habilitada. Não adicionar senhas ou conteúdo do .env.local. Função usa variáveis padrão SUPABASE_URL e SUPABASE_ANON_KEY do serviço. Depois de publicar, testar com conta real em Ver veículo > Ver estimativas de manutenção. Sem publicação, erro de função indisponível é esperado.

Fontes oficiais: https://supabase.com/docs/guides/functions/auth e https://supabase.com/docs/guides/functions/cors
Atualização: função publicada manualmente pelo usuário e consulta real funcionou com ritmo de uso e dados insuficientes. Teste real com duas manutenções adiado pelo usuário. Avisos internos de marcos alcançados, projeção passada, leitura desatualizada e histórico inconsistente adicionados na interface; acesso direto por veículo no painel. Cinco testes específicos passaram. Sem alertas por proximidade com limites ainda indefinidos; sem nova publicação necessária para este passo da interface.

## Revisão do planejamento - estado atual

Este resumo substitui as pendências históricas dos tópicos anteriores:
- Função publicada pelo usuário, consulta real confirmada.
- Dois serviços de bateria geraram estimativa inicial; erro da leitura antiga foi corrigido por nova tela e usuário confirmou TUDO CERTO. Teste antes adiado passou a confirmado conforme relato.
- CorrigirQuilometragem permite corrigir km de uma leitura específica, mantendo data; manutenção permanece separada. Testes locais serviço/form passaram; testes reais confirmados após atualizar navegador.
- ResumoPrevisoes agora consulta ao abrir o painel e mostra avisos por veículo, com loading/erro sem esconder os veículos. Voltar ao painel após alteração recalcula; a tela detalhada recalcula ao abrir ou pelo botão. Não há atualização em tempo real entre abas.
- Avisos não são persistidos. IA não participa. Leituras desatualizadas solicitam atualização a partir de 30 dias.
- Limites de aviso antecipado por proximidade continuam sem definição; não implementados. Não declarar esse item concluído.
- npm run test:previsoes reúne 36 testes (motor23, handler8, avisos5). Lint/build/diff passaram. Checagem estática TypeScript ainda não configurada; testes Node executam o código.
- Falta conferir visualmente o novo resumo no painel com conta real; sem nova publicação necessária para essa mudança local. Sem commit/push da Etapa9 até nova autorização.
Regra confirmada: aviso 90 dias antes do primeiro marco tempo/km, fallbacktempo. Implementada janela inclusiva de 90 dias na interface; 42 testes aprovados. Pendência: fixar ativação até nova troca mesmo quando novas leituras mudarem a projeção. O cálculo sem estado atual pode retirar um aviso se projeção sair da janela; não garante ainda essa persistência integral. Próxima alteração deve preservar ativação por ciclo de manutenção.

## Persistência integrada - aguardando atualização da função

SQL003 foi aplicado pelo usuário com sucesso. Handler atualizado ativa via ativar_aviso_manutencao usando a última troca do tipo/veículo (data/criado_em/id), preserva primeira ativação e devolve avisosPersistentes mesmo sem previsão atual. Uma troca concorrente retorna409 para recalcular. A consulta agora pode gravar a ativação do aviso; não altera veículos, serviços ou leituras.

A interface mostra o aviso guardado até uma nova troca do mesmo tipo/veículo. Novas leituras podem antecipar ou adiar a DATA projetada, mas não retiram o aviso ativado. Registrar serviço retroativo anterior à troca base não encerra o ciclo. Atualização/edição/exclusão de serviço não deve ser apresentada como nova troca; excluir o veículo remove seus avisos.

49 testes Node passaram, lint e build passaram.14verificaçõesPGlite do SQL já passaram. Arquivo único PUBLICAR_PREVISOES_VEICULO.ts regenerado com motor, ativação, handler e entrada; sintaxe conferida. Ainda falta substituir o Code/index.ts da função existente no Supabase e publicar a nova versão. Não reexecutarSQL003. Teste real da persistência após publicação segue pendente. Checagem estática TypeScript ainda não configurada.

Esta explicação da projeção variável e do aviso persistente deve constar em TODO resumo/handoff/documento futuro do AutoPrev, conforme pedido explícito do usuário. Não afirmar garantia remota concluída antes da publicação e teste.

## Encerramento da Etapa 9 - confirmação final em 03/10/2026

Esta atualização substitui as pendências históricas acima. O usuário confirmou publicação da função atualizada, recálculo sem erro, exibição do aviso e os dois testes manuais: permanência após mudança de projeção e encerramento após nova troca do mesmo tipo/veículo. Confirmações relatadas pelo usuário, não observação direta do agente.

Regra permanente: novas leituras alteram o ritmo e a DATA projetada para atingir o marco de km; não alteram, por si, o marco de km calculado pelas manutenções. Aviso ativa 90 dias antes do primeiro marco por tempo/projeção de km, com alternativa por tempo sem ritmo válido, e permanece até nova troca do mesmo tipo e veículo. Retroativo anterior à troca base não encerra o ciclo. Incluir essa regra em todos os resumos/handoffs/documentos futuros.

Verificação final: 49 testes passaram; lint, build e diff check passaram. Build apresenta aviso de pacote JavaScript acima de 500 kB, sem impedir a geração; avaliar divisão do carregamento na finalização. Checagem estática completa TypeScript e restauração de backup ainda não realizadas.

Relatório escolar de 5 páginas criado e revisado visualmente em D:/Chat GPT/AutoPrev/output/pdf/09-ETAPA-CALCULOS-E-AVISOS.pdf; cópia idêntica em D:/BCT/SI/09- ETAPA - CALCULOS E AVISOS.pdf. É relatório didático, não transcrição integral.

Próxima atividade: implementar a primeira tela da Etapa 10 (mapas/oficinas), conforme PLANEJAMENTO_ETAPA_10.md. Ainda não implementada. Nenhuma nova migração deve ser reexecutada só para retomar. Não expor .env.local, não guardar localização, não enviar localização à IA.
