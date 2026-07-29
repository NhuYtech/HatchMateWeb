import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  description: string;
  accent: "temperature" | "humidity" | "success" | "warning" | "danger" | "default" | "users";
  icon: ReactNode;
  footnote?: string;
}

const accentStyles: Record<StatCardProps["accent"], string> = {
  temperature: "border-orange-100 bg-white text-slate-900",
  humidity: "border-sky-100 bg-gradient-to-br from-sky-50 via-white to-sky-100 text-sky-900",
  success: "border-teal-100 bg-white text-slate-900",
  warning: "border-amber-100 bg-gradient-to-br from-amber-50 via-white to-amber-100 text-amber-900",
  danger: "border-rose-100 bg-gradient-to-br from-rose-50 via-white to-rose-100 text-rose-900",
  default: "border-indigo-100 bg-white text-slate-900",
  users: "border-sky-100 bg-white text-slate-900",
};

export default function StatCard({ label, value, description, accent, icon, footnote }: StatCardProps) {
  return (
    <div className={`rounded-[24px] border p-4 sm:p-5 shadow-sm transition-all duration-300 hover:scale-[1.01] relative overflow-hidden ${accentStyles[accent]}`}>
      {accent === "default" && (
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "#ffffff",
            backgroundImage: `
              radial-gradient(
                circle at top left,
                rgba(173, 109, 244, 0.45),
                transparent 70%
              )
            `,
            filter: "blur(40px)",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
      {accent === "success" && (
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "#ffffff",
            backgroundImage: `
              radial-gradient(
                circle at top left,
                rgba(56, 193, 182, 0.45),
                transparent 70%
              )
            `,
            filter: "blur(40px)",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
      {accent === "temperature" && (
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "#ffffff",
            backgroundImage: `
              radial-gradient(
                circle at top left,
                rgba(255, 140, 60, 0.45),
                transparent 70%
              )
            `,
            filter: "blur(40px)",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
      {accent === "users" && (
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "#ffffff",
            backgroundImage: `
              radial-gradient(
                circle at top left,
                rgba(70, 130, 180, 0.5),
                transparent 70%
              )
            `,
            filter: "blur(40px)",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
      <div className="flex items-start justify-between gap-3 sm:gap-4 relative z-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
          <p className="mt-2 sm:mt-4 text-2xl sm:text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1.5 sm:mt-3 text-xs sm:text-sm leading-5 sm:leading-6 text-slate-600/90">{description}</p>
        </div>
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-3xl bg-white/90 text-current shadow-sm">
          {icon}
        </div>
      </div>
      {footnote ? <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-slate-500 relative z-10">{footnote}</p> : null}
    </div>
  );
}
