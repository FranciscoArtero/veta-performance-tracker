"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { InstallCard } from "@/components/pwa/InstallCard";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setLoading(true);

        try {
            // Register
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al crear la cuenta");
                setLoading(false);
                return;
            }

            // Auto sign-in after registration
            const signInRes = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (signInRes?.error) {
                setError("Cuenta creada, pero error al iniciar sesión. Intentá loguearte.");
                setLoading(false);
                return;
            }

            router.push("/");
            router.refresh();
        } catch {
            setError("Error al crear la cuenta");
            setLoading(false);
        }
    }

    return (
        <div className="space-y-8">
            {/* Logo */}
            <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon-192.png" alt="CORE" className="h-14 w-14 rounded-2xl shadow-lg shadow-violet-500/25" />
                <div className="text-center">
                    <h1 className="text-2xl font-black tracking-tight gradient-text">
                        CORE
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Performance OS — Crear cuenta
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                        Nombre
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tu nombre"
                            required
                            className="w-full rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-smooth"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                        Email
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            required
                            className="w-full rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-smooth"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                        Contraseña
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            required
                            minLength={6}
                            className="w-full rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-smooth"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                        Confirmar contraseña
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repetí tu contraseña"
                            required
                            minLength={6}
                            className="w-full rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-smooth"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white transition-smooth hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creando cuenta...
                        </>
                    ) : (
                        "Crear cuenta"
                    )}
                </button>
            </form>

            {/* Login link */}
            <p className="text-center text-sm text-muted-foreground">
                ¿Ya tenés cuenta?{" "}
                <Link
                    href="/auth/login"
                    className="text-violet-400 hover:text-violet-300 font-medium transition-smooth"
                >
                    Iniciar sesión
                </Link>
            </p>

            <div className="pt-4">
                <InstallCard />
            </div>
        </div>
    );
}
