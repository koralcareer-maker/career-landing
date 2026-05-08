/**
 * ATS-grade CV text extraction. Goal: never reject a customer's file
 * unless it's truly unreadable. Three-stage strategy:
 *
 *   1. Format detection (signature bytes, not extension — extensions lie).
 *   2. Native text extraction:
 *        DOCX → mammoth (zero-dep, deterministic, fast).
 *        PDF  → pdf-parse (handles most digital PDFs in one shot).
 *   3. AI fallback: when native extraction yields too little text
 *      (under EMPTY_THRESHOLD chars, e.g. a scanned image-only PDF),
 *      we hand the binary to Gemini multimodal which does its own
 *      vision-based reading. Slower and more expensive, but rescues
 *      the 'photographed CV' case we used to reject.
 *
 * The output of THIS module is plain text. Whoever calls it then runs
 * the structured-analysis prompt against that text — separating the
 * extraction concern from the analysis concern keeps both reliable.
 */

// pdf-parse v2 exposes a class-based API. Wrap it to match the v1
// promise-style flow the rest of this module expects.
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

async function pdfParse(buf: Buffer): Promise<{ text: string }> {
  // Convert Node Buffer → Uint8Array (PDFParse asks for ArrayBuffer-
  // backed bytes; passing a raw Buffer crashes pdfjs-dist internally).
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const parser = new PDFParse({ data });
  const r = await parser.getText();
  return { text: r.text ?? "" };
}

export type CvFormat = "pdf" | "docx" | "doc" | "unknown";

/**
 * Sniff the format from the first few bytes. Falls back to the
 * extension only when the signature isn't conclusive (rare).
 */
export function detectFormat(buf: Buffer, fileName: string): CvFormat {
  // PDF: starts with %PDF-
  if (buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "pdf";
  }
  // DOCX: zip signature 'PK' followed by docx-shape internals.
  // Treat any zip+ext=docx as docx; we'll fail gracefully later if it
  // turns out to be something else.
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) {
    if (/\.docx$/i.test(fileName)) return "docx";
  }
  // Old DOC (compound binary): D0 CF 11 E0
  if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    return "doc";
  }
  // Last resort — extension.
  if (/\.pdf$/i.test(fileName)) return "pdf";
  if (/\.docx$/i.test(fileName)) return "docx";
  if (/\.doc$/i.test(fileName)) return "doc";
  return "unknown";
}

const EMPTY_THRESHOLD = 80; // characters — under this we treat extraction as "empty"

export interface ExtractionResult {
  /** Plain-text extracted from the document. May be empty if all stages failed. */
  text: string;
  /** Which stage succeeded. */
  source: "native-pdf" | "native-docx" | "native-doc" | "ai-vision" | "none";
  /** Detected format for diagnostics. */
  format: CvFormat;
  /** Truthy when we resorted to the AI fallback (slower / costlier). */
  usedFallback: boolean;
  /** Friendly Hebrew warning when we couldn't extract enough. */
  warning?: string;
}

interface ExtractOptions {
  /** Disable AI fallback (caller will run their own AI call instead). */
  noAiFallback?: boolean;
  /** Async hook the caller provides to fetch text from Gemini using the
   *  raw bytes — kept here as a callback so this module stays free of
   *  network/secret deps. */
  aiVisionExtract?: (buf: Buffer, mime: string) => Promise<string>;
}

/**
 * Run the multi-stage extraction. Always returns — never throws on a
 * recoverable failure; instead populates `text=""` and `warning`.
 */
export async function extractCvText(
  buf: Buffer,
  fileName: string,
  opts: ExtractOptions = {},
): Promise<ExtractionResult> {
  const format = detectFormat(buf, fileName);

  // Stage 1: native extraction by format.
  let text = "";
  let source: ExtractionResult["source"] = "none";

  try {
    if (format === "pdf") {
      const r = await pdfParse(buf);
      text = (r?.text ?? "").trim();
      source = text.length > 0 ? "native-pdf" : "none";
    } else if (format === "docx") {
      const r = await mammoth.extractRawText({ buffer: buf });
      text = (r?.value ?? "").trim();
      source = text.length > 0 ? "native-docx" : "none";
    } else if (format === "doc") {
      // No first-class .doc parser bundled; fall through to AI.
      source = "none";
    }
  } catch {
    // swallow — try the AI fallback, then surface a friendly warning
  }

  // Stage 2: AI vision fallback when native came back empty / nothing.
  if (text.length < EMPTY_THRESHOLD && !opts.noAiFallback && opts.aiVisionExtract) {
    try {
      const mime =
        format === "pdf"
          ? "application/pdf"
          : format === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : format === "doc"
          ? "application/msword"
          : "application/octet-stream";
      const aiText = (await opts.aiVisionExtract(buf, mime)).trim();
      if (aiText.length > text.length) {
        text = aiText;
        source = "ai-vision";
      }
    } catch {
      // leave native text (or empty) as the result
    }
  }

  let warning: string | undefined;
  if (text.length === 0) {
    warning =
      format === "unknown"
        ? "פורמט הקובץ לא זוהה. תומכים ב-PDF, DOCX, DOC."
        : "לא הצלחנו לחלץ טקסט מהקובץ. ייתכן שזה PDF סרוק/מוצפן. נסי לפתוח אותו ב-Word ולשמור מחדש כ-PDF.";
  } else if (text.length < EMPTY_THRESHOLD) {
    warning = "חולצה כמות מועטה של טקסט. ייתכן שחלקים מהקובץ אינם נקראים.";
  }

  return {
    text,
    source,
    format,
    usedFallback: source === "ai-vision",
    warning,
  };
}
