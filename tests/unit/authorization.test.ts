import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
	assertTenantMembership,
	assertTenantPermission,
	AuthorizationError,
} from "../../backend/services/authorization"

const membership = {
	tenantId: "tenant-a",
	userId: "user-a",
	role: "STAFF" as const,
	status: "ACTIVE" as const,
	canManageAdmins: false,
	canManageBookings: true,
	canManageContent: false,
	canManageSecurity: false,
}

describe("tenant authorization boundary", () => {
	it("rejects a membership from another tenant", () => {
		expect(() => assertTenantMembership(membership, "tenant-b")).toThrow(
			AuthorizationError,
		)
	})

	it("rejects inactive memberships", () => {
		expect(() =>
			assertTenantMembership(
				{ ...membership, status: "SUSPENDED" },
				"tenant-a",
			),
		).toThrow(AuthorizationError)
	})

	it("allows owners to use every tenant permission", () => {
		expect(() =>
			assertTenantPermission(
				{ ...membership, role: "OWNER" },
				"canManageSecurity",
			),
		).not.toThrow()
	})

	it("rejects staff without the requested permission", () => {
		expect(() =>
			assertTenantPermission(membership, "canManageSecurity"),
		).toThrow(AuthorizationError)
	})

	it("allows staff only for explicitly granted permissions", () => {
		expect(() =>
			assertTenantPermission(membership, "canManageBookings"),
		).not.toThrow()
	})
})
