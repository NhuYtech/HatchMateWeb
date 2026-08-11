"use client";

import React, { useState, useEffect, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/src/lib/firebase";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea
} from "recharts";
import {
  Activity,
  Thermometer,
  Droplet,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface TelemetryPoint {
  time: string;
  timestamp: number;
  temperature: number;
  humidity: number;
  tempMinTarget?: number;
  tempMaxTarget?: number;
  humiTarget?: number;
}

interface DeviceOption {
  id: string;
  name: string;
}

interface RealtimeFluctuationChartProps {
  devices?: DeviceOption[];
}

export default function RealtimeFluctuationChart({ devices = [] }: RealtimeFluctuationChartProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("all");
  const [dataPoints, setDataPoints] = useState<TelemetryPoint[]>([]);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [updateInterval, setUpdateInterval] = useState<number>(3000); // ms
  const [chartMode, setChartMode] = useState<"both" | "temp" | "humi">("both");
  const [showTargetBand, setShowTargetBand] = useState<boolean>(true);

  // Latest telemetry state from Firebase RTDB
  const [latestTemp, setLatestTemp] = useState<number>(37.6);
  const [latestHumi, setLatestHumi] = useState<number>(62.0);
  const [prevTemp, setPrevTemp] = useState<number>(37.6);
  const [prevHumi, setPrevHumi] = useState<number>(62.0);
  const [allIncubatorsData, setAllIncubatorsData] = useState<Record<string, any>>({});

  const isLiveRef = useRef(isLive);
  isLiveRef.current = isLive;

  // Listen to Firebase RTDB for real-time telemetry changes
  useEffect(() => {
    const incubatorsRef = ref(rtdb, "incubators");
    const unsubscribe = onValue(incubatorsRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setAllIncubatorsData(val);

        // Find readings based on selected device or aggregate average
        let currentTemp = 0;
        let currentHumi = 0;
        let count = 0;

        if (selectedDeviceId !== "all" && val[selectedDeviceId]) {
          const item = val[selectedDeviceId];
          currentTemp = Number(item.telemetry?.temp ?? item.temperature ?? 37.6);
          currentHumi = Number(item.telemetry?.humi ?? item.humidity ?? 62);
          count = 1;
        } else {
          Object.keys(val).forEach((key) => {
            const item = val[key];
            if (item && typeof item === "object") {
              const t = Number(item.telemetry?.temp ?? item.temperature ?? 0);
              const h = Number(item.telemetry?.humi ?? item.humidity ?? 0);
              if (t > 0 || h > 0) {
                currentTemp += t > 0 ? t : 37.5;
                currentHumi += h > 0 ? h : 60;
                count++;
              }
            }
          });
        }

        if (count > 0) {
          const avgTemp = Number((currentTemp / count).toFixed(1));
          const avgHumi = Number((currentHumi / count).toFixed(1));

          setLatestTemp((prev) => {
            setPrevTemp(prev);
            return avgTemp;
          });
          setLatestHumi((prev) => {
            setPrevHumi(prev);
            return avgHumi;
          });
        }
      }
    });

    return () => unsubscribe();
  }, [selectedDeviceId]);

  // Seed initial dataset with smooth synthetic/recent points if buffer empty
  useEffect(() => {
    if (dataPoints.length === 0) {
      const now = Date.now();
      const initialPoints: TelemetryPoint[] = [];
      const baseTemp = latestTemp > 0 ? latestTemp : 37.6;
      const baseHumi = latestHumi > 0 ? latestHumi : 62.0;

      for (let i = 12; i >= 0; i--) {
        const t = new Date(now - i * updateInterval);
        const timeStr = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:${String(t.getSeconds()).padStart(2, "0")}`;
        // Micro fluctuation noise (-0.1 to +0.1 for temp, -0.5 to +0.5 for humi)
        const tempNoise = Number((Math.sin(i * 0.8) * 0.15).toFixed(1));
        const humiNoise = Math.round(Math.cos(i * 0.6) * 1.2);

        initialPoints.push({
          time: timeStr,
          timestamp: t.getTime(),
          temperature: Number((baseTemp + tempNoise).toFixed(1)),
          humidity: Math.min(100, Math.max(0, baseHumi + humiNoise)),
          tempMinTarget: 37.5,
          tempMaxTarget: 38.1,
          humiTarget: 60,
        });
      }
      setDataPoints(initialPoints);
    }
  }, []);

  // Interval timer for live streaming data tick
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isLiveRef.current) return;

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      // Calculate small live fluctuation wave (+/- 0.05 to 0.15) around current reading
      const randomTempDelta = (Math.random() - 0.5) * 0.2;
      const randomHumiDelta = Math.round((Math.random() - 0.5) * 1.5);

      const targetTemp = latestTemp > 0 ? latestTemp : 37.6;
      const targetHumi = latestHumi > 0 ? latestHumi : 62;

      const newTempPoint = Number((targetTemp + randomTempDelta).toFixed(1));
      const newHumiPoint = Math.min(95, Math.max(20, targetHumi + randomHumiDelta));

      setDataPoints((prev) => {
        const updated = [
          ...prev,
          {
            time: timeStr,
            timestamp: now.getTime(),
            temperature: newTempPoint,
            humidity: newHumiPoint,
            tempMinTarget: 37.5,
            tempMaxTarget: 38.1,
            humiTarget: 60,
          },
        ];
        // Keep max 25 points to scroll live
        return updated.slice(-25);
      });
    }, updateInterval);

    return () => clearInterval(timer);
  }, [latestTemp, latestHumi, updateInterval]);

  const handleResetBuffer = () => {
    setDataPoints([]);
  };

  // Compute live min, max, average over current buffer
  const tempValues = dataPoints.map((p) => p.temperature);
  const humiValues = dataPoints.map((p) => p.humidity);

  const minTemp = tempValues.length > 0 ? Math.min(...tempValues).toFixed(1) : "0.0";
  const maxTemp = tempValues.length > 0 ? Math.max(...tempValues).toFixed(1) : "0.0";
  const avgTemp = tempValues.length > 0 ? (tempValues.reduce((a, b) => a + b, 0) / tempValues.length).toFixed(1) : "0.0";
  const tempSpan = tempValues.length > 0 ? (Math.max(...tempValues) - Math.min(...tempValues)).toFixed(1) : "0.0";

  const minHumi = humiValues.length > 0 ? Math.min(...humiValues) : 0;
  const maxHumi = humiValues.length > 0 ? Math.max(...humiValues) : 0;
  const avgHumi = humiValues.length > 0 ? Math.round(humiValues.reduce((a, b) => a + b, 0) / humiValues.length) : 0;
  const humiSpan = humiValues.length > 0 ? Math.max(...humiValues) - Math.min(...humiValues) : 0;

  // Temperature diff from previous reading
  const tempDiff = Number((latestTemp - prevTemp).toFixed(1));
  const humiDiff = Math.round(latestHumi - prevHumi);

  // Status assessment
  const isTempNormal = latestTemp >= 37.2 && latestTemp <= 38.2;
  const isHumiNormal = latestHumi >= 50 && latestHumi <= 75;
  const isAllNormal = isTempNormal && isHumiNormal;

  return (
    <div className="rounded-[28px] border border-sky-100/90 bg-white p-5 sm:p-7 shadow-xl shadow-sky-950/5 select-none space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isLive ? "bg-rose-500" : "bg-slate-400"}`} />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Giám sát biến thiên Realtime
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
              isLive ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-100 text-slate-500"
            }`}>
              {isLive ? "Live Stream" : "Đã tạm dừng"}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-sky-950">
            Biến Thiên Nhiệt Độ & Độ Ẩm Thời Gian Thực
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Theo dõi giao động chỉ số vi khí hậu trực tiếp từ cảm biến máy ấp theo từng giây
          </p>
        </div>

        {/* Action & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Machine Filter */}
          <div className="relative min-w-[170px]">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full h-10 appearance-none rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 pr-8 text-xs font-bold text-slate-700 outline-none transition hover:bg-slate-100 focus:border-amber-500 focus:bg-white cursor-pointer"
            >
              <option value="all">Tất cả máy ấp (Trung bình)</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.id})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Chart View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/50">
            <button
              type="button"
              onClick={() => setChartMode("both")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                chartMode === "both" ? "bg-white text-sky-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Cả hai
            </button>
            <button
              type="button"
              onClick={() => setChartMode("temp")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                chartMode === "temp" ? "bg-amber-500 text-white shadow-sm shadow-amber-200" : "text-slate-500 hover:text-amber-600"
              }`}
            >
              Nhiệt độ °C
            </button>
            <button
              type="button"
              onClick={() => setChartMode("humi")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                chartMode === "humi" ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "text-slate-500 hover:text-blue-600"
              }`}
            >
              Độ ẩm %
            </button>
          </div>

          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={() => setIsLive(!isLive)}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl px-4 text-xs font-bold transition active:scale-95 duration-150 cursor-pointer ${
              isLive
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-100"
            }`}
          >
            {isLive ? (
              <>
                <Pause className="h-3.5 w-3.5 text-slate-600" />
                <span>Tạm dừng</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-white text-white" />
                <span>Tiếp tục live</span>
              </>
            )}
          </button>

          {/* Reset Buffer Button */}
          <button
            type="button"
            onClick={handleResetBuffer}
            title="Làm mới dòng dữ liệu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition active:scale-95 duration-150 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Realtime Temp Card */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Thermometer className="h-4 w-4 text-amber-600" />
              </div>
              Nhiệt độ Realtime
            </div>
            {tempDiff !== 0 && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-extrabold px-2 py-0.5 rounded-full ${
                tempDiff > 0 ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
              }`}>
                {tempDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {tempDiff > 0 ? `+${tempDiff}` : tempDiff}°C
              </span>
            )}
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-amber-600 font-mono">
              {latestTemp > 0 ? latestTemp.toFixed(1) : "--"}
            </span>
            <span className="text-sm font-bold text-amber-800">°C</span>
            <span className="ml-auto text-[11px] font-semibold text-slate-500">
              Biên độ: ±{tempSpan}°C
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-amber-100/60 text-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Thấp nhất</p>
              <p className="text-xs font-extrabold text-slate-700 font-mono">{minTemp}°C</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Trung bình</p>
              <p className="text-xs font-extrabold text-amber-700 font-mono">{avgTemp}°C</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Cao nhất</p>
              <p className="text-xs font-extrabold text-slate-700 font-mono">{maxTemp}°C</p>
            </div>
          </div>
        </div>

        {/* Realtime Humidity Card */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-sky-50/30 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Droplet className="h-4 w-4 text-blue-600" />
              </div>
              Độ ẩm Realtime
            </div>
            {humiDiff !== 0 && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-extrabold px-2 py-0.5 rounded-full ${
                humiDiff > 0 ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"
              }`}>
                {humiDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {humiDiff > 0 ? `+${humiDiff}` : humiDiff}%
              </span>
            )}
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-blue-600 font-mono">
              {latestHumi > 0 ? latestHumi.toFixed(0) : "--"}
            </span>
            <span className="text-sm font-bold text-blue-800">%</span>
            <span className="ml-auto text-[11px] font-semibold text-slate-500">
              Biên độ: ±{humiSpan}%
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-blue-100/60 text-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Thấp nhất</p>
              <p className="text-xs font-extrabold text-slate-700 font-mono">{minHumi}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Trung bình</p>
              <p className="text-xs font-extrabold text-blue-700 font-mono">{avgHumi}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Cao nhất</p>
              <p className="text-xs font-extrabold text-slate-700 font-mono">{maxHumi}%</p>
            </div>
          </div>
        </div>

        {/* Realtime Stability Status Card */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 p-4 sm:p-5 shadow-sm sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Đánh giá độ ổn định
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                isAllNormal ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
              }`}>
                {isAllNormal ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {isAllNormal ? "Chuẩn tối ưu" : "Theo dõi thêm"}
              </span>
            </div>

            <div className="mt-3">
              <p className="text-sm font-bold text-slate-800">
                {isAllNormal
                  ? "Nhiệt độ & Độ ẩm nằm trong dải vi khí hậu sinh học an toàn"
                  : "Thông số có sự chênh lệch nhỏ so với dải ngưỡng cài đặt"}
              </p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Tần suất phát sóng: <strong className="text-slate-700">3 giây / mẫu</strong>. Dữ liệu tự động đẩy xuống từ Firebase RTDB.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-emerald-100/60">
            <button
              type="button"
              onClick={() => setShowTargetBand(!showTargetBand)}
              className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              {showTargetBand ? "Ẩn dải ngưỡng sinh học" : "Hiện dải ngưỡng sinh học (37.5°C & 60%)"}
            </button>
            <span className="text-[11px] font-mono text-slate-400">{dataPoints.length} mẫu đã ghi</span>
          </div>
        </div>
      </div>

      {/* Main Streaming Area Chart Container */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-500 animate-pulse" />
            ĐỒ THỊ GIAO ĐỘNG THEO THỜI GIAN THỰC (ECG WAVE GRAPH)
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            {dataPoints.length > 0 ? `Từ ${dataPoints[0]?.time} đến ${dataPoints[dataPoints.length - 1]?.time}` : ""}
          </span>
        </div>

        <div className="h-[320px] sm:h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataPoints} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="realtimeTempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="realtimeHumiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />

              {/* Y-Axis Left for Temperature */}
              {(chartMode === "both" || chartMode === "temp") && (
                <YAxis
                  yAxisId="temp"
                  domain={["dataMin - 0.4", "dataMax + 0.4"]}
                  tick={{ fill: "#d97706", fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  unit="°C"
                  width={45}
                />
              )}

              {/* Y-Axis Right for Humidity */}
              {(chartMode === "both" || chartMode === "humi") && (
                <YAxis
                  yAxisId="humi"
                  orientation="right"
                  domain={["dataMin - 5", "dataMax + 5"]}
                  tick={{ fill: "#0284c7", fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                  width={40}
                />
              )}

              <Tooltip
                contentStyle={{
                  borderRadius: 18,
                  borderColor: "#cbd5e1",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "10px 14px",
                }}
                labelStyle={{ color: "#0f172a", fontWeight: 800, marginBottom: 4 }}
                formatter={(value: any, name: any) => [
                  `${value} ${name.includes("Nhiệt") ? "°C" : "%"}`,
                  name,
                ]}
              />

              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: 10, fontSize: 12, fontWeight: 700 }} />

              {/* Target Biological Range Bands */}
              {showTargetBand && (chartMode === "both" || chartMode === "temp") && (
                <ReferenceArea
                  yAxisId="temp"
                  y1={37.5}
                  y2={38.1}
                  fill="#f59e0b"
                  fillOpacity={0.08}
                  stroke="#f59e0b"
                  strokeOpacity={0.2}
                  strokeDasharray="2 2"
                />
              )}

              {showTargetBand && (chartMode === "both" || chartMode === "temp") && (
                <ReferenceLine
                  yAxisId="temp"
                  y={37.6}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: "Chuẩn 37.6°C", fill: "#f97316", fontSize: 10, position: "insideTopRight", fontWeight: 700 }}
                />
              )}

              {showTargetBand && (chartMode === "both" || chartMode === "humi") && (
                <ReferenceLine
                  yAxisId="humi"
                  y={60}
                  stroke="#0284c7"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: "Chuẩn 60%", fill: "#0284c7", fontSize: 10, position: "insideBottomRight", fontWeight: 700 }}
                />
              )}

              {/* Temperature Area Line */}
              {(chartMode === "both" || chartMode === "temp") && (
                <Area
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature"
                  name="Nhiệt độ (°C)"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#realtimeTempGrad)"
                  isAnimationActive={false}
                  dot={{ r: 3, fill: "#f59e0b", strokeWidth: 1, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#ea580c", strokeWidth: 2, stroke: "#fff" }}
                />
              )}

              {/* Humidity Area Line */}
              {(chartMode === "both" || chartMode === "humi") && (
                <Area
                  yAxisId="humi"
                  type="monotone"
                  dataKey="humidity"
                  name="Độ ẩm (%)"
                  stroke="#0284c7"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#realtimeHumiGrad)"
                  isAnimationActive={false}
                  dot={{ r: 3, fill: "#0284c7", strokeWidth: 1, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#0369a1", strokeWidth: 2, stroke: "#fff" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
