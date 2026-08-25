"use server"

import { MessageStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	deleteMessage,
	MerchantMessageError,
	updateMessageStatus,
} from "@backend/services/merchantMessageService"

export async function setMessageStatus(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const messageId = formData.get("messageId")
	const status = formData.get("status")
	if (
		typeof tenantSlug !== "string" ||
		typeof messageId !== "string" ||
		!["NEW", "READ", "RESOLVED"].includes(String(status))
	)
		return
	try {
		await updateMessageStatus(
			session.user.id,
			tenantSlug,
			messageId,
			status as MessageStatus,
		)
		revalidatePath(`/manage/${tenantSlug}/messages`)
	} catch (error) {
		if (error instanceof MerchantMessageError) return
		throw error
	}
}

export async function removeMessage(formData: FormData): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const tenantSlug = formData.get("tenantSlug")
	const messageId = formData.get("messageId")
	if (typeof tenantSlug !== "string" || typeof messageId !== "string") return
	try {
		await deleteMessage(session.user.id, tenantSlug, messageId)
		revalidatePath(`/manage/${tenantSlug}/messages`)
	} catch (error) {
		if (error instanceof MerchantMessageError) return
		throw error
	}
}
