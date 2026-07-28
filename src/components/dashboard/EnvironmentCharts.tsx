"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  ReferenceArea,
} from "recharts";
import type { ChartPoint } from "../../types/dashboard";
import { SlidersHorizontal, Sparkles, Thermometer, Droplets, RotateCw } from "lucide-react";

interface DeviceOption {
  id: string;
  name: string;
}

interface EnvironmentChartsProps {
  data: ChartPoint[];
  devices?: DeviceOption[];
}

const rangeOptions = ["Hôm nay", "7 ngày", "30 ngày"] as const;

// Data curve standard for the 21-day incubation roadmap across 3 stages
const stageStandardData = [
  { day: "N1", temp: 37.8, humi: 63, stage: "GĐ 1 (Ấp đầu)", tempRange: "37.5 - 38.1°C", humiRange: "58 - 68%", turn: "Đảo 2h/lần" },
  { day: "N4", temp: 37.8, humi: 63, stage: "GĐ 1 (Ấp đầu)", tempRange: "37.5 - 38.1°C", humiRange: "58 - 68%", turn: "Đảo 2h/lần" },
  { day: "N7", temp: 37.8, humi: 63, stage: "GĐ 1 (Ấp đầu)", tempRange: "37.5 - 38.1°C", humiRange: "58 - 68%", turn: "Đảo 2h/lần" },
  { day: "N8", temp: 37.5, humi: 60, stage: "GĐ 2 (Ấp giữa)", tempRange: "37.2 - 37.8°C", humiRange: "55 - 65%", turn: "Đảo 2h/lần" },
  { day: "N12", temp: 37.5, humi: 60, stage: "GĐ 2 (Ấp giữa)", tempRange: "37.2 - 37.8°C", humiRange: "55 - 65%", turn: "Đảo 2h/lần" },
  { day: "N17", temp: 37.5, humi: 60, stage: "GĐ 2 (Ấp giữa)", tempRange: "37.2 - 37.8°C", humiRange: "55 - 65%", turn: "Đảo 2h/lần" },
  { day: "N18", temp: 37.2, humi: 77, stage: "GĐ 3 (Sắp nở)", tempRange: "36.9 - 37.5°C", humiRange: "72 - 82%", turn: "Dừng đảo trứng" },
  { day: "N21", temp: 37.2, humi: 77, stage: "GĐ 3 (Sắp nở)", tempRange: "36.9 - 37.5°C", humiRange: "72 - 82%", turn: "Dừng đảo trứng" },
];

export default function EnvironmentCharts({ data, devices = [] }: EnvironmentChartsProps) {
  const [activeRange, setActiveRange] = useState<typeof rangeOptions[number]>("Hôm nay");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("all");
  const [activeSegment, setActiveSegment] = useState<{
    name: string;
    tempRange: string;
    humiRange: string;
    turn: string;
    color: string;
  } | null>(null);

  const selectedDeviceName =
    selectedDeviceId === "all"
      ? "Tất cả trạm máy (Dải biến thiên Min - Max)"
      : devices.find((d) => d.id === selectedDeviceId)?.name || selectedDeviceId;

  const donutData = [
    {
      name: "GĐ 1 (Ngày 1–7)",
      title: "Ấp đầu",
      value: 7,
      color: "#f59e0b",
      tempRange: "37.5 - 38.1°C",
      humiRange: "58 - 68%",
      turn: "Đảo 2h/lần",
    },
    {
      name: "GĐ 2 (Ngày 8–17)",
      title: "Ấp giữa",
      value: 10,
      color: "#0ea5e9",
      tempRange: "37.2 - 37.8°C",
      humiRange: "55 - 65%",
      turn: "Đảo 2h/lần",
    },
    {
      name: "GĐ 3 (Ngày 18–21)",
      title: "Sắp nở",
      value: 4,
      color: "#10b981",
      tempRange: "36.9 - 37.5°C",
      humiRange: "72 - 82%",
      turn: "Dừng đảo (Chuẩn bị nở)",
    },
  ];

  return (
    <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] min-w-0 overflow-hidden">
      {/* Left: Interactive Area Chart */}
      <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm min-w-0 overflow-hidden">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              Vi khí hậu theo thời gian
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 truncate">{selectedDeviceName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Machine Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="h-9 appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-xs font-bold text-slate-700 outline-none transition hover:bg-slate-100 focus:border-amber-500 focus:bg-white cursor-pointer"
              >
                <option value="all">Tất cả thiết bị (Dải Min-Max)</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.id})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {rangeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setActiveRange(option)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${activeRange === option
                    ? "bg-white text-amber-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recharts Area Container */}
        <div className="h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  borderColor: "#cbd5e1",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
                labelStyle={{ color: "#0f172a", fontWeight: 700 }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingLeft: 10, fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="temperature"
                stroke="#f97316"
                fillOpacity={1}
                fill="url(#tempGradient)"
                name={selectedDeviceId === "all" ? "Nhiệt độ (Khoảng Min-Max °C)" : "Nhiệt độ (°C)"}
                strokeWidth={2.5}
              />
              <Area
                type="monotone"
                dataKey="humidity"
                stroke="#0284c7"
                fillOpacity={1}
                fill="url(#humGradient)"
                name={selectedDeviceId === "all" ? "Độ ẩm (Khoảng Min-Max %)" : "Độ ẩm (%)"}
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right: Modern Grouped Bar & Biological Phase Roadmap Chart */}
      <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                THÔNG SỐ ẤP
              </p>
              {/* <h3 className="mt-0.5 text-lg font-bold text-slate-900">Phân bổ 3 Giai đoạn Sinh học</h3> */}
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              Trứng gà 21 ngày
            </span>
          </div>
        </div>

        {/* Grouped Bar Chart comparing Temp & Humidity across Stages */}
        <div className="h-[210px] w-full my-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  stage: "GĐ 1 (Ngày 1–7)",
                  label: "GĐ đầu",
                  temp: 37.8,
                  humi: 63,
                  tempRange: "37.5 - 38.1°C",
                  humiRange: "58 - 68%",
                  turn: "Đảo 2h/lần",
                },
                {
                  stage: "GĐ 2 (Ngày 8–17)",
                  label: "GĐ giữa",
                  temp: 37.5,
                  humi: 60,
                  tempRange: "37.2 - 37.8°C",
                  humiRange: "55 - 65%",
                  turn: "Đảo 2h/lần",
                },
                {
                  stage: "GĐ 3 (Ngày 18–21)",
                  label: "Sắp nở",
                  temp: 37.2,
                  humi: 77,
                  tempRange: "36.9 - 37.5°C",
                  humiRange: "72 - 82%",
                  turn: "Dừng đảo (Chuẩn bị nở)",
                },
              ]}
              margin={{ top: 20, right: 10, left: -25, bottom: 0 }}
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
                          <span className="font-semibold flex items-center gap-1"><Thermometer className="h-3.5 w-3.5" /> Nhiệt độ chuẩn:</span>
                          <span className="font-extrabold">{dataPoint.tempRange}</span>
                        </div>
                        <div className="flex items-center justify-between text-sky-600">
                          <span className="font-semibold flex items-center gap-1"><Droplets className="h-3.5 w-3.5" /> Độ ẩm chuẩn:</span>
                          <span className="font-extrabold">{dataPoint.humiRange}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-700 border-t border-slate-100 pt-1">
                          <span className="font-semibold flex items-center gap-1"><RotateCw className="h-3.5 w-3.5 text-emerald-600" /> Khay đảo:</span>
                          <span className="font-extrabold text-emerald-600">{dataPoint.turn}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 11 }} />
              <Bar
                yAxisId="tempAxis"
                dataKey="temp"
                name="Nhiệt độ (°C)"
                fill="#f97316"
                radius={[8, 8, 0, 0]}
                barSize={24}
              />
              <Bar
                yAxisId="humiAxis"
                dataKey="humi"
                name="Độ ẩm (%)"
                fill="#0284c7"
                radius={[8, 8, 0, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Phase Timeline Cards */}
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
          <div className="p-2.5 rounded-2xl bg-amber-50/80 border border-amber-100/90 text-center">
            <span className="text-[10px] font-extrabold uppercase text-amber-700 block">GĐ ĐẦU (N1–7)</span>
            <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">37.5 – 38.1°C</span>
            <span className="text-[10px] text-sky-700 font-bold block">58 – 68% RH</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-sky-50/80 border border-sky-100/90 text-center">
            <span className="text-[10px] font-extrabold uppercase text-sky-700 block">GĐ GIỮA (N8–17)</span>
            <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">37.2 – 37.8°C</span>
            <span className="text-[10px] text-sky-700 font-bold block">55 – 65% RH</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-100/90 text-center">
            <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">Sắp nở (N18–21)</span>
            <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">36.9 – 37.5°C</span>
            <span className="text-[10px] text-rose-600 font-extrabold block">Dừng đảo khay</span>
          </div>
        </div>
      </div>
    </section>
  );
}

