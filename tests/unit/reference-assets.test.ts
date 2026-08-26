import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const projectRoot = resolve(import.meta.dirname, "../..")
const scriptPath = resolve(
	projectRoot,
	"frontend/public/reference/JS/script.js",
)
const publicRoot = resolve(projectRoot, "frontend/public")

describe("reference asset contract", () => {
	it("contains only existing absolute fallback gallery image paths", () => {
		const script = readFileSync(scriptPath, "utf8")
		const paths = [
			...script.matchAll(/(?:imageUrl|beforeImageUrl):\s*"([^"]+)"/g),
		].map((match) => match[1])
		expect(paths.length).toBeGreaterThan(0)
		for (const assetPath of paths) {
			expect(assetPath).toMatch(/^\/reference\/IMG\/.+/)
			expect(existsSync(resolve(publicRoot, assetPath.slice(1)))).toBe(true)
		}
	})
})
