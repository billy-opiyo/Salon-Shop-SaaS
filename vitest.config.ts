import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
	resolve: {
		alias: {
			"@backend": path.resolve(__dirname, "backend"),
			"@shared": path.resolve(__dirname, "shared"),
		},
	},
	test: {
		environment: "node",
		include: ["tests/unit/**/*.test.ts"],
	},
})
