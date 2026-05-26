import { NextResponse, type NextRequest } from "next/server"

const CANONICAL_HOST = "erp-controle-dados.vercel.app"
const LEGACY_HOSTS = new Set([
  "odonto-pro-5lng.vercel.app",
  "odonto-pro-5lng-wellington-andrades-projects-4bd5b92e.vercel.app",
])

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.toLowerCase() ?? ""

  const isLegacy =
    LEGACY_HOSTS.has(host) || host.startsWith("odonto-pro-5lng-")

  if (!isLegacy) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.host = CANONICAL_HOST
  url.protocol = "https:"
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map)$).*)"],
}

