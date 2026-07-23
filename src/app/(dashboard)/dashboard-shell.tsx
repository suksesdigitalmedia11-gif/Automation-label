"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ScrollText,
  ShoppingCart,
  Type,
  Image as ImageIcon,
  Activity,
  LogOut,
  Menu,
  X,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const user = session?.user as { id?: string; role?: string; name?: string; email?: string };
  const isAdmin = user?.role === "admin";
  const initials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "U";

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: ScrollText, label: "Roll", href: "/roll" },
    { icon: ShoppingCart, label: "Transaksi", href: "/transaksi" },
    { label: "Material", type: "group" as const, children: [
      { icon: Type, label: "Font", href: "/materials/font" },
      { icon: ImageIcon, label: "Background", href: "/materials/background" },
    ]},
    ...(isAdmin ? [
      { label: "Admin", type: "group" as const, children: [
        { icon: Users, label: "Manajemen User", href: "/users" },
        { icon: Activity, label: "Log Aktivitas", href: "/log" },
      ]}
    ] : [])
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-900 transition-all duration-300 lg:static",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className={cn(
          "flex h-16 items-center border-b border-slate-800 px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <span className="text-xl font-bold text-white">Tinemu</span>
          )}
          {collapsed && (
            <span className="text-xl font-bold text-white">T</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:block"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {sidebarItems.map((item) => {
            if ("type" in item && item.type === "group") {
              return (
                <div key={item.label} className="space-y-1">
                  {!collapsed && (
                    <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {item.label}
                    </p>
                  )}
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive(child.href)
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-white",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <child.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{child.label}</span>}
                    </Link>
                  ))}
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href!)
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 backdrop-blur lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger className="relative h-9 w-9 rounded-full outline-none focus:ring-2 focus:ring-slate-400">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-slate-700 text-xs text-white hover:bg-slate-600 transition-colors">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-slate-900 text-white border-slate-800" align="end">
              <div className="px-1.5 py-1">
                <div className="flex flex-col">
                  <span>{user?.name || "User"}</span>
                  <span className="text-xs font-normal text-slate-400">
                    {isAdmin ? "Admin" : "Operator"}
                  </span>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                className="text-red-400 focus:text-red-400 focus:bg-red-900/20"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
