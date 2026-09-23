import "server-only"

import { WaitlistStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"

export interface WaitlistSlotIdentity {
	readonly preferredDate: Date | null
	readonly preferredTime: string | null
	readonly preferredStylist: string | null
}

const ACTIVE_QUEUE_STATUSES: WaitlistStatus[] = [
	WaitlistStatus.WAITING,
	WaitlistStatus.NOTIFIED,
	WaitlistStatus.CONTACTED,
	WaitlistStatus.NOTIFICATION_FAILED,
]

export async function recalculateWaitlistQueuePositions(
	tenantId: string,
	slot: WaitlistSlotIdentity,
): Promise<void> {
	const entries = await prisma.waitlistEntry.findMany({
		where: {
			tenantId,
			preferredDate: slot.preferredDate,
			preferredTime: slot.preferredTime,
			preferredStylist: slot.preferredStylist,
		},
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: { id: true, status: true },
	})
	const active = entries.filter((entry) =>
		ACTIVE_QUEUE_STATUSES.includes(entry.status),
	)
	const activePosition = new Map(
		active.map((entry, index) => [entry.id, index + 1]),
	)
	if (!entries.length) return

	await prisma.$transaction(
		entries.map((entry) =>
			prisma.waitlistEntry.update({
				where: { id: entry.id },
				data: { queuePosition: activePosition.get(entry.id) ?? 0 },
			}),
		),
	)
}
