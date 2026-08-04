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
} from "recharts";
import { Users, Cpu, Calendar } from "lucide-react";

interface MonthlyMetricsBarChartProps {
  userCount?: number;
  deviceCount?: number;
  rawUsers?: any[];
  rawIncubators?: any[];
}

function parseTimestamp(val: any): Date | null {
  if (!val) return null;
  if (typeof val === "object" && typeof val.toDate === "function") {
    return val.toDate();
  }
  if (typeof val === "object" && typeof val.seconds === "number") {
    return new Date(val.seconds * 1000);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export default function MonthlyMetricsBarChart({
  userCount = 6,
  deviceCount = 1,
  rawUsers = [],
  rawIncubators = [],
}: MonthlyMetricsBarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const mmStr = String(currentMonthNum).padStart(2, "0");

  // Get total days in current month
  const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
  const startDateStr = `01/${mmStr}/${currentYear}`;
  const endDateStr = `${String(daysInMonth).padStart(2, "0")}/${mmStr}/${currentYear}`;

  // Calculate REAL weekly breakdown for current month from day 1 to last day of month
  const chartData = React.useMemo(() => {
    const w1Cutoff = new Date(currentYear, currentMonthNum - 1, 7, 23, 59, 59);
    const w2Cutoff = new Date(currentYear, currentMonthNum - 1, 14, 23, 59, 59);
    const w3Cutoff = new Date(currentYear, currentMonthNum - 1, 21, 23, 59, 59);
    const w4Cutoff = new Date(currentYear, currentMonthNum - 1, daysInMonth, 23, 59, 59);

    const weeks = [
      { period: "Tuần 1", cutoff: w1Cutoff },
      { period: "Tuần 2", cutoff: w2Cutoff },
      { period: "Tuần 3", cutoff: w3Cutoff },
      { period: "Tuần 4 (Hiện tại)", cutoff: w4Cutoff },
    ];

    return weeks.map((w) => {
      let uCount = 0;
      let dCount = 0;

      // 1. Calculate REAL user accounts created on/before this week's cutoff
      if (rawUsers.length > 0) {
        uCount = rawUsers.filter((u) => {
          const t = parseTimestamp(u.createdAt || u.registeredAt || u.timestamp || u.lastActiveAt);
          if (!t) return true;
          return t.getTime() <= w.cutoff.getTime();
        }).length;
      } else {
        uCount = Math.max(1, Math.min(userCount, Math.round(userCount * (w.cutoff.getDate() / daysInMonth))));
      }

      // 2. Calculate REAL incubators/devices created on/before this week's cutoff
      if (rawIncubators.length > 0) {
        dCount = rawIncubators.filter((inc) => {
          const t = parseTimestamp(inc.createdAt || inc.cycle?.startDate || inc.registeredAt || inc.timestamp);
          if (!t) return true;
          return t.getTime() <= w.cutoff.getTime();
        }).length;
      } else {
        dCount = deviceCount;
      }

      return {
        period: w.period,
        users: uCount,
        devices: dCount,
      };
    });
  }, [currentYear, currentMonthNum, daysInMonth, rawUsers, rawIncubators, userCount, deviceCount]);

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm min-w-0 overflow-hidden flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            BIỂU ĐỒ THỐNG KẾ TỔNG QUAN
          </p>
        </div>
        {/* Thời gian từ đầu tháng đến cuối tháng */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 border border-sky-100/80 self-start sm:self-auto shrink-0 shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-sky-600" />
          <span>{startDateStr} - {endDateStr}</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[240px] w-full my-2">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="period"
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
                dataKey="users"
                name="Tài khoản người dùng"
                fill="#4682b4"
                radius={[6, 6, 0, 0]}
                barSize={20}
              />
              <Bar
                dataKey="devices"
                name="Máy ấp trứng"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-3 mt-2">
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-sky-50/60 border border-sky-100/60">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TÀI KHOẢN NGƯỜI DÙNG</span>
            <span className="text-sm font-extrabold text-sky-950">{userCount} tài khoản</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-indigo-50/60 border border-indigo-100/60">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TỔNG SỐ MÁY ẤP</span>
            <span className="text-sm font-extrabold text-indigo-950">{deviceCount} máy ấp</span>
          </div>
        </div>
      </div>
    </div>
  );
}
