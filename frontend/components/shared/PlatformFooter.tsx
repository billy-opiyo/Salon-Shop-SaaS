import Link from "next/link"

import { CurrentYear } from "@/components/shared/CurrentYear"

type SocialIconName = "whatsapp" | "facebook" | "tiktok" | "instagram"

function SocialIcon({ name }: { readonly name: SocialIconName }) {
	return <i className={`platform-social-icon fab fa-${name}`} aria-hidden="true" />
}

export function PlatformFooter() {
	return (
		<footer className="platform-footer">
			<div className="platform-footer__grid">
				<div className="platform-footer__brand">
					<Link
						className="platform-footer__title"
						href="/"
						aria-label="Beauty Sphia Homepage"
					>
						Beauty Sphia
					</Link>
					<p>
						Manage your salon, book clients, and grow your brand in one
						place.
					</p>
				</div>
				<nav className="platform-footer__links" aria-label="Platform policies">
					<span className="eyebrow">Policies</span>
					<Link href="/privacy">Privacy Policy</Link>
					<Link href="/cookies">Cookie Policy</Link>
					<Link href="/terms">Terms of Service</Link>
				</nav>
				<div className="platform-footer__social">
					<span className="eyebrow">Connect with us</span>
					<div className="platform-social-links">
						<a
							href="https://wa.me/254740470381"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="WhatsApp"
						>
							<SocialIcon name="whatsapp" />
						</a>
						<a
							href="https://www.facebook.com/"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Facebook"
						>
							<SocialIcon name="facebook" />
						</a>
						<a
							href="https://www.tiktok.com/"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="TikTok"
						>
							<SocialIcon name="tiktok" />
						</a>
						<a
							href="https://www.instagram.com/"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Instagram"
						>
							<SocialIcon name="instagram" />
						</a>
					</div>
				</div>
			</div>
			<div className="platform-footer__bottom">
				<span>
					© <CurrentYear /> Beauty Sphia
				</span>
				<Link href="/">Beauty Sphia Homepage</Link>
			</div>
		</footer>
	)
}
