"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const CENTRAL_AUTH_ENABLED = process.env.NEXT_PUBLIC_CENTRAL_API_ENABLED === "true";

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export default function LoginPage() {
  const started = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!CENTRAL_AUTH_ENABLED || started.current) return;
    started.current = true;
    void (async () => {
      try {
        const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
        const challenge = base64Url(new Uint8Array(digest));
        const state = base64Url(crypto.getRandomValues(new Uint8Array(32)));
        const redirectUri = `${window.location.origin}/auth/callback`;
        sessionStorage.setItem("binzeo_sso_verifier", verifier);
        sessionStorage.setItem("binzeo_sso_state", state);
        sessionStorage.setItem("binzeo_sso_redirect_uri", redirectUri);
        const authUrl = process.env.NEXT_PUBLIC_AUTH_APP_URL || "https://auth-binzeo.vercel.app";
        const authorize = new URL("/sso/authorize", authUrl);
        authorize.searchParams.set("client_id", "admin");
        authorize.searchParams.set("redirect_uri", redirectUri);
        authorize.searchParams.set("state", state);
        authorize.searchParams.set("code_challenge", challenge);
        window.location.replace(authorize.toString());
      } catch {
        setError("Central sign-in could not be started. Please refresh or contact your administrator.");
        started.current = false;
      }
    })();
  }, []);

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
    window.location.assign("/dashboard");
  }

  if (CENTRAL_AUTH_ENABLED) {
    return <main className="login"><section className="login-card"><div className="brand" style={{ padding: 0, marginBottom: 30 }}><span className="brand-mark">B</span>BINZEO Admin</div><p className="eyebrow">Central identity</p><h1>Secure sign-in</h1><p className="muted">Redirecting to BINZEO Identity…</p>{error && <p className="error" role="alert">{error}</p>}</section></main>;
  }

  return <main className="login"><section className="login-card"><div className="brand" style={{ padding: 0, marginBottom: 30 }}><span className="brand-mark">B</span>BINZEO Admin</div><p className="eyebrow">Private console</p><h1>Sign in securely</h1><p className="muted">Use an active BINZEO admin account to continue.</p>{error && <p className="error" role="alert">{error}</p>}<form className="form-grid" onSubmit={submit}><label>Email<input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Password<input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label><button className="btn sky" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form></section></main>;
}
