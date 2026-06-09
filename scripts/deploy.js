/**
 * Build with `npm run build`, then upload `dist/sdk/shadow.js` and `dist/sdk/shadow.css`.
 * S3 keys: `<prefix>shadow.js`, `<prefix>shadow.css` (default prefix `integration/stoiximan/`).
 *
 * Requires env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 * Optional: AWS_REGION (default eu-north-1 — must match the bucket region), S3_BUCKET, S3_PREFIX
 *
 * Run: npm run deploy
 * (loads .env via Node --env-file from package.json)
 */

import { execSync } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

const BUCKET = process.env.S3_BUCKET ?? "tekio";
const PREFIX = (process.env.S3_PREFIX ?? "integration/staging").replace(
  /\/?$/,
  "/",
);
const REGION = process.env.AWS_REGION ?? "eu-north-1";

/** Local path under `dist/`, and object key basename under the S3 prefix */
const ARTIFACTS = [
  { local: "sdk/shadow.js", key: "shadow.js" },
  { local: "sdk/shadow.css", key: "shadow.css" },
];

function assertCredentials() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error(
      "Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY. Use a .env file or export them before deploy.",
    );
    process.exit(1);
  }
}

function contentType(filePath) {
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}

async function main() {
  assertCredentials();

  console.log("Running npm run build...");
  execSync("npm run build", { cwd: ROOT, stdio: "inherit" });

  for (const { local } of ARTIFACTS) {
    const abs = join(DIST, local);
    if (!existsSync(abs)) {
      console.error(`Expected artifact missing after build: ${abs}`);
      process.exit(1);
    }
  }

  const client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  console.log(
    `Uploading ${ARTIFACTS.length} file(s) to s3://${BUCKET}/${PREFIX}`,
  );
  for (const { local, key } of ARTIFACTS) {
    const abs = join(DIST, local);
    const Key = `${PREFIX}${key}`;
    const Body = createReadStream(abs);
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key,
        Body,
        ContentType: contentType(abs),
        CacheControl: "public, max-age=300",
      }),
    );
    console.log(`  ${local} -> ${Key}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
