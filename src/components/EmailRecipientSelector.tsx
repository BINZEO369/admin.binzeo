"use client";

import { useMemo, useState } from "react";

export type EmailRecipient = {
  id: string;
  email: string | null;
  display_name: string | null;
  profile_photo_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  binzeo_user_id?: string | null;
  date_of_birth?: string | null;
  birth_date?: string | null;
  age?: number | null;
  country_code?: string | null;
  preferred_language?: string | null;
  created_at?: string | null;
};

type Props = {
  users: EmailRecipient[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  disabled?: boolean;
};

function ageOf(user: EmailRecipient): number | null {
  if (typeof user.age === "number" && Number.isFinite(user.age)) return user.age;
  const dob = user.date_of_birth ?? user.birth_date;
  if (!dob) return null;
  const [year, month, day] = dob.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - year;
  if (today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)) age -= 1;
  return age >= 0 ? age : null;
}

function countryLabel(code: string) {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

export default function EmailRecipientSelector({ users, selectedIds, onSelectedIdsChange, disabled = false }: Props) {
  const [search, setSearch] = useState("");
  const [minimumAge, setMinimumAge] = useState("");
  const [maximumAge, setMaximumAge] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [language, setLanguage] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");

  const countries = useMemo(() => [...new Set(users.map((user) => user.country_code?.trim().toUpperCase()).filter((code): code is string => Boolean(code)))].sort(), [users]);
  const languages = useMemo(() => [...new Set(users.map((user) => user.preferred_language?.trim().toLowerCase()).filter((value): value is string => Boolean(value)))].sort(), [users]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const min = minimumAge === "" ? null : Number(minimumAge);
    const max = maximumAge === "" ? null : Number(maximumAge);
    return users.filter((user) => {
      const haystack = `${user.display_name ?? ""} ${user.first_name ?? ""} ${user.last_name ?? ""} ${user.email ?? ""} ${user.binzeo_user_id ?? ""}`.toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (countryCode && user.country_code?.trim().toUpperCase() !== countryCode) return false;
      if (language && user.preferred_language?.trim().toLowerCase() !== language) return false;
      const age = ageOf(user);
      if (min !== null && (!Number.isFinite(min) || age === null || age < min)) return false;
      if (max !== null && (!Number.isFinite(max) || age === null || age > max)) return false;
      const joined = user.created_at?.slice(0, 10) ?? "";
      if (createdFrom && (!joined || joined < createdFrom)) return false;
      if (createdTo && (!joined || joined > createdTo)) return false;
      return true;
    }).sort((a, b) => {
      const left = (a.display_name || `${a.first_name ?? ""} ${a.last_name ?? ""}` || a.email || "").trim().toLocaleLowerCase();
      const right = (b.display_name || `${b.first_name ?? ""} ${b.last_name ?? ""}` || b.email || "").trim().toLocaleLowerCase();
      return left.localeCompare(right) * (sort === "asc" ? 1 : -1);
    });
  }, [users, search, minimumAge, maximumAge, countryCode, language, createdFrom, createdTo, sort]);

  const sendableFilteredIds = filtered.filter((user) => Boolean(user.email)).map((user) => user.id);
  const sendableAllIds = users.filter((user) => Boolean(user.email)).map((user) => user.id);
  const toggle = (id: string) => onSelectedIdsChange(selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);

  return (
    <div className="audience-selector">
      <div className="audience-filter-grid">
        <label className="field-label audience-search">Search<input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email or BINZEO ID" /></label>
        <label className="field-label">Minimum age<input className="input" type="number" min="0" max="120" inputMode="numeric" value={minimumAge} onChange={(event) => setMinimumAge(event.target.value)} placeholder="Any" /></label>
        <label className="field-label">Maximum age<input className="input" type="number" min="0" max="120" inputMode="numeric" value={maximumAge} onChange={(event) => setMaximumAge(event.target.value)} placeholder="Any" /></label>
        <label className="field-label">Country<select className="input" value={countryCode} onChange={(event) => setCountryCode(event.target.value)}><option value="">All countries</option>{countries.map((code) => <option value={code} key={code}>{countryLabel(code)}</option>)}</select></label>
        <label className="field-label">Preferred language<select className="input" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="">All languages</option>{languages.map((value) => <option value={value} key={value}>{value.toUpperCase()}</option>)}</select></label>
        <label className="field-label">Joined from<input className="input" type="date" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} /></label>
        <label className="field-label">Joined through<input className="input" type="date" value={createdTo} onChange={(event) => setCreatedTo(event.target.value)} /></label>
        <label className="field-label">Name order<select className="input" value={sort} onChange={(event) => setSort(event.target.value as "asc" | "desc")}><option value="asc">A–Z</option><option value="desc">Z–A</option></select></label>
      </div>
      <div className="audience-selection-toolbar">
        <span className="muted">{filtered.length} match · {selectedIds.length} selected · {users.length} eligible</span>
        <div className="actions audience-selection-actions">
          <button className="btn light" type="button" disabled={disabled || !sendableFilteredIds.length} onClick={() => onSelectedIdsChange(sendableFilteredIds)}>Select filtered</button>
          <button className="btn light" type="button" disabled={disabled || !sendableFilteredIds.length} onClick={() => onSelectedIdsChange([...new Set([...selectedIds, ...sendableFilteredIds])])}>Add filtered</button>
          <button className="btn light" type="button" disabled={disabled || !sendableAllIds.length} onClick={() => onSelectedIdsChange(sendableAllIds)}>Select all eligible</button>
          <button className="btn light" type="button" disabled={disabled || !selectedIds.length} onClick={() => onSelectedIdsChange([])}>Clear</button>
        </div>
      </div>
      <div className="audience-user-list" aria-label="Eligible email recipients">
        {filtered.map((user) => {
          const age = ageOf(user);
          const label = user.display_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unnamed user";
          return <label className="audience-user-row" key={user.id}>
            <input type="checkbox" checked={selectedIds.includes(user.id)} disabled={disabled || !user.email} onChange={() => toggle(user.id)} />
            <span className="audience-user-copy"><strong>{label}</strong><span>{user.email || "No deliverable email"}{age !== null ? ` · Age ${age}` : " · Age not set"}{user.country_code ? ` · ${user.country_code.toUpperCase()}` : " · Country not set"}</span></span>
          </label>;
        })}
        {!filtered.length && <p className="muted">No eligible users match these filters.</p>}
      </div>
      <p className="muted audience-consent-note">Only active profiles with marketing email permission and a deliverable email are eligible. Age/country/language filters narrow this list; selecting everyone still respects consent on the server.</p>
    </div>
  );
}
