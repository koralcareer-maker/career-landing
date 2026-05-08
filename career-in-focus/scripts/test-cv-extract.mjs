// Quick local test of the ATS-grade CV extraction pipeline.
// Reads the file at the path passed as argv[2], runs through the
// same extractCvText helper that the production /api/profile/analyze-cv
// route uses, and prints what came out.
//
// Usage:  node scripts/test-cv-extract.mjs '/path/to/cv.pdf'
//
// No Gemini call here — we just want to know whether native
// extraction (mammoth / pdf-parse) handles this file. If native
// extraction returns enough text, the production route will succeed
// without needing the AI vision fallback.

import { readFile } from "node:fs/promises";
import path from "node:path";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/test-cv-extract.mjs <path>");
  process.exit(1);
}

console.log("📄 Reading:", filePath);
const buf = await readFile(filePath);
console.log("   Size:", buf.length, "bytes");

// Inline the extractor (the .ts module isn't directly importable
// from a node script without a build step, so we replicate it).
const { PDFParse } = await import("pdf-parse");
const mammoth = (await import("mammoth")).default;

function detectFormat(buf, fileName) {
  if (buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b && /\.docx$/i.test(fileName)) return "docx";
  if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return "doc";
  if (/\.pdf$/i.test(fileName)) return "pdf";
  if (/\.docx$/i.test(fileName)) return "docx";
  return "unknown";
}

const fileName = path.basename(filePath);
const format = detectFormat(buf, fileName);
console.log("🔍 Detected format:", format);

let text = "";
try {
  if (format === "pdf") {
    const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const parser = new PDFParse({ data });
    const r = await parser.getText();
    text = (r?.text ?? "").trim();
  } else if (format === "docx") {
    const r = await mammoth.extractRawText({ buffer: buf });
    text = (r?.value ?? "").trim();
  }
} catch (e) {
  console.error("❌ Native extraction error:", e.message);
}

console.log("\n📊 Extraction result:");
console.log("   Text length:", text.length, "chars");
console.log("   Lines:", text.split("\n").filter(Boolean).length);
console.log("\n--- first 600 chars ---");
console.log(text.slice(0, 600));
console.log("--- last 200 chars ---");
console.log(text.slice(-200));

if (text.length < 80) {
  console.log("\n⚠️  TOO LITTLE TEXT — production flow would fall back to Gemini vision (OCR).");
} else {
  console.log("\n✅ NATIVE EXTRACTION SUCCEEDED — production will return analysis without needing AI fallback.");
}
