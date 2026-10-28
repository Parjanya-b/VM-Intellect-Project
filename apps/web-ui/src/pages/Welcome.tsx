import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PERSONAS, type HealthResponse, type Persona } from "@vmi/contracts";
import { api } from "../lib/api";
import { PERSONA_INFO, savePersona } from "../lib/persona";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { BrandLogo } from "../components/BrandLogo";
import { SectionHeader } from "../components/SectionHeader";

const PERSONA_DISPLAY: Record<string, { title: string; bullets: string[]; color: string }> = {
  student: {
    title: "Students / Learners",
    color: "#3B82F6",
    bullets: ["Fundamentals and theory", "G-code explainers", "Formula and feed breakdowns"],
  },
  technician: {
    title: "Technicians / Operators",
    color: "#0D9488",
    bullets: ["Tool setup and offsets", "Setup sheets", "Speed and feed quick calcs"],
  },
  engineer: {
    title: "Engineers / CAM",
    color: "#16A34A",
    bullets: ["Process planning and GD&T", "Plan review and approval", "Strategy guidance"],
  },
  manufacturer: {
    title: "Plant Managers",
    color: "#D97706",
    bullets: ["Cycle time and cost", "Job history", "Reports"],
  },
  researcher: {
    title: "R&D / Metallurgists",
    color: "#7C3AED",
    bullets: ["Material machinability", "Evidence and sources", "Data export"],
  },
};

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const health = useQuery({ queryKey: ["health"], queryFn: () => api<HealthResponse>("/system/health") });

  function choose(p: Persona) {
    savePersona(p);
    if (user) return navigate("/dashboard");
    navigate(health.data?.hasUsers ? "/signin" : "/signup");
  }

  return (
    <div>
      {/* Global top strip */}
      <div className="top-strip">
        VM INTELLECT&nbsp;&nbsp;·&nbsp;&nbsp;Local-First · works offline
      </div>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Hero card */}
        <div className="card mb-8" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            <BrandLogo variant="lockup" size={160} />
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0B2A5C", marginTop: "1rem" }}>
            Welcome. Who is using VM Intellect today?
          </h1>
          <p className="mt-2" style={{ color: "#64748b", fontSize: "14px", maxWidth: "480px", margin: "0.5rem auto 0" }}>
            This only changes how screens are arranged and how much explanation you see.
            It never changes what you are allowed to do.
          </p>
          {/* Version pill */}
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
            <span style={{
              background: "#D6E6F8",
              color: "#0B2A5C",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              padding: "2px 10px",
              borderRadius: "999px",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}>
              v0.1 · Local-First
            </span>
          </div>
        </div>

        {health.isError && (
          <div role="alert" className="mb-6 rounded-xl border border-danger/30 bg-red-50 p-4 text-sm text-danger">
            {(health.error as Error).message}
            <Button variant="secondary" className="ml-4" onClick={() => health.refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Step 1 panel */}
        <div className="card">
          <div style={{ background: "linear-gradient(90deg, #0B2A5C, #6FA8E6)", height: "3px", borderRadius: "2px 2px 0 0", margin: "-1.5rem -1.5rem 1.5rem" }} />
          <SectionHeader label="Step 1: Who are you?" caption="Choose your role to personalise the view" />

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "1rem",
          }}>
            {PERSONAS.map((p) => {
              const info = PERSONA_INFO[p];
              const display = PERSONA_DISPLAY[p];
              const Icon = info.icon;
              return (
                <button
                  key={p}
                  aria-label={`I am a ${info.label}`}
                  disabled={health.isLoading || health.isError}
                  onClick={() => choose(p)}
                  style={{
                    background: "#ffffff",
                    border: `2px solid #CBD5E1`,
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50 hover:shadow-md"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = display.color;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 3px ${display.color}22`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#CBD5E1";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
                  }}
                >
                  <Icon
                    className="h-5 w-5"
                    aria-hidden
                    style={{ color: display.color }}
                  />
                  <h2 style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: display.color,
                    margin: 0,
                  }}>
                    {display.title}
                  </h2>
                  <ul style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}>
                    {display.bullets.map((b) => (
                      <li key={b} style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "flex-start", gap: "4px" }}>
                        <span style={{ color: display.color, marginTop: "1px", flexShrink: 0 }}>›</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Amber note */}
          <div style={{
            marginTop: "1.25rem",
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: "0.5rem",
            padding: "0.75rem 1rem",
            fontSize: "13px",
            color: "#92400E",
          }}>
            <strong>Note:</strong> The persona only changes what you see first. Permissions are separate: the first account is Admin.
          </div>
        </div>
      </main>
    </div>
  );
}
