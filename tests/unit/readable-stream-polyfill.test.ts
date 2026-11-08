// Regression: old Safari (< 18) has no ReadableStream async iterator, and
// pdf.js getTextContent() needs it (for await...of). The polyfill installed
// by loadPdfjs must make for-await work when the native method is missing.
import { describe, it, expect, afterEach } from "vitest";
import { ensureReadableStreamAsyncIterator } from "@/lib/pdf-client";

const proto = ReadableStream.prototype as unknown as Record<symbol, unknown>;
const native = proto[Symbol.asyncIterator];

afterEach(() => {
  if (native === undefined) delete proto[Symbol.asyncIterator];
  else proto[Symbol.asyncIterator] = native;
});

describe("ensureReadableStreamAsyncIterator", () => {
  it("makes for-await work when the native async iterator is missing", async () => {
    delete proto[Symbol.asyncIterator];
    expect(typeof proto[Symbol.asyncIterator]).toBe("undefined");
    ensureReadableStreamAsyncIterator();
    expect(typeof proto[Symbol.asyncIterator]).toBe("function");
    const stream = new ReadableStream({
      start(c) {
        c.enqueue("a");
        c.enqueue("b");
        c.close();
      },
    });
    const chunks: unknown[] = [];
    // Cast: this test deliberately runs with the native method deleted.
    for await (const chunk of stream as unknown as AsyncIterable<unknown>) chunks.push(chunk);
    expect(chunks).toEqual(["a", "b"]);
  });

  it("is a no-op when the native async iterator exists", () => {
    const before = proto[Symbol.asyncIterator];
    ensureReadableStreamAsyncIterator();
    expect(proto[Symbol.asyncIterator]).toBe(before);
  });
});
