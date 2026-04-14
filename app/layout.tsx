import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionAuthProvider} from "@/components/session-auth"
import { Toaster } from "sonner"
import { QueryClientContext } from "@/app/providers/queryclient"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Odonto PRO encontre os melhores profissionais",
  description: "Nós somos a melhor plataforma para profissionais da saúde com foco em agilizar o seu agendamento de forma simplificada e organizada.",
  robots:{
    index: true,
    follow: true,
    noacache: true,

  },
  openGraph:{
     title: "Odonto PRO encontre os melhores profissionais",
     description: "Nós somos a melhor plataforma para profissionais da saúde com foco em agilizar o seu agendamento de forma simplificada e organizada.",
     images: [`${process.env.NEXT_PUBLIC_URL}/doctor-hero.png`]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionAuthProvider>
          <QueryClientContext>
          <Toaster
          duration={2500}
          />
          {children}
          </QueryClientContext>
        </SessionAuthProvider>
      </body>
    </html>
  );
}
