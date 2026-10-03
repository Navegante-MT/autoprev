-- Etapa 9: avisos ativados permanecem até nova troca do mesmo tipo/veículo.
-- Executar UMA VEZ, após as migrações 001 e 002. Não reexecutar as anteriores.
begin;
create table public.avisos_manutencao (
  veiculo_id uuid not null references public.veiculos(id) on delete cascade,
  tipo_manutencao_id uuid not null references public.tipos_manutencao(id),
  manutencao_base_id uuid references public.manutencoes(id) on delete set null,
  data_troca_base date not null,
  data_estimada_ativacao date not null,
  motivo text not null check (motivo in ('tempo', 'quilometragem', 'ambos')),
  ativado_em timestamptz not null default now(),
  primary key (veiculo_id, tipo_manutencao_id)
);
alter table public.avisos_manutencao enable row level security;
revoke all on public.avisos_manutencao from public, anon, authenticated;
grant select on public.avisos_manutencao to authenticated;
create policy avisos_do_dono on public.avisos_manutencao for select to authenticated
using (exists (select 1 from public.veiculos v where v.id = veiculo_id and v.usuario_id = (select auth.uid())));

create function public.ativar_aviso_manutencao(
  p_veiculo_id uuid, p_tipo_id uuid, p_manutencao_base_id uuid,
  p_data_estimada date, p_motivo text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  base public.manutencoes%rowtype;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  -- O mesmo lock do cadastro impede ativação de um ciclo antigo após nova troca.
  perform 1 from public.veiculos where id = p_veiculo_id and usuario_id = auth.uid() for update;
  if not found then raise exception 'Veículo indisponível.' using errcode = '42501'; end if;
  if p_data_estimada is null or p_motivo is null or p_motivo not in ('tempo','quilometragem','ambos') then
    raise exception 'Dados do aviso inválidos.' using errcode = '22023';
  end if;
  if p_data_estimada > (now() at time zone 'America/Cuiaba')::date + 90 then return false; end if;
  select * into base from public.manutencoes
    where veiculo_id = p_veiculo_id and tipo_manutencao_id = p_tipo_id
    order by data_manutencao desc, criado_em desc, id desc limit 1;
  if not found or base.id is distinct from p_manutencao_base_id then return false; end if;
  insert into public.avisos_manutencao(veiculo_id,tipo_manutencao_id,manutencao_base_id,data_troca_base,data_estimada_ativacao,motivo)
    values (p_veiculo_id,p_tipo_id,base.id,base.data_manutencao,p_data_estimada,p_motivo)
    on conflict (veiculo_id,tipo_manutencao_id) do nothing;
  return true;
end;
$$;
revoke all on function public.ativar_aviso_manutencao(uuid,uuid,uuid,date,text) from public,anon,authenticated;
grant execute on function public.ativar_aviso_manutencao(uuid,uuid,uuid,date,text) to authenticated;

create function public.encerrar_aviso_apos_troca()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.veiculos where id = new.veiculo_id for update;
  -- Retroativo anterior à última troca não encerra o aviso do ciclo atual.
  delete from public.avisos_manutencao
    where veiculo_id = new.veiculo_id and tipo_manutencao_id = new.tipo_manutencao_id
      and new.data_manutencao >= data_troca_base;
  return new;
end;
$$;
revoke all on function public.encerrar_aviso_apos_troca() from public,anon,authenticated;
create trigger troca_encerra_aviso after insert on public.manutencoes
  for each row execute function public.encerrar_aviso_apos_troca();
comment on table public.avisos_manutencao is 'Avisos ativados por ciclo: novas leituras alteram projeção, mas não retiram aviso. Nova troca mesmo tipo/veículo encerra; retroativo anterior não encerra.';
commit;
