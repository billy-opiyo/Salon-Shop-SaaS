import "server-only"

import { prisma } from "@backend/db/prisma"

export async function flagPaymentForManualReview(
	attemptId: string,
	reason: "duplicate" | "refund_requested" | "other",
) {
	return prisma.paymentAttempt.update({
		where: { id: attemptId },
		data: { status: "manual_review", resultDescription: reason },
	})
}
