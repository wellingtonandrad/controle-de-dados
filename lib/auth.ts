import NextAuth from "next-auth"
import prisma from "./prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Adapter } from "next-auth/adapters"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  trustHost: true,
  // Em produção o Auth.js exige secret; no Vercel usa AUTH_SECRET (ou legados abaixo).
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.BETTER_AUTH_SECRET,
  providers: [
    GitHub,
    Google({
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
})


