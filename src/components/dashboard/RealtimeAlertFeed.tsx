"use client";

import React from "react";
import { AlertTriangle, WifiOff, Bell, CheckCircle2, ShieldAlert } from "lucide-react";
import { useAlerts, AlertLogItem } from "@/src/hooks/useAlerts";

function formatFeedTime(timestamp: string | number): string {
  if (!timestamp) return "Vừa xong";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return String(timestamp);

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function RealtimeAlertFeed() {
  const { alerts, activeCount, loading } = useAlerts();

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm min-w-0 overflow-hidden flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            Cảnh báoThời gian thực (Realtime Feed)
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Nhật ký Sự cố Cảnh báo</span>
            {activeCount > 0 && (
              <span className="flex h-5 px-2 items-center justify-center rounded-full bg-rose-500 text-[11px] font-extrabold text-white animate-pulse">
                {activeCount} sự cố
              </span>
            )}
          </h3>
        </div>
      </div>

      {/* Feed List (capped at 30 items) */}
      {loading ? (
        <div className="flex h-[240px] items-center justify-center text-xs font-semibold text-slate-400">
          Đang kết nối luồng sự cố thời gian thực...
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 mb-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="text-xs font-semibold text-slate-700">Hệ thống đang hoạt động an toàn</p>
          <p className="text-[11px] text-slate-400 mt-1">Không ghi nhận sự cố hay cảnh báo vượt ngưỡng nào</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
          {alerts.map((item) => {
            const isWarn = item.type === "warning" || item.status === "active";
            const isOffline = item.type === "offline";

            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border transition flex items-start gap-3 ${
                  isWarn
                    ? "bg-rose-50/40 border-rose-100"
                    : isOffline
                    ? "bg-amber-50/40 border-amber-100"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                {/* Icon */}
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                    isWarn
                      ? "bg-rose-100 text-rose-600"
                      : isOffline
                      ? "bg-amber-100 text-amber-600"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isWarn ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : isOffline ? (
                    <WifiOff className="h-3.5 w-3.5" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {item.deviceName || item.deviceId || "Cảnh báo hệ thống"}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      {formatFeedTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">
                    {item.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-100 pt-3 mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Tự động giải phóng khi ổn định:</span>
        <span className="font-bold text-emerald-600">Firmware Auto-Clear</span>
      </div>
    </div>
  );
}
