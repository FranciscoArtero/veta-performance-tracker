"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Fetch financial categories, optionally filtered by type.
 */
export async function getCategoriesByType(type?: "Income" | "Expense" | "Savings" | "Debt") {
    const { id: userId } = await requireAuth();

    return prisma.financialCategory.findMany({
        where: {
            userId,
            ...(type ? { type } : {}),
        },
        orderBy: { name: "asc" },
    });
}

/**
 * Fetch the user's budget for a given month.
 * The month must be passed as the first day of that month (Date object).
 */
export async function getMonthlyBudget(month: Date) {
    const { id: userId } = await requireAuth();

    // Ensure it's the first day of the month
    const startOfMonth = new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1));

    return prisma.budget.findMany({
        where: {
            userId,
            month: startOfMonth,
        },
        include: {
            category: true,
        },
    });
}

/**
 * Creates a new transaction and atomically updates the actualAmount
 * in the corresponding Budget for that month and category.
 */
export async function createTransaction({
    categoryId,
    amount,
    dateISO,
    description,
    type,
}: {
    categoryId: string;
    amount: number;
    dateISO: string;
    description?: string;
    type: "Income" | "Expense";
}) {
    const { id: userId } = await requireAuth();
    
    const transactionDate = new Date(dateISO);
    // Find the budget month (1st of the transaction's month)
    const budgetMonth = new Date(Date.UTC(transactionDate.getUTCFullYear(), transactionDate.getUTCMonth(), 1));

    try {
        // Use an interactive transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the transaction
            const transaction = await tx.transaction.create({
                data: {
                    userId,
                    categoryId,
                    amount,
                    date: transactionDate,
                    description,
                    type,
                },
            });

            // 2. Atomically update or lazily create the budget tracker
            // We use upsert to ensure it handles the case if no budget plan was made yet.
            const budget = await tx.budget.upsert({
                where: {
                    userId_categoryId_month: {
                        userId,
                        categoryId,
                        month: budgetMonth,
                    },
                },
                update: {
                    actualAmount: {
                        // For budgets, we typically sum up expenses.
                        // If it's income, it doesn't strictly go "against" an expense budget, 
                        // but we just add the absolute amount to the category tracker.
                        increment: amount,
                    },
                },
                create: {
                    userId,
                    categoryId,
                    month: budgetMonth,
                    plannedAmount: 0, // No plan existed, so baseline is 0
                    actualAmount: amount,
                },
            });

            return { transaction, budget };
        });

        revalidatePath("/");
        revalidatePath("/finances"); 
        return { success: true, data: result };

    } catch (error) {
        console.error("Error creating transaction:", error);
        return { error: "Failed to create transaction" };
    }
}

/**
 * Fetch all transactions for a given month, ordered chronologically (newest first). 
 */
export async function getTransactions(month: Date) {
    const { id: userId } = await requireAuth();

    const startOfMonth = new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999));

    return prisma.transaction.findMany({
        where: {
            userId,
            date: {
                gte: startOfMonth,
                lte: endOfMonth,
            },
        },
        include: {
            category: true,
        },
        orderBy: {
            date: "desc",
        },
    });
}

/**
 * Atomically delete a transaction and decrement the associated Budget's actualAmount.
 */
export async function deleteTransaction(transactionId: string) {
    const { id: userId } = await requireAuth();

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Fetch transaction to verify ownership and get amounts/dates
            const transaction = await tx.transaction.findUnique({
                where: { id: transactionId },
            });

            if (!transaction || transaction.userId !== userId) {
                throw new Error("Transaction not found or unauthorized");
            }

            // 2. Delete the transaction
            await tx.transaction.delete({
                where: { id: transactionId },
            });

            // 3. Find the parent budget month
            const budgetMonth = new Date(Date.UTC(transaction.date.getUTCFullYear(), transaction.date.getUTCMonth(), 1));

            // 4. Decrement the budget actualAmount
            // (We assume it exists if the transaction exists, but updateMany is safer if it somehow doesn't)
            await tx.budget.updateMany({
                where: {
                    userId,
                    categoryId: transaction.categoryId,
                    month: budgetMonth,
                },
                data: {
                    actualAmount: {
                        decrement: transaction.amount,
                    },
                },
            });

            return true;
        });

        revalidatePath("/finances");
        revalidatePath("/finances/history");
        return { success: true };

    } catch (error) {
        console.error("Error deleting transaction:", error);
        return { error: "Failed to delete transaction" };
    }
}
