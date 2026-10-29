import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AGENT_STEPS } from "@vmi/contracts";
import { archiveJob, formatDate, getJob } from "../lib/jobs";
import { useAuth } from "../auth/AuthContext";
import StatusBadge from "../components/StatusBadge";
import { Button } from "../components/Button";
import FileList from "../components/FileList";
import FileUploader from "../components/FileUploader";

export default function JobOverview() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["job", id], queryFn: () => getJob(id) });
  const archive = useMutation({
    mutationFn: () => archiveJob(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["jobs"] });
      navigate("/jobs", { replace: true });
    },
  });

  if (query.isLoading) return <p className="p-8 text-muted">Loading…</p>;
  if (query.isError || !query.data) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Job not found</h1>
        <p className="mt-2 text-muted">
          {(query.error as Error | null)?.message ?? "This job does not exist."}
        </p>
        <Link to="/jobs" className="mt-4 inline-block text-accent hover:underline">
          Back to jobs
        </Link>
      </main>
    );
  }

  const job = query.data;
  const canEdit = !!user && (user.id === job.ownerId || user.role === "admin");
  const c = job.constraints;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Link to="/jobs" className="text-sm text-muted hover:text-ink">
        ← All jobs
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{job.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {job.ownerName} · created {formatDate(job.createdAt)} · revision {job.revision}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <section className="mt-6 rounded-lg border border-line bg-white p-5">
        <h2 className="font-semibold">Goal</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">{job.goal}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Material</dt>
            <dd>{c.material ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Quantity</dt>
            <dd>{c.quantity ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Tolerance</dt>
            <dd>{c.tolerance ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5">
        <h2 className="font-semibold">Files</h2>
        <div className="mt-3 space-y-4">
          {canEdit && (
            <FileUploader
              jobId={job.id}
              onUploaded={() => void qc.invalidateQueries({ queryKey: ["job", id] })}
            />
          )}
          <FileList jobId={job.id} files={job.files} canEdit={canEdit} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5">
        <h2 className="font-semibold">Workflow</h2>
        <ol className="mt-3 space-y-2">
          {AGENT_STEPS.map((s, i) => (
            <li key={s.key} className="flex items-center justify-between text-sm">
              <span>
                {i + 1}. {s.label}
              </span>
              <span className="text-muted">Not started</span>
            </li>
          ))}
        </ol>
      </section>

      {canEdit && (
        <div className="mt-8">
          <Button
            variant="secondary"
            disabled={archive.isPending}
            onClick={() => {
              if (window.confirm("Archive this job? It will disappear from your lists."))
                archive.mutate();
            }}
          >
            Archive job
          </Button>
          {archive.isError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {(archive.error as Error).message}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
