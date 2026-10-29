const MOBILE_GOOGLE_TICKET_PREFIX = "beauty-sphia:mobile-google:"

export function isValidMobileGoogleState(state: string): boolean {
	return /^[0-9a-f-]{36}$/i.test(state)
}

export function isValidMobileGoogleChallenge(challenge: string): boolean {
	return /^[A-Za-z0-9_-]{43}$/.test(challenge)
}

export function mobileGoogleTicketIdentifierPrefix(state: string, challenge: string): string {
	return `${MOBILE_GOOGLE_TICKET_PREFIX}${state}:${challenge}:`
}
