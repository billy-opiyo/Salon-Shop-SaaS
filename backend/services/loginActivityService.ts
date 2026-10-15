import "server-only"

import { createHash } from "node:crypto"

import { prisma } from "@backend/db/prisma"

const FAILURE_WINDOW_MS = 15 * 60 * 1000
const REPEATED_FAILURE_WINDOW_MS = 5 * 60 * 1000
const LOCK_THRESHOLD = 5
const REPEATED_FAILURE_THRESHOLD = 3
const LOCK_DURATION_MS = 30 * 60 * 1000

export interface LoginActivityInput {
	readonly userId?: string
	readonly email?: string | null
	readonly provider: string
	readonly status: "success" | "failure"
	readonly failureCode?: string
	readonly userAgent?: string
	readonly ipAddress?: string
	readonly country?: string
	readonly now?: Date
}

function maskIpHash(ipAddress: string | undefined): string | null {
	const normalized = ipAddress?.trim()
	return normalized
		? createHash("sha256").update(normalized).digest("hex")
		: null
}

function uniqueEventTimes(records: readonly { createdAt: Date }[]): number[] {
	return [...new Set(records.map((record) => record.createdAt.getTime()))]
}

export async function recordLoginActivity(
	input: LoginActivityInput,
): Promise<void> {
	const now = input.now ?? new Date()
	const normalizedEmail = input.email?.trim().toLowerCase() || null
	const user = input.userId
		? await prisma.user.findUnique({
				where: { id: input.userId },
				select: {
					id: true,
					blockedUntil: true,
					memberships: {
						where: { status: "ACTIVE" },
						select: { tenantId: true },
					},
				},
			})
		: null
	const tenantIds =
		user?.memberships.map((membership) => membership.tenantId) ?? []
	const identityWhere = input.userId
		? {
				OR: [
					{ userId: input.userId },
					...(normalizedEmail ? [{ email: normalizedEmail }] : []),
				],
			}
		: normalizedEmail
			? { email: normalizedEmail }
			: undefined

	let failedInFiveMinutes = 0
	let failedInFifteenMinutes = 0
	let newDevice = false
	if (identityWhere) {
		const [failures, successes] = await Promise.all([
			input.status === "failure"
				? prisma.loginActivity.findMany({
						where: {
							...identityWhere,
							status: "failure",
							createdAt: { gte: new Date(now.getTime() - FAILURE_WINDOW_MS) },
						},
						select: { createdAt: true },
					})
				: Promise.resolve([]),
			input.status === "success" && input.userId
				? prisma.loginActivity.findMany({
						where: { userId: input.userId, status: "success" },
						orderBy: { createdAt: "desc" },
						take: 25,
						select: { userAgent: true },
					})
				: Promise.resolve([]),
		])
		const failureTimes = uniqueEventTimes(failures)
		failedInFifteenMinutes =
			failureTimes.length + (input.status === "failure" ? 1 : 0)
		failedInFiveMinutes =
			failureTimes.filter(
				(createdAt) => createdAt >= now.getTime() - REPEATED_FAILURE_WINDOW_MS,
			).length + (input.status === "failure" ? 1 : 0)
		newDevice =
			input.status === "success" &&
			successes.length > 0 &&
			!successes.some((entry) => entry.userAgent === (input.userAgent ?? null))
	}

	const lockTriggered =
		input.status === "failure" && failedInFifteenMinutes >= LOCK_THRESHOLD
	const alreadyLocked = Boolean(user?.blockedUntil && user.blockedUntil > now)
	const setLock = lockTriggered && user && !alreadyLocked
	const riskScore = lockTriggered
		? 90
		: failedInFiveMinutes >= REPEATED_FAILURE_THRESHOLD
			? 65
			: newDevice
				? 45
				: 10
	const riskLevel =
		riskScore >= 80 ? "high" : riskScore >= 40 ? "medium" : "low"
	const createdAt = now
	const rows = (tenantIds.length ? tenantIds : [null]).map((tenantId) => ({
		tenantId,
		userId: input.userId ?? null,
		email: normalizedEmail,
		provider: input.provider,
		status: input.status,
		failureCode: input.failureCode?.slice(0, 80) ?? null,
		riskScore,
		riskLevel,
		ipHash: maskIpHash(input.ipAddress),
		userAgent: input.userAgent?.slice(0, 500) ?? null,
		country: input.country?.slice(0, 80) ?? null,
		createdAt,
	}))

	await prisma.loginActivity.createMany({ data: rows })

	if (setLock) {
		const lockUntil = new Date(now.getTime() + LOCK_DURATION_MS)
		const updated = await prisma.user.updateMany({
			where: {
				id: user.id,
				OR: [{ blockedUntil: null }, { blockedUntil: { lte: now } }],
			},
			data: { blockedUntil: lockUntil },
		})
		if (updated.count > 0) {
			await prisma.securityAlert.createMany({
				data: (tenantIds.length ? tenantIds : [null]).map((tenantId) => ({
					tenantId,
					userId: user.id,
					severity: "high",
					alertType: "multiple_failed_login_attempts",
					message:
						"Account temporarily locked after repeated failed login attempts.",
					createdAt: now,
				})),
			})
		}
	}

	if (newDevice && user && tenantIds.length) {
		await prisma.securityAlert.createMany({
			data: tenantIds.map((tenantId) => ({
				tenantId,
				userId: user.id,
				severity: "medium",
				alertType: "new_device_detected",
				message: "Login from a new browser or device.",
				createdAt: now,
			})),
		})
	}
}
