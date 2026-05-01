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
import { Github, LogIn, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClientOnly } from "@/components/client-only"

function canOpenClinicPanel(session: ReturnType<typeof useSession>["data"]) {
  if (!session?.user) return false
  const u = session.user
  if (u.role === "ACCOUNT_HOLDER" && u.organizationVerified) return true
  if (u.organizationRole && u.activeOrganizationId) return true
  return false
}

export function Header({
  panelNoAuth = false,
  googleOAuthConfigured = false,
  githubOAuthConfigured = false,
}: {
  panelNoAuth?: boolean
  googleOAuthConfigured?: boolean
  githubOAuthConfigured?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: session } = useSession();

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
    ) : session && canOpenClinicPanel(session) ? (
      <Link
        href="/dashboard"
        className="text-base font-medium text-emerald-700 underline-offset-4 hover:underline"
      >
        Painel
      </Link>
    ) : null}

    {!panelNoAuth &&
    !session &&
    (googleOAuthConfigured || githubOAuthConfigured) ? (
      <>
        {googleOAuthConfigured ? (
          <Button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Entrar com Google
          </Button>
        ) : null}
        {githubOAuthConfigured ? (
          <Button
            type="button"
            variant={googleOAuthConfigured ? "outline" : "default"}
            className="font-normal"
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          >
            <Github className="mr-2 h-4 w-4" />
            Entrar com GitHub
          </Button>
        ) : null}
      </>
    ) : !panelNoAuth &&
      session &&
      !canOpenClinicPanel(session) &&
      (googleOAuthConfigured || githubOAuthConfigured) ? (
      <>
        {googleOAuthConfigured ? (
          <Button
            type="button"
            variant="outline"
            className="font-normal"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Google
          </Button>
        ) : null}
        {githubOAuthConfigured ? (
          <Button
            type="button"
            variant="outline"
            className="font-normal"
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          >
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </Button>
        ) : null}
      </>
    ) : !panelNoAuth &&
      !session &&
      !googleOAuthConfigured &&
      !githubOAuthConfigured ? (
      <span className="max-w-56 text-right text-xs leading-snug text-zinc-500 md:max-w-none">
        Nenhum login OAuth configurado. Defina{" "}
        <code className="rounded bg-zinc-100 px-1">AUTH_GITHUB_*</code> ou{" "}
        <code className="rounded bg-zinc-100 px-1">AUTH_GOOGLE_*</code>, ou{" "}
        <code className="rounded bg-zinc-100 px-1">PANEL_NO_AUTH=true</code>.
      </span>
    ) : null}

    </div>
)



    return(
        <header  
         className="fixed top-0 right-0 left-0 z-[999] py-4 px-6 bg-white "
        >
        <div className="container mx-auto flex items-center justify-between " >
       <Link
       href="/"
       className="text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl"
       >
          Controle<span className="text-emerald-600"> de dados</span>
       </Link>

          <nav className="hidden md:flex md:items-center md:gap-4">
            <NavLinks />
          </nav>

        <ClientOnly
          fallback={
            <div className="flex h-10 w-10 shrink-0 md:hidden" aria-hidden />
          }
        >
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "text-black hover:bg-transparent md:hidden",
              )}
            >
              <Menu className="w-6 h-6" />
            </SheetTrigger>

            <SheetContent
              side="right"
              className="z-[9999] w-[240px] sm:w-[300px]"
            >
              <SheetTitle>Menu</SheetTitle>
              <SheetHeader />
              <SheetDescription>
                Navegação e acesso ao painel
              </SheetDescription>

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