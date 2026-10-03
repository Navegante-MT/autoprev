-- Etapa 8, parte 1: executar uma unica vez no SQL Editor do projeto AutoPrev.
-- Tudo e criado numa transacao. Nenhuma tabela existente e apagada.
begin;

create table public.veiculos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  marca text not null check (length(btrim(marca)) > 0),
  modelo text not null check (length(btrim(modelo)) > 0),
  ano integer not null check (ano between 1886 and extract(year from current_date)::integer + 1),
  apelido text,
  criado_em timestamptz not null default now()
);

create table public.registros_quilometragem (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos(id) on delete cascade,
  quilometragem integer not null check (quilometragem >= 0),
  data_registro date not null default current_date,
  criado_em timestamptz not null default now()
);

create index veiculos_usuario_id_idx on public.veiculos(usuario_id);
-- A leitura atual usa a maior data; criado_em e id desempatarão leituras do mesmo dia.
create index registros_quilometragem_mais_recente_idx
  on public.registros_quilometragem(veiculo_id, data_registro desc, criado_em desc, id desc);

alter table public.veiculos enable row level security;
alter table public.registros_quilometragem enable row level security;

revoke all on table public.veiculos, public.registros_quilometragem from public, anon, authenticated;
grant select, insert, update, delete on table public.veiculos, public.registros_quilometragem to authenticated;

-- USING protege registros existentes; WITH CHECK protege valores inseridos/alterados.
create policy veiculos_do_usuario on public.veiculos
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy quilometragens_do_usuario on public.registros_quilometragem
  for all to authenticated
  using (exists (
    select 1 from public.veiculos v
    where v.id = registros_quilometragem.veiculo_id and v.usuario_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.veiculos v
    where v.id = registros_quilometragem.veiculo_id and v.usuario_id = (select auth.uid())
  ));

-- O aplicativo chamara esta funcao: os dois INSERTs confirmam ou falham juntos.
-- SECURITY INVOKER conserva as permissoes e politicas RLS do usuario conectado.
create function public.cadastrar_veiculo(
  p_marca text,
  p_modelo text,
  p_ano integer,
  p_quilometragem integer,
  p_apelido text default null,
  p_data_registro date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  novo_veiculo_id uuid;
  usuario_atual uuid := auth.uid();
begin
  if usuario_atual is null then
    raise exception 'Entre na sua conta para cadastrar um veiculo.' using errcode = '42501';
  end if;

  insert into public.veiculos(usuario_id, marca, modelo, ano, apelido)
  values (usuario_atual, btrim(p_marca), btrim(p_modelo), p_ano, nullif(btrim(p_apelido), ''))
  returning id into novo_veiculo_id;

  insert into public.registros_quilometragem(veiculo_id, quilometragem, data_registro)
  values (novo_veiculo_id, p_quilometragem, p_data_registro);

  return novo_veiculo_id;
end;
$$;

revoke all on function public.cadastrar_veiculo(text, text, integer, integer, text, date) from public, anon, authenticated;
grant execute on function public.cadastrar_veiculo(text, text, integer, integer, text, date) to authenticated;

comment on table public.veiculos is 'Veiculos de cada usuario do AutoPrev. Nao armazena senhas.';
comment on table public.registros_quilometragem is 'Historico de leituras de km; nao impede reducao para permitir correcao confirmada na interface.';
comment on function public.cadastrar_veiculo(text, text, integer, integer, text, date)
  is 'Cadastro atomico do veiculo e quilometragem inicial, respeitando RLS.';

commit;
