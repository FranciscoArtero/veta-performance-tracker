import { Settings, User, Bell, Palette, Database, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const settingsSections = [
    {
        title: "Perfil",
        icon: User,
        description: "Nombre, email y foto de perfil",
        color: "text-violet-400",
        bgColor: "bg-violet-500/10",
    },
    {
        title: "Notificaciones",
        icon: Bell,
        description: "Recordatorios y alertas",
        color: "text-cyan-400",
        bgColor: "bg-cyan-500/10",
    },
    {
        title: "Apariencia",
        icon: Palette,
        description: "Tema, colores y personalización",
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
    },
    {
        title: "Datos",
        icon: Database,
        description: "Exportar, importar y backup",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
    },
    {
        title: "Privacidad",
        icon: Shield,
        description: "Seguridad y privacidad de datos",
        color: "text-pink-400",
        bgColor: "bg-pink-500/10",
    },
];

export default function SettingsPage() {
    return (
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight lg:text-3xl flex items-center gap-2">
                    <Settings className="h-7 w-7 text-muted-foreground" />
                    Configuración
                </h1>
                <p className="text-muted-foreground">
                    Personalizá tu experiencia en CORE.
                </p>
            </div>

            {/* Settings Cards */}
            <div className="max-w-2xl space-y-3">
                {settingsSections.map((section, i) => (
                    <Card
                        key={i}
                        className="border-border/50 bg-card/50 backdrop-blur-sm transition-smooth hover:border-violet-500/20 cursor-pointer group"
                    >
                        <CardContent className="p-4 flex items-center gap-4">
                            <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${section.bgColor} transition-smooth group-hover:scale-110`}
                            >
                                <section.icon className={`h-5 w-5 ${section.color}`} />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-sm">{section.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {section.description}
                                </p>
                            </div>
                            <div className="text-muted-foreground/50 group-hover:text-foreground transition-smooth">
                                →
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Separator className="opacity-50 max-w-2xl" />

            <div className="max-w-2xl">
                <p className="text-xs text-muted-foreground">
                    CORE Performance OS v0.2.0 — Construido con ❤️
                </p>
            </div>
        </div>
    );
}
