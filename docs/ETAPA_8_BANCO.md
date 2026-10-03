# Etapa 8 - Banco e cadastro de veículos, parte 1

## Onde estamos

Etapa 7 concluída. Esta parte prepara veículos e seu histórico de quilometragem.
O SQL foi preparado no projeto; sua presença na pasta não cria tabelas no Supabase.
Ainda é necessário executá-lo no SQL Editor e conferir o resultado no projeto remoto.
Não é preciso alterar nem compartilhar `.env.local`.

## Entendendo as tabelas

Uma tabela organiza informações em colunas e linhas, como uma planilha.
Cada linha de `veiculos` representa um veículo. Cada linha de
`registros_quilometragem` representa uma leitura de km desse veículo.

| Tabela | Campos e finalidade |
| --- | --- |
| `veiculos` | `id`: identificação única; `usuario_id`: dono; `marca`, `modelo`, `ano`; `apelido`: opcional; `criado_em`: momento da inclusão |
| `registros_quilometragem` | `id`: identificação da leitura; `veiculo_id`: veículo correspondente; `quilometragem`: km inteiro e não negativo; `data_registro`: dia da leitura; `criado_em`: momento da inclusão |

As contas existentes continuam em `auth.users`, administrado pelo Supabase Auth.
Não criamos uma tabela de senhas. Um usuário pode possuir vários veículos;
um veículo pode ter várias leituras de km. As referências entre IDs são
chaves estrangeiras e impedem ligar uma leitura a um veículo inexistente.

Por exemplo, um carro pode ter leituras de 50.000 km e depois 50.800 km.
Guardamos ambas. A quilometragem atual será a leitura com a data mais recente,
desempatada por `criado_em` e `id`; não o maior valor de km. Assim, uma correção
para um valor menor pode funcionar sem apagar o histórico. A confirmação dessa
correção será implementada na interface de atualização de km.

O limite técnico inicial do ano é de 1886 até o ano atual mais um.
Marca e modelo não podem ser vazios; apelido em branco vira `null` (sem valor).
Um índice ajuda o banco a encontrar os veículos do usuário e suas últimas leituras.

## Quem pode acessar

RLS significa segurança por linha. O banco verifica quem está conectado:
`auth.uid()` fornece a identificação desse usuário. As políticas permitem
consultar, inserir, editar e excluir apenas veículos próprios e leituras de
veículos próprios. Uma alteração também não pode transferir o registro a outro usuário.
Visitantes sem login não recebem permissões de acesso às tabelas ou à função.

`USING` verifica quais registros existentes a pessoa pode acessar.
`WITH CHECK` verifica se os novos valores respeitam a propriedade do registro.
A função usa `SECURITY INVOKER`: segue as permissões da pessoa que a chamou.

O proprietário administrativo do banco, como o SQL Editor, pode ignorar RLS.
Ver todas as linhas no painel administrativo não significa que o aplicativo
permita isso aos usuários comuns. As políticas precisam ser verificadas com
usuários autenticados, não só com consultas administrativas.

Excluir um veículo também exclui suas leituras por `ON DELETE CASCADE`.
A tela de exclusão deverá exigir confirmação, conforme o planejamento aprovado.
Não haverá botão de exclusão nesta primeira tela de cadastro.

## Como será o cadastro

1. Usuário entra e abre Cadastrar veículo pelo painel.
2. Informa marca, modelo, ano, apelido opcional e quilometragem inicial obrigatória.
3. O aplicativo valida os campos e chama `cadastrar_veiculo` pela API do Supabase.
4. O banco identifica o usuário pela sessão, cria o veículo e registra o km inicial.
5. Se tudo der certo, retorna ao painel; se houver erro, mostra a mensagem e permite corrigir.

Os dois registros são salvos juntos pela função: se a quilometragem falhar,
o veículo também não fica salvo pela chamada. Isso se chama atomicidade.
O aplicativo deve usar essa função no cadastro; as permissões de inserção direta
das tabelas, necessárias para `SECURITY INVOKER`, não obrigam outros clientes a usá-la.
Por isso, não afirmar que qualquer inserção manual necessariamente cria o km inicial.

## Aplicar no Supabase

1. Abra o projeto do AutoPrev no Supabase.
2. No Table Editor, confira se `veiculos` e `registros_quilometragem` já existem.
   Se existirem, pare e informe isso para comparar o esquema antes de prosseguir.
3. Abra SQL Editor e crie uma nova consulta.
4. Copie o conteúdo integral de
   `supabase/migrations/202610030001_veiculos_quilometragem.sql` e execute com Run.
5. O resultado esperado é sucesso sem linhas retornadas. No Table Editor,
   confira as duas tabelas e a indicação de RLS habilitada.

Executar uma única vez. O script usa `BEGIN` e `COMMIT`, não apaga tabelas
existentes e não esconde conflitos com `IF NOT EXISTS`. Se falhar, registre a
mensagem e não remova tabelas para forçar a execução. Em uma consulta que
permaneça em transação com erro, execute `ROLLBACK` antes de tentar novamente.

Após a aplicação remota, implementaremos o formulário e a listagem no painel.
Depois acrescentaremos `tipos_manutencao` e `manutencoes`, mantendo os três
tipos aprovados: troca de óleo, bateria e pastilhas. Esta parte não conclui a Etapa 8.

## Referências

- [Políticas RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Funções do banco](https://supabase.com/docs/guides/database/functions)
