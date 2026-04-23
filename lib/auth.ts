import NextAuth from "next-auth"
import prisma from "./prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Adapter } from "next-auth/adapters"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { shouldAutoApproveClinic } from "@/app/utils/auth/clinic-access"

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
  callbacks: {
    async signIn({ user }) {
      try {
        if (!user.email) return true

        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { role: true, clinicVerified: true },
        })

        if (!dbUser) return true

        if (shouldAutoApproveClinic(user.email)) {
          if (dbUser.role !== "CLINIC" || !dbUser.clinicVerified) {
            await prisma.user.update({
              where: { email: user.email },
              data: {
                role: "CLINIC",
                clinicVerified: true,
              },
            })
          }
        } else if (dbUser.role === "PATIENT" && dbUser.clinicVerified) {
          await prisma.user.update({
            where: { email: user.email },
            data: {
              clinicVerified: false,
            },
          })
        }
      } catch (error) {
        // Do not block OAuth login if role sync fails temporarily.
        console.error("Auth role sync failed:", error)
      }

      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role
        session.user.clinicVerified = user.clinicVerified
        session.user.clinicOwnerId = null
        session.user.clinicStaffRole = null

        if (user.role === "CLINIC" && user.clinicVerified) {
          session.user.clinicOwnerId = user.id
          session.user.clinicStaffRole = "OWNER"
        } else {
          const membership = await prisma.clinicMember.findFirst({
            where: { userId: user.id },
          })

          if (membership) {
            const owner = await prisma.user.findUnique({
              where: { id: membership.clinicOwnerId },
              select: { role: true, clinicVerified: true, status: true },
            })

            if (
              owner?.role === "CLINIC" &&
              owner.clinicVerified &&
              owner.status
            ) {
              session.user.clinicOwnerId = membership.clinicOwnerId
              session.user.clinicStaffRole = membership.role
            }
          }
        }
      }

      return session
    },
  },
})


