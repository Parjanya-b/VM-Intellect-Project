import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDate, listJobs, type ListParams } from "../lib/jobs";
import StatusBadge from "./StatusBadge";

interface Props {
  title: string;
  emptyText: string;
  params: ListParams;
}

export default function JobsPanel({ title, emptyText, params }: Props) {
  const query = useQuery({
    queryKey: ["jobs", "panel", title],
    queryFn: () => listJobs({ ...params, limit: 5 }),
  });
  const items = query.data?.items ?? [];

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Link to="/jobs" className="text-sm text-accent hover:underline">
          View all
        </Link>
      </div>
      {query.isError && <p className="mt-2 text-sm text-danger">Could not load jobs.</p>}
      {!query.isLoading && !query.isError && items.length === 0 && (
        <p className="mt-2 text-sm text-muted">{emptyText}</p>
      )}
      <ul className="mt-2 divide-y divide-line">
        {items.map((j) => (
          <li key={j.id}>
            <Link
              to={`/jobs/${j.id}`}
              className="flex items-center justify-between gap-3 py-2 text-sm hover:text-accent"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{j.title}</span>
                <span className="text-xs text-muted">{formatDate(j.updatedAt)}</span>
              </span>
              <StatusBadge status={j.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
