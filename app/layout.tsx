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
  title: "Controle de dados — gestão e agendamento",
  description:
    "Plataforma para gestão empresarial, agendamento e operação do dia a dia.",
  robots: {
    index: true,
    follow: true,
    nocache: true,
  },
  openGraph: {
    title: "Controle de dados — gestão e agendamento",
    description:
      "Plataforma para gestão empresarial, agendamento e operação do dia a dia.",
    images: [`${process.env.NEXT_PUBLIC_URL}/doctor-hero.png`],
  },
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
