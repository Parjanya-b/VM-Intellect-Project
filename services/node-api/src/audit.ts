import { db } from "./db";

export function audit(userId: string | null, action: string, traceId: string, detail?: string) {
  db.prepare("INSERT INTO audit_log (user_id, action, detail, trace_id) VALUES (?, ?, ?, ?)").run(
    userId,
    action,
    detail ?? null,
    traceId,
  );
}
