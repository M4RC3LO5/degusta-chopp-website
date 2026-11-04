-- Card 10: retenção e exclusão do Histórico (só Dono), sempre com rastro.
-- Nada é apagado automaticamente. O app não tem DELETE em audit_log: a exclusão só passa por purge_audit_month().
-- Meses são calculados no fuso America/Sao_Paulo (o mesmo que o dono vê na tela).

-- ===== Registro permanente das exclusões =====
create table public.audit_purges (
  id bigint generated always as identity primary key,
  purged_by uuid not null references public.profiles,
  purged_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  rows_deleted integer not null check (rows_deleted > 0),
  check (period_end >= period_start)
);
alter table public.audit_purges enable row level security;
create policy mgr_read_audit_purges on public.audit_purges for select to authenticated
  using (public.my_role() in ('dono','gerente'));

-- Só leitura para o app. Sem INSERT/UPDATE/DELETE (a escrita é da RPC) e sem TRUNCATE.
revoke all on public.audit_purges from public, anon, authenticated;
grant select on public.audit_purges to authenticated;

-- audit_log: o Supabase concede TRUNCATE (e outros) por padrão a anon/authenticated. Fica só o SELECT.
revoke all on public.audit_log from public, anon, authenticated;
grant select on public.audit_log to authenticated;

-- ===== Meses com histórico (dono/gerente) =====
-- older_than_12m: mês que começou antes de (início do mês corrente - 12 meses).
create or replace function public.audit_months()
returns table (month date, row_count bigint, older_than_12m boolean, is_current boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  cur date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
begin
  if public.my_role() is null or public.my_role() not in ('dono','gerente') then
    raise exception 'permission denied for function audit_months' using errcode = '42501';
  end if;
  return query
    select m.month, m.n, m.month < (cur - interval '12 months')::date, m.month = cur
    from (
      select date_trunc('month', a.changed_at at time zone 'America/Sao_Paulo')::date as month, count(*) as n
      from public.audit_log a group by 1
    ) m
    order by m.month;
end $$;

-- ===== Apagar um mês fechado (só dono) =====
create or replace function public.purge_audit_month(p_month date)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  cur date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  first_day date := date_trunc('month', p_month)::date;
  t_start timestamptz;
  t_end timestamptz;
  n integer;
begin
  if public.my_role() is distinct from 'dono' then
    raise exception 'permission denied for function purge_audit_month' using errcode = '42501';
  end if;
  if p_month is null then
    raise exception 'Informe o mês.' using errcode = '22023';
  end if;
  if first_day >= cur then
    raise exception 'O mês corrente (e meses futuros) nunca é apagado.' using errcode = '22023';
  end if;

  t_start := (first_day::timestamp) at time zone 'America/Sao_Paulo';
  t_end   := ((first_day + interval '1 month')::timestamp) at time zone 'America/Sao_Paulo';

  with del as (
    delete from public.audit_log where changed_at >= t_start and changed_at < t_end returning 1
  ) select count(*) into n from del;

  if n = 0 then
    raise exception 'Esse mês não tem registros.' using errcode = 'P0002';
  end if;

  insert into public.audit_purges(purged_by, period_start, period_end, rows_deleted)
  values (auth.uid(), first_day, (first_day + interval '1 month - 1 day')::date, n);
  return n;
end $$;

revoke all on function public.audit_months() from public, anon;
revoke all on function public.purge_audit_month(date) from public, anon;
grant execute on function public.audit_months() to authenticated;
grant execute on function public.purge_audit_month(date) to authenticated;
