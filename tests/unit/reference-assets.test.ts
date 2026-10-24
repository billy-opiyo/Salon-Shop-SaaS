import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
	DEFAULT_SALON_BLOGS,
	DEFAULT_SALON_GALLERY,
} from "@shared/constants/legacySalonCatalog"

const projectRoot = resolve(import.meta.dirname, "../..")
const publicRoot = resolve(projectRoot, "frontend/public")
const storefrontPagePath = resolve(
	projectRoot,
	"frontend/app/[tenantSlug]/page.tsx",
)

describe("native storefront asset contract", () => {
	it("contains only existing native salon asset paths", () => {
		const storefrontPage = readFileSync(storefrontPagePath, "utf8")
		const pageAssetPaths = [
			...storefrontPage.matchAll(/\/assets\/salon\/[^"']+/g),
		].map((match) => match[0])
		const catalogAssetPaths = [
			...DEFAULT_SALON_GALLERY.flatMap((item) => [
				item.imageUrl,
				item.beforeImageUrl,
			]),
			...DEFAULT_SALON_BLOGS.map((item) => item.imageUrl),
		].filter((path): path is string => Boolean(path))
		const paths = [...new Set([...pageAssetPaths, ...catalogAssetPaths])]

		expect(paths.length).toBeGreaterThan(0)
		for (const assetPath of paths) {
			expect(assetPath).toMatch(/^\/assets\/salon\//)
			expect(existsSync(resolve(publicRoot, assetPath.slice(1)))).toBe(true)
		}
	})
})
