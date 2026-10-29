import { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

export const ANDROID_BUILD_TARGETS = Object.freeze({
	staging: Object.freeze({
		url: "https://beauty-sphia-staging.vercel.app",
		applicationId: "com.beautysphia.app.staging",
		appName: "Beauty Sphia Staging",
		apkName: "beauty-sphia-staging.apk",
		updateManifest: "beauty-sphia-staging-update.json",
	}),
	production: Object.freeze({
		urlEnv: "BEAUTY_SPHIA_PRODUCTION_URL",
		applicationId: "com.beautysphia.app",
		appName: "Beauty Sphia",
		apkName: "beauty-sphia.apk",
		updateManifest: "beauty-sphia-production-update.json",
	}),
})

const productionSigningEnv = [
	"BEAUTY_SPHIA_ANDROID_KEYSTORE",
	"BEAUTY_SPHIA_ANDROID_STORE_PASSWORD",
	"BEAUTY_SPHIA_ANDROID_KEY_ALIAS",
	"BEAUTY_SPHIA_ANDROID_KEY_PASSWORD",
]
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function parseHttpsOrigin(value, name) {
	let parsed
	try {
		parsed = new URL(value)
	} catch {
		throw new Error(`${name} must be a valid HTTPS origin.`)
	}
	if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
		throw new Error(`${name} must be an HTTPS origin without credentials, path, query, or fragment.`)
	}
	return parsed.origin
}

/** @param {NodeJS.ProcessEnv} env */
export function resolveAndroidBuildTarget(env) {
	const target = env.CAPACITOR_BUILD_TARGET?.trim()
	if (target !== "staging" && target !== "production") {
		throw new Error("Select an Android target explicitly: staging or production.")
	}
	const definition = ANDROID_BUILD_TARGETS[target]
	const url = target === "staging"
		? definition.url
		: parseHttpsOrigin(env[definition.urlEnv]?.trim() || "", definition.urlEnv)
	if (target === "production" && url === ANDROID_BUILD_TARGETS.staging.url) {
		throw new Error("Production Android builds cannot use the staging website origin.")
	}
	const configuredUrl = env.CAPACITOR_SERVER_URL?.trim()
	if (configuredUrl && configuredUrl !== url) {
		throw new Error(`CAPACITOR_SERVER_URL does not match the selected '${target}' target.`)
	}
	return { target, url, ...definition }
}

function commandExists(command, env) {
	const result = spawnSync(process.platform === "win32" ? "where.exe" : "which", [command], {
		encoding: "utf8",
		env,
		stdio: ["ignore", "pipe", "ignore"],
	})
	return result.status === 0 && Boolean(result.stdout.trim())
}

function javaHomeToolExists(name, env) {
	const executable = process.platform === "win32" ? `${name}.exe` : name
	const javaHomeCandidate = env.JAVA_HOME ? path.join(env.JAVA_HOME, "bin", executable) : ""
	return Boolean(javaHomeCandidate && existsSync(javaHomeCandidate)) || commandExists(name, env)
}

function findSdkTool(name, env) {
	const roots = [env.ANDROID_SDK_ROOT, env.ANDROID_HOME, env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Android", "Sdk")].filter(Boolean)
	for (const root of roots) {
		const tools = path.join(root, "build-tools")
		if (!existsSync(tools)) continue
		const versions = readdirSync(tools, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
		for (const version of versions) {
			const candidate = path.join(tools, version, process.platform === "win32" ? `${name}.exe` : name)
			if (existsSync(candidate)) return candidate
		}
	}
	return undefined
}

/** @param {NodeJS.ProcessEnv} env @param {"apk"|"aab"} type */
export function validateProductionReleaseEnvironment(env, type) {
	const selected = resolveAndroidBuildTarget(env)
	if (env.BEAUTY_SPHIA_PRODUCTION_RELEASE_ENABLED?.trim() !== "1") {
		throw new Error("Production APK/AAB generation is disabled until the production site is deployed and the release is approved.")
	}
	const missing = productionSigningEnv.filter((name) => !env[name]?.trim())
	if (missing.length) throw new Error(`Production signing is incomplete. Missing ${missing.join(", ")}; values are not displayed.`)
	const keystorePath = env.BEAUTY_SPHIA_ANDROID_KEYSTORE
	if (!path.isAbsolute(keystorePath) || !existsSync(keystorePath) || !statSync(keystorePath).isFile()) {
		throw new Error("BEAUTY_SPHIA_ANDROID_KEYSTORE must point to an existing keystore file using an absolute path.")
	}
	const repository = realpathSync(projectRoot)
	const keystore = realpathSync(keystorePath)
	const relative = path.relative(repository, keystore)
	if (!relative || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) {
		throw new Error("The production signing keystore must be stored outside the repository.")
	}
	const fingerprint = (env.BEAUTY_SPHIA_ANDROID_EXPECTED_CERT_SHA256 || "").replaceAll(":", "").trim()
	if (!/^[0-9a-f]{64}$/i.test(fingerprint)) {
		throw new Error("Set BEAUTY_SPHIA_ANDROID_EXPECTED_CERT_SHA256 to the approved production certificate SHA-256 fingerprint.")
	}
	const unavailable = type === "apk"
		? ["apksigner", "aapt"].filter((name) => !findSdkTool(name, env) && !commandExists(name, env))
		: ["java", "jarsigner", "keytool"].filter((name) => !javaHomeToolExists(name, env))
			.concat(env.BUNDLETOOL_JAR
				? (!existsSync(env.BUNDLETOOL_JAR) || !statSync(env.BUNDLETOOL_JAR).isFile() ? ["BUNDLETOOL_JAR"] : [])
				: (commandExists("bundletool", env) ? [] : ["bundletool"]))
	if (unavailable.length) throw new Error(`Production ${type.toUpperCase()} verification tools are unavailable: ${unavailable.join(", ")}.`)
	return selected
}

function runNode(args, env) {
	const result = spawnSync(process.execPath, args, { cwd: projectRoot, stdio: "inherit", env })
	if (result.error) throw result.error
	if (result.status !== 0) throw new Error(`Command failed with exit code ${result.status ?? "unknown"}.`)
}

function runGradle(task, env) {
	const wrapper = process.platform === "win32" ? ".\\gradlew.bat" : "./gradlew"
	const result = spawnSync(wrapper, [task], {
		cwd: path.join(projectRoot, "android"),
		stdio: "inherit",
		env,
		shell: process.platform === "win32",
	})
	if (result.error) throw result.error
	if (result.status !== 0) throw new Error(`Gradle ${task} failed with exit code ${result.status ?? "unknown"}.`)
}

export function renderAndroidStrings(xml, selected) {
	const values = {
		app_name: selected.appName,
		title_activity_main: selected.appName,
		package_name: selected.applicationId,
		custom_url_scheme: selected.applicationId,
	}
	for (const [name, value] of Object.entries(values)) {
		const escapedValue = value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
		const expression = new RegExp(`(<string name=["']${name}["']>)[^<]*(</string>)`)
		if (!expression.test(xml)) throw new Error(`Android strings.xml is missing the ${name} target identity.`)
		xml = xml.replace(expression, `$1${escapedValue}$2`)
	}
	return xml
}

function syncAndroidIdentity(selected) {
	const stringsPath = path.join(projectRoot, "android", "app", "src", "main", "res", "values", "strings.xml")
	if (!existsSync(stringsPath)) throw new Error("Android strings.xml is missing; run the Android platform add command first.")
	writeFileSync(stringsPath, renderAndroidStrings(readFileSync(stringsPath, "utf8"), selected))
}

function main([target, action]) {
	const env = { ...process.env }
	if (env.CAPACITOR_BUILD_TARGET?.trim() && env.CAPACITOR_BUILD_TARGET.trim() !== target) {
		throw new Error(`CAPACITOR_BUILD_TARGET conflicts with the requested '${target}' target.`)
	}
	const selected = resolveAndroidBuildTarget({ ...env, CAPACITOR_BUILD_TARGET: target })
	if (env.CAPACITOR_SERVER_URL?.trim() && env.CAPACITOR_SERVER_URL.trim() !== selected.url) {
		throw new Error(`CAPACITOR_SERVER_URL conflicts with the requested '${target}' target.`)
	}
	env.CAPACITOR_BUILD_TARGET = target
	env.CAPACITOR_SERVER_URL = selected.url
	env.CAPACITOR_APP_ID = selected.applicationId
	env.CAPACITOR_APP_NAME = selected.appName
	if (action === "validate") {
		console.log(JSON.stringify({ target, url: selected.url, applicationId: selected.applicationId, appName: selected.appName }))
		return
	}
	const cli = path.join(projectRoot, "node_modules", "@capacitor", "cli", "bin", "capacitor")
	const runCapacitor = (command) => runNode([cli, command, "android"], env)
	if (action === "add" && target === "staging") {
		runCapacitor("add")
		syncAndroidIdentity(selected)
		return
	}
	if (action === "sync") {
		runCapacitor("sync")
		syncAndroidIdentity(selected)
		return
	}
	if (action === "debug" && target === "staging") {
		runCapacitor("sync")
		syncAndroidIdentity(selected)
		return runGradle("copyStagingApk", env)
	}
	if (action === "release-apk" && target === "production") {
		validateProductionReleaseEnvironment(env, "apk")
		env.BEAUTY_SPHIA_RELEASE_WRAPPER = "1"
		runCapacitor("sync")
		syncAndroidIdentity(selected)
		return runGradle("copyProductionApk", env)
	}
	if (action === "release-aab" && target === "production") {
		validateProductionReleaseEnvironment(env, "aab")
		env.BEAUTY_SPHIA_RELEASE_WRAPPER = "1"
		runCapacitor("sync")
		syncAndroidIdentity(selected)
		return runGradle("copyProductionAab", env)
	}
	throw new Error(`Action '${action || "(missing)"}' is not allowed for target '${target}'.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		main(process.argv.slice(2))
	} catch (error) {
		console.error(error instanceof Error ? error.message : "Android build target selection failed.")
		process.exitCode = 1
	}
}
