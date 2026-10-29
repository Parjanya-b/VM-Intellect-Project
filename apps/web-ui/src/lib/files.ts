import type { ApiErrorBody, JobFile } from "@vmi/contracts";
import { ApiError, api, tokenStore } from "./api";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const deleteFile = (id: string) => api<void>(`/files/${id}`, { method: "DELETE" });

/** XHR (not fetch) because fetch cannot report upload progress. */
export function uploadFile(
  jobId: string,
  file: File,
  opts: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
): Promise<JobFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/v1/jobs/${jobId}/files`);
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* response was not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data as JobFile);
      const e = (data as ApiErrorBody | null)?.error;
      reject(
        new ApiError(
          xhr.status,
          e?.code ?? "UNKNOWN",
          e?.message ?? "Upload failed.",
          e?.traceId,
          e?.details,
        ),
      );
    };
    xhr.onerror = () =>
      reject(new ApiError(0, "NETWORK", "Cannot reach the local VM Intellect service."));
    xhr.onabort = () => reject(new ApiError(0, "ABORTED", "Upload cancelled."));
    opts.signal?.addEventListener("abort", () => xhr.abort());

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

// Files need the Authorization header, so a plain <a href> cannot be used. Fetch a blob instead.
async function fetchBlob(id: string, download: boolean): Promise<Blob> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`/api/v1/files/${id}/preview${download ? "?download=1" : ""}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Cannot reach the local VM Intellect service.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      data?.error.code ?? "UNKNOWN",
      data?.error.message ?? "Could not load the file.",
    );
  }
  return res.blob();
}

export async function openFile(id: string) {
  const win = window.open("", "_blank"); // opened first so popup blockers allow it
  try {
    const url = URL.createObjectURL(await fetchBlob(id, false));
    if (win) win.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    win?.close();
    throw e;
  }
}

export async function downloadFile(id: string, name: string) {
  const url = URL.createObjectURL(await fetchBlob(id, true));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
