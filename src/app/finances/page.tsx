import { Wallet, TrendingUp, PiggyBank, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function FinancesPage() {
    return (
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight lg:text-3xl flex items-center gap-2">
                    <Wallet className="h-7 w-7 text-emerald-400" />
                    Finanzas
                </h1>
                <p className="text-muted-foreground">
                    Control de gastos e ingresos personales.
                </p>
            </div>

            {/* Coming Soon */}
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm max-w-md w-full">
                    <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                            <PiggyBank className="h-8 w-8 text-emerald-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold">Próximamente</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Estamos construyendo un módulo completo de finanzas personales.
                                Vas a poder trackear gastos, ingresos, y ver tu balance en tiempo real.
                            </p>
                        </div>
                        <Badge variant="secondary" className="gap-1.5">
                            <TrendingUp className="h-3 w-3" />
                            En desarrollo
                        </Badge>
                        <div className="grid grid-cols-3 gap-3 w-full mt-2">
                            {[
                                { icon: CreditCard, label: "Gastos" },
                                { icon: TrendingUp, label: "Ingresos" },
                                { icon: PiggyBank, label: "Ahorro" },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/50 p-3 opacity-50"
                                >
                                    <item.icon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
