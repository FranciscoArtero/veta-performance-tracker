import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "CORE — Autenticación",
    description: "Inicia sesión o creá tu cuenta en CORE Performance OS",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 md:ml-0">
            <div className="w-full max-w-md">{children}</div>
        </div>
    );
}
