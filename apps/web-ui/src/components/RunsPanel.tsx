import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AGENT_STEPS, type AgentKey, type AgentRun } from "@vmi/contracts";
import { formatDate } from "../lib/jobs";
import { cancelRun, listRuns, runAgent } from "../lib/runs";
import { Button } from "./Button";

const STATUS_STYLE: Record<AgentRun["status"], string> = {
  running: "bg-sky-50 text-sky-700",
  completed: "bg-green-50 text-green-700",
  needs_review: "bg-amber-50 text-amber-800",
  failed: "bg-red-50 text-red-700",
  interrupted: "bg-orange-50 text-orange-800",
  cancelled: "bg-slate-100 text-slate-700",
};
const STATUS_LABEL: Record<AgentRun["status"], string> = {
  running: "Running",
  completed: "Completed",
  needs_review: "Needs review",
  failed: "Failed",
  interrupted: "Interrupted",
  cancelled: "Cancelled",
};

export default function RunsPanel({ jobId, canEdit }: { jobId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const [agent, setAgent] = useState<AgentKey>("understanding");
  const [error, setError] = useState<string | null>(null);

  const runs = useQuery({
    queryKey: ["runs", jobId],
    queryFn: () => listRuns(jobId),
    refetchInterval: (q) =>
      q.state.data?.items.some((r) => r.status === "running") ? 1500 : false,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["runs", jobId] });

  const start = useMutation({
    mutationFn: () => runAgent(jobId, agent),
    onMutate: () => setError(null),
    onError: (e: Error) => setError(e.message),
    onSettled: refresh,
  });
  const cancel = useMutation({ mutationFn: cancelRun, onSettled: refresh });

  const items = runs.data?.items ?? [];

  return (
    <section className="mt-6 rounded-lg border border-line bg-white p-5">
      <h2 className="font-semibold">AI service test (stub agents)</h2>
      <p className="mt-1 text-sm text-muted">
        Stub agents return placeholder output only. Real agents replace them in later tasks.
      </p>

      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            aria-label="Agent"
            value={agent}
            onChange={(e) => setAgent(e.target.value as AgentKey)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            {AGENT_STEPS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <Button type="button" disabled={start.isPending} onClick={() => start.mutate()}>
            {start.isPending ? "Running…" : "Run agent"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="mt-4 divide-y divide-line" data-testid="run-list">
        {items.length === 0 && <li className="py-3 text-sm text-muted">No runs yet.</li>}
        {items.map((r) => (
          <li key={r.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {AGENT_STEPS.find((s) => s.key === r.agent)?.label}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  {formatDate(r.createdAt)}
                  {r.durationMs !== null ? ` · ${r.durationMs} ms` : ""}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}
                >
                  {STATUS_LABEL[r.status]}
                </span>
                {r.status === "running" && canEdit && (
                  <Button variant="secondary" onClick={() => cancel.mutate(r.id)}>
                    Cancel run
                  </Button>
                )}
              </span>
            </div>
            {r.warnings.map((w) => (
              <p key={w} className="mt-1 text-xs text-amber-800">
                {w}
              </p>
            ))}
            {r.errorMessage && <p className="mt-1 text-xs text-danger">{r.errorMessage}</p>}
            {r.output && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-accent">View output</summary>
                <pre className="mt-1 overflow-x-auto rounded bg-paper-dark p-2 text-xs">
                  {JSON.stringify(r.output, null, 2)}
                </pre>
              </details>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
