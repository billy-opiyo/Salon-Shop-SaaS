"use client"

import { PlatformBackToTop } from "@/components/shared/PlatformBackToTop"

// Platform contact stays independent from the tenant-specific storefront settings.
export function PlatformFloatingActions({ whatsappUrl = "https://wa.me/254740470381" }: { readonly whatsappUrl?: string }) {
	return (
		<>
			<a
				href={`${whatsappUrl}${whatsappUrl.includes("?") ? "&" : "?"}text=${encodeURIComponent("Hello Beauty Sphia, I would like to know more about the platform.")}`}
				className="platform-floating-whatsapp"
				aria-label="Contact Beauty Sphia on WhatsApp"
				target="_blank"
				rel="noopener noreferrer"
			>
				<i className="fab fa-whatsapp" aria-hidden="true" />
			</a>
			<PlatformBackToTop />
		</>
	)
}
