"use client";

import React from "react";
import { Calendar, Egg, ArrowUpRight, Flame } from "lucide-react";
import Link from "next/link";

export interface IncubationItem {
  id: string;
  name: string;
  currentDay: number;
  totalDays: number;
  startDate?: string;
  status: string;
}

interface IncubationProgressListProps {
  items: IncubationItem[];
}

export default function IncubationProgressList({ items }: IncubationProgressListProps) {
  // Sort items so machines closest to hatching (e.g. Day 19/21, Day 18/21) appear FIRST!
  const sorted = [...items].sort((a, b) => {
    const remainA = a.totalDays - a.currentDay;
    const remainB = b.totalDays - b.currentDay;
    return remainA - remainB;
  });

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm min-w-0 overflow-hidden flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            Tiến độ Chu kỳ Ấp (21 Ngày)
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Danh sách máy đang ấp</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              <Flame className="h-3 w-3" />
              Sắp nở trước
            </span>
          </h3>
        </div>

        <Link
          href="/devices"
          className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition"
        >
          <span>Xem tất cả</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* List / Table */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
          <Egg className="h-10 w-10 text-slate-300 mb-2" />
          <p className="text-xs font-semibold">Chưa có máy ấp nào được khởi tạo</p>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Vào mục Quản lý thiết bị để thêm máy ấp mới
          </p>
        </div>
      ) : (
        <div className="space-y-3.5 overflow-y-auto max-h-[300px] pr-1">
          {sorted.map((item) => {
            const currentDay = Math.min(item.currentDay, item.totalDays);
            const percent = Math.min(100, Math.round((currentDay / item.totalDays) * 100));
            const remainingDays = Math.max(0, item.totalDays - currentDay);
            const isNearHatching = remainingDays <= 3 && currentDay > 0;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col gap-2"
              >
                {/* Top Row: Device info & Days Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100/70 text-amber-700 text-xs font-bold shrink-0">
                      <Egg className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Mã: {item.id}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isNearHatching ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-extrabold text-rose-700 animate-pulse">
                        Sắp nở (Còn {remainingDays} ngày)
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-700">
                        Ngày {currentDay}/{item.totalDays}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isNearHatching
                        ? "bg-gradient-to-r from-amber-500 to-rose-500"
                        : "bg-gradient-to-r from-amber-400 to-amber-500"
                    }`}
                    style={{ width: `${Math.max(5, percent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-100 pt-3 mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Chu kỳ ấp trứng gà chuẩn:</span>
        <span className="font-bold text-slate-700">21 ngày</span>
      </div>
    </div>
  );
}
