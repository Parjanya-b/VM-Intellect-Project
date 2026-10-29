import { describe, expect, it } from "vitest";
import { hasValidSignature } from "../src/files/signature";

const b = (s: string) => Buffer.from(s, "latin1");

describe("hasValidSignature", () => {
  it("accepts real headers", () => {
    expect(hasValidSignature("pdf", b("%PDF-1.7\n1 0 obj"))).toBe(true);
    expect(
      hasValidSignature("png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])),
    ).toBe(true);
    expect(hasValidSignature("jpg", Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(hasValidSignature("xlsx", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0]))).toBe(true);
    expect(hasValidSignature("csv", b("a,b\n1,2\n"))).toBe(true);
    expect(hasValidSignature("step", b("ISO-10303-21;\nHEADER;"))).toBe(true);
    expect(hasValidSignature("igs", b("A".repeat(72) + "S      1\n"))).toBe(true);
  });

  it("rejects content that does not match the extension", () => {
    expect(hasValidSignature("pdf", b("hello world"))).toBe(false);
    expect(hasValidSignature("png", b("%PDF-1.4"))).toBe(false);
    expect(hasValidSignature("jpg", b("not a jpeg"))).toBe(false);
    expect(hasValidSignature("xlsx", b("a,b,c"))).toBe(false);
    expect(hasValidSignature("csv", Buffer.from([0x61, 0x00, 0x62]))).toBe(false);
    expect(hasValidSignature("step", b("hello"))).toBe(false);
    expect(hasValidSignature("igs", b("too short"))).toBe(false);
    expect(hasValidSignature("exe", b("MZ"))).toBe(false);
  });
});
