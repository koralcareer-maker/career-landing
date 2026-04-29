import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const FAL_KEY = () => process.env.FAL_KEY ?? "";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });

  const requestId = req.nextUrl.searchParams.get("requestId");
  if (!requestId) return NextResponse.json({ error: "חסר requestId" }, { status: 400 });

  const statusRes = await fetch(
    `https://queue.fal.run/fal-ai/photomaker/requests/${requestId}/status`,
    { headers: { Authorization: `Key ${FAL_KEY()}` } }
  );

  if (!statusRes.ok) {
    return NextResponse.json({ status: "pending" });
  }

  const status = await statusRes.json() as { status: string };

  if (status.status === "COMPLETED") {
    const resultRes = await fetch(
      `https://queue.fal.run/fal-ai/photomaker/requests/${requestId}`,
      { headers: { Authorization: `Key ${FAL_KEY()}` } }
    );
    const result = await resultRes.json() as { images?: { url: string }[] };
    const images = result.images?.map((i) => i.url) ?? [];
    return NextResponse.json({ status: "completed", images });
  }

  if (status.status === "FAILED") {
    return NextResponse.json({ status: "failed" });
  }

  return NextResponse.json({ status: "pending" });
}
