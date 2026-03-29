import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const { pathname } = req.nextUrl;
        const token = req.nextauth.token;

        // If user is authenticated and tries to access auth pages, redirect to home
        if (pathname.startsWith("/auth") && token) {
            return NextResponse.redirect(new URL("/", req.url));
        }

        // Block /admin for non-ADMIN users
        if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        // Force password change: redirect to /profile if mustChangePassword is true
        if (
            token?.mustChangePassword === true &&
            !pathname.startsWith("/profile") &&
            !pathname.startsWith("/api/auth") &&
            !pathname.startsWith("/auth")
        ) {
            return NextResponse.redirect(new URL("/profile", req.url));
        }

        // ADMIN users: redirect from user-facing routes to /admin
        const userOnlyRoutes = ["/", "/habits", "/finances", "/gym"];
        if (
            token?.role === "ADMIN" &&
            userOnlyRoutes.includes(pathname)
        ) {
            return NextResponse.redirect(new URL("/admin", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized({ req, token }) {
                const { pathname } = req.nextUrl;

                // Public routes: auth pages and API auth routes
                if (
                    pathname.startsWith("/auth") ||
                    pathname.startsWith("/api/auth")
                ) {
                    return true;
                }

                // All other routes require authentication
                return !!token;
            },
        },
        pages: {
            signIn: "/auth/login",
        },
    }
);

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
};
