import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { inflateRawSync } from "node:zlib"
import { spawnSync } from "node:child_process"

import { resolveAndroidBuildTarget } from "./android-build.mjs"

export function readZipEntry(zipBuffer, entryName) {
	let eocdOffset = -1
	const scanStart = Math.max(0, zipBuffer.length - 22 - 0xffff)
	for (let offset = zipBuffer.length - 22; offset >= scanStart; offset -= 1) {
		if (zipBuffer.readUInt32LE(offset) === 0x06054b50) { eocdOffset = offset; break }
	}
	if (eocdOffset < 0) throw new Error("Android artifact is not a supported ZIP package.")
	const entryCount = zipBuffer.readUInt16LE(eocdOffset + 10)
	let cursor = zipBuffer.readUInt32LE(eocdOffset + 16)
	for (let index = 0; index < entryCount; index += 1) {
		if (zipBuffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Android artifact ZIP directory is invalid.")
		const method = zipBuffer.readUInt16LE(cursor + 10)
		const compressedSize = zipBuffer.readUInt32LE(cursor + 20)
		const nameLength = zipBuffer.readUInt16LE(cursor + 28)
		const extraLength = zipBuffer.readUInt16LE(cursor + 30)
		const commentLength = zipBuffer.readUInt16LE(cursor + 32)
		const localOffset = zipBuffer.readUInt32LE(cursor + 42)
		const name = zipBuffer.toString("utf8", cursor + 46, cursor + 46 + nameLength)
		if (name === entryName) {
			if (zipBuffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Android artifact ZIP entry is invalid.")
			const localNameLength = zipBuffer.readUInt16LE(localOffset + 26)
			const localExtraLength = zipBuffer.readUInt16LE(localOffset + 28)
			const dataOffset = localOffset + 30 + localNameLength + localExtraLength
			const compressed = zipBuffer.subarray(dataOffset, dataOffset + compressedSize)
			if (method === 0) return compressed
			if (method === 8) return inflateRawSync(compressed)
			throw new Error("Android artifact uses unsupported ZIP compression for its Capacitor config.")
		}
		cursor += 46 + nameLength + extraLength + commentLength
	}
	throw new Error(`Android artifact is missing ${entryName}.`)
}

export function normalizeSha256(value) {
	return String(value || "").replace(/^SHA-?256\s*:\s*/i, "").replaceAll(":", "").replaceAll(" ", "").trim().toLowerCase()
}

function requireExpectedCertificate(actual, expected) {
	const actualHash = normalizeSha256(actual)
	const expectedHash = normalizeSha256(expected)
	if (!/^[0-9a-f]{64}$/.test(expectedHash) || actualHash !== expectedHash) {
		throw new Error("The production artifact certificate does not match BEAUTY_SPHIA_ANDROID_EXPECTED_CERT_SHA256.")
	}
	return actualHash
}

function sdkTool(name, env) {
	const roots = [env.ANDROID_SDK_ROOT, env.ANDROID_HOME, env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Android", "Sdk")].filter(Boolean)
	for (const root of roots) {
		const directory = path.join(root, "build-tools")
		if (!existsSync(directory)) continue
		const versions = readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory())
			.map((entry) => entry.name).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
		for (const version of versions) {
			for (const extension of process.platform === "win32" ? [".exe", ".bat", ""] : [""]) {
				const candidate = path.join(directory, version, `${name}${extension}`)
				if (existsSync(candidate)) return candidate
			}
		}
	}
	return name
}

function run(command, args, env) {
	const usesBatch = process.platform === "win32" && /\.(bat|cmd)$/i.test(command)
	const safeArgs = usesBatch ? args.map((value) => `"${String(value).replaceAll('"', '""')}"`) : args
	const result = spawnSync(command, safeArgs, { encoding: "utf8", env, windowsHide: true, maxBuffer: 8 * 1024 * 1024, shell: usesBatch })
	if (result.error || result.status !== 0) throw new Error(`Android artifact verification failed: ${path.basename(command)}.`)
	return `${result.stdout || ""}\n${result.stderr || ""}`
}

function sourceVersion(projectRoot) {
	const gradle = readFileSync(path.join(projectRoot, "android", "app", "build.gradle"), "utf8")
	const code = gradle.match(/versionCode\s+(\d+)/)
	const name = gradle.match(/versionName\s+["']([^"']+)["']/)
	if (!code || !name) throw new Error("Could not read Android versionCode and versionName from Gradle.")
	return { versionCode: code[1], versionName: name[1] }
}

function verifyConfig(configText, selected) {
	let config
	try { config = JSON.parse(configText) }
	catch { throw new Error("The packaged Capacitor config is invalid JSON.") }
	if (config?.appId !== selected.applicationId || config?.server?.url !== selected.url || config?.server?.cleartext !== false) {
		throw new Error("The Android artifact does not contain the selected HTTPS origin, app ID, and cleartext-disabled setting.")
	}
}

function certificateFromApk(artifact, env, selected, expectedVersion) {
	const signerOutput = run(sdkTool("apksigner", env), ["verify", "--print-certs", artifact], env)
	const certificate = signerOutput.match(/Signer #\d+ certificate SHA-256 digest:\s*([0-9a-f:]+)/i)?.[1]
	if (!certificate) throw new Error("Could not read the APK signing certificate.")
	const metadata = run(sdkTool("aapt", env), ["dump", "badging", artifact], env)
	const packageData = metadata.match(/^package:\s+name='([^']+)'\s+versionCode='([^']+)'\s+versionName='([^']*)'/m)
	if (!packageData || packageData[1] !== selected.applicationId
		|| packageData[2] !== expectedVersion.versionCode || packageData[3] !== expectedVersion.versionName) {
		throw new Error("APK package ID or version does not match the selected Android target and Gradle version.")
	}
	verifyConfig(readZipEntry(readFileSync(artifact), "assets/capacitor.config.json").toString("utf8"), selected)
	return normalizeSha256(certificate)
}

function certificateFromAab(artifact, env, selected, expectedVersion) {
	const java = env.JAVA_HOME ? path.join(env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java") : "java"
	const keytool = env.JAVA_HOME ? path.join(env.JAVA_HOME, "bin", process.platform === "win32" ? "keytool.exe" : "keytool") : "keytool"
	const jarsigner = env.JAVA_HOME ? path.join(env.JAVA_HOME, "bin", process.platform === "win32" ? "jarsigner.exe" : "jarsigner") : "jarsigner"
	const bundletool = env.BUNDLETOOL_JAR ? { command: java, prefix: ["-jar", env.BUNDLETOOL_JAR] } : { command: "bundletool", prefix: [] }
	const signature = run(jarsigner, ["-verify", artifact], env)
	if (!/\bjar verified\./i.test(signature) || /\bjar is unsigned\b|signature.*invalid|digest.*invalid/i.test(signature)) {
		throw new Error("The AAB JAR signature did not pass verification.")
	}
	const certificateOutput = run(keytool, ["-printcert", "-jarfile", artifact], env)
	const fingerprint = certificateOutput.match(/SHA-?256\s*:\s*([0-9a-f: ]+)/i)?.[1]
	if (!fingerprint) throw new Error("Could not read the AAB signing certificate.")
	run(bundletool.command, [...bundletool.prefix, "validate", `--bundle=${artifact}`], env)
	const manifest = run(bundletool.command, [...bundletool.prefix, "dump", "manifest", `--bundle=${artifact}`, "--module=base"], env)
	const appId = manifest.match(/\bpackage=["']([^"']+)["']/)?.[1]
	const versionCode = manifest.match(/\bandroid:versionCode=["']([^"']+)["']/)?.[1]
	const versionName = manifest.match(/\bandroid:versionName=["']([^"']*)["']/)?.[1]
	if (appId !== selected.applicationId || versionCode !== expectedVersion.versionCode || versionName !== expectedVersion.versionName) {
		throw new Error("AAB package ID or version does not match the selected Android target and Gradle version.")
	}
	verifyConfig(readZipEntry(readFileSync(artifact), "base/assets/capacitor.config.json").toString("utf8"), selected)
	return normalizeSha256(fingerprint)
}

export function verifyAndroidReleaseArtifact({ artifact, type, env = process.env, projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..") }) {
	if (!existsSync(artifact)) throw new Error("Android artifact does not exist.")
	if (type !== "apk" && type !== "aab") throw new Error("Artifact type must be apk or aab.")
	const selected = resolveAndroidBuildTarget(env)
	const expectedVersion = sourceVersion(projectRoot)
	const certificateSha256 = type === "apk"
		? certificateFromApk(artifact, env, selected, expectedVersion)
		: certificateFromAab(artifact, env, selected, expectedVersion)
	if (selected.target === "production") requireExpectedCertificate(certificateSha256, env.BEAUTY_SPHIA_ANDROID_EXPECTED_CERT_SHA256)
	return {
		target: selected.target,
		applicationId: selected.applicationId,
		serverUrl: selected.url,
		type,
		sha256: createHash("sha256").update(readFileSync(artifact)).digest("hex"),
		certificateSha256,
		versionCode: Number(expectedVersion.versionCode),
		versionName: expectedVersion.versionName,
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const [type, artifact] = process.argv.slice(2)
		if (!type || !artifact) throw new Error("Usage: node scripts/verify-android-release.mjs <apk|aab> <artifact-path>")
		const result = verifyAndroidReleaseArtifact({ type, artifact: path.resolve(artifact) })
		console.log(`${type.toUpperCase()} verified for ${result.target} (${result.applicationId}); SHA-256 ${result.sha256}; certificate ${result.certificateSha256}`)
	} catch (error) {
		console.error(error instanceof Error ? error.message : "Android artifact verification failed.")
		process.exitCode = 1
	}
}
