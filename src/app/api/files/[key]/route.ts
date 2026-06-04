import { readStoredFile } from "@/lib/server/fileStorage";

export const runtime = "nodejs";

function contentTypeFor(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  try {
    const bytes = await readStoredFile(key);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": contentTypeFor(key),
        "cache-control": "private, max-age=3600"
      }
    });
  } catch {
    return Response.json({ ok: false, error: "File not found." }, { status: 404 });
  }
}
