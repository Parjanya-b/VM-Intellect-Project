import fs from "node:fs";

/** Read the first bytes of a file (enough to check its signature). */
export function readHead(file: string, n = 8192): Buffer {
  const fd = fs.openSync(file, "r");
  try {
    const buf = Buffer.alloc(n);
    const read = fs.readSync(fd, buf, 0, n, 0);
    return buf.subarray(0, read);
  } finally {
    fs.closeSync(fd);
  }
}

const startsWith = (b: Buffer, bytes: number[]) => bytes.every((v, i) => b[i] === v);

/** True when the file's first bytes really look like the type its extension claims. */
export function hasValidSignature(ext: string, head: Buffer): boolean {
  switch (ext) {
    case "pdf":
      return head.subarray(0, 1024).includes("%PDF-");
    case "png":
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "jpg":
    case "jpeg":
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case "xlsx": // a zip container
      return startsWith(head, [0x50, 0x4b, 0x03, 0x04]);
    case "csv": // plain text: no NUL bytes
      return !head.includes(0x00);
    case "step":
    case "stp":
      return head.toString("latin1").trimStart().startsWith("ISO-10303-21");
    case "iges":
    case "igs": {
      // fixed 80-column records; column 73 holds the section letter ("S" on the first line)
      const first = head.toString("latin1").split(/\r?\n/)[0] ?? "";
      return first.length >= 73 && first[72] === "S";
    }
    default:
      return false;
  }
}
