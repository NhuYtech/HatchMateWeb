"use client";

import React, { useState, useEffect } from "react";
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
  ReferenceLine
} from "recharts";
import { Thermometer, Droplet, Activity } from "lucide-react";

interface RealtimePoint {
  time: string;
  timestamp: number;
  temperature: number;
  humidity: number;
}

interface DeviceRealtimeModalChartsProps {
  deviceId: string;
  deviceName: string;
  initialTemp?: number;
  initialHumi?: number;
  onLiveTelemetry?: (temp: number, humi: number, day?: number, lastSeen?: string) => void;
}

export default function DeviceRealtimeModalCharts({
  deviceId,
  deviceName,
  initialTemp = 0,
  initialHumi = 0,
  onLiveTelemetry
}: DeviceRealtimeModalChartsProps) {
  const [dataPoints, setDataPoints] = useState<RealtimePoint[]>([]);
  const [liveTemp, setLiveTemp] = useState<number>(initialTemp);
  const [liveHumi, setLiveHumi] = useState<number>(initialHumi);
  const [loaded, setLoaded] = useState<boolean>(false);

  // Subscribe directly to Firebase Realtime Database for real telemetry data
  useEffect(() => {
    if (!deviceId) return;

    const deviceRef = ref(rtdb, `incubators/${deviceId}`);
    const unsubscribe = onValue(deviceRef, (snapshot) => {
      setLoaded(true);

      if (snapshot.exists()) {
        const item = snapshot.val();

        // Parse REAL sensor telemetry values pushed from ESP32 / Firebase DB
        const realTemp = Number(item.telemetry?.temp ?? item.telemetry?.temperature ?? item.temperature ?? item.temp ?? 0);
        const realHumi = Number(item.telemetry?.humi ?? item.telemetry?.humidity ?? item.humidity ?? item.humi ?? 0);
        const realDay = Number(item.telemetry?.day ?? item.incubatingDay ?? 0);
        const lastSeen = item.lastSeen ?? item.updatedAt ?? "Vừa xong";

        if (realTemp > 0) setLiveTemp(realTemp);
        if (realHumi > 0) setLiveHumi(realHumi);

        if (onLiveTelemetry) {
          onLiveTelemetry(realTemp, realHumi, realDay, lastSeen);
        }

        // Check if database contains historical telemetry logs node (e.g. history / telemetryHistory / logs)
        let parsedHistory: RealtimePoint[] = [];
        const historyNode = item.history || item.telemetryHistory || item.logs;
        if (historyNode && typeof historyNode === "object") {
          const keys = Object.keys(historyNode);
          parsedHistory = keys
            .map((k) => {
              const pt = historyNode[k];
              const tVal = Number(pt.temp ?? pt.temperature ?? 0);
              const hVal = Number(pt.humi ?? pt.humidity ?? 0);
              const ts = pt.timestamp ? Number(pt.timestamp) : (pt.time ? Date.parse(pt.time) : 0);
              const dateObj = ts ? new Date(ts) : new Date();
              const timeStr = `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}:${String(dateObj.getSeconds()).padStart(2, "0")}`;
              return {
                time: timeStr,
                timestamp: ts || Date.now(),
                temperature: tVal,
                humidity: hVal,
              };
            })
            .filter((pt) => pt.temperature > 0 || pt.humidity > 0);
        }

        // If historical data points exist in DB, use real historical records
        if (parsedHistory.length > 0) {
          setDataPoints(parsedHistory.slice(-25));
        } else if (realTemp > 0 || realHumi > 0) {
          // Record incoming REAL telemetry updates pushed from Firebase RTDB into live point buffer
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

          setDataPoints((prev) => {
            if (prev.length === 0) {
              return [
                {
                  time: timeStr,
                  timestamp: now.getTime(),
                  temperature: realTemp,
                  humidity: realHumi,
                },
              ];
            }

            const last = prev[prev.length - 1];
            if (last && last.temperature === realTemp && last.humidity === realHumi && Math.abs(now.getTime() - last.timestamp) < 2000) {
              return prev;
            }

            const updated = [
              ...prev,
              {
                time: timeStr,
                timestamp: now.getTime(),
                temperature: realTemp,
                humidity: realHumi,
              },
            ];
            return updated.slice(-25);
          });
        }
      }
    });

    return () => unsubscribe();
  }, [deviceId]);

  // If DB telemetry is null or no data points exist for this incubator, display empty state
  const hasNoData = loaded && dataPoints.length === 0 && liveTemp <= 0 && liveHumi <= 0;

  if (hasNoData) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12 text-center select-none my-2">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
          <Activity className="h-6 w-6 stroke-[2]" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Chưa có dữ liệu giao động (Null)</h4>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 leading-relaxed">
          Thiết bị máy ấp <strong className="font-semibold text-slate-700">{deviceName} ({deviceId})</strong> chưa có dữ liệu nhiệt độ & độ ẩm lưu trong cơ sở dữ liệu. Biểu đồ sẽ tự động hiển thị khi thiết bị gửi dữ liệu telemetry.
        </p>
      </div>
    );
  }

  // Compute metrics strictly from real dataPoints
  const tempValues = dataPoints.map((p) => p.temperature).filter((t) => t > 0);
  const humiValues = dataPoints.map((p) => p.humidity).filter((h) => h > 0);

  const currentDisplayTemp = liveTemp > 0 ? liveTemp : (tempValues.length > 0 ? tempValues[tempValues.length - 1] : 0);
  const currentDisplayHumi = liveHumi > 0 ? liveHumi : (humiValues.length > 0 ? humiValues[humiValues.length - 1] : 0);

  const minTemp = tempValues.length > 0 ? Math.min(...tempValues).toFixed(1) : (currentDisplayTemp > 0 ? currentDisplayTemp.toFixed(1) : "--");
  const maxTemp = tempValues.length > 0 ? Math.max(...tempValues).toFixed(1) : (currentDisplayTemp > 0 ? currentDisplayTemp.toFixed(1) : "--");
  const avgTemp = tempValues.length > 0 ? (tempValues.reduce((a, b) => a + b, 0) / tempValues.length).toFixed(1) : (currentDisplayTemp > 0 ? currentDisplayTemp.toFixed(1) : "--");
  const tempSpan = tempValues.length > 0 ? (Math.max(...tempValues) - Math.min(...tempValues)).toFixed(1) : "0.0";

  const minHumi = humiValues.length > 0 ? Math.min(...humiValues) : (currentDisplayHumi > 0 ? currentDisplayHumi : "--");
  const maxHumi = humiValues.length > 0 ? Math.max(...humiValues) : (currentDisplayHumi > 0 ? currentDisplayHumi : "--");
  const avgHumi = humiValues.length > 0 ? Math.round(humiValues.reduce((a, b) => a + b, 0) / humiValues.length) : (currentDisplayHumi > 0 ? currentDisplayHumi : "--");
  const humiSpan = humiValues.length > 0 ? Math.max(...humiValues) - Math.min(...humiValues) : 0;

  return (
    <div className="space-y-4">
      {/* 2 Realtime Charts Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Left: Realtime Temp Area Chart */}
        <div className="rounded-[24px] border border-amber-100/90 bg-gradient-to-b from-amber-50/30 via-white to-white p-4 min-w-0 overflow-hidden shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b border-amber-100/60 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Thermometer className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-sky-950 text-xs uppercase tracking-wider">Nhiệt độ Giao động Realtime</h4>
                <p className="text-[10px] text-slate-400 font-semibold font-mono">Biên độ: ±{tempSpan}°C</p>
              </div>
            </div>
            <span className="text-base font-extrabold text-amber-600 font-mono">
              {currentDisplayTemp > 0 ? `${currentDisplayTemp.toFixed(1)}°C` : "--"}
            </span>
          </div>

          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="modalRealtimeTempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#d97706"
                  fontSize={10}
                  domain={["dataMin - 0.3", "dataMax + 0.3"]}
                  tickLine={false}
                  axisLine={false}
                  unit="°C"
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid #fef3c7",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                  formatter={(val: any) => [`${val}°C`, "Nhiệt độ (Real DB)"]}
                />
                <ReferenceLine
                  y={37.6}
                  stroke="#f97316"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  name="Nhiệt độ"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#modalRealtimeTempGrad)"
                  isAnimationActive={false}
                  dot={{ r: 3, fill: "#f59e0b" }}
                  activeDot={{ r: 5, fill: "#ea580c" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-1 pt-2 border-t border-amber-100/60 text-center">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400">Thấp nhất</p>
              <p className="text-xs font-bold text-slate-700 font-mono">{minTemp}°C</p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400">Trung bình</p>
              <p className="text-xs font-extrabold text-amber-700 font-mono">{avgTemp}°C</p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400">Cao nhất</p>
              <p className="text-xs font-bold text-slate-700 font-mono">{maxTemp}°C</p>
            </div>
          </div>
        </div>

        {/* Right: Realtime Humi Area Chart */}
        <div className="rounded-[24px] border border-blue-100/90 bg-gradient-to-b from-blue-50/30 via-white to-white p-4 min-w-0 overflow-hidden shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b border-blue-100/60 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Droplet className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-sky-950 text-xs uppercase tracking-wider">Độ ẩm Giao động Realtime</h4>
                <p className="text-[10px] text-slate-400 font-semibold font-mono">Biên độ: ±{humiSpan}%</p>
              </div>
            </div>
            <span className="text-base font-extrabold text-blue-600 font-mono">
              {currentDisplayHumi > 0 ? `${currentDisplayHumi.toFixed(0)}% RH` : "--"}
            </span>
          </div>

          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="modalRealtimeHumiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#0284c7"
                  fontSize={10}
                  domain={["dataMin - 4", "dataMax + 4"]}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid #dbeafe",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                  formatter={(val: any) => [`${val}%`, "Độ ẩm (Real DB)"]}
                />
                <ReferenceLine
                  y={60}
                  stroke="#0284c7"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="humidity"
                  name="Độ ẩm"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#modalRealtimeHumiGrad)"
                  isAnimationActive={false}
                  dot={{ r: 3, fill: "#0284c7" }}
                  activeDot={{ r: 5, fill: "#0369a1" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-1 pt-2 border-t border-blue-100/60 text-center">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400">Thấp nhất</p>
              <p className="text-xs font-bold text-slate-700 font-mono">{minHumi}%</p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400">Trung bình</p>
              <p className="text-xs font-extrabold text-blue-700 font-mono">{avgHumi}%</p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400">Cao nhất</p>
              <p className="text-xs font-bold text-slate-700 font-mono">{maxHumi}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
