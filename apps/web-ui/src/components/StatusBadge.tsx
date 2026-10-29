import type { JobStatus } from "@vmi/contracts";
import { STATUS_LABEL } from "../lib/jobs";

const STYLE: Record<JobStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  uploaded: "bg-blue-50 text-blue-700",
  queued: "bg-indigo-50 text-indigo-700",
  processing: "bg-sky-50 text-sky-700",
  needs_review: "bg-amber-50 text-amber-800",
  completed: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  interrupted: "bg-orange-50 text-orange-800",
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
