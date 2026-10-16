"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type ApiResponse = {
  success?: boolean;
  data?: { requires_two_factor?: boolean; challenge_id?: string };
  error?: { message?: string };
};

function responseError(payload: ApiResponse, fallback: string) {
  return payload.error?.message || fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function verifyAdminAccess() {
    const response = await fetch("/api/admin/me", { method: "GET", cache: "no-store" });
    if (!response.ok) {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      throw new Error("This account does not have active BINZEO admin access.");
    }
    const result = await response.json() as ApiResponse;
    if (result.success !== true) {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      throw new Error("This account does not have active BINZEO admin access.");
    }
    router.replace("/dashboard");
    router.refresh();
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as ApiResponse;
      setPassword("");
      if (!response.ok || result.success !== true) {
        setError(responseError(result, "Central sign-in failed."));
        return;
      }
      if (result.data?.requires_two_factor) {
        setChallengeId(result.data.challenge_id ?? "");
        return;
      }
      await verifyAdminAccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Central sign-in is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId, code }),
      });
      const result = await response.json() as ApiResponse;
      if (!response.ok || result.success !== true) {
        setError(responseError(result, "Two-factor verification failed."));
        return;
      }
      await verifyAdminAccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Central sign-in is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <section className="login-card">
        <div className="brand" style={{ padding: 0, marginBottom: 30 }}><span className="brand-mark">B</span>BINZEO Admin</div>
        <p className="eyebrow">Private console · Central identity</p>
        <h1>{challengeId ? "Verify your sign-in" : "Sign in securely"}</h1>
        <p className="muted">{challengeId ? "Enter the 6-digit code sent to your email." : "Use an active BINZEO admin account. Identity and sign-in are handled by the Central API."}</p>
        {error && <p className="error" role="alert">{error}</p>}
        {challengeId ? (
          <form className="form-grid" onSubmit={submitTwoFactor}>
            <label>6-digit code<input className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></label>
            <button className="btn sky" disabled={loading || code.length !== 6}>{loading ? "Verifying…" : "Verify and continue"}</button>
            <button className="btn light" type="button" disabled={loading} onClick={() => { setChallengeId(""); setCode(""); setError(""); }}>Back to sign in</button>
          </form>
        ) : (
          <form className="form-grid" onSubmit={submitPassword}>
            <label>Email<input className="input" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<input className="input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button className="btn sky" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
