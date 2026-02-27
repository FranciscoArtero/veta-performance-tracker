import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

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

export const metadata: Metadata = {
  title: "Veta — Performance Tracker",
  description:
    "Track your habits, mental state, finances and workouts. Build better habits, achieve more.",
  keywords: [
    "habit tracker",
    "performance",
    "mental health",
    "productivity",
    "fitness",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-[family-name:var(--font-geist-sans)] antialiased`}
      >
        <Sidebar />
        <main className="ml-[240px] min-h-screen bg-background transition-all duration-300">
          {children}
        </main>
      </body>
    </html>
  );
}
