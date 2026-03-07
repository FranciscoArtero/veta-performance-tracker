import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        // If user is authenticated and tries to access auth pages, redirect to home
        if (
            req.nextUrl.pathname.startsWith("/auth") &&
            req.nextauth.token
        ) {
            return NextResponse.redirect(new URL("/", req.url));
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
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public folder files
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
