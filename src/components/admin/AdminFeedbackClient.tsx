"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markFeedbackAsRead } from "@/app/actions/feedback";
import { Loader2, Check, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type FeedbackUser = {
    name: string | null;
    email: string;
    image: string | null;
};

type FeedbackItem = {
    id: string;
    message: string;
    read: boolean;
    createdAt: string;
    user: FeedbackUser;
};

export function AdminFeedbackClient({ initialFeedbacks }: { initialFeedbacks: FeedbackItem[] }) {
    const [feedbacks, setFeedbacks] = useState(initialFeedbacks);
    const [isPending, startTransition] = useTransition();
    const [actionId, setActionId] = useState<string | null>(null);

    function handleMarkAsRead(id: string) {
        setActionId(id);
        startTransition(async () => {
            const result = await markFeedbackAsRead(id);
            if (result.success) {
                setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, read: true } : f));
                toast.success("Marcado como leído");
            } else {
                toast.error(result.error || "Ocurrió un error");
            }
            setActionId(null);
        });
    }

    if (feedbacks.length === 0) {
        return (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[40vh]">
                    No hay reseñas enviadas todavía.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4 max-w-4xl mx-auto">
            {feedbacks.map((item) => (
                <Card key={item.id} className={`border-border/50 backdrop-blur-sm transition-colors ${!item.read ? 'bg-violet-500/5 border-violet-500/30' : 'bg-card/50'}`}>
                    <CardContent className="p-4 md:p-6 space-y-4">
                        <div className="flex justify-between items-start gap-4 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={item.user.image || ""} />
                                    <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm leading-none">{item.user.name || "Usuario"}</p>
                                    <div className="flex gap-2 items-center mt-1">
                                        <p className="text-xs text-muted-foreground">{item.user.email}</p>
                                        <span className="text-xs text-muted-foreground/50 hidden sm:inline">•</span>
                                        <span className="text-xs text-muted-foreground hidden sm:inline">
                                            {new Date(item.createdAt).toLocaleDateString("es-AR", {
                                                day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-12 sm:ml-0">
                                <span className="text-xs text-muted-foreground sm:hidden tracking-tight">
                                    {new Date(item.createdAt).toLocaleDateString("es-AR", {
                                        day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit"
                                    })}
                                </span>
                                {!item.read ? (
                                    <Badge variant="secondary" className="bg-violet-500/20 text-violet-400 border-violet-500/30">Nuevo</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-muted-foreground">Leído</Badge>
                                )}
                            </div>
                        </div>

                        <div className="bg-secondary/30 rounded-lg p-3 md:p-4 text-sm text-foreground/90 whitespace-pre-wrap ml-0 sm:ml-12 border border-border/40">
                            {item.message}
                        </div>

                        {!item.read && (
                            <div className="flex justify-end pt-2">
                                <Button 
                                    size="sm" 
                                    variant="secondary"
                                    className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                    disabled={isPending && actionId === item.id}
                                    onClick={() => handleMarkAsRead(item.id)}
                                >
                                    {isPending && actionId === item.id ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                    )}
                                    Marcar como leído
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
