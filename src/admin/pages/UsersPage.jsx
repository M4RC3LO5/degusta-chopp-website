import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Check, KeyRound, MessageCircle, Plus, Power, ShieldCheck, UserPlus } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../auth/AuthContext';
import { callAdminUsers } from '../api/adminUsers';
import Modal, { ConfirmDialog } from '../components/Modal';
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, RULES, USERS_NOTICE } from '../rules';

const ROLE_LIST = Object.values(ROLES);

const ROLE_CHIP = {
  dono: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  gerente: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  operador: 'bg-slate-500/20 border-slate-400/40 text-slate-200'
};

const inputClass = 'w-full h-12 px-4 rounded-xl bg-[#0d1c10] border border-emerald-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400';
const primaryBtn = 'h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black uppercase tracking-wide shadow-gold-glow disabled:opacity-50 disabled:shadow-none';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function buildWhatsAppText(origin, username, password) {
  return `Seu acesso ao painel Degusta Chopp:\nEndereço: ${origin}/admin\nUsuário: ${username}\nSenha provisória: ${password}\nNo 1º acesso você vai criar sua senha.`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    el.remove();
    return ok;
  }
}

// Modal que mostra a senha provisória UMA vez (criação ou redefinição).
function SecretModal({ secret, onClose }) {
  const [copied, setCopied] = useState(false);
  const message = buildWhatsAppText(window.location.origin, secret.user.username, secret.password);

  const copy = async () => {
    setCopied(await copyText(secret.password));
    setTimeout(() => setCopied(false), 2500);
  };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');

  return (
    <Modal title={secret.kind === 'create' ? 'Usuário criado' : 'Senha redefinida'} labelledBy="secret-title">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#0d1c10] border border-emerald-900/50 p-4 space-y-2">
          <p className="text-xs text-emerald-200/70">Usuário</p>
          <p className="font-bold text-slate-100" data-testid="secret-username">{secret.user.username}</p>
          <p className="text-xs text-emerald-200/70 pt-1">Senha provisória</p>
          <p className="font-mono text-xl font-bold text-amber-300 break-all select-all" data-testid="secret-password">{secret.password}</p>
        </div>
        <p className="text-sm font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
          Esta senha não será exibida de novo.
        </p>
        {secret.kind === 'reset' && secret.sessionsRevoked === false && (
          <p className="text-xs text-emerald-200/80">As sessões antigas deste usuário não puderam ser encerradas agora; elas caem quando ele entrar com a nova senha.</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={copy} className="h-12 rounded-xl border border-amber-500/40 bg-[#0d1c10] text-sm font-bold text-amber-300 flex items-center justify-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiada' : 'Copiar'}</span>
          </button>
          <button type="button" onClick={whatsapp} className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 text-sm font-black flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </button>
        </div>
        <button type="button" onClick={onClose} className={`${primaryBtn} w-full`}>Concluir</button>
      </div>
    </Modal>
  );
}

function CreateUserModal({ users, onClose, onCreated }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('operador');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const usernameError = useMemo(() => {
    if (!username) return '';
    if (!RULES.username.regex.test(username)) return 'Use 3 a 20 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.';
    if (users.some(u => u.username === username)) return 'Esse usuário já existe.';
    return '';
  }, [username, users]);

  const nameLength = fullName.trim().length;
  const nameValid = nameLength >= RULES.fullName.min && nameLength <= RULES.fullName.max;
  const canSubmit = nameValid && username && !usernameError && !busy;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      const result = await onCreated({ username, full_name: fullName.trim(), role });
      if (result?.error) setError(result.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Novo usuário" onClose={busy ? undefined : onClose} labelledBy="create-title">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="nu-name" className="text-xs font-bold uppercase tracking-wider text-amber-400">Nome</label>
          <input id="nu-name" className={inputClass} maxLength={RULES.fullName.max} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" />
          <p className={`text-xs text-right ${nameLength >= RULES.fullName.max * 0.9 ? 'text-amber-300' : 'text-emerald-200/60'}`}>{nameLength}/{RULES.fullName.max}</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="nu-username" className="text-xs font-bold uppercase tracking-wider text-amber-400">Usuário</label>
          <input
            id="nu-username"
            className={inputClass}
            maxLength={RULES.username.max}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
          />
          {usernameError
            ? <p role="alert" className="text-xs font-semibold text-rose-300">{usernameError}</p>
            : <p className="text-xs text-emerald-200/60">Sem espaços. Ex.: joao.silva</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="nu-role" className="text-xs font-bold uppercase tracking-wider text-amber-400">Perfil</label>
          <select id="nu-role" className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_LIST.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <p className="text-xs text-emerald-200/80">{ROLE_DESCRIPTIONS[role]}</p>
        </div>

        {error && <p role="alert" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={!canSubmit} className={`${primaryBtn} flex-1`}>{busy ? 'Criando…' : 'Criar'}</button>
        </div>
      </form>
    </Modal>
  );
}

function RoleModal({ user, onClose, onConfirm }) {
  const [role, setRole] = useState(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await onConfirm(user, role);
      if (result?.error) setError(result.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Alterar perfil de ${user.full_name}`} onClose={busy ? undefined : onClose} labelledBy="role-title">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="role-select" className="text-xs font-bold uppercase tracking-wider text-amber-400">Novo perfil</label>
          <select id="role-select" className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_LIST.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <p className="text-xs text-emerald-200/80">{ROLE_DESCRIPTIONS[role]}</p>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={confirm} disabled={busy || role === user.role} className={`${primaryBtn} flex-1`}>{busy ? 'Salvando…' : 'Confirmar'}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function UsersPage() {
  const { profile: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [secret, setSecret] = useState(null);
  const [confirm, setConfirm] = useState(null);   // { title, message, confirmLabel, danger, run }
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [roleUser, setRoleUser] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, role, active, must_change_password, created_at')
      .order('created_at', { ascending: true });
    if (error) setLoadError('Não foi possível carregar os usuários.');
    else { setUsers(data); setLoadError(''); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const errorText = (err) => err?.message || 'Não foi possível concluir a ação. Tente de novo.';

  const handleCreate = async (payload) => {
    try {
      const result = await callAdminUsers('create', payload);
      setCreateOpen(false);
      setSecret({ kind: 'create', user: result.user, password: result.temp_password });
      load();
      return {};
    } catch (err) {
      return { error: errorText(err) };
    }
  };

  const askConfirm = (cfg) => { setConfirmError(''); setConfirm(cfg); };

  const runConfirm = async () => {
    setConfirmBusy(true);
    setConfirmError('');
    try {
      await confirm.run();
      setConfirm(null);
    } catch (err) {
      setConfirmError(errorText(err));
    } finally {
      setConfirmBusy(false);
    }
  };

  const resetPassword = (user) => askConfirm({
    title: 'Redefinir senha',
    message: `Gerar uma nova senha provisória para ${user.full_name}? A senha atual deixa de valer e ele precisará criar outra no próximo acesso.`,
    confirmLabel: 'Redefinir',
    run: async () => {
      const result = await callAdminUsers('reset_password', { user_id: user.id });
      setSecret({ kind: 'reset', user: result.user, password: result.temp_password, sessionsRevoked: result.sessions_revoked });
      load();
    }
  });

  const toggleActive = (user) => askConfirm({
    title: user.active ? 'Desativar usuário' : 'Ativar usuário',
    message: user.active
      ? `Desativar ${user.full_name}? Ele perde o acesso ao painel imediatamente. Nada é apagado.`
      : `Reativar ${user.full_name}? Ele volta a entrar com a senha que já tem.`,
    confirmLabel: user.active ? 'Desativar' : 'Ativar',
    danger: user.active,
    run: async () => { await callAdminUsers('set_active', { user_id: user.id, active: !user.active }); load(); }
  });

  const changeRole = async (user, role) => {
    try {
      await callAdminUsers('set_role', { user_id: user.id, role });
      setRoleUser(null);
      load();
      return {};
    } catch (err) {
      return { error: errorText(err) };
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold text-amber-300">Usuários</h1>
        <button type="button" onClick={() => setCreateOpen(true)} className={`${primaryBtn} px-4 flex items-center gap-2 text-xs`}>
          <UserPlus className="w-4 h-4" />
          <span>Novo usuário</span>
        </button>
      </div>

      <p className="flex items-start gap-2 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
        <span>{USERS_NOTICE}</span>
      </p>

      {loading && <p className="text-sm text-emerald-200/70" role="status">Carregando…</p>}
      {loadError && <p role="alert" className="text-sm font-semibold text-rose-300">{loadError}</p>}

      <ul className="space-y-3">
        {users.map(u => (
          <li key={u.id} data-testid={`user-${u.username}`} className="rounded-2xl bg-[#142718] border border-emerald-900/50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-100 truncate">
                  {u.full_name}{u.id === me.id && <span className="ml-2 text-[11px] font-bold text-emerald-300">(você)</span>}
                </p>
                <p className="text-xs text-emerald-200/70">@{u.username} · criado em {formatDate(u.created_at)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase border ${ROLE_CHIP[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                <span className={`text-[11px] font-bold ${u.active ? 'text-emerald-300' : 'text-rose-300'}`}>{u.active ? 'Ativo' : 'Desativado'}</span>
              </div>
            </div>
            {u.must_change_password && <p className="text-[11px] text-amber-300/90">Aguardando o 1º acesso (senha provisória).</p>}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => resetPassword(u)} className="min-h-[44px] rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-[11px] font-bold text-emerald-200 hover:text-amber-300 flex flex-col items-center justify-center gap-0.5 px-1">
                <KeyRound className="w-4 h-4" /><span>Redefinir senha</span>
              </button>
              <button type="button" onClick={() => toggleActive(u)} className="min-h-[44px] rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-[11px] font-bold text-emerald-200 hover:text-amber-300 flex flex-col items-center justify-center gap-0.5 px-1">
                <Power className="w-4 h-4" /><span>{u.active ? 'Desativar' : 'Ativar'}</span>
              </button>
              <button type="button" onClick={() => setRoleUser(u)} className="min-h-[44px] rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-[11px] font-bold text-emerald-200 hover:text-amber-300 flex flex-col items-center justify-center gap-0.5 px-1">
                <Plus className="w-4 h-4 rotate-45" /><span>Alterar perfil</span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {createOpen && <CreateUserModal users={users} onClose={() => setCreateOpen(false)} onCreated={handleCreate} />}
      {roleUser && <RoleModal user={roleUser} onClose={() => setRoleUser(null)} onConfirm={changeRole} />}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          busy={confirmBusy}
          error={confirmError}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {secret && <SecretModal secret={secret} onClose={() => setSecret(null)} />}
    </section>
  );
}
