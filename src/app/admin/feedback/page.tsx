export const dynamic = 'force-dynamic';

import { getFeedbacks } from "@/app/actions/feedback";
import { AdminFeedbackClient } from "@/components/admin/AdminFeedbackClient";
import { Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminFeedbackPage() {
    const feedbacks = await getFeedbacks();

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight lg:text-3xl flex items-center gap-2">
                        <Shield className="h-6 w-6 text-violet-400" />
                        Reseñas y Feedback
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Comentarios enviados por los usuarios.
                    </p>
                </div>
                <Link href="/admin">
                    <Button variant="outline" size="sm">
                        Volver al Panel
                    </Button>
                </Link>
            </div>

            <AdminFeedbackClient initialFeedbacks={feedbacks.map((f: any) => ({
                id: f.id,
                message: f.message,
                read: f.read,
                createdAt: f.createdAt.toISOString(),
                user: {
                    name: f.user.name,
                    email: f.user.email,
                    image: f.user.image,
                }
            }))} />
        </div>
    );
}
