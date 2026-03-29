"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { NetworkStatusProvider } from "@/components/providers/NetworkStatusProvider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <NetworkStatusProvider>
                    {children}
                </NetworkStatusProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}
