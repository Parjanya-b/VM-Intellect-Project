import { useRef, useState } from "react";
import { ACCEPT_ATTR, fileKindFor, MAX_UPLOAD_BYTES } from "@vmi/contracts";
import { ApiError } from "../lib/api";
import { formatBytes, uploadFile } from "../lib/files";
import { Button } from "./Button";

type ItemState = "queued" | "uploading" | "done" | "error" | "cancelled";

interface Item {
  key: string;
  file: File;
  progress: number;
  state: ItemState;
  error?: string;
}

interface Props {
  jobId: string;
  onUploaded: () => void;
}

function precheck(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!fileKindFor(ext)) return `.${ext} files are not supported.`;
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_UPLOAD_BYTES)
    return `The file is larger than ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  return null;
}

export default function FileUploader({ jobId, onUploaded }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const controllers = useRef(new Map<string, AbortController>());

  const patch = (key: string, p: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...p } : i)));

  async function uploadOne(key: string, file: File) {
    const problem = precheck(file);
    if (problem) return patch(key, { state: "error", error: problem });

    const controller = new AbortController();
    controllers.current.set(key, controller);
    patch(key, { state: "uploading", progress: 0, error: undefined });
    try {
      await uploadFile(jobId, file, {
        signal: controller.signal,
        onProgress: (p) => patch(key, { progress: p }),
      });
      patch(key, { state: "done", progress: 100 });
      onUploaded();
    } catch (e) {
      if (e instanceof ApiError && e.code === "ABORTED") patch(key, { state: "cancelled" });
      else patch(key, { state: "error", error: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      controllers.current.delete(key);
    }
  }

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const fresh: Item[] = Array.from(list).map((file) => ({
      key: crypto.randomUUID(),
      file,
      progress: 0,
      state: "queued",
    }));
    setItems((prev) => [...prev, ...fresh]);
    for (const it of fresh) await uploadOne(it.key, it.file); // one at a time
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm transition ${
          dragging ? "border-accent bg-paper-dark" : "border-line bg-paper"
        }`}
      >
        <span className="font-medium">Drop files here or click to choose</span>
        <span className="mt-1 text-xs text-muted">
          PDF, PNG/JPG, CSV/XLSX, STEP/IGES · up to {formatBytes(MAX_UPLOAD_BYTES)} each
        </span>
        <input
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = ""; // allow choosing the same file again
          }}
        />
      </label>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2" data-testid="upload-queue">
          {items.map((it) => (
            <li key={it.key} className="rounded-md border border-line bg-white p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium">{it.file.name}</span>
                <span className="shrink-0 text-xs text-muted">{formatBytes(it.file.size)}</span>
              </div>

              {(it.state === "uploading" || it.state === "queued") && (
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded bg-paper-dark"
                    role="progressbar"
                    aria-valuenow={it.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${it.progress}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs text-muted">
                    {it.state === "queued" ? "Waiting" : `${it.progress}%`}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => controllers.current.get(it.key)?.abort()}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {it.state === "done" && <p className="mt-1 text-xs text-ok">Uploaded</p>}

              {(it.state === "error" || it.state === "cancelled") && (
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p role="alert" className="text-xs text-danger">
                    {it.state === "cancelled" ? "Upload cancelled." : it.error}
                  </p>
                  <Button variant="secondary" onClick={() => void uploadOne(it.key, it.file)}>
                    Retry
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {items.some((i) => i.state === "done" || i.state === "cancelled") && (
        <button
          type="button"
          className="mt-2 text-xs text-muted hover:text-ink"
          onClick={() =>
            setItems((prev) => prev.filter((i) => i.state !== "done" && i.state !== "cancelled"))
          }
        >
          Clear finished
        </button>
      )}
    </div>
  );
}
