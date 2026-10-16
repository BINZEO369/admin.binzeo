"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Central sign-out failed. Please retry.");
      router.replace("/login");
      router.refresh();
    } catch {
      router.replace("/login?error=central_unavailable");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <button className="btn light" type="button" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>;
}
