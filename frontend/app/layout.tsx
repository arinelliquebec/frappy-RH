// Deploy: 2026-01-01 - Vacation Period Edit + Admin Improvements
import type { Metadata } from "next";
import { Nunito, Orbitron } from "next/font/google";
import "./globals.css";
import { ApolloProvider } from "@/lib/graphql/ApolloProvider";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FrappYOU! - Sua Carreira",
  description: "Descubra seu potencial com FrappYOU!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${nunito.variable} ${orbitron.variable} antialiased`}>
        <ApolloProvider>{children}</ApolloProvider>
      </body>
    </html>
  );
}
