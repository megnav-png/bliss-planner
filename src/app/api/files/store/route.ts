import { storeFile } from "@/lib/server/fileStorage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload?.name || !payload?.kind || !payload?.dataUrl) {
    return Response.json({ ok: false, error: "Missing file upload payload." }, { status: 400 });
  }

  try {
    const file = await storeFile({
      name: String(payload.name),
      kind: payload.kind,
      dataUrl: String(payload.dataUrl)
    });
    return Response.json({ ok: true, file });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "File storage failed." },
      { status: 500 }
    );
  }
}
