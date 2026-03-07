export const dynamic = 'force-dynamic';

import { getProfile } from "@/app/actions/profile";
import { ProfileClient } from "@/components/profile/ProfileClient";

export default async function ProfilePage() {
    const profile = await getProfile();

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-2xl">
            <ProfileClient profile={{
                name: profile.name ?? "",
                email: profile.email,
                timezone: profile.timezone,
                createdAt: profile.createdAt.toISOString(),
            }} />
        </div>
    );
}
