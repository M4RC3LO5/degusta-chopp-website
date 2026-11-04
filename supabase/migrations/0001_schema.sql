-- ===== Tipos e helpers =====
create type public.user_role as enum ('dono','gerente','operador');

create table public.profiles (
  id uuid primary key references auth.users on delete restrict,
  username text unique not null check (username ~ '^[a-z0-9._-]{3,20}$'),
  full_name text not null check (char_length(full_name) between 2 and 60),
  role public.user_role not null default 'operador',
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

-- ===== Catálogo =====
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{2,30}$'),
  name text not null check (char_length(name) between 2 and 20),
  logo_path text,
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles
);

create table public.flavors (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{2,30}$'),
  name text not null check (char_length(name) between 2 and 20),
  abv numeric(3,1) not null check (abv between 0 and 15),
  ibu int not null check (ibu between 0 and 120),
  description text not null check (char_length(description) between 10 and 120),
  ideal_for text not null check (char_length(ideal_for) between 5 and 45),
  badge text check (badge is null or (char_length(badge) <= 18 and badge = upper(badge))),
  badge_color text not null default 'amber'
    check (badge_color in ('amber','emerald','yellow','purple','orange')),
  image_path text,
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles
);

-- Oferta = sabor x marca. Tamanhos fixos 30L/50L nesta fase.
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  flavor_id uuid not null references public.flavors,
  brand_id uuid not null references public.brands,
  subtitle text check (subtitle is null or char_length(subtitle) <= 22),
  price_30 numeric(8,2) check (price_30 is null or (price_30 > 0 and price_30 <= 5000)),
  price_50 numeric(8,2) check (price_50 is null or (price_50 > 0 and price_50 <= 5000)),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles,
  unique (flavor_id, brand_id),
  check (not active or price_30 is not null or price_50 is not null)
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  whatsapp text not null check (whatsapp ~ '^55[1-9][0-9]{9,10}$'),
  promo_min_liters int not null default 50 check (promo_min_liters between 0 and 500),
  business_hours text not null check (char_length(business_hours) <= 80),
  regions text not null check (char_length(regions) <= 160),
  payment_info text not null check (char_length(payment_info) <= 120),
  instagram text check (instagram is null or instagram ~ '^[a-z0-9._]{1,30}$'),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles
);

-- ===== Auditoria =====
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text not null,
  action text not null,
  changed_by uuid references public.profiles,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create or replace function public.tg_audit_and_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  insert into public.audit_log(table_name,row_id,action,changed_by,old_data,new_data)
  values (tg_table_name,
          coalesce(new.id, old.id)::text,
          tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return new;
end $$;

create trigger audit_brands   before insert or update on public.brands   for each row execute function public.tg_audit_and_stamp();
create trigger audit_flavors  before insert or update on public.flavors  for each row execute function public.tg_audit_and_stamp();
create trigger audit_offers   before insert or update on public.offers   for each row execute function public.tg_audit_and_stamp();
create trigger audit_settings before insert or update on public.settings for each row execute function public.tg_audit_and_stamp();

-- ===== RLS =====
alter table public.profiles  enable row level security;
alter table public.brands    enable row level security;
alter table public.flavors   enable row level security;
alter table public.offers    enable row level security;
alter table public.settings  enable row level security;
alter table public.audit_log enable row level security;

-- Público (site): só o que está ativo
create policy pub_brands  on public.brands  for select to anon using (active);
create policy pub_flavors on public.flavors for select to anon using (active);
create policy pub_offers  on public.offers  for select to anon using (active);
create policy pub_settings on public.settings for select to anon, authenticated using (true);

-- Equipe: lê tudo, cria e edita catálogo (sem DELETE: nenhuma policy de delete)
create policy staff_read_brands  on public.brands  for select to authenticated using (public.my_role() is not null);
create policy staff_read_flavors on public.flavors for select to authenticated using (public.my_role() is not null);
create policy staff_read_offers  on public.offers  for select to authenticated using (public.my_role() is not null);

create policy staff_ins_brands  on public.brands  for insert to authenticated with check (public.my_role() is not null);
create policy staff_upd_brands  on public.brands  for update to authenticated using (public.my_role() is not null);
create policy staff_ins_flavors on public.flavors for insert to authenticated with check (public.my_role() is not null);
create policy staff_upd_flavors on public.flavors for update to authenticated using (public.my_role() is not null);
create policy staff_ins_offers  on public.offers  for insert to authenticated with check (public.my_role() is not null);
create policy staff_upd_offers  on public.offers  for update to authenticated using (public.my_role() is not null);

create policy mgr_upd_settings on public.settings for update to authenticated
  using (public.my_role() in ('dono','gerente'));

create policy mgr_read_audit on public.audit_log for select to authenticated
  using (public.my_role() in ('dono','gerente'));

-- Profiles: cada um lê o próprio; dono lê todos. Escrita só via Edge Function / RPC.
create policy self_read_profile on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() = 'dono');

-- ===== GRANTs explícitos =====
-- Projeto criado com "Automatically expose new tables" DESLIGADO: sem estes grants a API não enxerga nada.
-- Sem DELETE para ninguém (dupla proteção junto com a ausência de policy).
grant usage on schema public to anon, authenticated;
grant select on public.brands, public.flavors, public.offers, public.settings to anon;
grant select, insert, update on public.brands, public.flavors, public.offers to authenticated;
grant select, update on public.settings to authenticated;
grant select on public.profiles, public.audit_log to authenticated;
grant execute on function public.my_role() to authenticated;

-- RPC: concluir troca de senha do 1º acesso
create or replace function public.complete_password_change() returns void
language sql security definer set search_path = public as $$
  update public.profiles set must_change_password = false where id = auth.uid() and active;
$$;
revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;
