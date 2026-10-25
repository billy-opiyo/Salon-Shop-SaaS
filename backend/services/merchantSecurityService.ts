import "server-only"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class MerchantSecurityError extends Error {
	readonly code = "MERCHANT_SECURITY_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantSecurityError"
	}
}

export async function getSecuritySnapshot(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantSecurityError("Store not found.")
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
		"canManageSecurity",
	)
	const tenantMemberships = await prisma.membership.findMany({
		where: { tenantId: tenant.id, status: "ACTIVE" },
		select: { userId: true },
	})
	const tenantUserIds = tenantMemberships.map((item) => item.userId)
	const now = new Date()
	const todayStart = new Date(now)
	todayStart.setUTCHours(0, 0, 0, 0)
	const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60_000)
	const [logins, alerts, changes, timeline, sessions, loginCounts, alertCounts, todayLogins, repeatedFailures, lockedAccounts, suspiciousLogins] = await Promise.all([
		prisma.loginActivity.findMany({
			where: { tenantId: tenant.id },
			orderBy: { createdAt: "desc" },
			take: 1000,
			select: {
				id: true,
				userId: true,
				email: true,
				provider: true,
				status: true,
				riskLevel: true,
				riskScore: true,
				userAgent: true,
				country: true,
				createdAt: true,
			},
		}),
		prisma.securityAlert.findMany({
			where: { tenantId: tenant.id },
			orderBy: { createdAt: "desc" },
			take: 50,
			select: {
				id: true,
				severity: true,
				alertType: true,
				message: true,
				resolvedAt: true,
				createdAt: true,
			},
		}),
		prisma.accountChangeHistory.findMany({
			where: { tenantId: tenant.id },
			orderBy: { createdAt: "desc" },
			take: 50,
			select: { id: true, changeType: true, summary: true, createdAt: true },
		}),
		prisma.activityTimeline.findMany({
			where: { tenantId: tenant.id },
			orderBy: { createdAt: "desc" },
			take: 100,
			select: { id: true, userId: true, eventType: true, summary: true, createdAt: true },
		}),
		prisma.session.findMany({
			where: { userId: { in: tenantUserIds }, expires: { gt: now } },
			orderBy: { expires: "desc" },
			take: 800,
			select: {
				id: true,
				userId: true,
				expires: true,
				user: { select: { email: true, name: true } },
			},
		}),
		Promise.all([
			prisma.loginActivity.count({ where: { tenantId: tenant.id } }),
			prisma.loginActivity.count({ where: { tenantId: tenant.id, status: { equals: "success", mode: "insensitive" } } }),
			prisma.loginActivity.count({ where: { tenantId: tenant.id, status: { not: "success" } } }),
			prisma.loginActivity.count({ where: { tenantId: tenant.id, riskLevel: { equals: "high", mode: "insensitive" } } }),
			prisma.loginActivity.count({ where: { tenantId: tenant.id, createdAt: { gte: todayStart } } }),
			prisma.loginActivity.count({ where: { tenantId: tenant.id, provider: { equals: "google", mode: "insensitive" }, createdAt: { gte: todayStart } } }),
			prisma.loginActivity.count({ where: { tenantId: tenant.id, provider: { equals: "email/password", mode: "insensitive" }, createdAt: { gte: todayStart } } }),
		]),
		Promise.all([
			prisma.securityAlert.count({ where: { tenantId: tenant.id } }),
			prisma.securityAlert.count({ where: { tenantId: tenant.id, resolvedAt: null } }),
			prisma.securityAlert.count({ where: { tenantId: tenant.id, severity: { equals: "high", mode: "insensitive" } } }),
			prisma.accountChangeHistory.count({ where: { tenantId: tenant.id } }),
			prisma.activityTimeline.count({ where: { tenantId: tenant.id } }),
		]),
		prisma.loginActivity.findMany({
			where: { tenantId: tenant.id, createdAt: { gte: todayStart } },
			orderBy: { createdAt: "desc" },
			take: 2000,
			select: {
				id: true,
				userId: true,
				email: true,
				provider: true,
				status: true,
				createdAt: true,
				user: { select: { createdAt: true } },
			},
		}),
		prisma.loginActivity.findMany({
			where: {
				tenantId: tenant.id,
				status: { equals: "failure", mode: "insensitive" },
				createdAt: { gte: fifteenMinutesAgo },
			},
			orderBy: { createdAt: "desc" },
			take: 2000,
			select: { id: true, userId: true, email: true, createdAt: true },
		}),
		prisma.user.count({
			where: {
				blockedUntil: { gt: now },
				loginActivities: { some: { tenantId: tenant.id } },
			},
		}),
		prisma.loginActivity.count({
			where: {
				tenantId: tenant.id,
				riskLevel: { in: ["medium", "high"] },
			},
		}),
	])
	const todaySuccessfulLogins = todayLogins.filter(
		(item) => item.status.toLowerCase() === "success",
	)
	const newRegistrations = new Set(
		todaySuccessfulLogins
			.filter((item) => item.userId && item.user?.createdAt && item.user.createdAt >= todayStart)
			.map((item) => item.userId),
	).size
	const returningCustomers = new Set(
		todaySuccessfulLogins
			.filter((item) => item.userId && item.user?.createdAt && item.user.createdAt < todayStart)
			.map((item) => item.userId),
	).size
	const anonymousUsers = new Set(
		todayLogins
			.filter((item) => item.provider.toLowerCase() === "anonymous")
			.map((item) => item.userId ?? item.email?.toLowerCase() ?? item.id),
	).size
	const failureTimesByIdentity = new Map<string, Set<number>>()
	for (const item of repeatedFailures) {
		const identity = item.userId ?? item.email?.toLowerCase()
		if (!identity) continue
		const times = failureTimesByIdentity.get(identity) ?? new Set<number>()
		times.add(item.createdAt.getTime())
		failureTimesByIdentity.set(identity, times)
	}
	const repeatedWrongPasswords = [...failureTimesByIdentity.values()].filter(
		(times) => {
			const sortedTimes = [...times].sort((left, right) => right - left)
			const failuresInFiveMinutes = sortedTimes.filter(
				(time) => time >= now.getTime() - 5 * 60_000,
			).length
			return failuresInFiveMinutes >= 3 || sortedTimes.length >= 5
		},
	).length
	return {
		logins,
		alerts,
		changes,
		timeline,
		sessions,
		stats: {
			totalLogins: loginCounts[0],
			successfulLogins: loginCounts[1],
			failedLogins: loginCounts[2],
			failedLoginAttemptsToday: todayLogins.filter(
				(item) => item.status.toLowerCase() === "failure",
			).length,
			suspiciousLogins,
			lockedAccounts,
			repeatedWrongPasswords,
			highRiskLogins: loginCounts[3],
			totalLoginsToday: loginCounts[4],
			googleSignIns: loginCounts[5],
			emailSignIns: loginCounts[6],
			newRegistrations,
			returningCustomers,
			anonymousUsers,
			activeSessions: sessions.length,
			activeUsers: new Set(sessions.map((item) => item.userId)).size,
			totalAlerts: alertCounts[0],
			openAlerts: alertCounts[1],
			highSeverityAlerts: alertCounts[2],
			totalAccountChanges: alertCounts[3],
			totalTimelineEvents: alertCounts[4],
		},
	}
}
