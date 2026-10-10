"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";

type User = { id: string; binzeo_user_id: string | null; display_name: string | null; username: string | null; profile_photo_url: string | null; country_code: string | null; preferred_language: string | null; created_at: string; };

export default function ActiveUsers({ users }: { users: User[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => `${user.display_name ?? ""} ${user.username ?? ""} ${user.binzeo_user_id ?? ""} ${user.country_code ?? ""}`.toLowerCase().includes(needle));
  }, [query, users]);
  return <>
    <div className="explorer-head"><div><span className="badge good">{users.length} active accounts</span><p className="muted explorer-description">Verified active profiles from the shared user database.</p></div><input className="input explorer-search" placeholder="Search active users" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <div className="active-users-grid">{filtered.map((user) => <Link className="account-card" href={`/dashboard/users/${user.id}`} key={user.id}>
      {user.profile_photo_url ? <img className="account-avatar" src={user.profile_photo_url} alt="" /> : <span className="account-avatar account-avatar-fallback">{(user.display_name || user.username || "U").slice(0, 1).toUpperCase()}</span>}
      <div className="account-card-body"><div className="account-card-top"><div><h3>{user.display_name || user.username || "Unnamed user"}</h3><p className="muted">@{user.username || "no-username"}</p></div><span className="badge good">active</span></div><div className="account-meta"><span>{user.binzeo_user_id || "No BINZEO ID"}</span><span>{user.country_code || "—"}</span></div><p className="account-card-link">View account →</p></div>
    </Link>)}{filtered.length === 0 && <p className="muted">No active users match your search.</p>}</div>
  </>;
}
