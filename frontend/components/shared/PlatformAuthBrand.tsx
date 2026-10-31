import Image from "next/image"
import Link from "next/link"

export function PlatformAuthBrand({
	logoUrl,
	brandName,
	brandTagline,
}: {
	readonly logoUrl: string
	readonly brandName: string
	readonly brandTagline: string
}) {
	return (
		<Link className="brand-mark" href="/" aria-label={`${brandName} home`}>
			<Image
				className="brand-mark__image"
				src={logoUrl}
				alt={`${brandName} logo`}
				width={48}
				height={48}
				unoptimized={/^https?:\/\//i.test(logoUrl)}
			/>
			<span className="brand-mark__copy">
				<strong className="brand-mark__title">{brandName}</strong>
				<span className="brand-mark__tagline">{brandTagline}</span>
			</span>
		</Link>
	)
}
