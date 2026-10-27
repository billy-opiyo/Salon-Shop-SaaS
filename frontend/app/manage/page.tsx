import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"

export default async function ManagePage() {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath("/account"))
	redirect("/account")
}
