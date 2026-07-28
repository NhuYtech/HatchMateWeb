import type { Metadata } from "next";
import "./globals.css";

import AdminLayoutWrapper from "@/src/components/admin/AdminLayoutWrapper";
import { AuthProvider } from "@/src/components/AuthProvider";

export const metadata: Metadata = {
  title: {
    default: "HatchMate",
    template: "%s | HatchMate",
  },
  description: "Hệ thống giám sát và quản lý máy ấp trứng HatchMate",
  icons: {
    icon: "/logov2.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logov2.png?v=3" type="image/png" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const savedTheme = localStorage.getItem("theme");
              if (savedTheme === "dark") {
                document.documentElement.classList.add("dark");
              } else {
                document.documentElement.classList.remove("dark");
              }
            })()
          `
        }} />
      </head>
      <body
        className="font-times h-screen overflow-hidden flex flex-col text-slate-900"
      >
        <AuthProvider>
          <AdminLayoutWrapper>
            {children}
          </AdminLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}