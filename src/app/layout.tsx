import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { AuthProvider } from "@/components/providers/auth-provider";
import { getPublicEnv } from "@/lib/env";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lúmen.",
  description:
    "Plataforma de doações transparentes e rastreáveis baseada em Solana.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await connection();
  getPublicEnv();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <AuthProvider>
          <Header />
          <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:py-10">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
