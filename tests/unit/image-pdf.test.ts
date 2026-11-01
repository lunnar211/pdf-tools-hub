import { describe, it, expect } from "vitest";
import {
  pageSizeFor,
  layoutCells,
  estimatePdfBytes,
  type PdfImageItem,
} from "@/lib/image-pdf";

const fakeItem = (bytes: number): PdfImageItem =>
  ({
    image: { width: 100, height: 50 },
    rotation: 0,
    inputBytes: bytes,
  }) as unknown as PdfImageItem;

describe("pageSizeFor", () => {
  it("A4 auto follows the image orientation", () => {
    const [w1, h1] = pageSizeFor("a4", "auto", 100, 50);
    expect(w1).toBeGreaterThan(h1); // landscape image -> landscape page
    const [w2, h2] = pageSizeFor("a4", "auto", 50, 100);
    expect(h2).toBeGreaterThan(w2);
  });
  it("portrait / landscape force orientation", () => {
    const [w, h] = pageSizeFor("a4", "portrait", 100, 50);
    expect(h).toBeGreaterThan(w);
    const [w2, h2] = pageSizeFor("a4", "landscape", 50, 100);
    expect(w2).toBeGreaterThan(h2);
  });
  it("fit-to-image keeps the image aspect", () => {
    const [w, h] = pageSizeFor("fit", "auto", 200, 100);
    expect(w / h).toBeCloseTo(2, 5);
  });
  it("fit-to-image caps at A3 long side", () => {
    const [w, h] = pageSizeFor("fit", "auto", 5000, 2500);
    expect(Math.max(w, h)).toBeLessThanOrEqual(1190.55 + 0.01);
  });
});

describe("layoutCells", () => {
  it("returns the right cell counts", () => {
    expect(layoutCells(595, 842, 36, 1)).toHaveLength(1);
    expect(layoutCells(595, 842, 36, 2)).toHaveLength(2);
    expect(layoutCells(595, 842, 36, 4)).toHaveLength(4);
    expect(layoutCells(595, 842, 36, 6)).toHaveLength(6);
  });
  it("cells stay inside the margins", () => {
    const cells = layoutCells(595, 842, 36, 4);
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(36);
      expect(c.y).toBeGreaterThanOrEqual(36);
      expect(c.x + c.w).toBeLessThanOrEqual(595 - 36 + 0.01);
      expect(c.y + c.h).toBeLessThanOrEqual(842 - 36 + 0.01);
    }
  });
});

describe("estimatePdfBytes", () => {
  const base = {
    pageSize: "a4" as const,
    orientation: "auto" as const,
    margin: "small" as const,
    fit: "fit" as const,
    quality: "high" as const,
    layout: 1 as const,
    pageNumbers: false,
    title: "",
  };
  it("high quality ≈ input + 1KB per page", () => {
    const est = estimatePdfBytes([fakeItem(100_000), fakeItem(50_000)], base);
    expect(est).toBe(150_000 + 2 * 1024);
  });
  it("medium / small scale the input down", () => {
    const med = estimatePdfBytes([fakeItem(100_000)], { ...base, quality: "medium" });
    const small = estimatePdfBytes([fakeItem(100_000)], { ...base, quality: "small" });
    expect(med).toBeLessThan(estimatePdfBytes([fakeItem(100_000)], base));
    expect(small).toBeLessThan(med);
  });
  it("multi-image layout shares pages", () => {
    const one = estimatePdfBytes([fakeItem(10_000), fakeItem(10_000)], base);
    const four = estimatePdfBytes([fakeItem(10_000), fakeItem(10_000)], { ...base, layout: 4 });
    expect(four).toBeLessThan(one); // 1 page of overhead instead of 2
  });
});
