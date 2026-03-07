export const dynamic = 'force-dynamic';

import { getUsers } from "@/app/actions/admin";
import { AdminClient } from "@/components/admin/AdminClient";

export default async function AdminPage() {
    const users = await getUsers();

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
            <AdminClient users={users.map(u => ({
                ...u,
                createdAt: u.createdAt.toISOString(),
            }))} />
        </div>
    );
}
