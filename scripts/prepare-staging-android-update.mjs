import { copyFileSync, mkdirSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { verifyAndroidReleaseArtifact } from "./verify-android-release.mjs"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const artifact = process.argv[2]
if (!artifact) throw new Error("Pass the verified staging APK path.")

const verified = verifyAndroidReleaseArtifact({ type: "apk", artifact: path.resolve(artifact) })
if (verified.target !== "staging" || verified.applicationId !== "com.beautysphia.app.staging") {
  throw new Error("Refusing to place a non-staging APK in the staging update channel.")
}

const downloadsDirectory = path.join(projectRoot, "frontend", "public", "downloads")
mkdirSync(downloadsDirectory, { recursive: true })
const apkPath = path.join(downloadsDirectory, "beauty-sphia-staging.apk")
const manifestPath = path.join(downloadsDirectory, "beauty-sphia-staging-update.json")
const temporaryManifestPath = `${manifestPath}.tmp`
const manifest = {
  enabled: true,
  channel: "staging",
  applicationId: verified.applicationId,
  versionCode: verified.versionCode,
  versionName: verified.versionName,
  apkUrl: "/downloads/beauty-sphia-staging.apk",
  signingCertificateSha256: verified.certificateSha256,
  releaseNotes: "Pull-to-refresh no longer selects page text while dragging.",
}

copyFileSync(path.resolve(artifact), apkPath)
writeFileSync(temporaryManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
renameSync(temporaryManifestPath, manifestPath)
console.log(`Staging update artifacts prepared for version ${verified.versionName} (${verified.versionCode}).`)
