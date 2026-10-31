import "server-only"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class MerchantScheduleError extends Error {
	readonly code = "MERCHANT_SCHEDULE_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantScheduleError"
	}
}

function timeLabelMinutes(value: string): number {
	const text = value.trim().toUpperCase().replace(/\./g, "").replace(/\s+/g, "")
	const match = /^(\d{1,2})(?::?(\d{2}))?(AM|PM)?$/.exec(text)
	if (!match) return Number.MAX_SAFE_INTEGER
	let hour = Number(match[1])
	const minute = Number(match[2] ?? 0)
	if (
		minute > 59 ||
		(match[3] ? hour < 1 || hour > 12 : hour > 23)
	)
		return Number.MAX_SAFE_INTEGER
	if (match[3] === "PM" && hour < 12) hour += 12
	if (match[3] === "AM" && hour === 12) hour = 0
	return hour * 60 + minute
}

export async function listScheduleForUser(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantScheduleError("Store not found.")
	const membership = await prisma.membership.findUnique({
		where: { tenantId_userId: { tenantId: tenant.id, userId } },
		select: {
			tenantId: true,
			userId: true,
			role: true,
			status: true,
			canManageAdmins: true,
			canManageBookings: true,
			canManageContent: true,
			canManageSecurity: true,
		},
	})
	assertTenantPermission(
		assertTenantMembership(membership, tenant.id),
		"canManageBookings",
	)
	const bookings = await prisma.booking.findMany({
		where: {
			tenantId: tenant.id,
			appointmentDate: { gte: new Date(new Date().toISOString().slice(0, 10)) },
			status: { notIn: ["CANCELLED", "COMPLETED"] },
		},
		orderBy: { appointmentDate: "asc" },
		take: 100,
		select: {
			id: true,
			firstName: true,
			lastName: true,
			serviceName: true,
			appointmentDate: true,
			timeLabel: true,
			status: true,
		},
	})
	return bookings.sort(
		(a, b) =>
			a.appointmentDate.getTime() - b.appointmentDate.getTime() ||
			timeLabelMinutes(a.timeLabel) - timeLabelMinutes(b.timeLabel) ||
			a.timeLabel.localeCompare(b.timeLabel),
	)
}
