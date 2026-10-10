"use client";
import { useMemo, useState } from "react";

type Row = Record<string, unknown>;
type Props = {
  title: string;
  description: string;
  columns: string[];
  rows: Row[];
  sensitive?: boolean;
  page?: number;
  pageCount?: number;
  totalCount?: number;
};

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function label(column: string) {
  return column.replaceAll("_", " ");
}

export default function DataTable({
  title,
  description,
  columns,
  rows,
  sensitive = false,
  page,
  pageCount,
  totalCount,
}: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      columns.some((column) => display(row[column]).toLowerCase().includes(needle)),
    );
  }, [columns, query, rows]);

  return (
    <section className="explorer-block">
      <div className="explorer-head">
        <div>
          <p className="eyebrow">{title}</p>
          <p className="muted explorer-description">{description}</p>
        </div>
        <div className="explorer-tools">
          <span className="badge">
            {filtered.length}/{totalCount ?? rows.length} rows
            {pageCount && pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
          </span>
          {rows.length > 0 && (
            <input
              className="input explorer-search"
              placeholder="Filter loaded records…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
        </div>
      </div>
      {sensitive && (
        <p className="muted" style={{ margin: "0 0 14px" }}>
          Security note: secret hashes, private keys and raw authentication codes are intentionally excluded; lifecycle and audit metadata remain visible.
        </p>
      )}
      <div className="table-wrap">
        <table className="table explorer-table">
          <thead>
            <tr>{columns.map((column) => <th key={column}>{label(column)}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={String(row.id ?? row.user_id ?? row.sector_id ?? index)}>
                {columns.map((column) => <td key={column}>{display(row[column])}</td>)}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className="muted" colSpan={Math.max(columns.length, 1)}>No matching records.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
