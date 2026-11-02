# AutoPrev

Projeto escolar do Seminário Integrador V. Organiza veículos, leituras do hodômetro e histórico de manutenção, com estimativas por tipo de serviço e avisos internos.

## Versão atual

- Cadastro, login, recuperação de senha e sessão pelo Supabase.
- Veículos, quilometragem, correção de leituras e manutenções retroativas.
- Histórico, filtros, estimativas e avisos persistentes.
- Oficinas/mapas e IA ficam para implementação futura. A tela de oficinas é apenas uma apresentação dessa possibilidade.

As estimativas ajudam no planejamento; não constituem diagnóstico mecânico ou recomendação do fabricante. Novas leituras mudam o ritmo de uso e a DATA projetada para atingir o marco de km, não o marco de km por si. Avisos ativam 90 dias antes do primeiro marco por tempo/projeção de km, usando tempo sem ritmo válido. Uma vez ativo, o aviso permanece até nova troca do mesmo tipo e veículo, mesmo se a projeção mudar. Retroativo anterior à troca base não encerra o ciclo.

## Executar

Requer Node.js 24 e npm. Instale com `npm ci`. Configure localmente VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local, sem versionar esse arquivo. Execute `npm run dev`.

Verificações: `npm run test:previsoes`, `npm run lint` e `npm run build`.

## Publicar na Vercel

Importe Navegante-MT/autoprev, branch main, selecione Vite, build `npm run build` e saída `dist`. Cadastre VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente do projeto antes do deploy. Não use senha do banco nem chave service_role no navegador.

O vercel.json encaminha endereços internos ao React, permitindo recarregar /login e /painel. No Supabase Auth > URL Configuration, use a URL definitiva como Site URL e permita seus caminhos /login e /redefinir-senha. Preserve os endereços locais necessários ao desenvolvimento. Teste os e-mails de confirmação e recuperação no domínio publicado.

As migrações SQL já foram aplicadas no projeto existente: não reexecutá-las para publicar o front-end. A Edge Function previsoes-veiculo também já foi publicada separadamente no Supabase.

Fontes: https://vercel.com/docs/frameworks/frontend/vite e https://supabase.com/docs/guides/auth/redirect-urls.
