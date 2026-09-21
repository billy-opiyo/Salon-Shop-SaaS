import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const projectRoot = resolve(import.meta.dirname, "../..")
const catalogPath = resolve(
	projectRoot,
	"frontend/components/tenant/SalonCatalog.tsx",
)
const publicRoot = resolve(projectRoot, "frontend/public")

	describe("native storefront asset contract", () => {
	it("contains only existing native salon asset paths", () => {
		const catalog = readFileSync(catalogPath, "utf8")
		const paths = [
			...catalog.matchAll(/\/assets\/salon\/[^"']+/g),
		].map((match) => match[0])
		expect(paths.length).toBeGreaterThan(0)
		for (const assetPath of new Set(paths)) {
			expect(existsSync(resolve(publicRoot, assetPath.slice(1)))).toBe(true)
		}
	})
})
