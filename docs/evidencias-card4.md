# Card 4 — evidência dos critérios de aceite

Gestão de usuários (`/admin/usuarios`, só Dono) + Edge Function `admin-users`. Testado contra a **função real em produção** (projeto `degusta-chopp`), com navegador real (Chromium, 390 px) e testes de lógica sem rede. O usuário `marcelo` não foi tocado: perfil, hash da senha, ban e confirmação idênticos antes e depois (snapshot comparado).

## Mudanças de banco (aprovadas)

`0003_service_role_grants.sql`: o `service_role` não tinha permissão nas tabelas (projeto com "Automatically expose new tables" desligado). Concedido o mínimo, **sem DELETE**: `select, insert, update` em `profiles`, `select, insert` em `audit_log`, `usage` em `audit_log_id_seq`. Aplicada pela Management API e registrada no histórico (`0001`, `0002`, `0003`).

## Critérios do card

| Critério | Resultado |
|---|---|
| Gerente ou operador chamando a função direto → 403 | ✅ operador e gerente (perfil alterado por SQL entre as chamadas): `403` nas 4 ações (`create`, `reset_password`, `set_active`, `set_role`); nada foi criado nem alterado. Sem token e token inválido: `401`. Dono desativado: `403` (teste de lógica). |
| Criar → logar com a provisória → forçado a trocar → entra | ✅ pela interface: criar `teste.ui`, login com a senha provisória, tela "Crie sua senha", entra como operador (Preços, Catálogo). |
| Desativar usuário logado em outro aparelho → perde acesso no próximo request | ✅ aparelho B logado; dono desativa pela tela; B recarrega e volta a `/admin/login` com a mensagem de acesso desativado. No Auth: `refresh` recusado (`user_banned`) e `/auth/v1/user` com o access token antigo → 403 `user_banned`. Com o JWT ainda válido, `my_role()` é nulo e os dados ficam protegidos (RLS). |
| Impossível desativar ou rebaixar o último dono | ✅ **testes de lógica (16/16)**: com 1 dono ativo, `set_active=false` e `set_role` (para gerente e operador) retornam `409 last_owner`, inclusive sobre si mesmo; vale para a corrida (outro pedido tira o outro dono entre a checagem e a gravação: desfaz e devolve 409). **Em produção** o caminho bloqueado não foi exercitado, porque exigiria desativar ou rebaixar o `marcelo`; foi exercitado o caminho permitido com 2 donos ativos (o `teste.dono` desativou a si mesmo com o `marcelo` ativo: 200). |
| Nenhum e-mail é disparado (Auth logs) | ✅ janela de 4 h dos testes, `auth_audit_logs`: apenas `login`, `logout`, `user_signedup` (criação admin), `user_modified`, `user_updated_password`. `auth_logs`: só `/token`, `/user`, `/logout`, `/admin/users*`. Zero ocorrências de `smtp`, `mailer`, `/recover`, `/otp`, `/magiclink`, `/invite`, `/resend`, `confirmation_sent`, `recovery_sent`, `email_change`. |

## Demais itens

| Item | Resultado |
|---|---|
| Valida o JWT do chamador e `profiles.role = 'dono' and active`, senão 403 | ✅ `verify_jwt = false` no gateway (para o preflight CORS passar); a validação é feita na função (`auth.getUser` + perfil). |
| `create`: senha `palavra-palavra-NNNN` (208 palavras sem acento, `crypto.getRandomValues`), `must_change_password = true`, senha retornada uma vez | ✅ formato validado em 2.000 amostras e em produção; e-mail interno confirmado no Auth; username duplicado (inclusive `marcelo`) → 409; dados inválidos → 400; falha ao inserir o perfil desfaz o usuário do Auth. |
| `reset_password`: nova provisória + `must_change_password` + revoga sessões | ✅ senha antiga deixa de valer; refresh token antigo revogado; com 2 sessões abertas antes, **0** depois (a sessão usada para revogar não é mantida). |
| `set_active`: ao desativar revoga sessões; ao reativar volta a entrar | ✅ desativar = perfil inativo + `ban_duration` longo; reativar = `ban_duration: 'none'` e a mesma senha volta a funcionar. **Login de usuário banido mostra "Seu acesso está desativado. Fale com o responsável."** (testado na tela). |
| `set_role` | ✅ com antes/depois no audit. |
| Toda ação grava em `audit_log` (`table_name = 'profiles'`) | ✅ `INSERT` (criar), `RESET_PASSWORD`, `UPDATE` (ativar/desativar/perfil), todos com `changed_by` = dono, `old_data`/`new_data` (campos públicos). **Nenhuma senha** em `audit_log` nem nos logs da função (varredura de todas as fontes de log com as senhas geradas: 0 ocorrências; 21 requisições da função confirmadas na janela). |
| Tela: lista (nome, usuário, chip do perfil, status, data) e aviso fixo "Mantenha pelo menos 2 usuários com perfil Dono." | ✅ |
| Novo usuário: nome (contador n/60), usuário (validação ao vivo, "já existe"), perfil com descrição | ✅ |
| Modal da senha: Copiar, Enviar no WhatsApp e aviso "Esta senha não será exibida de novo." | ✅ copiar confere com a área de transferência; a mensagem do WhatsApp é exatamente a do card (`<origin>/admin`); após fechar e recarregar a senha não aparece mais. |
| Ações por linha com confirmação: redefinir, ativar/desativar, alterar perfil | ✅ cancelar não executa; alvos de toque ≥ 44 px a 390 px. |
| Outro aparelho após redefinir senha | ✅ no próximo request volta a exigir "Crie sua senha". |

## Decisões e desvios

- **Sessões**: o Auth não tem "revogar sessões por id de usuário" (`DELETE /auth/v1/admin/users/{id}/sessions` → 404). Desativar usa `ban_duration` (derruba refresh e API do Auth; o perfil inativo bloqueia os dados e o admin desloga no próximo request); redefinir usa login com a senha nova + `signOut({ scope: 'global' })`, sem manter a sessão.
- **Deploy**: o CLI 3.x pediu `--yes` (confirmação para mutar o projeto hospedado em modo não interativo). Comando usado: `npx supabase functions deploy admin-users --project-ref auaodnjrpaqsgcoogtcb --use-api --yes`.
- **`audit_log.action`**: `INSERT` para criação, `RESET_PASSWORD` para redefinição e `UPDATE` para ativar/desativar e perfil (o Card 7 monta o texto legível a partir de `old_data`/`new_data`).
- **Código**: a função foi dividida em `index.ts` (ligação com o Supabase), `handler.ts` (regras, com dependências injetadas) e `passwords.ts`, para testar a lógica sem rede (`npm run test:functions`, 16 testes).
- **Bug pego pelos testes de interface**: `ROLES` em `rules.js` é um objeto; o `.map` nos selects de perfil quebrava o modal "Novo usuário". Corrigido antes do PR.
- **Usuários de teste** (todos `active = false` e banidos no fim; nada foi apagado): `teste.dono` (criado neste card), `teste.operador` (reativado só durante os testes), `teste.criado` e `teste.ui` (criados pelos testes via API e interface).

## Bundle

| Arquivo (gzip -9) | Antes (master) | Depois |
|---|---|---|
| Landing `index-*.js` | 64.196 B (`index-BxWfkATj.js`) | 64.196 B, **mesmo hash** |
| Landing `index-*.css` | 7.438 B (`index-oN87JdVb.css`) | 7.438 B, **mesmo hash** |
| Admin JS (só em `/admin`) | 124.343 B | 128.240 B |
| Admin CSS (só em `/admin`) | 3.462 B | 4.058 B |
