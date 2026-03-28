import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email y contraseña son requeridos");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) {
                    throw new Error("Credenciales inválidas");
                }

                // Block inactive users
                if (!user.isActive) {
                    throw new Error("Tu cuenta ha sido desactivada. Contactá al administrador.");
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);
                if (!isValid) {
                    throw new Error("Credenciales inválidas");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    mustChangePassword: user.mustChangePassword,
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: "/auth/login",
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role?: string }).role || "USER";
                token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword || false;
            }
            // Allow session updates (e.g., after password change clears mustChangePassword)
            if (trigger === "update" && session) {
                if (session.mustChangePassword !== undefined) {
                    token.mustChangePassword = session.mustChangePassword;
                }
                if (session.role !== undefined) {
                    token.role = session.role;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const u = session.user as { id: string; role: string; mustChangePassword: boolean };
                u.id = token.id as string;
                u.role = (token.role as string) || "USER";
                u.mustChangePassword = (token.mustChangePassword as boolean) || false;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            // Allows relative paths
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            // Allows callbacks on the same origin
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
    },
};

export async function getAuthSession() {
    return getServerSession(authOptions);
}

/**
 * Require authentication — returns the session user or redirects to login.
 */
export async function requireAuth() {
    const session = await getAuthSession();
    if (!session?.user || !(session.user as { id?: string }).id) {
        redirect("/auth/login");
    }
    return session.user as {
        id: string;
        email: string;
        name?: string | null;
        role: string;
        mustChangePassword: boolean;
    };
}

/**
 * Require ADMIN role — returns the session user or redirects.
 */
export async function requireAdmin() {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
        redirect("/");
    }
    return user;
}
