"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return <main className="login"><section className="login-card"><div className="brand" style={{ padding: 0, marginBottom: 30 }}><span className="brand-mark">B</span>BINZEO Admin</div><p className="eyebrow">Private console</p><h1>Sign in securely</h1><p className="muted">Use an active BINZEO admin account to continue.</p>{error && <p className="error">{error}</p>}<form className="form-grid" onSubmit={submit}><label>Email<input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Password<input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label><button className="btn sky" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form></section></main>;
}
