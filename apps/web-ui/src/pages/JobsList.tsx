import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { JOB_STATUSES, type JobStatus } from "@vmi/contracts";
import { formatDate, listJobs, STATUS_LABEL } from "../lib/jobs";
import StatusBadge from "../components/StatusBadge";
import { Button } from "../components/Button";

const PAGE_SIZE = 20;

export default function JobsList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<JobStatus | "">("");
  const [page, setPage] = useState(0);
  const deferredQ = useDeferredValue(q);

  const query = useQuery({
    queryKey: ["jobs", { q: deferredQ, status, page }],
    queryFn: () => listJobs({ q: deferredQ, status, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const filtered = deferredQ !== "" || status !== "";
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <Link to="/jobs/new">
          <Button type="button">New job</Button>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          aria-label="Search jobs"
          placeholder="Search title or goal"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          className="w-72 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as JobStatus | "");
            setPage(0);
          }}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {query.isError && (
        <p role="alert" className="mt-6 text-sm text-danger">
          {(query.error as Error).message}
        </p>
      )}

      <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-white">
        {items.map((job) => (
          <li key={job.id}>
            <Link
              to={`/jobs/${job.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper-dark"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{job.title}</p>
                <p className="truncate text-sm text-muted">
                  {job.ownerName} · updated {formatDate(job.updatedAt)}
                </p>
              </div>
              <StatusBadge status={job.status} />
            </Link>
          </li>
        ))}
        {!query.isLoading && items.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted">
            {filtered ? "No jobs match your search." : "No jobs yet."}
          </li>
        )}
      </ul>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            Page {page + 1} of {lastPage + 1} · {total} jobs
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
