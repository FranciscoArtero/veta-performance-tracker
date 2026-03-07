"use client";

import { useState, useTransition } from "react";
import { Shield, Users, UserX, UserCheck, KeyRound, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toggleUserActive, resetUserPassword } from "@/app/actions/admin";

type UserRow = {
    id: string;
    name: string | null;
    email: string;
    role: string;
    isActive: boolean;
    mustChangePassword: boolean;
    createdAt: string;
};

type Props = {
    users: UserRow[];
};

export function AdminClient({ users: initialUsers }: Props) {
    const [users, setUsers] = useState(initialUsers);
    const [isPending, startTransition] = useTransition();
    const [actionUserId, setActionUserId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<string | null>(null);

    function handleToggleActive(userId: string) {
        setActionUserId(userId);
        setActionType("toggle");
        startTransition(async () => {
            const result = await toggleUserActive(userId);
            if (result.success) {
                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === userId ? { ...u, isActive: result.isActive! } : u
                    )
                );
            }
            setActionUserId(null);
            setActionType(null);
        });
    }

    function handleResetPassword(userId: string, userName: string | null) {
        if (!confirm(`¿Resetear la contraseña de ${userName || "este usuario"} a "1234"?`)) return;
        setActionUserId(userId);
        setActionType("reset");
        startTransition(async () => {
            const result = await resetUserPassword(userId);
            if (result.success) {
                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === userId ? { ...u, mustChangePassword: true } : u
                    )
                );
            }
            setActionUserId(null);
            setActionType(null);
        });
    }

    const activeCount = users.filter((u) => u.isActive).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight lg:text-3xl flex items-center gap-2">
                    <Shield className="h-6 w-6 text-violet-400" />
                    Panel de Administración
                </h1>
                <p className="text-sm text-muted-foreground">
                    Gestioná los usuarios de CORE OS.
                </p>
            </div>

            {/* Stats */}
            <div className="flex gap-3">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                            <Users className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{users.length}</p>
                            <p className="text-xs text-muted-foreground">Total usuarios</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                            <UserCheck className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{activeCount}</p>
                            <p className="text-xs text-muted-foreground">Activos</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Users Table */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4 text-violet-400" />
                        Usuarios registrados
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50">
                                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Registro</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rol</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                                    <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-border/30 last:border-0 hover:bg-white/[0.02] transition-smooth">
                                        <td className="py-3 px-3 font-medium">{user.name || "—"}</td>
                                        <td className="py-3 px-3 text-muted-foreground">{user.email}</td>
                                        <td className="py-3 px-3 text-muted-foreground">
                                            {new Date(user.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                                        </td>
                                        <td className="py-3 px-3">
                                            <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className={user.role === "ADMIN" ? "bg-violet-500/20 text-violet-400 border-violet-500/30" : ""}>
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-3">
                                            <Badge variant="secondary" className={user.isActive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                                                {user.isActive ? "Activo" : "Baja"}
                                            </Badge>
                                            {user.mustChangePassword && (
                                                <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                                                    Reset
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleActive(user.id)}
                                                    disabled={isPending && actionUserId === user.id}
                                                    title={user.isActive ? "Dar de baja" : "Reactivar"}
                                                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-smooth disabled:opacity-50 ${user.isActive
                                                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                        : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                                        }`}
                                                >
                                                    {isPending && actionUserId === user.id && actionType === "toggle" ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : user.isActive ? (
                                                        <UserX className="h-4 w-4" />
                                                    ) : (
                                                        <UserCheck className="h-4 w-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleResetPassword(user.id, user.name)}
                                                    disabled={isPending && actionUserId === user.id}
                                                    title='Reset password a "1234"'
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-smooth disabled:opacity-50"
                                                >
                                                    {isPending && actionUserId === user.id && actionType === "reset" ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <KeyRound className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {users.map((user) => (
                            <div key={user.id} className="rounded-lg border border-border/30 bg-white/[0.02] p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{user.name || "—"}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className={`text-[10px] ${user.role === "ADMIN" ? "bg-violet-500/20 text-violet-400" : ""}`}>
                                            {user.role}
                                        </Badge>
                                        <Badge variant="secondary" className={`text-[10px] ${user.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                                            {user.isActive ? "Activo" : "Baja"}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-border/20">
                                    <span className="text-[11px] text-muted-foreground">
                                        {new Date(user.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleToggleActive(user.id)}
                                            disabled={isPending && actionUserId === user.id}
                                            className={`flex h-8 px-3 items-center gap-1.5 rounded-lg text-xs font-medium transition-smooth disabled:opacity-50 ${user.isActive
                                                ? "bg-red-500/10 text-red-400"
                                                : "bg-emerald-500/10 text-emerald-400"
                                                }`}
                                        >
                                            {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                            {user.isActive ? "Baja" : "Activar"}
                                        </button>
                                        <button
                                            onClick={() => handleResetPassword(user.id, user.name)}
                                            disabled={isPending && actionUserId === user.id}
                                            className="flex h-8 px-3 items-center gap-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 transition-smooth disabled:opacity-50"
                                        >
                                            <KeyRound className="h-3.5 w-3.5" />
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
