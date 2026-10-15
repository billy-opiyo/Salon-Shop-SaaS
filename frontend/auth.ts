import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs"
import { headers } from "next/headers"

import { prisma } from "@backend/db/prisma"
import { recordLoginActivity } from "@backend/services/loginActivityService"
import {
	consumeRateLimit,
	hashRateLimitSubject,
	RateLimitExceededError,
} from "@backend/services/rateLimit"
import { credentialsSchema } from "@shared/validation/auth"

async function recordAuthenticationAttempt(input: {
	readonly userId?: string
	readonly email?: string | null
	readonly provider: string
	readonly status: "success" | "failure"
	readonly failureCode?: string
}): Promise<void> {
	try {
		const requestHeaders = await headers()
		await recordLoginActivity({
			...input,
			userAgent: requestHeaders.get("user-agent") ?? undefined,
			country:
				requestHeaders.get("x-vercel-ip-country") ??
				requestHeaders.get("cf-ipcountry") ??
				undefined,
			ipAddress:
				requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
				requestHeaders.get("x-real-ip") ??
				undefined,
		})
	} catch (error) {
		console.error("Could not record authentication activity", error)
	}
}

const googleProvider =
	process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
		? Google({
				clientId: process.env.AUTH_GOOGLE_ID,
				clientSecret: process.env.AUTH_GOOGLE_SECRET,
			})
		: null

export const { handlers, auth, signIn, signOut } = NextAuth({
	adapter: PrismaAdapter(prisma),
	secret: process.env.AUTH_SECRET,
	trustHost: true,
	session: { strategy: "jwt" },
	pages: { signIn: "/login" },
	providers: [
		Credentials({
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(rawCredentials) {
				const parsed = credentialsSchema.safeParse(rawCredentials)
				if (!parsed.success) return null
				const email = parsed.data.email.toLowerCase()
				try {
					await consumeRateLimit({
						subjectKey: hashRateLimitSubject(email),
						kind: "auth-login",
						intervalMs: 10_000,
					})
				} catch (error) {
					if (error instanceof RateLimitExceededError) return null
					throw error
				}

				const user = await prisma.user.findUnique({
					where: { email },
				})
				const recordFailure = async (failureCode: string) => {
					await recordAuthenticationAttempt({
						userId: user?.id,
						email,
						provider: "credentials",
						status: "failure",
						failureCode,
					})
					return null
				}
				if (!user) return recordFailure("account_not_found")
				if (user.blockedUntil && user.blockedUntil > new Date())
					return recordFailure("account_temporarily_locked")
				if (!user.passwordHash) return recordFailure("password_not_configured")
				if (!user.emailVerified) return recordFailure("email_not_verified")
				if (user.passwordResetRequired)
					return recordFailure("password_reset_required")

				const passwordMatches = await compare(
					parsed.data.password,
					user.passwordHash,
				)
				if (!passwordMatches) return recordFailure("invalid_credentials")
				await recordAuthenticationAttempt({
					userId: user.id,
					email: user.email,
					provider: "credentials",
					status: "success",
				})

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					image: user.image,
				}
			},
		}),
		...(googleProvider ? [googleProvider] : []),
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user?.id) token.id = user.id
			return token
		},
		async session({ session, token }) {
			if (session.user && typeof token.id === "string")
				session.user.id = token.id
			return session
		},
	},
	events: {
		async signIn({ user, account }) {
			if (account?.provider === "credentials" || !user.id) return
			await recordAuthenticationAttempt({
				userId: user.id,
				email: user.email,
				provider: account?.provider ?? "oauth",
				status: "success",
			})
		},
	},
})
