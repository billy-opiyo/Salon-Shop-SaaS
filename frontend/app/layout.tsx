import type { Metadata } from "next"
import "./globals.css"

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
				<link
					rel="stylesheet"
					href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
				/>
			</head>
			<body>{children}</body>
		</html>
	)
}
