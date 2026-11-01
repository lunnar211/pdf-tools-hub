import { describe, it, expect } from "vitest";
import { NEXT_TOOLS } from "@/lib/next-tools";
import { TOOL_SLUGS } from "@/lib/site";

describe("next-tool suggestions", () => {
  it("every tool has at least one suggestion", () => {
    for (const slug of TOOL_SLUGS) {
      expect(NEXT_TOOLS[slug]?.length ?? 0, `${slug} has no next-tool suggestions`).toBeGreaterThan(0);
    }
  });
  it("every suggestion points at a real tool", () => {
    const real = new Set<string>(TOOL_SLUGS);
    for (const [from, list] of Object.entries(NEXT_TOOLS)) {
      for (const s of list) {
        expect(real.has(s.slug), `${from} suggests unknown tool ${s.slug}`).toBe(true);
        expect(s.reason.length, `${from} -> ${s.slug} needs a reason`).toBeGreaterThan(0);
      }
    }
  });
});
