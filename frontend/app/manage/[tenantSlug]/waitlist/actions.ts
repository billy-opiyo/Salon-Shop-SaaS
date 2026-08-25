"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	MerchantWaitlistError,
	updateWaitlistStatusForUser,
} from "@backend/services/merchantWaitlistService"

const waitlistStatuses = new Set([
	"WAITING",
	"CONTACTED",
	"BOOKED",
	"CANCELLED",
])

export async function updateWaitlistStatus(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const entryId = formData.get("entryId")
	const status = formData.get("status")
	if (
		typeof tenantSlug !== "string" ||
		typeof entryId !== "string" ||
		typeof status !== "string"
	)
		return
	if (!waitlistStatuses.has(status)) return
	try {
		await updateWaitlistStatusForUser(
			session.user.id,
			tenantSlug,
			entryId,
			status as "WAITING" | "CONTACTED" | "BOOKED" | "CANCELLED",
		)
		revalidatePath(`/manage/${tenantSlug}/waitlist`)
	} catch (error) {
		if (error instanceof MerchantWaitlistError) return
		return
	}
}
