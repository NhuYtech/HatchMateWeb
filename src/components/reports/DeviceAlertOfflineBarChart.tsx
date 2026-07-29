"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { AlertTriangle, WifiOff, CheckCircle2, ShieldAlert } from "lucide-react";
import type { DeviceItem } from "@/src/types/dashboard";

interface DeviceAlertOfflineBarChartProps {
  devices?: DeviceItem[];
  onlineCount?: number;
  warningCount?: number;
  offlineCount?: number;
}

export default function DeviceAlertOfflineBarChart({
  devices = [],
  onlineCount = 0,
  warningCount = 0,
  offlineCount = 0,
}: DeviceAlertOfflineBarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prepare chart data per device if available, otherwise aggregate
  const deviceData = React.useMemo(() => {
    if (devices.length > 0) {
      return devices.map((d) => ({
        name: d.name || d.id,
        warning: d.status === "warning" ? 1 : 0,
        offline: d.status === "offline" ? 1 : 0,
        online: d.status === "online" ? 1 : 0,
      }));
    }

    return [
      {
        name: "Tổng trạm ấp",
        warning: warningCount,
        offline: offlineCount,
        online: onlineCount,
      },
    ];
  }, [devices, warningCount, offlineCount, onlineCount]);

  const totalIncubators = devices.length || (onlineCount + warningCount + offlineCount);

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm min-w-0 overflow-hidden flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            THỐNG KẾ SỰ CỐ THIẾT BỊ
          </p>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="h-[220px] w-full my-2">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={deviceData}
              margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: "10px", fontSize: "11px", fontWeight: 600 }}
              />
              <Bar
                dataKey="warning"
                name="Cảnh báo"
                fill="#f43f5e"
                radius={[6, 6, 0, 0]}
                barSize={24}
              />
              <Bar
                dataKey="offline"
                name="Mất kết nối (Offline)"
                fill="#64748b"
                radius={[6, 6, 0, 0]}
                barSize={24}
              />
              <Bar
                dataKey="online"
                name="Ổn định (Online)"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Info Cards */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 mt-2">
        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-rose-50/70 border border-rose-100/70 text-center">
          <div className="flex items-center gap-1 text-rose-700 text-xs font-extrabold">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{warningCount}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">Cảnh báo</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-100/70 border border-slate-200/70 text-center">
          <div className="flex items-center gap-1 text-slate-700 text-xs font-extrabold">
            <WifiOff className="h-3.5 w-3.5" />
            <span>{offlineCount}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">Mất kết nối</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-emerald-50/70 border border-emerald-100/70 text-center">
          <div className="flex items-center gap-1 text-emerald-700 text-xs font-extrabold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{onlineCount}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">Ổn định</span>
        </div>
      </div>
    </div>
  );
}
