import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, LockKeyhole, Pill, ShieldCheck } from "lucide-react";
import { useLogin } from "../hooks/useSession";

export function LoginPage() {
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate({ email: email.trim(), password });
  }

  return (
    <main className="auth-stage">
      <section className="auth-intro">
        <div className="auth-brand"><span className="brand-mark"><Pill size={21} /></span><span>pharmacy<span className="brand-light">desk</span></span></div>
        <div className="auth-intro-copy"><p className="eyebrow">PHARMACY OPERATIONS</p><h1>Clarity for every<br />counter shift.</h1><p>Inventory, batches, and sales in one secure workspace.</p></div>
        <div className="auth-intro-footer"><span>PKR</span><span>ASIA / KARACHI</span><span>01 — 03</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-top"><span className="auth-top-mark">PD</span><span>STAFF ACCESS</span></div>
        <div className="login-content">
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Sign in to continue</h2>
          <p className="login-description">Use the account provided by your pharmacy administrator.</p>
          <form className="login-form" onSubmit={submit}>
            <label className="field"><span>Email address</span><input type="email" autoComplete="username" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@pharmacy.com" /></label>
            <label className="field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>
            {login.isError && <p className="login-error">{login.error.message.includes("Request failed") ? "Unable to sign in. Check your details and try again." : login.error.message}</p>}
            <button className="login-submit" type="submit" disabled={login.isPending}>{login.isPending ? "Signing in..." : <>Sign in <ArrowUpRight size={17} /></>}</button>
          </form>
          <div className="login-session-note"><ShieldCheck size={16} /><span>This device stays signed in with a rotating secure session.</span></div>
          <div className="login-lock-note"><LockKeyhole size={14} /><span>Accounts lock briefly after repeated failed attempts.</span></div>
        </div>
        <footer className="auth-panel-footer"><span>PHARMACY DESK</span><span>SECURE WORKSPACE</span></footer>
      </section>
    </main>
  );
}