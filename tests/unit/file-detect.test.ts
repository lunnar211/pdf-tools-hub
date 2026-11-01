import { describe, it, expect } from "vitest";
import { detectKindFromBytes } from "@/lib/file-detect";

function bytes(...vals: number[]): Uint8Array {
  return new Uint8Array(vals);
}

describe("detectKindFromBytes", () => {
  it("detects PDF", () => {
    expect(detectKindFromBytes(bytes(0x25, 0x50, 0x44, 0x46, 0x2d))).toBe("pdf");
  });
  it("detects PNG", () => {
    expect(detectKindFromBytes(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
  });
  it("detects JPG", () => {
    expect(detectKindFromBytes(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpg");
  });
  it("detects WebP via RIFF....WEBP", () => {
    expect(
      detectKindFromBytes(bytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50)),
    ).toBe("webp");
  });
  it("detects BMP via BM", () => {
    expect(detectKindFromBytes(bytes(0x42, 0x4d, 0x00, 0x00))).toBe("bmp");
  });
  it("detects HEIC via ftyp brand", () => {
    // ....ftypheic
    expect(
      detectKindFromBytes(bytes(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63)),
    ).toBe("heic");
    // ....ftypmif1
    expect(
      detectKindFromBytes(bytes(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31)),
    ).toBe("heic");
  });
  it("rejects unknown ftyp brands (e.g. mp4)", () => {
    expect(
      detectKindFromBytes(bytes(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d)),
    ).toBe("unknown");
  });
  it("detects GIF", () => {
    expect(detectKindFromBytes(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe("gif");
  });
  it("detects ZIP (docx) via PK", () => {
    expect(detectKindFromBytes(bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00))).toBe("zip");
  });
  it("returns unknown for random bytes and truncated input", () => {
    expect(detectKindFromBytes(bytes(0x00, 0x01, 0x02, 0x03))).toBe("unknown");
    expect(detectKindFromBytes(bytes(0x25, 0x50))).toBe("unknown");
    expect(detectKindFromBytes(bytes())).toBe("unknown");
  });
});
