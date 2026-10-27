import type { Metadata } from "next"
import "./globals.css"
import "../styles/not-found.css"
import { OfflineNotice } from "@/components/shared/OfflineNotice"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"

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

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
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
			<body>
				{children}
				<OfflineNotice />
			</body>
		</html>
	)
}
