type Row = Record<string, unknown>;

type Props = { title: string; description?: string; columns: string[]; rows: Row[]; empty?: string };

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function heading(column: string) {
  return column.replaceAll("_", " ");
}

export default function UserDataSection({ title, description, columns, rows, empty = "No records found." }: Props) {
  return <section className="explorer-block user-dossier-section"><div className="explorer-head"><div><p className="eyebrow">{title}</p>{description && <p className="muted explorer-description">{description}</p>}</div><span className="badge">{rows.length} {rows.length === 1 ? "record" : "records"}</span></div><div className="table-wrap"><table className="table explorer-table"><thead><tr>{columns.map((column) => <th key={column}>{heading(column)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? row.user_id ?? row.created_at ?? index)}>{columns.map((column) => <td key={column}>{display(row[column])}</td>)}</tr>)}{rows.length === 0 && <tr><td className="muted" colSpan={columns.length}>{empty}</td></tr>}</tbody></table></div></section>;
}
