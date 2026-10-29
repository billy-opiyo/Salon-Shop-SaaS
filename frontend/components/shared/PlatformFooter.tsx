import Link from "next/link"

import { CurrentYear } from "@/components/shared/CurrentYear"
import { MobileAppSwitchLink } from "@/components/shared/MobileAppSwitchLink"

type SocialIconName = "whatsapp" | "facebook" | "tiktok" | "instagram"

function SocialIcon({ name }: { readonly name: SocialIconName }) {
	return <i className={`platform-social-icon fab fa-${name}`} aria-hidden="true" />
}

export function PlatformFooter({
	brandName = "Beauty Sphia",
	description = "Manage your salon, book clients, and grow your brand in one place.",
	supportEmail = "support@beautysphia.com",
	phone = "+254740470381",
	whatsappUrl = "https://wa.me/254740470381",
	facebookUrl = "https://www.facebook.com/",
	instagramUrl = "https://www.instagram.com/",
	tiktokUrl = "https://www.tiktok.com/",
}: {
	readonly brandName?: string
	readonly description?: string
	readonly supportEmail?: string
	readonly phone?: string
	readonly whatsappUrl?: string
	readonly facebookUrl?: string
	readonly instagramUrl?: string
	readonly tiktokUrl?: string
}) {
	return (
		<footer className="platform-footer">
			<div className="platform-footer__grid">
				<div className="platform-footer__brand">
					<Link className="platform-footer__title" href="/" aria-label={`${brandName} Homepage`}>
						{brandName}
					</Link>
					<p>{description}</p>
				</div>
				<nav className="platform-footer__links" aria-label="Platform">
					<span className="eyebrow">Platform</span>
					<Link href="/support">Salon Owner Support</Link>
					<Link href="/about">About Us</Link>
					<Link href="/#contact">Contact</Link>
					<a href={`mailto:${supportEmail}`}>{supportEmail}</a>
					<a href={`tel:${phone}`}>{phone}</a>
					<MobileAppSwitchLink />
				</nav>
				<nav className="platform-footer__links platform-footer__policies" aria-label="Policies">
					<span className="eyebrow">Policies</span>
					<Link href="/privacy">Privacy Policy</Link>
					<Link href="/cookies">Cookie Policy</Link>
					<Link href="/terms">Terms of Service</Link>
				</nav>
				<div className="platform-footer__social">
					<span className="eyebrow">Connect with us</span>
					<div className="platform-social-links">
						<a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
							<SocialIcon name="whatsapp" />
						</a>
						<a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><SocialIcon name="facebook" /></a>
						<a href={tiktokUrl} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><SocialIcon name="tiktok" /></a>
						<a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><SocialIcon name="instagram" /></a>
					</div>
				</div>
			</div>
			<div className="platform-footer__bottom">
				<span>© <CurrentYear /> {brandName}</span>
				<Link href="/">{brandName} Homepage</Link>
			</div>
		</footer>
	)
}
