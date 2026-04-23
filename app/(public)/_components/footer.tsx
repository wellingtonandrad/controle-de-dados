import { LegalFooterLinks } from "./legal-footer-links"

export function Footer() {
  return (
    <footer className="space-y-4 py-8 text-center text-sm text-muted-foreground md:text-base">
      <LegalFooterLinks />
      <p>
        Todos os direitos reservados © {new Date().getFullYear()}
        <span className="duration-300 hover:text-foreground">
          {" "}
          — @wellingtonandrade
        </span>
      </p>
    </footer>
  )
}