-- Card 7: nomes da equipe para "Última alteração" e Histórico.
-- profiles continua restrito por RLS; esta RPC expõe SÓ id e full_name, e só para quem é da equipe ativa.
create or replace function public.staff_names()
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name
  from public.profiles p
  where public.my_role() is not null
$$;

revoke all on function public.staff_names() from public, anon;
grant execute on function public.staff_names() to authenticated;
