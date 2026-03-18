import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADM Portal",
  description: "Login com NextAuth e provedor customizado de credenciais",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
