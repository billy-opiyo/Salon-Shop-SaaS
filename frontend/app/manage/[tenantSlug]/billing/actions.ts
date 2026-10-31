"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
	cancelSubscriptionForUser,
	changePlanForUser,
	MerchantBillingError,
} from "@backend/services/merchantBillingService"
import type { PlanTier } from "@shared/types/tenant"

export interface ChangePlanResult {
	readonly ok: boolean
	readonly message: string
}

export async function cancelSubscription(
	_previous: ChangePlanResult,
	formData: FormData,
): Promise<ChangePlanResult> {
	const session = await auth()
	const tenantSlug = String(formData.get("tenantSlug") ?? "").trim()
	if (!session?.user?.id)
		return { ok: false, message: "Sign in again before changing billing settings." }
	if (!tenantSlug || formData.get("confirmation") !== "confirmed")
		return { ok: false, message: "Confirm the cancellation details and try again." }
	try {
		await cancelSubscriptionForUser(session.user.id, tenantSlug)
		revalidatePath(`/manage/${tenantSlug}/billing`)
		return {
			ok: true,
			message: "Cancellation saved. Your billing summary now shows when it takes effect.",
		}
	} catch (error) {
		return {
			ok: false,
			message: error instanceof MerchantBillingError
				? error.message
				: "The subscription could not be cancelled. Please try again.",
		}
	}
}

export async function changePlan(
	_previous: ChangePlanResult,
	formData: FormData,
): Promise<ChangePlanResult> {
	const session = await auth()
	const tenantSlug = String(formData.get("tenantSlug") ?? "")
	const tier = String(formData.get("tier") ?? "") as PlanTier
	if (
		!session?.user?.id ||
		!["starter", "business", "enterprise"].includes(tier)
	)
		return { ok: false, message: "Choose a valid plan and try again." }
	try {
		await changePlanForUser(session.user.id, tenantSlug, tier)
		revalidatePath(`/manage/${tenantSlug}/billing`)
		return {
			ok: true,
			message: "Plan change saved. Any adjustment invoice is listed above; the selected tier takes effect at renewal.",
		}
	} catch (error) {
		return {
			ok: false,
			message: error instanceof MerchantBillingError
				? error.message
				: "The plan could not be changed. Please try again.",
		}
	}
}
