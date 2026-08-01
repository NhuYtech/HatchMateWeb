"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardTopbar from "./DashboardTopbar";
import AdminSidebar from "./AdminSidebar";
import { useAuth } from "@/src/components/AuthProvider";
import AnimatedBackground from "@/src/components/common/AnimatedBackground";

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const { currentUser, loading } = useAuth();

  // Auto-collapse sidebar on screens smaller than 1024px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (loading) return;

    const isLoginPath = pathname === "/" || pathname === "/login";

    if (!currentUser && !isLoginPath) {
      setAuthorized(false);
      router.replace("/");
    } else if (currentUser && isLoginPath) {
      setAuthorized(false);
      router.replace("/dashboard");
    } else {
      setAuthorized(true);
    }
  }, [currentUser, loading, pathname, router]);

  const toggleSidebar = () => {
    setCollapsed((v) => !v);
  };

  const isLoginPath = pathname === "/" || pathname === "/login";

  // If still loading auth state, show loader
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FFF8E8]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5B000]"></div>
      </div>
    );
  }

  // Render the login page directly with its own layout/bg
  if (isLoginPath) {
    return <>{children}</>;
  }

  // If not authorized yet (during redirect), keep showing the loader
  if (!authorized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FFF8E8]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5B000]"></div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col text-slate-900">
      {/* HEADER: Full width, top level */}
      <DashboardTopbar onMenuToggle={toggleSidebar} />

      {/* BOTTOM SECTION: Row of Sidebar and Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Backdrop overlay for mobile sidebar */}
        {!collapsed && (
          <div
            className="fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden"
            onClick={() => setCollapsed(true)}
          />
        )}

        {/* Sidebar: Fixed width, height fills space under header, scrollable */}
        <AdminSidebar
          collapsed={collapsed}
          onItemClick={() => {
            if (window.innerWidth < 1024) {
              setCollapsed(true);
            }
          }}
        />

        {/* Content: Fills remaining space, scrollable, restored warm gradient bg */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 relative">
          <AnimatedBackground />
          <div className="mx-auto max-w-[1600px] w-full relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
