"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { NetworkStatusProvider } from "@/components/providers/NetworkStatusProvider";
import { PwaInstallPromptProvider } from "@/components/pwa/PwaInstallPromptProvider";

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
                    <PwaInstallPromptProvider />
                    {children}
                </NetworkStatusProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}
