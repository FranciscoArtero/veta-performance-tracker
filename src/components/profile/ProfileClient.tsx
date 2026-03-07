"use client";

import { useState, useTransition } from "react";
import { signOut, useSession } from "next-auth/react";
import { User, Lock, Globe, LogOut, Shield, Loader2, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { changePassword, updateTimezone } from "@/app/actions/profile";
import { InstallCard } from "@/components/pwa/InstallCard";

const TIMEZONES = [
    { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
    { value: "America/Argentina/Cordoba", label: "Argentina (Córdoba)" },
    { value: "America/Montevideo", label: "Uruguay (Montevideo)" },
    { value: "America/Santiago", label: "Chile (Santiago)" },
    { value: "America/Sao_Paulo", label: "Brasil (São Paulo)" },
    { value: "America/Bogota", label: "Colombia (Bogotá)" },
    { value: "America/Lima", label: "Perú (Lima)" },
    { value: "America/Mexico_City", label: "México (CDMX)" },
    { value: "America/New_York", label: "Estados Unidos (New York)" },
    { value: "Europe/Madrid", label: "España (Madrid)" },
    { value: "UTC", label: "UTC" },
];

type Props = {
    profile: {
        name: string;
        email: string;
        timezone: string;
        mustChangePassword: boolean;
        createdAt: string;
    };
};

export function ProfileClient({ profile }: Props) {
    const { update: updateSession } = useSession();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [timezone, setTimezone] = useState(profile.timezone);
    const [tzSaved, setTzSaved] = useState(false);
    const [isPending, startTransition] = useTransition();

    function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess(false);

        if (newPassword !== confirmPassword) {
            setPasswordError("Las contraseñas no coinciden");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError("La nueva contraseña debe tener al menos 6 caracteres");
            return;
        }

        startTransition(async () => {
            const result = await changePassword(currentPassword, newPassword);
            if (result.error) {
                setPasswordError(result.error);
            } else {
                setPasswordSuccess(true);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                // Clear mustChangePassword from session
                if (profile.mustChangePassword) {
                    await updateSession({ mustChangePassword: false });
                }
                setTimeout(() => setPasswordSuccess(false), 3000);
            }
        });
    }

    function handleTimezoneChange(tz: string) {
        setTimezone(tz);
        setTzSaved(false);
        startTransition(async () => {
            await updateTimezone(tz);
            setTzSaved(true);
            setTimeout(() => setTzSaved(false), 2000);
        });
    }

    const memberSince = new Date(profile.createdAt).toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="space-y-6">
            {/* Forced Password Change Banner */}
            {profile.mustChangePassword && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-300">Cambio de contraseña obligatorio</p>
                        <p className="text-xs text-amber-400/80 mt-0.5">
                            Tu contraseña fue reseteada por un administrador. Tenés que cambiarla antes de continuar.
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight lg:text-3xl flex items-center gap-2">
                    <Shield className="h-6 w-6 text-violet-400" />
                    Mi Perfil
                </h1>
                <p className="text-sm text-muted-foreground">
                    Configurá tu cuenta y preferencias.
                </p>
            </div>

            {/* Profile Info */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <User className="h-4 w-4 text-violet-400" />
                        Información
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Nombre
                            </label>
                            <p className="mt-1 text-sm font-medium">{profile.name || "—"}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Email
                            </label>
                            <p className="mt-1 text-sm font-medium">{profile.email}</p>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Miembro desde
                        </label>
                        <p className="mt-1 text-sm text-muted-foreground">{memberSince}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Change Password */}
            <Card className={`border-border/50 bg-card/50 backdrop-blur-sm ${profile.mustChangePassword ? "ring-2 ring-amber-500/50" : ""}`}>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Lock className="h-4 w-4 text-amber-400" />
                        Cambiar contraseña
                        {profile.mustChangePassword && (
                            <span className="text-xs font-medium text-amber-400 ml-auto">⚠ Requerido</span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-3">
                        {passwordError && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
                                {passwordError}
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-sm text-emerald-400 flex items-center gap-2">
                                <Check className="h-4 w-4" />
                                Contraseña actualizada correctamente
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                Contraseña actual
                            </label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-smooth"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                Nueva contraseña
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                                className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-smooth"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                Confirmar nueva contraseña
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repetí la nueva contraseña"
                                required
                                minLength={6}
                                className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-smooth"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-smooth hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Actualizando...
                                </>
                            ) : (
                                "Cambiar contraseña"
                            )}
                        </button>
                    </form>
                </CardContent>
            </Card>

            {/* Timezone */}
            {!profile.mustChangePassword && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Globe className="h-4 w-4 text-cyan-400" />
                            Zona horaria
                            {tzSaved && (
                                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 ml-auto">
                                    <Check className="h-3 w-3" /> Guardado
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <select
                            value={timezone}
                            onChange={(e) => handleTimezoneChange(e.target.value)}
                            aria-label="Zona horaria"
                            className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-smooth"
                        >
                            {TIMEZONES.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                </option>
                            ))}
                        </select>
                    </CardContent>
                </Card>
            )}

            <Separator className="opacity-50" />

            {/* PWA Install */}
            <InstallCard />

            <Separator className="opacity-50" />

            {/* Logout */}
            <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-smooth hover:bg-red-500/20 w-full justify-center sm:w-auto"
            >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
            </button>
        </div>
    );
}
