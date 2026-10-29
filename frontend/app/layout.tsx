import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import "./globals.css"
import "../styles/not-found.css"
import { OfflineNotice } from "@/components/shared/OfflineNotice"
import { AndroidNativeBridge } from "@/components/shared/AndroidNativeBridge"
import { AndroidAppUpdatePrompt } from "@/components/shared/AndroidAppUpdatePrompt"
import { AndroidAppDownloadPrompt } from "@/components/shared/AndroidAppDownloadPrompt"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { resolveAndroidWebsiteChannel } from "@/lib/android-update-channel"

export async function generateMetadata(): Promise<Metadata> {
	const design = await getPlatformStorefrontDesign()
	return {
		title: design.branding.name,
		description: design.homeHero.description,
		icons: {
			icon: design.logoUrl,
			shortcut: design.logoUrl,
			apple: design.logoUrl,
		},
	}
}

export async function generateViewport(): Promise<Viewport> {
	const design = await getPlatformStorefrontDesign()
	return {
		colorScheme: "dark",
		themeColor: design.theme.background,
	}
}

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const requestHeaders = await headers()
	const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "")
		.split(",", 1)[0]
		.trim()
	const websiteOrigin = host ? `https://${host}` : ""
	const androidChannel = resolveAndroidWebsiteChannel(websiteOrigin, process.env.BEAUTY_SPHIA_PRODUCTION_URL)
	return (
		<html lang="en">
		<head>
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
			<link
				href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800&display=swap"
				rel="stylesheet"
			/>
			<link
					rel="stylesheet"
					href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
				/>
			</head>
			<body data-android-channel={androidChannel ?? undefined}>
				{children}
				<OfflineNotice />
				<AndroidNativeBridge />
				<AndroidAppUpdatePrompt channel={androidChannel} siteOrigin={androidChannel ? websiteOrigin : null} />
				<AndroidAppDownloadPrompt channel={androidChannel} />
			</body>
		</html>
	)
}
