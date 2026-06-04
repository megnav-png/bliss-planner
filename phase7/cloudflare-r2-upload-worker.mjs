export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed." }, 405);
    }

    const expectedToken = env.BLISS_OBJECT_STORAGE_TOKEN || "";
    const incomingToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    if (!expectedToken || incomingToken !== expectedToken) {
      return json({ ok: false, error: "Unauthorized object storage upload." }, 401);
    }

    if (!env.BLISS_FILES) {
      return json({ ok: false, error: "Missing R2 binding BLISS_FILES." }, 500);
    }

    const payload = await request.json().catch(() => null);
    if (!payload?.key || !payload?.fileName || !payload?.mimeType || !payload?.dataBase64) {
      return json({ ok: false, error: "Missing upload payload." }, 400);
    }

    const bytes = Uint8Array.from(atob(payload.dataBase64), (char) => char.charCodeAt(0));
    const maxBytes = Number(env.BLISS_OBJECT_STORAGE_MAX_BYTES || 25 * 1024 * 1024);
    if (bytes.byteLength > maxBytes) {
      return json({ ok: false, error: `File exceeds ${maxBytes} byte limit.` }, 413);
    }

    const key = sanitizeKey(String(payload.key));
    await env.BLISS_FILES.put(key, bytes, {
      httpMetadata: {
        contentType: String(payload.mimeType)
      },
      customMetadata: {
        fileName: String(payload.fileName),
        checksum: String(payload.checksum || ""),
        sizeBytes: String(payload.sizeBytes || bytes.byteLength)
      }
    });

    const publicBaseUrl = (env.BLISS_OBJECT_STORAGE_PUBLIC_BASE_URL || "").replace(/\/$/, "");
    return json({
      ok: true,
      key,
      url: publicBaseUrl ? `${publicBaseUrl}/${encodeURIComponent(key)}` : undefined,
      publicUrl: publicBaseUrl ? `${publicBaseUrl}/${encodeURIComponent(key)}` : undefined,
      sizeBytes: bytes.byteLength
    });
  }
};

function sanitizeKey(value) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120))
    .join("/")
    .slice(0, 500);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
