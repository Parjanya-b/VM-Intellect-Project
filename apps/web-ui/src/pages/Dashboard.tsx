import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FilePlus2, MessageCircleQuestion } from "lucide-react";
import type { HealthResponse } from "@vmi/contracts";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { getPersona, PERSONA_INFO } from "../lib/persona";

const ACTIONS = [
  { to: "/ask", label: "Ask a question", hint: "Quick, source-linked answer. No files needed.", icon: MessageCircleQuestion },
  { to: "/jobs/new", label: "New job", hint: "Upload a drawing and run the full workflow.", icon: FilePlus2 },
  { to: "/knowledge", label: "Knowledge", hint: "Browse machines, materials, tools and guides.", icon: BookOpen },
];

function StatusItem({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div>
      <p className="font-mono" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>{label}</p>
      <p className="mt-0.5 flex items-center gap-2 text-sm font-medium" style={{ color: "#0B2A5C" }}>
        {ok !== undefined && (
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: ok ? "#15803d" : "#b91c1c",
              flexShrink: 0,
            }}
          />
        )}
        {value}
      </p>
    </div>
  );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <section className="card">
      <h2 className="font-semibold" style={{ color: "#0B2A5C", fontSize: "15px", marginBottom: "0.5rem" }}>{title}</h2>
      <p className="text-sm" style={{ color: "#64748b" }}>{text}</p>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const persona = getPersona();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<HealthResponse>("/system/health"),
    refetchInterval: 30_000,
  });
  const h = health.data;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold" style={{ color: "#0B2A5C" }}>Hello, {user?.fullName.split(" ")[0]}</h1>
      {persona && <p className="mt-1 text-sm" style={{ color: "#64748b" }}>{PERSONA_INFO[persona].focus}</p>}

      {/* Status strip */}
      <div className="card mt-6" style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem" }}>
          <StatusItem
            label="Offline status"
            value={health.isError ? "Service unreachable" : h?.offlineReady ? "Offline ready" : "Checking…"}
            ok={health.isError ? false : h?.offlineReady}
          />
          <StatusItem label="Core bundle" value={h?.coreBundleVersion ?? "Not installed yet"} />
          <StatusItem label="Last backup" value={h?.lastBackupAt ? new Date(h.lastBackupAt).toLocaleString() : "No backup yet"} />
          <StatusItem label="Database schema" value={h ? `v${h.schemaVersion}` : "…"} />
        </div>
      </div>

      {/* Three big action cards */}
      <div className="mt-6" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {ACTIONS.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="card"
            style={{
              display: "block",
              textDecoration: "none",
              transition: "transform 0.15s, box-shadow 0.15s",
              padding: "1.5rem",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 16px rgba(11, 42, 92, 0.12)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "";
            }}
          >
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "#EEF5FC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "0.75rem",
            }}>
              <Icon style={{ width: "22px", height: "22px", color: "#0B2A5C" }} aria-hidden />
            </div>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0B2A5C", margin: "0 0 0.25rem" }}>{label}</h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>{hint}</p>
          </Link>
        ))}
      </div>

      {/* Recent jobs and review queue */}
      <div className="mt-6" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        <EmptyPanel title="Recent jobs" text="No jobs yet. Start with New job to see your work here." />
        <EmptyPanel title="Waiting for your review" text="Nothing needs your review right now." />
      </div>
    </main>
  );
}
