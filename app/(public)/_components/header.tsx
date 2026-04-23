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
import { LogIn, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

function canOpenClinicPanel(session: ReturnType<typeof useSession>["data"]) {
  if (!session?.user) return false
  const u = session.user
  if (u.role === "CLINIC" && u.clinicVerified) return true
  if (u.clinicStaffRole && u.clinicOwnerId) return true
  return false
}

export function Header(){
  const [isOpen, setIsOpen] = useState(false);

  const { data: session } = useSession();

const navItems = [{ href: "/#profissionais", label: "Profissionais" }]

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

    {session && canOpenClinicPanel(session) ? (
      <Link
        href="/dashboard"
        className="text-base font-medium text-emerald-700 underline-offset-4 hover:underline"
      >
        Painel da clínica
      </Link>
    ) : null}

    {!session ? (
      <Button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/acesso-clinica" })}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Sou clínica
      </Button>
    ) : !canOpenClinicPanel(session) ? (
      <Button
        type="button"
        variant="outline"
        className="font-normal"
        onClick={() => signIn("google", { callbackUrl: "/acesso-clinica" })}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Área da clínica
      </Button>
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
       className="text-3xl font-bold text-zinc-900"
       >
          Odonto<span className="text-emerald-500" >Pro</span>
       </Link>

          <nav className="hidden md:flex md:items-center md:gap-4">
            <NavLinks />
          </nav>
         
        <Sheet open={isOpen} onOpenChange={setIsOpen} >
          <SheetTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "text-black hover:bg-transparent md:hidden",
            )}
          >
            <Menu className="w-6 h-6" />
          </SheetTrigger>

        <SheetContent side="right" className="w-[240px] sm:w-[300px] z-[9999] ">
             <SheetTitle>
                Menu
             </SheetTitle>
             <SheetHeader></SheetHeader>

             <SheetDescription>
                Veja nossos links
             </SheetDescription>

             <nav className="mt-6 flex flex-col space-y-4">
                <NavLinks />
             </nav>

        </SheetContent>

        </Sheet> 

        </div>    
        </header>
    )
}