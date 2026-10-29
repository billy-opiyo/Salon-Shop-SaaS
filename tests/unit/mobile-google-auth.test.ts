import { describe, expect, it } from "vitest"

import {
	isValidMobileGoogleChallenge,
	isValidMobileGoogleState,
	mobileGoogleTicketIdentifierPrefix,
} from "../../shared/mobileGoogleAuth"

describe("Beauty Sphia mobile Google handoff", () => {
	it("requires a UUID state and a base64url PKCE challenge", () => {
		expect(isValidMobileGoogleState("9ef0b404-907f-431e-9a4a-8a9127778d52")).toBe(true)
		expect(isValidMobileGoogleState("other-state")).toBe(false)
		expect(isValidMobileGoogleChallenge("A".repeat(43))).toBe(true)
		expect(isValidMobileGoogleChallenge("bad challenge")).toBe(false)
	})

	it("binds one short-lived ticket to the specific OAuth state and verifier challenge", () => {
		expect(mobileGoogleTicketIdentifierPrefix(
			"9ef0b404-907f-431e-9a4a-8a9127778d52",
			"A".repeat(43),
		)).toBe(`beauty-sphia:mobile-google:9ef0b404-907f-431e-9a4a-8a9127778d52:${"A".repeat(43)}:`)
	})
})
