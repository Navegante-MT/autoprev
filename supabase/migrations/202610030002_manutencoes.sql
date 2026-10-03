-- Etapa 8: executar UMA VEZ, depois da migracao de veiculos/quilometragem.
-- Nao executar novamente o arquivo 202610030001.
begin;

create table public.tipos_manutencao (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

insert into public.tipos_manutencao(codigo, nome) values
  ('troca_oleo', 'Troca de óleo'),
  ('troca_bateria', 'Troca de bateria'),
  ('troca_pastilhas', 'Troca de pastilhas de freio');

create table public.manutencoes (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos(id) on delete cascade,
  tipo_manutencao_id uuid not null references public.tipos_manutencao(id),
  data_manutencao date not null check (data_manutencao <= (now() at time zone 'America/Cuiaba')::date),
  quilometragem integer not null check (quilometragem >= 0),
  valor_pago numeric(12,2) check (valor_pago >= 0),
  oficina text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index manutencoes_veiculo_data_idx on public.manutencoes(veiculo_id, data_manutencao desc, criado_em desc);
create index manutencoes_tipo_idx on public.manutencoes(tipo_manutencao_id);

alter table public.tipos_manutencao enable row level security;
alter table public.manutencoes enable row level security;
revoke all on table public.tipos_manutencao, public.manutencoes from public, anon, authenticated;
grant select on table public.tipos_manutencao to authenticated;
grant select, insert, update, delete on table public.manutencoes to authenticated;

create policy tipos_para_usuarios on public.tipos_manutencao
  for select to authenticated using (true);
create policy manutencoes_do_usuario on public.manutencoes
  for all to authenticated
  using (exists (
    select 1 from public.veiculos v
    where v.id = manutencoes.veiculo_id and v.usuario_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.veiculos v
    where v.id = manutencoes.veiculo_id and v.usuario_id = (select auth.uid())
  ));

create function public.marcar_atualizacao_manutencao()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;
revoke all on function public.marcar_atualizacao_manutencao() from public, anon, authenticated;
create trigger manutencao_atualizada before update on public.manutencoes
  for each row execute function public.marcar_atualizacao_manutencao();

-- A chamada grava a manutencao e, se necessario, uma leitura de km juntos.
create function public.registrar_manutencao(
  p_veiculo_id uuid,
  p_tipo_manutencao_id uuid,
  p_data_manutencao date,
  p_quilometragem integer,
  p_valor_pago numeric default null,
  p_oficina text default null,
  p_observacoes text default null
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  nova_manutencao_id uuid;
  km_atual integer;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para registrar manutencoes.' using errcode = '42501';
  end if;
  -- Serializa chamadas de manutencao para o mesmo veiculo e verifica o dono.
  perform 1 from public.veiculos
    where id = p_veiculo_id and usuario_id = auth.uid() for update;
  if not found then
    raise exception 'Veiculo nao encontrado ou indisponivel para sua conta.' using errcode = '42501';
  end if;
  perform 1 from public.tipos_manutencao where id = p_tipo_manutencao_id and ativo;
  if not found then
    raise exception 'Tipo de manutencao inexistente ou inativo.' using errcode = '22023';
  end if;

  insert into public.manutencoes(veiculo_id, tipo_manutencao_id, data_manutencao, quilometragem, valor_pago, oficina, observacoes)
  values (p_veiculo_id, p_tipo_manutencao_id, p_data_manutencao, p_quilometragem, p_valor_pago,
    nullif(btrim(p_oficina), ''), nullif(btrim(p_observacoes), ''))
  returning id into nova_manutencao_id;

  select quilometragem into km_atual from public.registros_quilometragem
    where veiculo_id = p_veiculo_id
    order by data_registro desc, criado_em desc, id desc limit 1;
  if km_atual is null or p_quilometragem > km_atual then
    insert into public.registros_quilometragem(veiculo_id, quilometragem, data_registro)
    values (p_veiculo_id, p_quilometragem, p_data_manutencao);
  end if;
  return nova_manutencao_id;
end;
$$;
revoke all on function public.registrar_manutencao(uuid, uuid, date, integer, numeric, text, text) from public, anon, authenticated;
grant execute on function public.registrar_manutencao(uuid, uuid, date, integer, numeric, text, text) to authenticated;

comment on function public.registrar_manutencao(uuid, uuid, date, integer, numeric, text, text)
  is 'Registra manutencao e leitura adicional quando km supera leitura atual. Retroativos preservam a ordem por data.';
commit;
