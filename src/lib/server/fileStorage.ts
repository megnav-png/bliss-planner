import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { FileReference } from "@/lib/types";
import { recordFileObject } from "@/lib/server/productionStore";

type StoreFileInput = {
  name: string;
  kind: FileReference["kind"];
  dataUrl: string;
  workspaceId?: string;
  recordId?: string;
  actorEmail?: string;
  clientFacing?: boolean;
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

function encryptionKey() {
  const secret = env("BLISS_FILE_ENCRYPTION_KEY") || env("BLISS_RELAY_SECRET") || "";
  if (!secret) return null;
  return createHash("sha256").update(secret).digest();
}

function encryptBytes(bytes: Buffer) {
  const key = encryptionKey();
  if (!key) return { bytes, encrypted: false };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    bytes: Buffer.concat([Buffer.from("BLISSENC1"), iv, tag, encrypted]),
    encrypted: true
  };
}

function decryptBytes(bytes: Buffer) {
  const key = encryptionKey();
  if (!key || bytes.subarray(0, 9).toString("utf8") !== "BLISSENC1") return bytes;
  const iv = bytes.subarray(9, 21);
  const tag = bytes.subarray(21, 37);
  const encrypted = bytes.subarray(37);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function fileStorageHealth() {
  const externalUploadEndpoint = env("BLISS_OBJECT_STORAGE_UPLOAD_ENDPOINT");
  return {
    provider: externalUploadEndpoint ? "external-object" : "server-file",
    localDirectory: externalUploadEndpoint ? "" : fileStoreDir(),
    bucket: env("BLISS_OBJECT_STORAGE_BUCKET"),
    region: env("BLISS_OBJECT_STORAGE_REGION"),
    externalUploadConfigured: Boolean(externalUploadEndpoint),
    encryption: encryptionKey() ? "aes-256-gcm" : "not-configured"
  };
}

export async function storeFile(input: StoreFileInput): Promise<FileReference> {
  const parsed = parseDataUrl(input.dataUrl);
  const encrypted = encryptBytes(parsed.bytes);
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
        encrypted: encrypted.encrypted,
        dataBase64: encrypted.bytes.toString("base64")
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || "Object storage upload failed.");
    const stored: FileReference = {
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
    if (input.workspaceId) {
      await recordFileObject({
        workspaceId: input.workspaceId,
        recordId: input.recordId,
        provider: "external-object",
        storageKey: body.key || key,
        publicUrl: stored.url,
        fileName: input.name,
        mimeType: parsed.mimeType,
        sizeBytes: parsed.bytes.length,
        checksum,
        clientFacing: input.clientFacing,
        actorEmail: input.actorEmail
      });
    }
    return stored;
  }

  await mkdir(fileStoreDir(), { recursive: true });
  await writeFile(path.join(fileStoreDir(), key), encrypted.bytes);
  const stored: FileReference = {
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
  if (input.workspaceId) {
    await recordFileObject({
      workspaceId: input.workspaceId,
      recordId: input.recordId,
      provider: "server-file",
      storageKey: key,
      publicUrl: stored.url,
      fileName: input.name,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.bytes.length,
      checksum,
      clientFacing: input.clientFacing,
      actorEmail: input.actorEmail
    });
  }
  return stored;
}

export async function readStoredFile(key: string) {
  if (!key || key.includes("..") || key.includes("/") || key.includes("\\")) {
    throw new Error("Invalid file key.");
  }
  return decryptBytes(await readFile(path.join(fileStoreDir(), key)));
}
