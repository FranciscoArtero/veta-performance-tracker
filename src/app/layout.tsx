import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Providers } from "@/components/layout/providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "CORE — Performance OS",
  description:
    "Track your habits, mental state, finances and workouts. Build better habits, achieve more.",
  keywords: [
    "habit tracker",
    "performance",
    "mental health",
    "productivity",
    "fitness",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CORE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} font-[family-name:var(--font-geist-sans)] antialiased`}
      >
        <Providers>
          <Sidebar />
          <main className="min-h-screen bg-background transition-all duration-300 pb-16 md:pb-0 md:ml-[240px]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
