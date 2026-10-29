import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export async function sha256File(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

/** For display only. This value is never used to build a path. */
export function cleanName(name: string): string {
  const base = path.basename(name.replace(/\\/g, "/"));
  const printable = Array.from(base)
    .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
    .join("")
    .trim();
  return printable.slice(0, 200) || "file";
}
