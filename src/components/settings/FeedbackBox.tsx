"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Loader2, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitFeedback } from "@/app/actions/feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function FeedbackBox() {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isPending, startTransition] = useTransition();
    const [success, setSuccess] = useState(false);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        
        if (!message.trim()) {
            toast.error("El mensaje está vacío.");
            return;
        }

        startTransition(async () => {
            const result = await submitFeedback(message);
            if (result.success) {
                setSuccess(true);
            } else {
                toast.error(result.error || "Ocurrió un error al enviar el feedback.");
            }
        });
    }

    function handleOpenChange(isOpen: boolean) {
        if (!isOpen) {
            setOpen(false);
            setTimeout(() => {
                setMessage("");
                setSuccess(false);
            }, 300);
        } else {
            setOpen(true);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <div role="button" tabIndex={0} className="w-full relative outline-none ring-0">
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm transition-smooth hover:border-violet-500/20 cursor-pointer group">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 transition-smooth group-hover:scale-110">
                                <MessageSquare className="h-5 w-5 text-violet-400" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-medium text-sm">Ayudanos a Mejorar</p>
                                <p className="text-xs text-muted-foreground">
                                    Danos tu feedback para mejorar CORE.
                                </p>
                            </div>
                            <div className="text-muted-foreground/50 group-hover:text-foreground transition-smooth">
                                →
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[425px]">
                {!success ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Dejanos tu Feedback</DialogTitle>
                            <DialogDescription>
                                Contanos qué mejorarías, qué te gusta o sugerencias que tengas. Nos ayuda mucho a crecer.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                            <Textarea
                                placeholder="Escribí tus ideas acá..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="min-h-[120px] resize-none"
                                disabled={isPending}
                            />
                            <div className="flex justify-end gap-2">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => handleOpenChange(false)}
                                    disabled={isPending}
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isPending || !message.trim()}
                                    className="bg-violet-600 hover:bg-violet-700 text-white"
                                >
                                    {isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="mr-2 h-4 w-4" />
                                    )}
                                    Enviar
                                </Button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="font-medium text-lg">¡Feedback enviado exitosamente!</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Gracias por ayudarnos a mejorar CORE.
                            </p>
                        </div>
                        <Button 
                            className="mt-4" 
                            onClick={() => handleOpenChange(false)}
                        >
                            Cerrar
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
