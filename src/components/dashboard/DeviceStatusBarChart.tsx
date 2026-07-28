"use client";

import React, { useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Cpu, Activity, AlertTriangle, WifiOff } from "lucide-react";

interface DeviceStatusBarChartProps {
  onlineCount?: number;
  warningCount?: number;
  offlineCount?: number;
}

export default function DeviceStatusBarChart({
  onlineCount = 1,
  warningCount = 0,
  offlineCount = 0,
}: DeviceStatusBarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const total = onlineCount + warningCount + offlineCount;

  const data = [
    { name: "Online", count: onlineCount, color: "#10b981", label: "Đang chạy" },
    { name: "Cảnh báo", count: warningCount, color: "#f59e0b", label: "Vượt ngưỡng" },
    { name: "Offline", count: offlineCount, color: "#94a3b8", label: "Mất kết nối" },
  ];

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm min-w-0 overflow-hidden flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            Trạng thái Trạm máy
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Phân bổ vận hành</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-600">
              <Cpu className="h-3 w-3" />
              {total} trạm
            </span>
          </h3>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="h-[190px] w-full my-2">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              />
              <Bar dataKey="count" name="Số máy" radius={[8, 8, 0, 0]} barSize={42}>
                {data.map((entry, index) => (
                  <Cell key={`bar-cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Info Cards */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 mt-2">
        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-emerald-50/60 text-center">
          <div className="flex items-center gap-1 text-emerald-700 text-xs font-extrabold">
            <Activity className="h-3.5 w-3.5" />
            <span>{onlineCount}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">Ổn định</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-amber-50/60 text-center">
          <div className="flex items-center gap-1 text-amber-700 text-xs font-extrabold">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{warningCount}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">Cảnh báo</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-100/60 text-center">
          <div className="flex items-center gap-1 text-slate-700 text-xs font-extrabold">
            <WifiOff className="h-3.5 w-3.5" />
            <span>{offlineCount}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">Offline</span>
        </div>
      </div>
    </div>
  );
}
