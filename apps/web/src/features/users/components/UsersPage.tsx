import { useState } from "react";
import { KeyRound, Plus, ShieldCheck, UserRoundCog, Users } from "lucide-react";
import type { User, UserCreateInput, UserUpdateInput } from "@pharmacy/contracts";
import { PageHeading } from "../../../shared/components/PageHeading";
import { useAuthStore } from "../../../shared/store/useAuthStore";
import { useUserActions, useUsers } from "../hooks/useUsers";
import { UserForm } from "./UserForm";

export function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const { data: users = [], isLoading, isError, error: queryError } = useUsers();
  const { create, update, revokeSessions } = useUserActions();
  const [editing, setEditing] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  function saveCreate(input: UserCreateInput) {
    setError("");
    create.mutate(input, { onSuccess: () => setShowForm(false), onError: (cause) => setError(cause.message) });
  }

  function saveUpdate(input: UserUpdateInput) {
    if (!editing) return;
    setError("");
    update.mutate({ id: editing.id, input }, {
      onSuccess: () => { setShowForm(false); setEditing(null); },
      onError: (cause) => setError(cause.message),
    });
  }

  function revoke(user: User) {
    if (window.confirm(`Sign out every active session for ${user.full_name}?`)) {
      revokeSessions.mutate(user.id, { onError: (cause) => setError(cause.message) });
    }
  }

  return (
    <section className="feature-page users-page">
      <PageHeading eyebrow="ACCESS CONTROL" title="Staff accounts" description="Manage who can sell, handle stock, and administer this pharmacy." action={<button className="button button-primary" onClick={() => { setEditing(null); setError(""); setShowForm(true); }}><Plus size={17} />Add staff</button>} />
      <div className="user-access-note"><ShieldCheck size={18} /><span><strong>Role access is enforced by the API.</strong> Cashiers can process sales. Managers can manage stock and suppliers. Admins can manage staff accounts.</span></div>
      {error && !showForm && <p className="inline-error">{error}</p>}{isError && <p className="inline-error">{queryError.message}</p>}
      <div className="user-summary"><span><Users size={16} />{users.length} staff accounts</span><span><UserRoundCog size={16} />Signed in as {currentUser?.email}</span></div>
      <div className="data-table-wrap"><table className="data-table users-table"><thead><tr><th>Staff member</th><th>Role</th><th>Status</th><th>Added</th><th className="actions-cell">Actions</th></tr></thead><tbody>
        {isLoading ? <tr><td colSpan={5} className="table-message">Loading staff accounts...</td></tr> : users.length === 0 ? <tr><td colSpan={5} className="table-message">No staff accounts found.</td></tr> : users.map((user) => <tr key={user.id}><td><span className="cell-strong">{user.full_name}{user.id === currentUser?.id && <span className="you-tag">YOU</span>}</span><span className="cell-secondary">{user.email}</span></td><td><span className={`role-chip role-${user.role}`}>{user.role}</span></td><td><span className={`account-status ${user.is_active ? "is-active" : "is-disabled"}`}><i />{user.is_active ? "Enabled" : "Disabled"}</span></td><td>{new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(new Date(user.created_at))}</td><td className="actions-cell"><button className="icon-button" title="Edit staff account" aria-label={`Edit ${user.full_name}`} onClick={() => { setEditing(user); setError(""); setShowForm(true); }}><UserRoundCog size={16} /></button><button className="icon-button" title="Sign out all sessions" aria-label={`Revoke sessions for ${user.full_name}`} onClick={() => revoke(user)}><KeyRound size={16} /></button></td></tr>)}
      </tbody></table></div>
      {showForm && <UserForm key={editing?.id ?? "new"} user={editing ?? undefined} busy={create.isPending || update.isPending} error={error} onClose={() => { setShowForm(false); setEditing(null); }} onCreate={saveCreate} onUpdate={saveUpdate} />}
    </section>
  );
}