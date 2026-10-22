import { auth } from "@/auth"
import { PlatformHeaderClient } from "@/components/shared/PlatformHeaderClient"

interface PlatformHeaderProps {
	readonly page?: "home" | "stores" | "about" | "support"
	readonly logoUrl?: string
}

export async function PlatformHeader({ page = "home", logoUrl = "/platform/Beauty Sphia logo.webp" }: PlatformHeaderProps) {
	const session = await auth()

	return <PlatformHeaderClient page={page} logoUrl={logoUrl} isSignedIn={Boolean(session?.user)} />
}
