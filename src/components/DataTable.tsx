"use client";
import { useMemo, useState } from "react";

type Row = Record<string, unknown>;
type Props = { title: string; description: string; columns: string[]; rows: Row[]; sensitive?: boolean };

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function DataTable({ title, description, columns, rows, sensitive = false }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(row => columns.some(column => display(row[column]).toLowerCase().includes(needle)));
  }, [columns, query, rows]);
  return <section className="explorer-block"><div className="explorer-head"><div><p className="eyebrow">{title}</p><p className="muted explorer-description">{description}</p></div><div className="explorer-tools"><span className="badge">{filtered.length}/{rows.length} rows</span>{rows.length > 0 && <input className="input explorer-search" placeholder="Filter this table…" value={query} onChange={e => setQuery(e.target.value)} />}</div></div>{sensitive ? <div className="protected-note"><strong>Protected table</strong><span>Challenge hashes and private verification material are intentionally not exposed in the admin UI.</span></div> : <div className="table-wrap"><table className="table explorer-table"><thead><tr>{columns.map(column => <th key={column}>{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{filtered.map((row, index) => <tr key={String(row.id ?? row.user_id ?? row.sector_id ?? index)}>{columns.map(column => <td key={column}>{display(row[column])}</td>)}</tr>)}{filtered.length === 0 && <tr><td className="muted" colSpan={columns.length}>No matching records.</td></tr>}</tbody></table></div>}</section>;
}
