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
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 flex items-center gap-2 text-sm font-medium">
        {ok !== undefined && <span className={`h-2 w-2 rounded-full ${ok ? "bg-ok" : "bg-danger"}`} />}
        {value}
      </p>
    </div>
  );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{text}</p>
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
      <h1 className="text-2xl font-semibold">Hello, {user?.fullName.split(" ")[0]}</h1>
      {persona && <p className="mt-1 text-sm text-muted">{PERSONA_INFO[persona].focus}</p>}

      {/* Status strip */}
      <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-line bg-white p-4 md:grid-cols-4">
        <StatusItem
          label="Offline status"
          value={health.isError ? "Service unreachable" : h?.offlineReady ? "Offline ready" : "Checking…"}
          ok={health.isError ? false : h?.offlineReady}
        />
        <StatusItem label="Core bundle" value={h?.coreBundleVersion ?? "Not installed yet"} />
        <StatusItem label="Last backup" value={h?.lastBackupAt ? new Date(h.lastBackupAt).toLocaleString() : "No backup yet"} />
        <StatusItem label="Database schema" value={h ? `v${h.schemaVersion}` : "…"} />
      </div>

      {/* Three big buttons */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {ACTIONS.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="rounded-lg border border-line bg-white p-6 transition hover:border-accent hover:shadow-sm"
          >
            <Icon className="h-7 w-7 text-accent" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold">{label}</h2>
            <p className="mt-1 text-sm text-muted">{hint}</p>
          </Link>
        ))}
      </div>

      {/* Recent jobs and review queue (real data arrives with the Jobs phase) */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <EmptyPanel title="Recent jobs" text="No jobs yet. Start with New job to see your work here." />
        <EmptyPanel title="Waiting for your review" text="Nothing needs your review right now." />
      </div>
    </main>
  );
}
