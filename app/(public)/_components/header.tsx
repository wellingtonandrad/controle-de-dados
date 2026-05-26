"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn, useSession } from "next-auth/react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button, buttonVariants } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClientOnly } from "@/components/client-only"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function canOpenErpPanel(session: ReturnType<typeof useSession>["data"]) {
  if (!session?.user) return false
  const u = session.user
  if (u.role === "ACCOUNT_HOLDER" && u.organizationVerified) return true
  if (u.organizationRole && u.activeOrganizationId) return true
  return false
}

export function Header({
  panelNoAuth = false,
  googleOAuthConfigured = false,
}: {
  panelNoAuth?: boolean
  googleOAuthConfigured?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  const { data: session } = useSession()

  const navItems = [{ href: "/#recursos", label: "Módulos" }]

  const NavLinks = () => (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      {navItems.map((item) => (
        <Button
          key={item.href}
          asChild
          onClick={() => setIsOpen(false)}
          className="h-auto bg-transparent px-2 py-1 text-base font-normal text-black shadow-none hover:bg-zinc-100"
        >
          <a href={item.href}>{item.label}</a>
        </Button>
      ))}

      {panelNoAuth ? (
        <Link
          href="/dashboard"
          className="text-base font-medium text-emerald-700 underline-offset-4 hover:underline"
        >
          Abrir painel
        </Link>
      ) : session && canOpenErpPanel(session) ? (
        <Link
          href="/dashboard"
          className="text-base font-medium text-emerald-700 underline-offset-4 hover:underline"
        >
          Painel
        </Link>
      ) : null}

      {!panelNoAuth && !session && googleOAuthConfigured ? (
        <Button
          type="button"
          variant="default"
          className="font-normal"
          onClick={() =>
            void signIn("google", { callbackUrl: "/dashboard", redirectTo: "/dashboard" })
          }
        >
          <GoogleIcon className="mr-2 h-4 w-4 shrink-0" />
          Entrar com Google
        </Button>
      ) : !panelNoAuth && session && !canOpenErpPanel(session) && googleOAuthConfigured ? (
        <Button
          type="button"
          variant="outline"
          className="font-normal"
          onClick={() =>
            void signIn("google", { callbackUrl: "/dashboard", redirectTo: "/dashboard" })
          }
        >
          <GoogleIcon className="mr-2 h-4 w-4 shrink-0" />
          Google
        </Button>
      ) : !panelNoAuth && !session && !googleOAuthConfigured ? (
        <span className="max-w-56 text-right text-xs leading-snug text-zinc-500 md:max-w-none">
          Login com Google não configurado. Defina{" "}
          <code className="rounded bg-zinc-100 px-1">AUTH_GOOGLE_ID</code> e{" "}
          <code className="rounded bg-zinc-100 px-1">AUTH_GOOGLE_SECRET</code>, ou{" "}
          <code className="rounded bg-zinc-100 px-1">PANEL_NO_AUTH=true</code> (somente dev).
        </span>
      ) : null}
    </div>
  )

  return (
    <header className="fixed top-0 right-0 left-0 z-[999] bg-white px-6 py-4">
      <div className="container mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl leading-tight font-bold text-zinc-900 sm:text-3xl"
        >
          Controle<span className="text-emerald-600"> de dados</span>
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-4">
          <NavLinks />
        </nav>

        <ClientOnly
          fallback={<div className="flex h-10 w-10 shrink-0 md:hidden" aria-hidden />}
        >
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "text-black hover:bg-transparent md:hidden",
              )}
            >
              <Menu className="h-6 w-6" />
            </SheetTrigger>

            <SheetContent side="right" className="z-[9999] w-[240px] sm:w-[300px]">
              <SheetTitle>Menu</SheetTitle>
              <SheetHeader />
              <SheetDescription>Navegação e acesso ao painel</SheetDescription>

              <nav className="mt-6 flex flex-col space-y-4">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>
        </ClientOnly>
      </div>
    </header>
  )
}
