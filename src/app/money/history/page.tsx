import { requireAuth } from "@/lib/auth";
import { getTransactions } from "@/app/actions/money";
import { redirect } from "next/navigation";
import { TransactionHistoryClient } from "@/components/money/TransactionHistoryClient";

export const dynamic = "force-dynamic";

export default async function MoneyHistoryPage() {
    const user = await requireAuth();
    if (!user) {
        redirect("/auth/login");
    }

    const now = new Date();
    // Default to current month transactions
    const transactions = await getTransactions(now);

    return <TransactionHistoryClient transactions={transactions} currentMonth={now} />;
}
