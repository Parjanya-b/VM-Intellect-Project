import type { ApiErrorBody } from "@vmi/contracts";

const TOKEN_KEY = "vmi.token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  code: string;
  traceId?: string;
  details?: Record<string, string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    traceId?: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.traceId = traceId;
    this.details = details;
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Cannot reach the local VM Intellect service. Is it running?");
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data as ApiErrorBody | null)?.error;
    throw new ApiError(
      res.status,
      e?.code ?? "UNKNOWN",
      e?.message ?? "Request failed.",
      e?.traceId,
      e?.details,
    );
  }
  return data as T;
}
