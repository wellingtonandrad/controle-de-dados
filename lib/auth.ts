import NextAuth from "next-auth"
import type { Session } from "next-auth"
import prisma from "./prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Adapter } from "next-auth/adapters"
import { getDemoPanelSession } from "@/lib/auth/demo-panel-session"
import { buildAuthProviders } from "@/lib/auth/build-providers"

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.BETTER_AUTH_SECRET,
  providers: buildAuthProviders(),
  callbacks: {
    async signIn({ user }) {
      try {
        if (!user.email) return true

        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { role: true, id: true, name: true, email: true },
        })

        if (!dbUser) return true

        await prisma.user.update({
          where: { email: user.email },
          data: { role: "ACCOUNT_HOLDER" },
        })

        const u = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, name: true, email: true },
        })
        if (!u) return true

        const existingOrg = await prisma.organization.findFirst({
          where: { ownerUserId: u.id },
        })

        if (!existingOrg) {
          const baseSlug = (u.email ?? u.id)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 40)
          const slug = `${baseSlug || "empresa"}-${u.id.slice(-8)}`

          const org = await prisma.organization.create({
            data: {
              ownerUserId: u.id,
              name: u.name?.trim() || u.email || "Nova empresa",
              slug,
              verified: true,
              active: true,
            },
          })
          await prisma.organizationMember.create({
            data: {
              organizationId: org.id,
              userId: u.id,
              role: "OWNER",
            },
          })
        } else {
          await prisma.organization.update({
            where: { id: existingOrg.id },
            data: { verified: true, active: true },
          })
        }
      } catch (error) {
        console.error("Auth organization sync failed:", error)
      }

      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role
        session.user.activeOrganizationId = null
        session.user.organizationRole = null
        session.user.organizationVerified = false
        session.user.billingUserId = null

        if (user.role === "ACCOUNT_HOLDER") {
          const ownedOrg = await prisma.organization.findFirst({
            where: { ownerUserId: user.id },
            select: { id: true, verified: true, ownerUserId: true },
          })

          if (ownedOrg) {
            session.user.activeOrganizationId = ownedOrg.id
            session.user.organizationRole = "OWNER"
            session.user.organizationVerified = ownedOrg.verified
            session.user.billingUserId = ownedOrg.ownerUserId
          } else {
            const membership = await prisma.organizationMember.findFirst({
              where: { userId: user.id },
              include: {
                organization: {
                  select: { id: true, verified: true, ownerUserId: true },
                },
              },
            })

            if (membership?.organization) {
              session.user.activeOrganizationId = membership.organization.id
              session.user.organizationRole = membership.role
              session.user.organizationVerified = membership.organization.verified
              session.user.billingUserId = membership.organization.ownerUserId
            }
          }
        }
      }

      return session
    },
  },
})

export const { handlers, signIn, signOut } = nextAuth

/** Sessão real ou, com `PANEL_NO_AUTH=true`, sessão demo (sem OAuth). */
export async function auth(): Promise<Session | null> {
  const session = await nextAuth.auth()
  if (session) {
    return session
  }
  return getDemoPanelSession()
}
