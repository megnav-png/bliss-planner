import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { FileReference } from "@/lib/types";

type StoreFileInput = {
  name: string;
  kind: FileReference["kind"];
  dataUrl: string;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function fileStoreDir() {
  return (
    env("BLISS_FILE_STORE_DIR") ||
    env("BLISS_OBJECT_STORAGE_LOCAL_DIR") ||
    (env("RENDER") ? "/var/data/bliss-relay/files" : "/tmp/bliss-planner-files")
  );
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "attachment";
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Unsupported file payload.");
  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], "base64")
  };
}

export function fileStorageHealth() {
  const externalUploadEndpoint = env("BLISS_OBJECT_STORAGE_UPLOAD_ENDPOINT");
  return {
    provider: externalUploadEndpoint ? "external-object" : "server-file",
    localDirectory: externalUploadEndpoint ? "" : fileStoreDir(),
    bucket: env("BLISS_OBJECT_STORAGE_BUCKET"),
    region: env("BLISS_OBJECT_STORAGE_REGION"),
    externalUploadConfigured: Boolean(externalUploadEndpoint)
  };
}

export async function storeFile(input: StoreFileInput): Promise<FileReference> {
  const parsed = parseDataUrl(input.dataUrl);
  const id = `file-${randomUUID()}`;
  const extension = path.extname(input.name) || "";
  const key = `${id}-${safeFileName(path.basename(input.name, extension))}${extension}`;
  const checksum = createHash("sha256").update(parsed.bytes).digest("hex");
  const externalUploadEndpoint = env("BLISS_OBJECT_STORAGE_UPLOAD_ENDPOINT");

  if (externalUploadEndpoint) {
    const response = await fetch(externalUploadEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env("BLISS_OBJECT_STORAGE_TOKEN") ? { authorization: `Bearer ${env("BLISS_OBJECT_STORAGE_TOKEN")}` } : {})
      },
      body: JSON.stringify({
        key,
        fileName: input.name,
        mimeType: parsed.mimeType,
        sizeBytes: parsed.bytes.length,
        checksum,
        dataBase64: parsed.bytes.toString("base64")
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || "Object storage upload failed.");
    return {
      id,
      name: input.name,
      kind: input.kind,
      url: body.url || body.publicUrl || body.signedUrl,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.bytes.length,
      storageProvider: "external-object",
      storageKey: body.key || key,
      addedAt: new Date().toISOString()
    };
  }

  await mkdir(fileStoreDir(), { recursive: true });
  await writeFile(path.join(fileStoreDir(), key), parsed.bytes);
  return {
    id,
    name: input.name,
    kind: input.kind,
    url: `/api/files/${encodeURIComponent(key)}`,
    mimeType: parsed.mimeType,
    sizeBytes: parsed.bytes.length,
    storageProvider: "server-file",
    storageKey: key,
    addedAt: new Date().toISOString()
  };
}

export async function readStoredFile(key: string) {
  if (!key || key.includes("..") || key.includes("/") || key.includes("\\")) {
    throw new Error("Invalid file key.");
  }
  return readFile(path.join(fileStoreDir(), key));
}
