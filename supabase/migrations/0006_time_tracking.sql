-- Card 11: ponto dos colaboradores (controle interno; não substitui ponto certificado REP-P / Portaria 671).
-- Hora = hora do servidor. Distância calculada no banco (haversine em SQL puro, sem extensões).
-- O app não tem INSERT/UPDATE/DELETE direto: marcar passa pelas RPCs, e o único jeito de apagar é purge_time_month() (só Dono).
-- Meses são calculados em America/Sao_Paulo, pelo horário EFETIVO da marcação (informado, no esquecimento; senão o registrado).

-- ===== Tipos =====
create type public.time_kind as enum ('entrada', 'intervalo_inicio', 'intervalo_fim', 'saida');
create type public.time_source as enum ('app', 'esquecimento');

-- ===== Localização da loja e raio aceito (valores iniciais pelo default; o Dono ajusta em Config) =====
-- Rua Apalaches, 1215 — Capuava — Santo André/SP.
alter table public.settings
  add column store_lat numeric(9,6) not null default -23.644057 check (store_lat between -90 and 90),
  add column store_lng numeric(9,6) not null default -46.494256 check (store_lng between -180 and 180),
  add column store_radius_m integer not null default 200 check (store_radius_m between 50 and 50000);

-- ===== Marcações =====
create table public.time_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles,
  kind public.time_kind not null,
  recorded_at timestamptz not null default now(),   -- sempre a hora do servidor
  source public.time_source not null default 'app',
  claimed_at timestamptz,                           -- esquecimento: horário informado pelo colaborador
  reason text,                                      -- esquecimento: motivo
  lat numeric(9,6) check (lat between -90 and 90),
  lng numeric(9,6) check (lng between -180 and 180),
  accuracy_m numeric(8,1) check (accuracy_m >= 0),
  distance_m integer check (distance_m >= 0),
  within_radius boolean,                            -- null = sem localização
  check ((lat is null) = (lng is null)),
  check (
    (source = 'app' and claimed_at is null and reason is null)
    or (source = 'esquecimento' and claimed_at is not null and claimed_at <= recorded_at
        and reason is not null and char_length(btrim(reason)) between 3 and 120)
  )
);
create index time_entries_user_effective on public.time_entries (user_id, (coalesce(claimed_at, recorded_at)));
create index time_entries_effective on public.time_entries ((coalesce(claimed_at, recorded_at)));

alter table public.time_entries enable row level security;
create policy staff_read_time_entries on public.time_entries for select to authenticated
  using (public.my_role() is not null and (user_id = auth.uid() or public.my_role() in ('dono', 'gerente')));

-- Registro permanente das exclusões (mesmo padrão de audit_purges).
create table public.time_purges (
  id bigint generated always as identity primary key,
  purged_by uuid not null references public.profiles,
  purged_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  rows_deleted integer not null check (rows_deleted > 0),
  check (period_end >= period_start)
);
alter table public.time_purges enable row level security;
create policy mgr_read_time_purges on public.time_purges for select to authenticated
  using (public.my_role() in ('dono', 'gerente'));

-- Só leitura para o app: sem INSERT/UPDATE/DELETE e sem TRUNCATE (o Supabase concede por padrão a anon/authenticated).
revoke all on public.time_entries from public, anon, authenticated;
revoke all on public.time_purges from public, anon, authenticated;
grant select on public.time_entries, public.time_purges to authenticated;

-- ===== Sequência válida =====
-- Depois de (nada | saída) só entrada; entrada -> início do intervalo ou saída; início -> fim do intervalo; fim -> saída.
create or replace function public._time_next_ok(prev public.time_kind, nxt public.time_kind)
returns boolean language sql immutable as $$
  select case
    when prev is null or prev = 'saida' then nxt = 'entrada'
    when prev = 'entrada' then nxt in ('intervalo_inicio', 'saida')
    when prev = 'intervalo_inicio' then nxt = 'intervalo_fim'
    when prev = 'intervalo_fim' then nxt = 'saida'
    else false
  end
$$;
revoke all on function public._time_next_ok(public.time_kind, public.time_kind) from public, anon, authenticated;

-- ===== Marcar o ponto (hora do servidor, distância no banco, sequência válida) =====
create or replace function public.registrar_ponto(p_kind public.time_kind, p_lat numeric, p_lng numeric, p_accuracy numeric)
returns public.time_entries
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prev public.time_kind;
  prev_at timestamptz;
  st record;
  d integer;
  w boolean;
  r public.time_entries;
begin
  if public.my_role() is null then
    raise exception 'permission denied for function registrar_ponto' using errcode = '42501';
  end if;
  if p_kind is null then
    raise exception 'Informe o tipo da marcação.' using errcode = '22023';
  end if;
  if (p_lat is null) <> (p_lng is null) or p_lat not between -90 and 90 or p_lng not between -180 and 180
     or p_accuracy < 0 then
    raise exception 'Localização inválida.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ponto:' || uid::text, 0));

  select e.kind, coalesce(e.claimed_at, e.recorded_at) into prev, prev_at from public.time_entries e
   where e.user_id = uid order by coalesce(e.claimed_at, e.recorded_at) desc, e.id desc limit 1;
  -- Dia anterior ficou em aberto (esqueceu a saída): só vale uma nova Entrada, para ninguém ficar travado
  -- depois dos 7 dias do esquecimento. O dia aberto aparece como "incompleto" no espelho.
  if prev is not null and prev <> 'saida'
     and (prev_at at time zone 'America/Sao_Paulo')::date < (now() at time zone 'America/Sao_Paulo')::date then
    if p_kind <> 'entrada' then
      raise exception 'Falta a saída do dia anterior. Marque a Entrada de hoje ou use "Lancei esquecimento".' using errcode = '55000';
    end if;
  elsif not public._time_next_ok(prev, p_kind) then
    raise exception 'Essa marcação não vem depois da anterior. Se você esqueceu alguma, use "Lancei esquecimento".' using errcode = '55000';
  end if;

  select s.store_lat, s.store_lng, s.store_radius_m into st from public.settings s where s.id = 1;
  if p_lat is not null then
    -- haversine, raio da Terra = 6.371.000 m
    d := round(2 * 6371000 * asin(least(1, sqrt(
           power(sin(radians(p_lat::float8 - st.store_lat::float8) / 2), 2)
           + cos(radians(st.store_lat::float8)) * cos(radians(p_lat::float8))
             * power(sin(radians(p_lng::float8 - st.store_lng::float8) / 2), 2)
         ))))::integer;
    w := d <= st.store_radius_m;
  end if;

  insert into public.time_entries(user_id, kind, source, lat, lng, accuracy_m, distance_m, within_radius)
  values (uid, p_kind, 'app', p_lat, p_lng, round(p_accuracy, 1), d, w)
  returning * into r;
  return r;
end $$;

-- ===== Lançar esquecimento (últimos 7 dias, nunca no futuro) =====
create or replace function public.lancar_esquecimento(p_kind public.time_kind, p_claimed_at timestamptz, p_reason text)
returns public.time_entries
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  reason text := btrim(coalesce(p_reason, ''));
  prev public.time_kind;
  nxt public.time_kind;
  day_start timestamptz;
  day_end timestamptz;
  r public.time_entries;
begin
  if public.my_role() is null then
    raise exception 'permission denied for function lancar_esquecimento' using errcode = '42501';
  end if;
  if p_kind is null or p_claimed_at is null then
    raise exception 'Informe o tipo e o horário.' using errcode = '22023';
  end if;
  if char_length(reason) not between 3 and 120 then
    raise exception 'Informe o motivo (de 3 a 120 caracteres).' using errcode = '22023';
  end if;
  if p_claimed_at > now() then
    raise exception 'O horário não pode estar no futuro.' using errcode = '22023';
  end if;
  if p_claimed_at < now() - interval '7 days' then
    raise exception 'Só é possível lançar esquecimento dos últimos 7 dias.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ponto:' || uid::text, 0));

  if exists (select 1 from public.time_entries e where e.user_id = uid and coalesce(e.claimed_at, e.recorded_at) = p_claimed_at) then
    raise exception 'Já existe uma marcação nesse horário.' using errcode = '55000';
  end if;
  -- A sequência vale dentro do dia (São Paulo): vizinhas de outro dia não contam, então dá para lançar um dia
  -- inteiro esquecido (Entrada e depois Saída) mesmo havendo marcações de hoje.
  day_start := (date_trunc('day', p_claimed_at at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
  day_end := (date_trunc('day', p_claimed_at at time zone 'America/Sao_Paulo') + interval '1 day') at time zone 'America/Sao_Paulo';
  select e.kind into prev from public.time_entries e
   where e.user_id = uid and coalesce(e.claimed_at, e.recorded_at) >= day_start and coalesce(e.claimed_at, e.recorded_at) < p_claimed_at
   order by coalesce(e.claimed_at, e.recorded_at) desc, e.id desc limit 1;
  select e.kind into nxt from public.time_entries e
   where e.user_id = uid and coalesce(e.claimed_at, e.recorded_at) > p_claimed_at and coalesce(e.claimed_at, e.recorded_at) < day_end
   order by coalesce(e.claimed_at, e.recorded_at) asc, e.id asc limit 1;
  if not public._time_next_ok(prev, p_kind) or (nxt is not null and not public._time_next_ok(p_kind, nxt)) then
    raise exception 'Esse horário não encaixa na sequência das suas marcações do dia.' using errcode = '55000';
  end if;

  insert into public.time_entries(user_id, kind, source, claimed_at, reason)
  values (uid, p_kind, 'esquecimento', p_claimed_at, reason)
  returning * into r;
  return r;
end $$;

-- ===== Meses com marcações (dono/gerente) — mesmo formato de audit_months() =====
create or replace function public.time_months()
returns table (month date, row_count bigint, older_than_12m boolean, is_current boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  cur date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
begin
  if public.my_role() is null or public.my_role() not in ('dono', 'gerente') then
    raise exception 'permission denied for function time_months' using errcode = '42501';
  end if;
  return query
    select m.month, m.n, m.month < (cur - interval '12 months')::date, m.month = cur
    from (
      select date_trunc('month', coalesce(e.claimed_at, e.recorded_at) at time zone 'America/Sao_Paulo')::date as month, count(*) as n
      from public.time_entries e group by 1
    ) m
    order by m.month;
end $$;

-- ===== Apagar um mês fechado (só Dono), com registro em time_purges =====
create or replace function public.purge_time_month(p_month date)
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
    raise exception 'permission denied for function purge_time_month' using errcode = '42501';
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
    delete from public.time_entries
     where coalesce(claimed_at, recorded_at) >= t_start and coalesce(claimed_at, recorded_at) < t_end
    returning 1
  ) select count(*) into n from del;

  if n = 0 then
    raise exception 'Esse mês não tem registros.' using errcode = 'P0002';
  end if;

  insert into public.time_purges(purged_by, period_start, period_end, rows_deleted)
  values (auth.uid(), first_day, (first_day + interval '1 month - 1 day')::date, n);
  return n;
end $$;

revoke all on function public.registrar_ponto(public.time_kind, numeric, numeric, numeric) from public, anon;
revoke all on function public.lancar_esquecimento(public.time_kind, timestamptz, text) from public, anon;
revoke all on function public.time_months() from public, anon;
revoke all on function public.purge_time_month(date) from public, anon;
grant execute on function public.registrar_ponto(public.time_kind, numeric, numeric, numeric) to authenticated;
grant execute on function public.lancar_esquecimento(public.time_kind, timestamptz, text) to authenticated;
grant execute on function public.time_months() to authenticated;
grant execute on function public.purge_time_month(date) to authenticated;
