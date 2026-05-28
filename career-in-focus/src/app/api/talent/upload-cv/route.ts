/**
 * POST /api/talent/upload-cv
 *
 * Public helper for the /talent intake form. Accepts a single CV file
 * (PDF / DOCX / TXT, ≤8MB), extracts the plain text server-side, and
 * returns it as JSON. The form then ships that text along with the
 * other fields to the submitTalent server action.
 *
 * We keep parsing here (a route handler) rather than in the server
 * action because bundling node-only deps (pdf-parse / mammoth) into a
 * server action breaks the Next build. This route does NOT touch the
 * database — it only turns a file into text — so it's safe to expose
 * publicly. Size + type are validated; nothing is persisted.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });

  const file = form.get("cv");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "file too large (max 8MB)" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let text = "";
  try {
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      text = ((await parser.getText()).text ?? "").trim();
    } else if (
      name.endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth");
      text = ((await mammoth.extractRawText({ buffer: buf })).value ?? "").trim();
    } else if (name.endsWith(".txt") || file.type.startsWith("text/")) {
      text = buf.toString("utf-8").trim();
    } else {
      return NextResponse.json({ error: "unsupported file type" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "could not read file" }, { status: 400 });
  }

  // Cap returned text so a giant CV doesn't bloat the form payload.
  return NextResponse.json({ ok: true, text: text.slice(0, 12000) });
}
