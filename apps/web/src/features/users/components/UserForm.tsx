import type { FormEvent } from "react";
import type { User, UserCreateInput, UserRole, UserUpdateInput } from "@pharmacy/contracts";
import { Modal } from "../../../shared/components/Modal";

type UserFormProps = {
  user?: User;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onCreate: (input: UserCreateInput) => void;
  onUpdate: (input: UserUpdateInput) => void;
};

export function UserForm({ user, busy, error, onClose, onCreate, onUpdate }: UserFormProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const fullName = String(values.get("full_name")).trim();
    const password = String(values.get("password"));
    const role = String(values.get("role")) as UserRole;
    if (user) {
      onUpdate({
        full_name: fullName,
        role,
        is_active: values.get("is_active") === "on",
        ...(password ? { password } : {}),
      });
    } else {
      onCreate({
        email: String(values.get("email")).trim(),
        full_name: fullName,
        password,
        role,
      });
    }
  }

  return (
    <Modal title={user ? "Edit staff account" : "Add staff account"} onClose={onClose}>
      <form className="form-body" onSubmit={submit}>
        {!user && <label className="field"><span>Email address *</span><input name="email" type="email" required autoFocus autoComplete="off" placeholder="staff@pharmacy.com" /></label>}
        <label className="field"><span>Full name *</span><input name="full_name" required minLength={1} autoFocus={Boolean(user)} defaultValue={user?.full_name ?? ""} /></label>
        {!user && <label className="field"><span>Temporary password *</span><input name="password" type="password" required minLength={12} autoComplete="new-password" /><small>At least 12 characters. Share it with the staff member securely.</small></label>}
        {user && <label className="field"><span>Reset password <small>leave blank to keep current</small></span><input name="password" type="password" minLength={12} autoComplete="new-password" /></label>}
        <label className="field"><span>Role *</span><select name="role" defaultValue={user?.role ?? "cashier"}><option value="cashier">Cashier · sales only</option><option value="manager">Manager · stock and suppliers</option><option value="admin">Admin · user access</option></select></label>
        {user && <label className="user-active-toggle"><input type="checkbox" name="is_active" defaultChecked={user.is_active} /><span>Account enabled</span></label>}
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving..." : user ? "Save account" : "Create account"}</button></div>
      </form>
    </Modal>
  );
}