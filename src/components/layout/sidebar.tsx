"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Wallet,
  Dumbbell,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
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
    label: "Config",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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
            {navItems.map((item) => {
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
                      ? "bg-white/10 text-white"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-smooth",
                      isActive
                        ? "text-violet-400"
                        : "text-muted-foreground group-hover:text-white"
                    )}
                  />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!collapsed && item.comingSoon && (
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
                      {item.comingSoon && " (Coming Soon)"}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>

          <Separator className="opacity-50" />

          {/* Collapse Toggle */}
          <div className="p-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-smooth hover:bg-white/5 hover:text-white"
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
        {navItems.map((item) => {
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
                  ? "text-violet-400"
                  : "text-muted-foreground active:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-smooth",
                  isActive && "text-violet-400"
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
