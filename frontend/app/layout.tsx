import type { Metadata } from "next"
import "./globals.css"
import "../styles/not-found.css"

export const metadata: Metadata = {
	title: "Beauty Sphia",
	description: "Create and run a beautiful salon storefront from one platform.",
	icons: {
		icon: "/platform/Beauty Sphia logo.png",
		shortcut: "/platform/Beauty Sphia logo.png",
		apple: "/platform/Beauty Sphia logo.png",
	},
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
			<body>{children}</body>
		</html>
	)
}
