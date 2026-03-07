"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Target,
  Wallet,
  Dumbbell,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Hábitos",
    href: "/habits",
    icon: Target,
  },
  {
    label: "Finanzas",
    href: "/finances",
    icon: Wallet,
    comingSoon: true,
  },
  {
    label: "Gym",
    href: "/gym",
    icon: Dumbbell,
    comingSoon: true,
  },
  {
    label: "Perfil",
    href: "/profile",
    icon: User,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch: render nothing on the server
  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide sidebar on auth pages
  if (pathname.startsWith("/auth")) return null;

  // Don't render anything during SSR to prevent hydration mismatch
  if (!mounted) return null;

  const userName = session?.user?.name || "Usuario";
  const userEmail = session?.user?.email || "";
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  // Build nav items based on role
  const allNavItems = userRole === "ADMIN"
    ? [
      { label: "Admin", href: "/admin", icon: Shield },
      { label: "Perfil", href: "/profile", icon: User },
    ]
    : [
      ...navItems,
      ...(userRole === "ADMIN" ? [{ label: "Admin", href: "/admin", icon: Shield }] : []),
    ];

  return (
    <>
      {/* ─── Desktop Sidebar ─── */}
      <TooltipProvider delayDuration={0}>
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 hidden md:flex h-screen flex-col border-r border-border/50 bg-[hsl(var(--sidebar))] transition-all duration-300 ease-in-out",
            collapsed ? "w-[68px]" : "w-[240px]"
          )}
        >
          {/* Logo */}
          <div className="flex h-[60px] items-center gap-2 px-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <span className="text-lg font-black tracking-tight gradient-text">
                CORE
              </span>
            )}
          </div>

          <Separator className="opacity-50" />

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {allNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth",
                    isActive
                      ? "bg-black/10 dark:bg-white/10 text-foreground"
                      : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-smooth",
                      isActive
                        ? "text-violet-500 dark:text-violet-400"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!collapsed && "comingSoon" in item && item.comingSoon && (
                    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                      Soon
                    </span>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                      {"comingSoon" in item && item.comingSoon && " (Coming Soon)"}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>

          <Separator className="opacity-50" />

          {/* User info + Logout */}
          <div className="p-3 space-y-2">
            {!collapsed && mounted && status === "authenticated" && session?.user && (
              <div className="px-3 py-2">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
              </div>
            )}

            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => signOut({ callbackUrl: "/auth/login" })}
                    aria-label="Cerrar sesión"
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-smooth hover:bg-red-500/10 hover:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Cerrar sesión
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-smooth hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </button>
            )}

            {/* Collapse Toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-smooth hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Colapsar</span>
                </>
              )}
            </button>
          </div>
        </aside>
      </TooltipProvider>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border/50 bg-[hsl(var(--sidebar))]/95 backdrop-blur-lg safe-area-bottom">
        {allNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 pt-2.5 text-[10px] font-medium transition-smooth",
                isActive
                  ? "text-violet-500 dark:text-violet-400"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-smooth",
                  isActive && "text-violet-500 dark:text-violet-400"
                )}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 h-0.5 w-8 rounded-full bg-violet-500" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
