import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

export interface FileStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Short-lived URL the browser can load directly, or null when files are served by our route. */
  signedUrl(key: string): Promise<string | null>;
  read(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
}

const SIGNED_URL_TTL_SECONDS = 5 * 60;

function r2Storage(): FileStorage {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  });
  const Bucket = env.R2_BUCKET!;
  return {
    async put(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
    },
    signedUrl(key) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket, Key: key }), { expiresIn: SIGNED_URL_TTL_SECONDS });
    },
    async read(key) {
      const res = await client.send(new GetObjectCommand({ Bucket, Key: key }));
      return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
  };
}

/** Development fallback: files under .data/uploads, served through /api/files/[id]. */
function localStorage(root = path.join(process.cwd(), ".data", "uploads")): FileStorage {
  const resolve = (key: string) => {
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
    return full;
  };
  return {
    async put(key, body) {
      const full = resolve(key);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, body);
    },
    async signedUrl() {
      return null;
    },
    async read(key) {
      try {
        return await readFile(resolve(key));
      } catch {
        return null;
      }
    },
    async remove(key) {
      await rm(resolve(key), { force: true });
    },
  };
}

function createStorage(): FileStorage {
  if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET) return r2Storage();
  if (env.NODE_ENV === "production" && !process.env.CI) {
    console.warn("[storage] R2 is not configured; photos are stored on local disk and will not persist on serverless hosts.");
  }
  return localStorage();
}

export const storage: FileStorage = createStorage();

/** Best-effort cleanup after rows are deleted; failures are logged, never thrown. */
export async function removeStoredFiles(keys: string[]) {
  await Promise.all(
    keys.map((key) => storage.remove(key).catch((e) => console.error(`[storage] failed to remove ${key}`, e))),
  );
}
