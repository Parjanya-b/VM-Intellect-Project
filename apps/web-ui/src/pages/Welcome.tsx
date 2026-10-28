import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PERSONAS, type HealthResponse, type Persona } from "@vmi/contracts";
import { api } from "../lib/api";
import { PERSONA_INFO, savePersona } from "../lib/persona";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const health = useQuery({ queryKey: ["health"], queryFn: () => api<HealthResponse>("/system/health") });

  function choose(p: Persona) {
    savePersona(p);
    if (user) return navigate("/dashboard"); // already signed in: just changing view
    navigate(health.data?.hasUsers ? "/signin" : "/signup");
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">VM Intellect</p>
      <h1 className="mt-2 text-3xl font-semibold">Welcome. Who is using VM Intellect today?</h1>
      <p className="mt-2 max-w-2xl text-muted">
        This only changes how screens are arranged and how much explanation you see. It never changes what you
        are allowed to do.
      </p>

      {health.isError && (
        <div
          role="alert"
          className="mt-6 rounded-md border border-danger/30 bg-red-50 p-4 text-sm text-danger"
        >
          {(health.error as Error).message}
          <Button variant="secondary" className="ml-4" onClick={() => health.refetch()}>
            Retry
          </Button>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PERSONAS.map((p) => {
          const info = PERSONA_INFO[p];
          const Icon = info.icon;
          return (
            <button
              key={p}
              disabled={health.isLoading || health.isError}
              onClick={() => choose(p)}
              className="rounded-lg border border-line bg-white p-5 text-left transition hover:border-accent hover:shadow-sm
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
            >
              <Icon className="h-6 w-6 text-accent" aria-hidden />
              <h2 className="mt-3 font-semibold">I am a {info.label}</h2>
              <p className="mt-1 text-sm text-muted">{info.blurb}</p>
            </button>
          );
        })}
      </div>
    </main>
  );
}
