import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { DATA_TABLES } from "@/lib/data-tables";

/* ---------- design tokens (monochrome) ---------- */
const T = {
  black: "#0A0A0A",
  ink: "#171717",
  muted: "#737373",
  faint: "#A3A3A3",
  line: "#E5E5E5",
  soft: "#F5F5F5",
  surface: "#FFFFFF",
  canvas: "#FAFAFA",
};

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ---------- Stat card ---------- */
function StatCard({
  label,
  value,
  detail,
  index,
}: {
  label: string;
  value: number;
  detail: string;
  index: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 16,
        padding: "22px 22px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        minHeight: 172,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: T.muted,
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: T.faint,
            border: `1px solid ${T.line}`,
            borderRadius: 999,
            padding: "2px 8px",
          }}
        >
          {String(index).padStart(2, "0")}
        </span>
      </div>

      <div
        style={{
          fontSize: 46,
          lineHeight: 1,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: T.black,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value.toLocaleString()}
      </div>

      <div
        style={{
          marginTop: "auto",
          paddingTop: 14,
          borderTop: `1px solid ${T.line}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12.5,
          color: T.muted,
        }}
      >
        <span
          className="bz-pulse"
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: T.black,
            flexShrink: 0,
          }}
        />
        {detail}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default async function Dashboard() {
  await requireAdmin();
  const db = await createClient();

  const names = [
    "profiles",
    "user_login_history",
    "user_activity_logs",
    "admin_activity_logs",
  ] as const;

  const counts = await Promise.all(
    names.map(async (table) => {
      const { count } = await db
        .from(table)
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    })
  );

  const stats = [
    { label: "Users", value: counts[0], detail: "Profiles in the directory" },
    { label: "Login events", value: counts[1], detail: "Authentication records" },
    { label: "User activity", value: counts[2], detail: "Account activity logs" },
    { label: "Admin audit", value: counts[3], detail: "Administrative actions" },
  ];

  const total = counts.reduce((a, b) => a + b, 0);
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      style={{
        background: T.canvas,
        minHeight: "100%",
        padding: "40px clamp(20px, 4vw, 56px) 80px",
        color: T.ink,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif',
      }}
    >
      <style>{`
        .bz-card { transition: transform .22s cubic-bezier(.2,.7,.2,1), border-color .22s ease, box-shadow .22s ease; }
        .bz-card:hover { transform: translateY(-3px); border-color: ${T.black}; box-shadow: 0 18px 40px -22px rgba(0,0,0,.28); }
        .bz-card:hover .bz-arrow { transform: translateX(5px); }
        .bz-arrow { transition: transform .22s ease; display:inline-block; }
        .bz-pulse { animation: bzPulse 2.2s ease-in-out infinite; }
        @keyframes bzPulse { 0%,100%{opacity:1} 50%{opacity:.28} }
        @media (max-width: 960px){ .bz-stat-grid{grid-template-columns:repeat(2,1fr) !important;} }
        @media (max-width: 640px){ .bz-stat-grid{grid-template-columns:1fr !important;} .bz-table-grid{grid-template-columns:1fr !important;} }
      `}</style>

      {/* ============ HERO ============ */}
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingBottom: 32,
          borderBottom: `1px solid ${T.line}`,
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: T.black,
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              B
            </span>
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: T.muted,
                fontWeight: 600,
              }}
            >
              Control room · Overview
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(30px, 4vw, 44px)",
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: T.black,
              margin: 0,
            }}
          >
            {greeting()}, BINZEO.
          </h1>

          <p
            style={{
              marginTop: 14,
              fontSize: 15.5,
              lineHeight: 1.6,
              color: T.muted,
              maxWidth: 520,
            }}
          >
            A clear, real-time view of your users, activity and shared database —
            everything in one protected workspace.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              color: T.black,
              border: `1px solid ${T.black}`,
              borderRadius: 999,
              padding: "7px 14px",
              background: "#fff",
            }}
          >
            <span
              className="bz-pulse"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: T.black,
              }}
            />
            Protected workspace
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 12,
              color: T.faint,
              letterSpacing: "0.02em",
            }}
          >
            {dateLabel}
          </span>
        </div>
      </header>

      {/* ============ STATS ============ */}
      <section style={{ marginTop: 36 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 13,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: T.muted,
            }}
          >
            Metrics
          </h2>
          <span style={{ fontFamily: MONO, fontSize: 12, color: T.faint }}>
            {total.toLocaleString()} total records
          </span>
        </div>

        <div
          className="bz-stat-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          {stats.map((s, i) => (
            <StatCard
              key={s.label}
              index={i + 1}
              label={s.label}
              value={s.value}
              detail={s.detail}
            />
          ))}
        </div>
      </section>

      {/* ============ TABLE DIRECTORY ============ */}
      <section style={{ marginTop: 56 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 22,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: T.muted,
                fontWeight: 600,
              }}
            >
              Shared database
            </p>
            <h2
              style={{
                margin: "8px 0 6px",
                fontSize: "clamp(24px, 3vw, 32px)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: T.black,
              }}
            >
              Explore every table
            </h2>
            <p style={{ margin: 0, fontSize: 14.5, color: T.muted }}>
              Open a section to inspect its complete records and fields.
            </p>
          </div>

          <span
            style={{
              fontFamily: MONO,
              fontSize: 12,
              color: T.ink,
              border: `1px solid ${T.line}`,
              background: "#fff",
              borderRadius: 999,
              padding: "7px 14px",
            }}
          >
            {DATA_TABLES.length} tables
          </span>
        </div>

        <div
          className="bz-table-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {DATA_TABLES.map((item) => (
            <Link
              key={item.slug}
              href={`/dashboard/${item.slug}`}
              className="bz-card"
              style={{
                background: T.surface,
                border: `1px solid ${T.line}`,
                borderRadius: 16,
                padding: 22,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                textDecoration: "none",
                color: "inherit",
                minHeight: 210,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: T.black,
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {item.title.slice(0, 1).toUpperCase()}
                </span>

                <span
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: item.sensitive ? "#fff" : T.black,
                    background: item.sensitive ? T.black : "#fff",
                    border: `1px solid ${T.black}`,
                    borderRadius: 999,
                    padding: "4px 10px",
                  }}
                >
                  {item.sensitive ? "Protected" : "Available"}
                </span>
              </div>

              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: 18,
                  fontWeight: 650,
                  letterSpacing: "-0.02em",
                  color: T.black,
                }}
              >
                {item.title}
              </h3>

              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: T.muted,
                  flexGrow: 1,
                }}
              >
                {item.description}
              </p>

              <span
                style={{
                  paddingTop: 14,
                  borderTop: `1px solid ${T.line}`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.black,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Open section
                <span className="bz-arrow">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer
        style={{
          marginTop: 64,
          paddingTop: 24,
          borderTop: `1px solid ${T.line}`,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: MONO,
          fontSize: 11.5,
          color: T.faint,
          letterSpacing: "0.04em",
        }}
      >
        <span>BINZEO ADMIN CONSOLE — v1.0</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            className="bz-pulse"
            style={{ width: 6, height: 6, borderRadius: 999, background: T.black }}
          />
          SYSTEM OPERATIONAL
        </span>
      </footer>
    </div>
  );
}
