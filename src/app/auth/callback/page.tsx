"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing secure BINZEO sign-in…");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const returnedState = params.get("state");
        const expectedState = sessionStorage.getItem("binzeo_sso_state");
        const verifier = sessionStorage.getItem("binzeo_sso_verifier");
        const redirectUri = sessionStorage.getItem("binzeo_sso_redirect_uri");
        window.history.replaceState(null, document.title, window.location.pathname);

        if (!code || !returnedState || returnedState !== expectedState || !verifier || !redirectUri || redirectUri !== `${window.location.origin}/auth/callback`) {
          throw new Error("The sign-in response could not be verified. Please start again.");
        }
        sessionStorage.removeItem("binzeo_sso_state");
        sessionStorage.removeItem("binzeo_sso_verifier");
        sessionStorage.removeItem("binzeo_sso_redirect_uri");

        const response = await fetch("/api/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: "admin", redirect_uri: redirectUri, code, code_verifier: verifier }),
          cache: "no-store",
        });
        const result = await response.json();
        const session = result?.data?.session;
        if (!response.ok || !result.success || !session?.access_token || !session?.refresh_token) {
          throw new Error(result.error?.message || "Central sign-in could not be completed.");
        }
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
        if (error) throw new Error("The admin session could not be established. Please sign in again.");
        router.replace("/dashboard");
        router.refresh();
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Sign-in failed. Please start again.");
      }
    })();
    return () => { active = false; };
  }, [router]);

  return <main className="login"><section className="login-card"><div className="brand" style={{ padding: 0, marginBottom: 30 }}><span className="brand-mark">B</span>BINZEO Admin</div><p className="eyebrow">Central identity</p><h1>Secure sign-in</h1><p className="muted" role="status" aria-live="polite">{message}</p><a className="btn sky" href="/login">Return to sign in</a></section></main>;
}
