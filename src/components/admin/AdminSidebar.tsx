"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Cpu,
  Home,
  SlidersHorizontal,
  Users,
  X,
  LucideIcon,
  Egg,
} from "lucide-react";

interface MenuItem {
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
}

const menus: MenuItem[] = [
  { label: "Trang chủ", icon: Home, href: "/dashboard" },
  { label: "Thiết bị", icon: Cpu, href: "/devices" },
  { label: "Người dùng", icon: Users, href: "/users" },
  { label: "Thống kê", icon: BarChart3, href: "/reports" },
  { label: "Cấu hình máy", icon: SlidersHorizontal, href: "/settings" },
];

interface SidebarNavItemProps {
  label: string;
  Icon: LucideIcon;
  href: string;
  active: boolean;
  collapsed: boolean;
  badge?: string;
  onClick?: () => void;
}

function SidebarNavItem({
  label,
  Icon,
  href,
  active,
  collapsed,
  badge,
  onClick,
}: SidebarNavItemProps) {
  return (
    <div className="group relative px-3 py-0.5">
      <Link
        href={href}
        onClick={onClick}
        className={`flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${
          collapsed ? "justify-center px-0" : ""
        } ${
          active
            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-md shadow-orange-500/20"
            : "text-slate-600 hover:bg-amber-50/70 hover:text-amber-900"
        }`}
      >
        <Icon className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-amber-600"}`} />
        
        {!collapsed && (
          <div className="flex flex-1 items-center justify-between min-w-0">
            <span className="truncate">{label}</span>
            {badge && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                active 
                  ? "bg-white/20 text-white" 
                  : "bg-amber-100 text-amber-800"
              }`}>
                {badge}
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Tooltip when collapsed */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 opacity-0 transition-all duration-200 group-hover:opacity-100">
          <div className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-xl">
            <span>{label}</span>
            {badge && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                {badge}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AdminSidebarProps {
  collapsed: boolean;
  onItemClick?: () => void;
  onClose?: () => void;
}

export default function AdminSidebar({ collapsed, onItemClick, onClose }: AdminSidebarProps) {
  const pathname = usePathname() || "";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 md:z-auto flex flex-col border-r border-slate-200/80 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out md:static md:h-[calc(100vh-64px)] shrink-0 shadow-2xl md:shadow-none ${
        collapsed
          ? "-translate-x-full md:translate-x-0 md:w-[76px]"
          : "translate-x-0 md:w-[260px]"
      } w-[260px] overflow-hidden`}
    >
      {/* Mobile Drawer Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100 md:hidden bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-200">
            <Egg className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-base font-extrabold tracking-wider leading-none">
              <span className="text-[#f97316]">HATCH</span>
              <span className="text-[#0284c7]">MATE</span>
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Trạm điều khiển</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose || onItemClick}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        <nav className="space-y-0.5">
          {menus.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <SidebarNavItem
                key={item.label}
                label={item.label}
                Icon={Icon}
                href={item.href}
                active={isActive}
                collapsed={collapsed}
                badge={item.badge}
                onClick={onItemClick}
              />
            );
          })}
        </nav>
      </div>

      {/* System Footer Status */}
      <div className="p-4 border-t border-slate-100/80 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3 border border-slate-100 shadow-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0 font-bold text-xs">
              v1.2
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">HatchMate OS</p>
              <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hệ thống sẵn sàng
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" title="Hệ thống sẵn sàng" />
          </div>
        )}
      </div>
    </aside>
  );
}