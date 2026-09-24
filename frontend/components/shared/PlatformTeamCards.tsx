import type { PlatformTeamMemberView } from "@shared/types/platformTeam"

function safeHttpsUrl(value: string | null): string | null {
	if (!value) return null
	try {
		return new URL(value).protocol === "https:" ? value : null
	} catch {
		return null
	}
}

const socialLinks = [
	{ field: "websiteUrl", label: "Website", icon: "fas fa-globe" },
	{ field: "instagramUrl", label: "Instagram", icon: "fab fa-instagram" },
	{ field: "facebookUrl", label: "Facebook", icon: "fab fa-facebook" },
	{ field: "linkedinUrl", label: "LinkedIn", icon: "fab fa-linkedin" },
	{ field: "xUrl", label: "X", icon: "fab fa-x-twitter" },
] as const

export function PlatformTeamCards({
	members,
}: {
	readonly members: readonly PlatformTeamMemberView[]
}) {
	return (
		<div className="platform-team-grid">
			{members.map((member) => {
				const avatarUrl = safeHttpsUrl(member.avatarUrl)
				return (
					<article className="platform-team-public-card" key={member.id}>
						{avatarUrl ? (
							<img
								className="platform-team-public-card__avatar"
								src={avatarUrl}
								alt={`${member.name} profile`}
							/>
						) : (
							<div className="platform-team-public-card__avatar platform-team-public-card__avatar--empty" aria-hidden="true">
								{member.name.slice(0, 1).toUpperCase()}
							</div>
						)}
						<div className="platform-team-public-card__body">
							<h3>{member.name}</h3>
							<strong>{member.role}</strong>
							<p>{member.bio}</p>
						</div>
						<div className="platform-team-public-card__socials" aria-label={`${member.name} social links`}>
							{socialLinks.map(({ field, label, icon }) => {
								const href = safeHttpsUrl(member[field])
								return href ? <a href={href} key={field} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on ${label}`}><i className={icon} aria-hidden="true" /></a> : null
							})}
						</div>
					</article>
				)
			})}
		</div>
	)
}
