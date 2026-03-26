import { requireAuth } from "@/lib/auth";
import { getMonthlyBudget, getCategoriesByType } from "@/app/actions/money";
import { redirect } from "next/navigation";
import { MoneyDashboardClient } from "@/components/money/MoneyDashboardClient";

// Revalidates data dynamically so page is always fresh
export const dynamic = "force-dynamic";

export default async function MoneyDashboardPage() {
    const user = await requireAuth();
    if (!user) redirect("/auth/login");

    // We fetch the current month's budget
    const now = new Date();
    // Normalize to the 1st day of the current month
    const currentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

    try {
        const [budgets, categories] = await Promise.all([
            getMonthlyBudget(currentMonth),
            getCategoriesByType()
        ]);

        return (
            <MoneyDashboardClient budgets={budgets} categories={categories} currentMonth={currentMonth} />
        );
    } catch (e) {
        console.error("Error loading money dashboard:", e);
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <p className="text-red-400">Error cargando los datos financieros.</p>
                <p className="text-sm text-muted-foreground">Por favor, inténtalo de nuevo.</p>
            </div>
        );
    }
}
