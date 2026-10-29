import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Box,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { FileKind, JobFile } from "@vmi/contracts";
import { deleteFile, downloadFile, formatBytes, openFile } from "../lib/files";
import { Button } from "./Button";

const ICONS: Record<FileKind, LucideIcon> = {
  pdf: FileText,
  image: ImageIcon,
  spreadsheet: FileSpreadsheet,
  cad: Box,
};

interface Props {
  jobId: string;
  files: JobFile[];
  canEdit: boolean;
}

export default function FileList({ jobId, files, canEdit }: Props) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div data-testid="file-list">
      {files.length === 0 && <p className="text-sm text-muted">No files yet.</p>}
      <ul className="divide-y divide-line">
        {files.map((f) => {
          const Icon = ICONS[f.kind];
          return (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.originalName}</p>
                  <p className="text-xs text-muted">
                    {f.format.toUpperCase()} · {formatBytes(f.sizeBytes)} ·{" "}
                    <span className="font-mono" title={f.sha256}>
                      {f.sha256.slice(0, 12)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {(f.kind === "pdf" || f.kind === "image") && (
                  <Button
                    variant="secondary"
                    aria-label={`Open ${f.originalName}`}
                    onClick={() => void run(() => openFile(f.id))}
                  >
                    Open
                  </Button>
                )}
                <Button
                  variant="secondary"
                  aria-label={`Download ${f.originalName}`}
                  onClick={() => void run(() => downloadFile(f.id, f.originalName))}
                >
                  Download
                </Button>
                {canEdit && (
                  <Button
                    variant="secondary"
                    aria-label={`Delete ${f.originalName}`}
                    onClick={() =>
                      void run(async () => {
                        if (!window.confirm(`Delete ${f.originalName}?`)) return;
                        await deleteFile(f.id);
                        await qc.invalidateQueries({ queryKey: ["job", jobId] });
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden /> Delete
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
