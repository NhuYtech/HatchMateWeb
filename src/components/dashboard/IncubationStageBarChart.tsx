"use client";

import React from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Sparkles, Thermometer, Droplets, RotateCw } from "lucide-react";

export default function IncubationStageBarChart() {
  const stageData = [
    {
      stage: "GĐ 1 (N1–7)",
      label: "Ấp đầu",
      temp: 37.8,
      humi: 63,
      tempRange: "37.5 - 38.1°C",
      humiRange: "58 - 68%",
      turn: "Đảo 2h/lần",
    },
    {
      stage: "GĐ 2 (N8–17)",
      label: "Ấp giữa",
      temp: 37.5,
      humi: 60,
      tempRange: "37.2 - 37.8°C",
      humiRange: "55 - 65%",
      turn: "Đảo 2h/lần",
    },
    {
      stage: "GĐ 3 (N18–21)",
      label: "Sắp nở",
      temp: 37.2,
      humi: 77,
      tempRange: "36.9 - 37.5°C",
      humiRange: "72 - 82%",
      turn: "Dừng đảo (Chuẩn bị nở)",
    },
  ];

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm min-w-0 overflow-hidden flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              BIỂU ĐỒ THÔNG SỐ ẤP
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-700">
            <Sparkles className="h-3.5 w-3.5" />
            Trứng gà 21 ngày
          </span>
        </div>

        {/* Grouped Bar Chart comparing Temp & Humidity across Stages */}
        <div className="h-[185px] w-full my-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stageData}
              margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="stage" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="tempAxis"
                domain={[30, 40]}
                stroke="#f97316"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                unit="°C"
              />
              <YAxis
                yAxisId="humiAxis"
                orientation="right"
                domain={[30, 90]}
                stroke="#0284c7"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload;
                    return (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1.5 min-w-[180px]">
                        <p className="font-extrabold text-slate-900 border-b border-slate-100 pb-1">
                          {dataPoint.stage} – {dataPoint.label}
                        </p>
                        <div className="flex items-center justify-between text-amber-600">
                          <span className="font-semibold flex items-center gap-1">
                            <Thermometer className="h-3.5 w-3.5" /> Nhiệt độ chuẩn:
                          </span>
                          <span className="font-extrabold">{dataPoint.tempRange}</span>
                        </div>
                        <div className="flex items-center justify-between text-sky-600">
                          <span className="font-semibold flex items-center gap-1">
                            <Droplets className="h-3.5 w-3.5" /> Độ ẩm chuẩn:
                          </span>
                          <span className="font-extrabold">{dataPoint.humiRange}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-700 border-t border-slate-100 pt-1">
                          <span className="font-semibold flex items-center gap-1">
                            <RotateCw className="h-3.5 w-3.5 text-emerald-600" /> Khay đảo:
                          </span>
                          <span className="font-extrabold text-emerald-600">{dataPoint.turn}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 11 }} />
              <Bar
                yAxisId="tempAxis"
                dataKey="temp"
                name="Nhiệt độ (°C)"
                fill="#f97316"
                radius={[8, 8, 0, 0]}
                barSize={22}
              />
              <Bar
                yAxisId="humiAxis"
                dataKey="humi"
                name="Độ ẩm (%)"
                fill="#0284c7"
                radius={[8, 8, 0, 0]}
                barSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Phase Timeline Cards */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 mt-1">
        <div className="p-2 rounded-2xl bg-amber-50/80 border border-amber-100/90 text-center">
          <span className="text-[10px] font-extrabold uppercase text-amber-700 block">GĐ 1 (N1–7)</span>
          <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">37.5 – 38.1°C</span>
          <span className="text-[10px] text-sky-700 font-bold block">58 – 68% RH</span>
        </div>

        <div className="p-2 rounded-2xl bg-sky-50/80 border border-sky-100/90 text-center">
          <span className="text-[10px] font-extrabold uppercase text-sky-700 block">GĐ 2 (N8–17)</span>
          <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">37.2 – 37.8°C</span>
          <span className="text-[10px] text-sky-700 font-bold block">55 – 65% RH</span>
        </div>

        <div className="p-2 rounded-2xl bg-emerald-50/80 border border-emerald-100/90 text-center">
          <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">GĐ 3 (N18–21)</span>
          <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">36.9 – 37.5°C</span>
          <span className="text-[10px] text-rose-600 font-extrabold block">Dừng đảo khay</span>
        </div>
      </div>
    </div>
  );
}
