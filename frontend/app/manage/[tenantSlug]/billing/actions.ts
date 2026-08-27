"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
	cancelSubscriptionForUser,
	changePlanForUser,
} from "@backend/services/merchantBillingService"
import type { PlanTier } from "@shared/types/tenant"

export async function cancelSubscription(formData: FormData) {
	const session = await auth()
	const tenantSlug = String(formData.get("tenantSlug") ?? "")
	if (!session?.user?.id || formData.get("confirmation") !== "confirmed") return
	await cancelSubscriptionForUser(session.user.id, tenantSlug)
	revalidatePath(`/manage/${tenantSlug}/billing`)
}

export async function changePlan(formData: FormData) {
	const session = await auth()
	const tenantSlug = String(formData.get("tenantSlug") ?? "")
	const tier = String(formData.get("tier") ?? "") as PlanTier
	if (
		!session?.user?.id ||
		!["starter", "business", "enterprise"].includes(tier)
	)
		return
	await changePlanForUser(session.user.id, tenantSlug, tier)
	revalidatePath(`/manage/${tenantSlug}/billing`)
}
