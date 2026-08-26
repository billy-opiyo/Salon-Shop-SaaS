import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
	title: "Beauty Sphia",
	description: "Create and run a beautiful salon storefront from one platform.",
}

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	)
}
