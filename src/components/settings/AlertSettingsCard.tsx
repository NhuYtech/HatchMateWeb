"use client";

import React, { useState } from "react";
import { AlertSettings } from "@/src/types/incubation-settings";
import { defaultAlertSettings } from "@/src/constants/presets";
import {
  Thermometer,
  Droplets,
  Wifi,
  Bell,
  AlertTriangle,
  Radio,
  Smartphone,
  ShieldAlert,
  Activity,
  Moon,
} from "lucide-react";

/* ──────────────────────────────────────────────
   CSS toggle track+thumb
────────────────────────────────────────────── */
function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className="shrink-0 hover:scale-105 active:scale-95 transition duration-150"
    >
      <div
        className={`relative h-6 w-11 rounded-full border transition-all duration-200 ${
          enabled ? "border-emerald-400 bg-emerald-500" : "border-slate-200 bg-slate-200"
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
            enabled ? "left-5" : "left-0.5"
          }`}
        />
      </div>
    </button>
  );
}

/* ──────────────────────────────────────────────
   Toggle row
────────────────────────────────────────────── */
function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-sky-950 truncate">{label}</p>
        {description && (
          <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{description}</p>
        )}
      </div>
      <Toggle enabled={enabled} onToggle={onToggle} />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Threshold input row
────────────────────────────────────────────── */
function ThresholdRow({
  label,
  unit,
  value,
  min,
  max,
  step,
  enabled,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  enabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2 transition-opacity duration-150 ${
        enabled ? "bg-slate-50/70 border border-slate-100" : "opacity-35 pointer-events-none bg-slate-50/30"
      }`}
    >
      <span className="text-[11px] font-semibold text-slate-500 truncate">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={!enabled}
          onChange={(e) => onChange(parseFloat(e.target.value) || value)}
          className="w-20 h-8 rounded-lg border border-slate-200 bg-white text-center text-xs font-extrabold text-sky-950 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-50 disabled:cursor-not-allowed"
        />
        <span className="text-[10px] font-bold text-slate-400 w-10 shrink-0">{unit}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Group header with colored left border
────────────────────────────────────────────── */
function GroupHeader({
  icon,
  label,
  borderColor,
}: {
  icon: React.ReactNode;
  label: string;
  borderColor: string;
}) {
  return (
    <div className={`flex items-center gap-2 pb-2 border-b-2 ${borderColor} mb-0.5`}>
      {icon}
      <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Quick chip
────────────────────────────────────────────── */
function QuickChip({
  icon,
  label,
  active,
  colorOn,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  colorOn: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold transition duration-150 ${
        active ? colorOn : "border-slate-100 bg-slate-50 text-slate-400"
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

/* ──────────────────────────────────────────────
   Main component
────────────────────────────────────────────── */
export default function AlertSettingsCard() {
  const [s, setS] = useState<AlertSettings>(defaultAlertSettings);

  const toggle = (key: keyof AlertSettings) => {
    setS((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const set = (key: keyof AlertSettings, value: number) => {
    setS((prev) => ({ ...prev, [key]: value }));
  };

  const activeCount = [
    s.highTempAlertEnabled,
    s.lowTempAlertEnabled,
    s.lowHumidityAlertEnabled,
    s.highHumidityAlertEnabled,
    s.deviceOfflineAlert,
    s.sensorNoResponseAlert,
  ].filter(Boolean).length;

  return (
    <div className="rounded-[24px] border border-sky-100/80 bg-white shadow-sm shadow-sky-100/10 overflow-hidden">
      {/* ── Card Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-sky-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
            <ShieldAlert className="h-4.5 w-4.5 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              Cấu hình Cảnh báo
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Ngưỡng an toàn và kênh gửi thông báo khi có sự cố
            </p>
          </div>
        </div>

        {/* Active count badge */}
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-600">
          <Activity className="h-3 w-3" />
          {activeCount} loại đang bật
        </span>
      </div>

      {/* ── Body: 2-column grid ── */}
      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-50">

        {/* Left column */}
        <div className="space-y-6 p-6">

          {/* A. Temperature */}
          <div className="space-y-2">
            <GroupHeader
              icon={<Thermometer className="h-4 w-4 text-orange-500" />}
              label="Cảnh báo nhiệt độ"
              borderColor="border-orange-200"
            />
            <div className="divide-y divide-slate-50">
              <ToggleRow
                label="Cảnh báo quá nhiệt"
                description="Alert khi nhiệt độ vượt ngưỡng cao"
                enabled={s.highTempAlertEnabled}
                onToggle={() => toggle("highTempAlertEnabled")}
              />
              <div className="py-1">
                <ThresholdRow
                  label="Ngưỡng quá nhiệt"
                  unit="°C"
                  value={s.highTempThreshold}
                  min={37}
                  max={45}
                  step={0.1}
                  enabled={s.highTempAlertEnabled}
                  onChange={(v) => set("highTempThreshold", v)}
                />
              </div>
              <ToggleRow
                label="Cảnh báo nhiệt độ thấp"
                description="Alert khi nhiệt độ xuống quá thấp"
                enabled={s.lowTempAlertEnabled}
                onToggle={() => toggle("lowTempAlertEnabled")}
              />
              <div className="py-1">
                <ThresholdRow
                  label="Ngưỡng nhiệt thấp"
                  unit="°C"
                  value={s.lowTempThreshold}
                  min={30}
                  max={37}
                  step={0.1}
                  enabled={s.lowTempAlertEnabled}
                  onChange={(v) => set("lowTempThreshold", v)}
                />
              </div>
            </div>
          </div>

          {/* B. Humidity */}
          <div className="space-y-2">
            <GroupHeader
              icon={<Droplets className="h-4 w-4 text-blue-500" />}
              label="Cảnh báo độ ẩm"
              borderColor="border-blue-200"
            />
            <div className="divide-y divide-slate-50">
              <ToggleRow
                label="Cảnh báo độ ẩm thấp"
                description="Alert khi RH xuống dưới mức tối thiểu"
                enabled={s.lowHumidityAlertEnabled}
                onToggle={() => toggle("lowHumidityAlertEnabled")}
              />
              <div className="py-1">
                <ThresholdRow
                  label="Ngưỡng độ ẩm thấp"
                  unit="% RH"
                  value={s.lowHumidityThreshold}
                  min={30}
                  max={70}
                  step={1}
                  enabled={s.lowHumidityAlertEnabled}
                  onChange={(v) => set("lowHumidityThreshold", v)}
                />
              </div>
              <ToggleRow
                label="Cảnh báo độ ẩm cao"
                description="Alert khi RH vượt mức an toàn tối đa"
                enabled={s.highHumidityAlertEnabled}
                onToggle={() => toggle("highHumidityAlertEnabled")}
              />
              <div className="py-1">
                <ThresholdRow
                  label="Ngưỡng độ ẩm cao"
                  unit="% RH"
                  value={s.highHumidityThreshold}
                  min={60}
                  max={95}
                  step={1}
                  enabled={s.highHumidityAlertEnabled}
                  onChange={(v) => set("highHumidityThreshold", v)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6 p-6">

          {/* C. Connectivity */}
          <div className="space-y-2">
            <GroupHeader
              icon={<Wifi className="h-4 w-4 text-violet-500" />}
              label="Cảnh báo kết nối & Hệ thống"
              borderColor="border-violet-200"
            />
            <div className="divide-y divide-slate-50">
              <ToggleRow
                label="Thiết bị bị mất kết nối"
                description="Alert khi máy ấp offline bất ngờ"
                enabled={s.deviceOfflineAlert}
                onToggle={() => toggle("deviceOfflineAlert")}
              />
              <ToggleRow
                label="Cảm biến không phản hồi"
                description="Alert khi cảm biến ngừng gửi dữ liệu"
                enabled={s.sensorNoResponseAlert}
                onToggle={() => toggle("sensorNoResponseAlert")}
              />
            </div>

            {/* Connectivity chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <QuickChip
                icon={<Wifi className="h-3 w-3" />}
                label="Thiết bị"
                active={s.deviceOfflineAlert}
                colorOn="border-violet-100 bg-violet-50 text-violet-600"
              />
              <QuickChip
                icon={<AlertTriangle className="h-3 w-3" />}
                label="Cảm biến"
                active={s.sensorNoResponseAlert}
                colorOn="border-violet-100 bg-violet-50 text-violet-600"
              />
            </div>
          </div>

          {/* D. Notification channels */}
          <div className="space-y-2">
            <GroupHeader
              icon={<Bell className="h-4 w-4 text-sky-500" />}
              label="Kênh gửi thông báo"
              borderColor="border-sky-200"
            />
            <div className="divide-y divide-slate-50">
              <ToggleRow
                label="Thông báo đẩy trên app"
                description="Push notification đến app di động"
                enabled={s.pushNotificationEnabled}
                onToggle={() => toggle("pushNotificationEnabled")}
              />
              <ToggleRow
                label="Thông báo cho admin"
                description="Gửi alert đến tài khoản quản trị viên"
                enabled={s.adminNotificationEnabled}
                onToggle={() => toggle("adminNotificationEnabled")}
              />
              <ToggleRow
                label="Cảnh báo thời gian thực"
                description="Stream alert ngay khi phát hiện bất thường"
                enabled={s.realtimeAlertEnabled}
                onToggle={() => toggle("realtimeAlertEnabled")}
              />
            </div>

            {/* Channel chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <QuickChip
                icon={<Smartphone className="h-3 w-3" />}
                label="App"
                active={s.pushNotificationEnabled}
                colorOn="border-sky-100 bg-sky-50 text-sky-600"
              />
              <QuickChip
                icon={<Bell className="h-3 w-3" />}
                label="Admin"
                active={s.adminNotificationEnabled}
                colorOn="border-sky-100 bg-sky-50 text-sky-600"
              />
              <QuickChip
                icon={<Radio className="h-3 w-3" />}
                label="Realtime"
                active={s.realtimeAlertEnabled}
                colorOn="border-sky-100 bg-sky-50 text-sky-600"
              />
              <QuickChip
                icon={<Moon className="h-3 w-3" />}
                label="Quiet hours"
                active={false}
                colorOn="border-slate-200 bg-slate-100 text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
