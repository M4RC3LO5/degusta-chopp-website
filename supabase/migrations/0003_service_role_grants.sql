-- (0003) service_role usado pela Edge Function admin-users.
-- O projeto foi criado com "Automatically expose new tables" desligado: o service_role ignora o RLS,
-- mas não ignora GRANT. Sem DELETE (nada é apagado) e sem acesso às demais tabelas.
grant select, insert, update on public.profiles to service_role;
grant select, insert on public.audit_log to service_role;
grant usage on sequence public.audit_log_id_seq to service_role;
