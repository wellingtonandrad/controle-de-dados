"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Bell,
  ChartColumn,
  Boxes,
  List,
  Settings,
  Users,
  Contact,
  ShoppingBasket,
  Package,
  ShoppingCart,
  PanelLeftClose,
  PanelLeft,
  Search,
  LayoutDashboard,
  Wrench,
  Factory,
  ClipboardList,
  HandCoins,
} from "lucide-react"
import Link from "next/link"
import { ClientOnly } from "@/components/client-only"
import { dashboardTitleFromPathname } from "./dashboard-title"

function userInitials(name: string | null, email: string | null): string {
  const n = (name ?? "").trim()
  if (n.length >= 2) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  const e = (email ?? "").trim()
  if (e.length >= 2) return e.slice(0, 2).toUpperCase()
  return "?"
}

export function SidebarDashboard({
  children,
  isClinicOwner = false,
  canViewReports = true,
  userName = null,
  userEmail = null,
  userImage = null,
  notificationsCount = 0,
}: {
  children: React.ReactNode
  /** Dono da empresa: equipe. */
  isClinicOwner?: boolean
  /** Dono ou membro com permissão de relatórios. */
  canViewReports?: boolean
  userName?: string | null
  userEmail?: string | null
  userImage?: string | null
  notificationsCount?: number
}) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pageTitle = dashboardTitleFromPathname(pathname)
  const initials = userInitials(userName, userEmail)

  const navSections = (
    <>
      <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Menu
      </span>
      <SidebarLink
        href="/dashboard/overview"
        label="Visão geral"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<LayoutDashboard className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/vendas"
        label="Vendas"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<ShoppingCart className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/compras"
        label="Compras"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<ShoppingBasket className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/estoque"
        label="Estoque"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Boxes className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/contas-receber"
        label="Contas a receber"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<HandCoins className="size-5 shrink-0" />}
      />
      {canViewReports && (
        <SidebarLink
          href="/dashboard/reports"
          label="Relatórios"
          pathname={pathname}
          isCollapsed={isCollapsed}
          icon={<ChartColumn className="size-5 shrink-0" />}
        />
      )}

      <span className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Cadastros
      </span>
      <SidebarLink
        href="/dashboard/clientes"
        label="Clientes"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Contact className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/produtos"
        label="Produtos"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Package className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/engenharia"
        label="Engenharia"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Wrench className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/producao"
        label="Produção"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Factory className="size-5 shrink-0" />}
      />

      {isClinicOwner && (
        <>
          <span className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Organização
          </span>
          <SidebarLink
            href="/dashboard/equipe"
            label="Equipe"
            pathname={pathname}
            isCollapsed={isCollapsed}
            icon={<Users className="size-5 shrink-0" />}
          />
        </>
      )}

      <span className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Conta
      </span>
      <SidebarLink
        href="/dashboard/profile"
        label="Configurações"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Settings className="size-5 shrink-0" />}
      />
    </>
  )

  const collapsedNav = (
    <nav className="mt-2 flex flex-col gap-0.5 overflow-hidden">
      <SidebarLink
        href="/dashboard/overview"
        label="Visão geral"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<LayoutDashboard className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/vendas"
        label="Vendas"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<ShoppingCart className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/compras"
        label="Compras"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<ShoppingBasket className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/estoque"
        label="Estoque"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Boxes className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/contas-receber"
        label="Contas a receber"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<HandCoins className="size-5 shrink-0" />}
      />
      {canViewReports && (
        <SidebarLink
          href="/dashboard/reports"
          label="Relatórios"
          pathname={pathname}
          isCollapsed={isCollapsed}
          icon={<ChartColumn className="size-5 shrink-0" />}
        />
      )}
      <SidebarLink
        href="/dashboard/clientes"
        label="Clientes"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Contact className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/produtos"
        label="Produtos"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Package className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/engenharia"
        label="Engenharia"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Wrench className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/producao"
        label="Produção"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Factory className="size-5 shrink-0" />}
      />
      <SidebarLink
        href="/dashboard/necessidades"
        label="Necessidades"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<ClipboardList className="size-5 shrink-0" />}
      />
      {isClinicOwner && (
        <SidebarLink
          href="/dashboard/equipe"
          label="Equipe"
          pathname={pathname}
          isCollapsed={isCollapsed}
          icon={<Users className="size-5 shrink-0" />}
        />
      )}
      <SidebarLink
        href="/dashboard/profile"
        label="Configurações"
        pathname={pathname}
        isCollapsed={isCollapsed}
        icon={<Settings className="size-5 shrink-0" />}
      />
    </nav>
  )

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800/80 bg-slate-900 text-slate-100 transition-[width] duration-200 ease-out",
          isCollapsed ? "w-18" : "w-64",
          "hidden md:flex",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800/80 px-3">
          {!isCollapsed ? (
            <Link
              href="/dashboard/overview"
              className="flex min-w-0 items-center gap-2.5 px-0.5 text-left"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-950/35">
                <LayoutDashboard className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 font-semibold tracking-tight text-white">
                <span className="block truncate text-[15px] leading-tight">Controle</span>
                <span className="block truncate text-[11px] font-medium uppercase tracking-widest text-slate-400">
                  ERP
                </span>
              </span>
            </Link>
          ) : (
            <Link
              href="/dashboard/overview"
              className="mx-auto flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-950/35"
              title="Visão geral"
            >
              CD
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>

        {isCollapsed ? (
          <div className="flex flex-1 flex-col overflow-y-auto px-1.5 py-3">{collapsedNav}</div>
        ) : (
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-4">{navSections}</nav>
        )}

        {!isCollapsed && (
          <div className="mt-auto border-t border-zinc-800 p-3">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 rounded-lg bg-zinc-900/80 px-2 py-2.5 transition-colors hover:bg-zinc-800"
            >
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt=""
                  className="size-9 shrink-0 rounded-full border border-zinc-600 object-cover"
                />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-xs font-semibold text-zinc-200">
                  {initials}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {userName?.trim() || "Sua conta"}
                </p>
                {userEmail ? (
                  <p className="truncate text-xs text-zinc-500">{userEmail}</p>
                ) : null}
              </div>
            </Link>
          </div>
        )}
      </aside>

      <div
        className={clsx(
          "flex min-h-screen flex-1 flex-col transition-[margin] duration-200 ease-out",
          isCollapsed ? "md:ml-18" : "md:ml-64",
        )}
      >
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200/80 bg-white/95 px-3 shadow-sm backdrop-blur-md md:gap-4 md:px-5">
          <ClientOnly
            fallback={
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white md:hidden"
                  aria-hidden
                />
                <h1 className="truncate text-base font-semibold text-slate-900">{pageTitle}</h1>
              </div>
            }
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 border-slate-200 bg-white md:hidden"
                    aria-label="Abrir menu"
                  >
                    <List className="size-5 text-slate-700" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[min(100%,280px)] border-zinc-800 bg-zinc-950 p-0 text-zinc-100"
                >
                  <SheetHeader className="border-b border-zinc-800 px-4 py-4 text-left">
                    <SheetTitle className="text-white">Menu</SheetTitle>
                    <SheetDescription className="text-zinc-500">
                      Navegação do painel
                    </SheetDescription>
                  </SheetHeader>
                  <nav className="flex max-h-[calc(100vh-8rem)] flex-col gap-0.5 overflow-y-auto px-2 py-4 pb-28">
                    {navSections}
                  </nav>
                  <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950 p-3">
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center gap-3 rounded-lg bg-zinc-900/80 px-2 py-2"
                    >
                      {userImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={userImage}
                          alt=""
                          className="size-9 shrink-0 rounded-full border border-zinc-600 object-cover"
                        />
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-xs font-semibold">
                          {initials}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {userName?.trim() || "Perfil"}
                        </p>
                        {userEmail ? (
                          <p className="truncate text-xs text-zinc-500">{userEmail}</p>
                        ) : null}
                      </div>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="min-w-0 max-w-[40%] truncate text-base font-semibold tracking-tight text-slate-900 sm:max-w-none md:max-w-[220px] md:text-lg">
                {pageTitle}
              </h1>
              <div className="relative mx-auto hidden min-w-0 max-w-xl flex-1 md:block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  readOnly
                  placeholder="Buscar no sistema…"
                  className="h-9 border-slate-200 bg-slate-50 pl-9 pr-3 text-sm shadow-none"
                  aria-label="Busca global (em breve)"
                />
              </div>
            </div>
          </ClientOnly>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="relative text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <Link
                href="/dashboard/contas-receber"
                aria-label={`Contas vencidas: ${notificationsCount}`}
                title={`Contas vencidas: ${notificationsCount}`}
              >
                <Bell className="size-5" />
                {notificationsCount > 0 ? (
                  <span
                    className="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
                    aria-hidden
                  >
                    {notificationsCount > 99 ? "99+" : notificationsCount}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <Link href="/dashboard/profile" aria-label="Configurações e perfil">
                <Settings className="size-5" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 px-3 py-5 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}

interface SidebarLinkProps {
  href: string
  icon: React.ReactNode
  label: string
  pathname: string
  isCollapsed: boolean
}

function navLinkActive(pathname: string, href: string) {
  if (href === "/dashboard/overview") {
    return pathname === "/dashboard/overview" || pathname === "/dashboard"
  }
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarLink({ href, icon, isCollapsed, label, pathname }: SidebarLinkProps) {
  const active = navLinkActive(pathname, href)
  return (
    <Link href={href} className="block">
      <div
        className={clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/30"
            : "text-zinc-300 hover:bg-zinc-800/95 hover:text-white",
          isCollapsed && "justify-center px-2",
        )}
        title={isCollapsed ? label : undefined}
      >
        {icon}
        {!isCollapsed && <span className="truncate">{label}</span>}
      </div>
    </Link>
  )
}
