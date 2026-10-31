import { describe, it, expect } from "vitest";
import { detectKind, validateUpload, parseRanges, rangeSchema } from "@/lib/files";

describe("file validation (magic bytes + MIME + size)", () => {
  it("detects kinds from magic bytes, not extensions", () => {
    expect(detectKind(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("pdf");
    expect(detectKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    expect(detectKind(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(detectKind(Buffer.from("hello world"))).toBe(null);
  });
  it("rejects a PDF whose bytes are really a PNG (spoofed upload)", () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateUpload(pngBytes, "application/pdf", ["pdf"], 1024)).not.toBe(null);
  });
  it("accepts a genuine PDF and rejects oversize files", () => {
    const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    expect(validateUpload(pdf, "application/pdf", ["pdf"], 1024)).toBe(null);
    expect(validateUpload(Buffer.alloc(2048, 0x25), "application/pdf", ["pdf"], 1024)).not.toBe(null);
    expect(validateUpload(Buffer.alloc(0), "application/pdf", ["pdf"], 1024)).not.toBe(null);
  });
  it("allows generic octet-stream but rejects a conflicting MIME", () => {
    const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    expect(validateUpload(pdf, "application/octet-stream", ["pdf"], 1024)).toBe(null);
    expect(validateUpload(pdf, "image/png", ["pdf"], 1024)).not.toBe(null);
  });
});

describe("split page ranges", () => {
  it("parses ranges and rejects out-of-range pages", () => {
    expect(parseRanges("1-3,5", 10).error).toBe(null);
    expect(parseRanges("1-3,5", 10).ranges).toEqual([[1, 3], [5, 5]]);
    expect(parseRanges("9-12", 10).error).not.toBe(null);
    expect(rangeSchema.safeParse("1-3,5").success).toBe(true);
    expect(rangeSchema.safeParse("abc").success).toBe(false);
  });
});
