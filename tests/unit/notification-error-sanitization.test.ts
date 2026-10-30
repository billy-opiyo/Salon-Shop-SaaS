import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("../../backend/db/prisma", () => ({ prisma: {} }))

import { sanitizeNotificationErrorMessage } from "../../backend/services/notificationService"

describe("notification provider error sanitization", () => {
	it("hides email addresses while retaining the provider's actionable message", () => {
		expect(
			sanitizeNotificationErrorMessage(
				"Only send testing emails to babsohaleem01@gmail.com; verify a domain first.",
			),
		).toBe("Only send testing emails to [redacted email]; verify a domain first.")
	})
})
