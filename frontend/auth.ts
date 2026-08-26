import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs"

import { prisma } from "@backend/db/prisma"
import { credentialsSchema } from "@shared/validation/auth"

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

				const user = await prisma.user.findUnique({
					where: { email: parsed.data.email.toLowerCase() },
				})
				if (
					!user?.passwordHash ||
					!user.emailVerified ||
					user.passwordResetRequired
				)
					return null

				const passwordMatches = await compare(
					parsed.data.password,
					user.passwordHash,
				)
				if (!passwordMatches) return null

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					image: user.image,
				}
			},
		}),
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
})
