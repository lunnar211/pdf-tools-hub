// Edit PDF text: line grouping, content-stream removal, full round-trip.
import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  groupTextItems,
  removeTextFromContent,
  applyTextEdits,
  type TextEdit,
} from "@/lib/edit-pdf-text";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

async function extractText(bytes: Uint8Array): Promise<string> {
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    out += tc.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n";
  }
  return out;
}

function fakeItem(str: string, x: number, y: number, size = 12, width?: number): TextItem {
  return {
    str,
    dir: "ltr",
    transform: [size, 0, 0, size, x, y],
    width: width ?? str.length * size * 0.55,
    height: size,
    fontName: "Helvetica",
    hasEOL: false,
  };
}

describe("groupTextItems", () => {
  it("groups same-baseline items into lines, left to right", () => {
    // Viewport y grows downwards: y=660 sits above y=700 on the page.
    const items = [
      fakeItem("World", 120, 660),
      fakeItem("Hello", 50, 660),
      fakeItem("Second", 50, 700),
      fakeItem("line", 110, 700),
    ];
    const lines = groupTextItems(items);
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("Hello World");
    expect(lines[1].text).toBe("Second line");
  });

  it("keeps items on different baselines apart", () => {
    const items = [fakeItem("Top", 50, 660), fakeItem("Bottom", 50, 700)];
    expect(groupTextItems(items).map((l) => l.text)).toEqual(["Top", "Bottom"]);
  });
});

describe("removeTextFromContent", () => {
  const stream =
    "q\nBT\n/F1 24 Tf\n1 0 0 1 50 800 Tm\n(Hello World) Tj\nET\nQ\n" +
    "q\nBT\n/F1 14 Tf\n1 0 0 1 50 760 Tm\n(Second line here) Tj\nET\nQ\n";

  it("removes only the matching BT block", () => {
    const { content, removed } = removeTextFromContent(stream, "Hello World");
    expect(removed).toBe(true);
    expect(content).not.toContain("Hello World");
    expect(content).toContain("Second line here");
  });

  it("removes a hex-encoded string too", () => {
    const hex = "q\nBT\n/F1 24 Tf\n1 0 0 1 50 800 Tm\n<48656C6C6F20576F726C64> Tj\nET\nQ\n";
    const { content, removed } = removeTextFromContent(hex, "Hello World");
    expect(removed).toBe(true);
    expect(content).not.toContain("48656C6C6F20576F726C64");
  });

  it("leaves the stream alone when the text is not there", () => {
    const { content, removed } = removeTextFromContent(stream, "Not present");
    expect(removed).toBe(false);
    expect(content).toBe(stream);
  });

  it("does not remove a block that holds other text as well", () => {
    const mixed = "q\nBT\n/F1 24 Tf\n1 0 0 1 50 800 Tm\n(Hello World and more) Tj\nET\nQ\n";
    const { removed } = removeTextFromContent(mixed, "Hello World");
    expect(removed).toBe(false);
  });
});

describe("applyTextEdits round-trip", () => {
  async function makePdf(): Promise<{ bytes: Uint8Array; edit: TextEdit }> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText("Hello World", { x: 50, y: 800, size: 24, font });
    page.drawText("Second line here", { x: 50, y: 760, size: 14, font });
    const bytes = await doc.save();
    const edit: TextEdit = {
      pageIndex: 0,
      originalText: "Hello World",
      newText: "Hello Mars",
      pdfX: 50,
      pdfBaselineY: 800,
      pdfWidth: font.widthOfTextAtSize("Hello World", 24),
      pdfTop: 800 + 20,
      pdfBottom: 800 - 6,
      pdfFontSize: 24,
      bold: false,
      italic: false,
    };
    return { bytes, edit };
  }

  it("replaces the text: new word present, old word gone, other lines intact", async () => {
    const { bytes, edit } = await makePdf();
    const out = await applyTextEdits(bytes, [edit]);
    const text = await extractText(out);
    expect(text).toContain("Hello Mars");
    expect(text).not.toContain("Hello World");
    expect(text).toContain("Second line here");
  });

  it("a longer replacement is shrunk to fit and still present", async () => {
    const { bytes, edit } = await makePdf();
    const out = await applyTextEdits(bytes, [
      { ...edit, newText: "Hello Mars and welcome to the red planet" },
    ]);
    const text = await extractText(out);
    expect(text).toContain("Hello Mars and welcome to the red planet");
    expect(text).not.toContain("Hello World");
  });

  it("an edit to empty text deletes the line", async () => {
    const { bytes, edit } = await makePdf();
    const out = await applyTextEdits(bytes, [{ ...edit, newText: "" }]);
    const text = await extractText(out);
    expect(text).not.toContain("Hello World");
    expect(text).toContain("Second line here");
  });

  it("leaves the PDF unchanged when there are no edits", async () => {
    const { bytes } = await makePdf();
    const out = await applyTextEdits(bytes, []);
    const text = await extractText(out);
    expect(text).toContain("Hello World");
    expect(text).toContain("Second line here");
  });
});
