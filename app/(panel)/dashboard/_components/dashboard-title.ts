/** Título da barra superior conforme a rota (estilo ERP). */
export function dashboardTitleFromPathname(pathname: string): string {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/overview")) {
    return "Visão geral"
  }
  if (pathname.startsWith("/dashboard/reports")) return "Relatórios"
  if (pathname.startsWith("/dashboard/compras")) return "Compras"
  if (pathname.startsWith("/dashboard/estoque")) return "Estoque"
  if (pathname.startsWith("/dashboard/contas-receber")) return "Contas a receber"
  if (pathname.startsWith("/dashboard/clientes")) return "Clientes"
  if (pathname.startsWith("/dashboard/produtos")) return "Produtos"
  if (pathname.startsWith("/dashboard/engenharia")) return "Engenharia"
  if (pathname.startsWith("/dashboard/producao")) return "Produção"
  if (pathname.startsWith("/dashboard/necessidades")) return "Necessidades"
  if (pathname.startsWith("/dashboard/vendas/dashboard")) return "Dashboard de vendas"
  if (pathname.startsWith("/dashboard/vendas")) return "Vendas"
  if (pathname.startsWith("/dashboard/equipe")) return "Equipe"
  if (pathname.startsWith("/dashboard/cargos")) return "Cargos"
  if (pathname.startsWith("/dashboard/profile")) return "Configurações"
  return "Painel"
}
