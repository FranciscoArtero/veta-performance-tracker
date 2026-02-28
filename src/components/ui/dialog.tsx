"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Dialog Context ───
interface DialogContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
}
const DialogContext = React.createContext<DialogContextValue>({
    open: false,
    setOpen: () => { },
});

// ─── Dialog Root ───
function Dialog({
    children,
    open: controlledOpen,
    onOpenChange,
}: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    return (
        <DialogContext.Provider value={{ open, setOpen }}>
            {children}
        </DialogContext.Provider>
    );
}

// ─── Trigger ───
function DialogTrigger({
    children,
    asChild,
}: {
    children: React.ReactNode;
    asChild?: boolean;
}) {
    const { setOpen } = React.useContext(DialogContext);

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            onClick: (e: React.MouseEvent) => {
                (children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e);
                setOpen(true);
            },
        });
    }

    return (
        <button type="button" onClick={() => setOpen(true)}>
            {children}
        </button>
    );
}

// ─── Portal + Overlay + Content ───
function DialogContent({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const { open, setOpen } = React.useContext(DialogContext);

    React.useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, setOpen]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0"
                onClick={() => setOpen(false)}
            />
            {/* Content */}
            <div
                className={cn(
                    "relative z-50 w-[calc(100%-2rem)] max-w-lg rounded-xl border border-border/50 bg-card p-4 md:p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 max-h-[85vh] overflow-y-auto",
                    className
                )}
            >
                {/* Close button */}
                <button
                    onClick={() => setOpen(false)}
                    aria-label="Cerrar"
                    className="absolute right-4 top-4 rounded-sm text-muted-foreground/50 ring-offset-background transition-opacity hover:text-foreground focus:outline-none"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>
                {children}
            </div>
        </div>
    );
}

// ─── Header ───
function DialogHeader({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>
            {children}
        </div>
    );
}

// ─── Title ───
function DialogTitle({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
            {children}
        </h2>
    );
}

// ─── Description ───
function DialogDescription({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <p className={cn("text-sm text-muted-foreground", className)}>
            {children}
        </p>
    );
}

// ─── Footer ───
function DialogFooter({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4", className)}>
            {children}
        </div>
    );
}

export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
};
