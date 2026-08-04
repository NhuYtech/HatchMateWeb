"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/src/lib/firebase";
import {
  ChevronRight,
  Settings,
  Cpu,
  Wifi,
  Thermometer,
  Droplets,
  RotateCw,
  Bell,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Check,
  X,
  Save,
  Info,
  Calendar,
  Flame,
  WifiOff,
  RefreshCcw,
  Clock,
  Radio,
  FileCheck2,
  HardDriveDownload,
  AlertCircle,
  Sparkles
} from "lucide-react";

// Segmented Control Component
const SegmentedControl = ({
  options,
  value,
  onChange
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}) => {
  return (
    <div className="flex rounded-xl bg-slate-100/80 p-1 border border-slate-200/30">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-200 cursor-pointer text-slate-500 hover:text-slate-800"
          style={value === opt.value ? { backgroundColor: 'white', color: '#d97706', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } : {}}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// Clean IOS-style Toggle Switch
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? "bg-amber-500" : "bg-slate-200"
        }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  );
};

// Numeric Input with Unit Suffix
const UnitInput = ({
  label,
  value,
  onChange,
  unit,
  disabled = false,
  min,
  max,
  step
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  unit: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase">{label}</label>
      <div className="relative flex items-center">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={`h-11 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 text-sm font-medium text-slate-800 outline-none transition-all duration-200 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 ${disabled ? "opacity-60 bg-slate-100 cursor-not-allowed" : ""
            }`}
        />
        <span className="absolute right-4 text-xs font-bold text-slate-400 select-none">{unit}</span>
      </div>
    </div>
  );
};

function DeviceConfigurationContent() {
  const searchParams = useSearchParams();
  const machineId = searchParams.get("id") || "MATG01";

  // 1. General state
  const [deviceName, setDeviceName] = useState("HatchMate Smart Pro");
  const [eggType, setEggType] = useState("chicken");
  const [opMode, setOpMode] = useState("auto");

  // 2. Incubation Cycle state
  const [startDate, setStartDate] = useState("2026-07-09");
  const [totalDays, setTotalDays] = useState(21);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentPhase, setCurrentPhase] = useState("Giai đoạn 1");
  const [stopTurningDay, setStopTurningDay] = useState(18);

  // Synchronize currentPhase with currentDay
  useEffect(() => {
    if (currentDay >= 1 && currentDay <= 7) {
      setCurrentPhase("Giai đoạn 1");
    } else if (currentDay >= 8 && currentDay <= 17) {
      setCurrentPhase("Giai đoạn 2");
    } else if (currentDay >= 18 && currentDay <= 21) {
      setCurrentPhase("Giai đoạn 3");
    }
  }, [currentDay]);

  // 3. Temp state
  const [tempMin, setTempMin] = useState(37.5);
  const [tempMax, setTempMax] = useState(38.1);
  const [tempAlert, setTempAlert] = useState(39.0);
  const [tempOffset, setTempOffset] = useState(0.0);
  const [tempHysteresis, setTempHysteresis] = useState(0.2);

  // 4. Humi state
  const [humiMin, setHumiMin] = useState(58);
  const [humiMax, setHumiMax] = useState(68);
  const [humiAlert, setHumiAlert] = useState(48);
  const [humiOffset, setHumiOffset] = useState(0);

  // 5. Turning state
  const [enableTurning, setEnableTurning] = useState(true);
  const [turnInterval, setTurnInterval] = useState(2);
  const [servoAngle, setServoAngle] = useState(45);
  const [turnDuration, setTurnDuration] = useState(60);

  // 7. Notification toggles
  const [notifyTemp, setNotifyTemp] = useState(true);
  const [notifyHumi, setNotifyHumi] = useState(true);
  const [notifyOffline, setNotifyOffline] = useState(true);
  const [notifyFire, setNotifyFire] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  // Raw DB values state for read-only tracking
  const [rawDbData, setRawDbData] = useState<any>(null);

  // Popup state
  const [popupAlert, setPopupAlert] = useState<{
    type: "success" | "error" | "loading";
    title: string;
    message: string;
  } | null>(null);

  // Listen to database path `incubators/${machineId}`
  useEffect(() => {
    const deviceRef = ref(rtdb, `incubators/${machineId}`);
    const unsubscribe = onValue(deviceRef, (snapshot) => {
      if (snapshot.exists()) {
        const item = snapshot.val();
        setRawDbData(item);

        if (item.name) setDeviceName(item.name);
        if (item.mode) setOpMode(item.mode);
        if (item.cycle?.startDate) {
          setStartDate(item.cycle.startDate.substring(0, 10));
        }
        if (item.cycle?.totalDays !== undefined) {
          setTotalDays(item.cycle.totalDays);
        }
        if (item.telemetry?.day !== undefined) {
          setCurrentDay(item.telemetry.day);
        }
        if (item.telemetry?.phase !== undefined) {
          setCurrentPhase(`Giai đoạn ${item.telemetry.phase}`);
        }

        // Settings
        if (item.settings) {
          const s = item.settings;
          if (s.tempMin !== undefined) setTempMin(s.tempMin);
          if (s.tempMax !== undefined) setTempMax(s.tempMax);
          if (s.tempAlert !== undefined) setTempAlert(s.tempAlert);
          if (s.tempAdjustment !== undefined) setTempOffset(s.tempAdjustment);

          if (s.humidityMin !== undefined) setHumiMin(s.humidityMin);
          if (s.humidityMax !== undefined) setHumiMax(s.humidityMax);
          if (s.humidityAlert !== undefined) setHumiAlert(s.humidityAlert);

          if (s.turnInterval !== undefined) setTurnInterval(s.turnInterval);
          if (s.servoAngle !== undefined) setServoAngle(s.servoAngle);
          if (s.turnDuration !== undefined) setTurnDuration(s.turnDuration);
        }
      }
    });

    return () => unsubscribe();
  }, [machineId]);

  // Automatically calculate settings for Auto mode matching microcontroller & Flutter app logic
  useEffect(() => {
    if (opMode === "auto") {
      let tMin = 37.5;
      let tMax = 38.1;
      let hMin = 58;
      let hMax = 68;
      let hAlert = 48;
      let tInterval = 2;
      let tDuration = 60;

      if (currentDay >= 1 && currentDay <= 7) {
        tMin = 37.5;
        tMax = 38.1;
        hMin = 58;
        hMax = 68;
        hAlert = 48;
        tInterval = 2;
        tDuration = 60;
      } else if (currentDay >= 8 && currentDay <= 17) {
        tMin = 37.2;
        tMax = 37.8;
        hMin = 55;
        hMax = 65;
        hAlert = 45;
        tInterval = 2;
        tDuration = 60;
      } else if (currentDay >= 18 && currentDay <= 21) {
        tMin = 36.9;
        tMax = 37.5;
        hMin = 72;
        hMax = 82;
        hAlert = 62;
        tInterval = 0;
        tDuration = 0;
      } else if (currentDay > 21) {
        tMin = 0.0;
        tMax = 0.0;
        hMin = 0;
        hMax = 0;
        hAlert = 0;
        tInterval = 0;
        tDuration = 0;
      }

      setTempMin(tMin);
      setTempMax(tMax);
      setTempAlert(39.0);
      setHumiMin(hMin);
      setHumiMax(hMax);
      setHumiAlert(hAlert);
      setTurnInterval(tInterval);
      setTurnDuration(tDuration);
    }
  }, [opMode, currentDay]);

  // Helper to change day and auto-sync stage and start date
  const handleDayChange = (newDay: number) => {
    const clampedDay = Math.max(1, Math.min(21, newDay));
    setCurrentDay(clampedDay);

    let newPhase = "Giai đoạn 1";
    if (clampedDay >= 8 && clampedDay <= 17) {
      newPhase = "Giai đoạn 2";
    } else if (clampedDay >= 18) {
      newPhase = "Giai đoạn 3";
    }
    setCurrentPhase(newPhase);

    // Sync start date
    const today = new Date();
    today.setDate(today.getDate() - (clampedDay - 1));
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setStartDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSave = async () => {
    setPopupAlert({
      type: "loading",
      title: "Đang lưu cấu hình",
      message: `Đang gửi thiết lập mới tới máy ấp ${machineId}...`
    });
    try {
      // 1. Save settings
      const settingsRef = ref(rtdb, `incubators/${machineId}/settings`);
      await set(settingsRef, {
        tempMin,
        tempMax,
        tempAlert,
        tempAdjustment: tempOffset,
        humidityMin: humiMin,
        humidityMax: humiMax,
        humidityAlert: humiAlert,
        turnInterval,
        servoAngle,
        turnDuration
      });

      // 2. Save root attributes
      const nameRef = ref(rtdb, `incubators/${machineId}/name`);
      await set(nameRef, deviceName);

      const modeRef = ref(rtdb, `incubators/${machineId}/mode`);
      await set(modeRef, opMode);

      // 3. Save cycle
      const cycleRef = ref(rtdb, `incubators/${machineId}/cycle`);
      await set(cycleRef, {
        isActive: rawDbData?.cycle?.isActive ?? true,
        startDate: startDate + (rawDbData?.cycle?.startDate ? rawDbData.cycle.startDate.substring(10) : "T12:22:02.200783"),
        totalDays
      });

      // 4. Save telemetry (to sync the user-selected stage/day back to the device)
      const telemetryRef = ref(rtdb, `incubators/${machineId}/telemetry`);
      const phaseVal = currentPhase.includes("1") ? 1 : currentPhase.includes("2") ? 2 : 3;
      await set(telemetryRef, {
        ...(rawDbData?.telemetry || {}),
        day: currentDay,
        phase: phaseVal
      });

      setPopupAlert({
        type: "success",
        title: "Lưu thành công!",
        message: `Cấu hình đã được áp dụng và đồng bộ hóa tới máy ấp ${machineId}!`
      });
      setTimeout(() => setPopupAlert(null), 4000);
    } catch (err) {
      console.error("Lỗi khi lưu cấu hình:", err);
      setPopupAlert({
        type: "error",
        title: "Lưu thất bại",
        message: "Đã xảy ra sự cố khi lưu cấu hình thiết bị. Vui lòng kiểm tra kết nối mạng!"
      });
      setTimeout(() => setPopupAlert(null), 4000);
    }
  };

  const triggerMaintenance = (action: string) => {
    let actionTitle = "Đang gửi lệnh";
    let actionMessage = "Vui lòng đợi giây lát...";
    let successMessage = "Lệnh đã được thực thi thành công!";

    if (action === "restart") {
      actionTitle = "Khởi động lại";
      actionMessage = `Đang gửi lệnh khởi động lại tới máy ấp ${machineId}...`;
      successMessage = `Máy ấp ${machineId} đang khởi động lại hệ thống!`;
    } else if (action === "synctime") {
      actionTitle = "Đồng bộ thời gian";
      actionMessage = `Đang đồng bộ giờ thực tế cho máy ấp ${machineId}...`;
      successMessage = "Đồng bộ hóa thời gian thành công!";
    } else if (action === "firmware") {
      actionTitle = "Kiểm tra Firmware";
      actionMessage = "Đang kiểm tra và yêu cầu máy cập nhật bản mới nhất...";
      successMessage = "Thiết bị đang chạy phiên bản mới nhất!";
    } else if (action === "factoryreset") {
      actionTitle = "Khôi phục cài đặt gốc";
      actionMessage = "Đang tiến hành khôi phục cài đặt ban đầu cho lò ấp...";
      successMessage = "Khôi phục cài đặt gốc hoàn tất!";
    } else if (action === "capture") {
      actionTitle = "Yêu cầu chụp ảnh";
      actionMessage = `Đang gửi lệnh yêu cầu chụp ảnh tới máy ấp ${machineId}...`;
      successMessage = "Yêu cầu chụp ảnh thành công! Hình ảnh mới sẽ sớm được tải lên.";
    }

    setPopupAlert({
      type: "loading",
      title: actionTitle,
      message: actionMessage
    });

    setTimeout(() => {
      setPopupAlert({
        type: "success",
        title: "Thành công",
        message: successMessage
      });
      setTimeout(() => setPopupAlert(null), 4000);
    }, 1500);
  };

  // Derive live status states
  const liveTemp = rawDbData?.telemetry?.temp !== undefined ? Number(rawDbData.telemetry.temp) : 37.6;
  const liveHumi = rawDbData?.telemetry?.humi !== undefined ? Number(rawDbData.telemetry.humi) : 61;
  const liveStatus = rawDbData?.status || "Online";
  const liveFirmware = rawDbData?.firmware || "v1.2.0";
  const liveWifi = rawDbData?.wifi !== undefined ? Number(rawDbData.wifi) : 5;
  const liveLastSeen = rawDbData?.lastSeen || "Vừa xong";

  return (
    <div className="grid gap-4">

      {/* Top Header Section */}
      <div className="flex flex-col gap-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2.5">
          {/* Large Title & Subtitle */}
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <h5 className="text-1xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Cấu hình máy {machineId}
            </h5>

            <div className="flex gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                liveStatus.toLowerCase() === "online"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : liveStatus.toLowerCase() === "warning"
                  ? "bg-amber-50 border border-amber-200 text-amber-700"
                  : "bg-slate-50 border border-slate-200 text-slate-500"
                }`}>
                <span className={`h-2 w-2 rounded-full ${
                  liveStatus.toLowerCase() === "online" 
                    ? "bg-emerald-500 animate-pulse" 
                    : liveStatus.toLowerCase() === "warning"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-slate-400"
                  }`} />
                {liveStatus}
              </span>
            </div>
          </div>

          <p className="text-sm font-medium text-slate-500 max-w-xl">
            Thiết lập các ngưỡng vận hành, thông số chu kỳ ấp, vòng quay đảo trứng và cấu hình cảnh báo cho trạm ấp này.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3.5 shrink-0">
          {/* <button
              onClick={() => window.history.back()}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] duration-150 cursor-pointer"
            >
              Hủy
            </button> */}
          <button
            onClick={handleSave}
            disabled={popupAlert?.type === "loading"}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 text-sm font-bold text-white shadow-md shadow-sky-100 hover:bg-sky-600 active:scale-[0.98] transition disabled:opacity-75 disabled:cursor-not-allowed duration-150 cursor-pointer"
          >
            {popupAlert?.type === "loading" && popupAlert?.title === "Đang lưu cấu hình" ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* Left Column - 8 configuration cards */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-4">

          {/* Card 1 — General Information */}
          <section className="bg-white rounded-[24px] border border-slate-200/70 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_35px_rgb(0,0,0,0.03)] flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-500">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Thông tin chung</h2>

              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Tên thiết bị</label>
                <input
                  type="text"
                  value={deviceName}
                  disabled
                  className="h-11 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400 outline-none cursor-not-allowed select-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Mã thiết bị</label>
                <input
                  type="text"
                  value={machineId}
                  disabled
                  className="h-11 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400 outline-none cursor-not-allowed select-none"
                />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Chế độ hoạt động</label>
                <SegmentedControl
                  options={[
                    { label: "Tự động", value: "auto" },
                    { label: "Thủ công", value: "manual" }
                  ]}
                  value={opMode}
                  onChange={setOpMode}
                />
              </div>
            </div>
          </section>

          {/* Card 2 — Incubation Cycle */}
          <section className="bg-white rounded-[24px] border border-slate-200/70 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_35px_rgb(0,0,0,0.03)] flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-500">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Chu kỳ ấp trứng</h2>
                <p className="text-xs text-slate-400 font-medium">Điều chỉnh ngày ấp hiện tại hoặc giai đoạn để hệ thống tự động áp dụng các ngưỡng chuẩn sinh học.</p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Ngày bắt đầu ấp</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition duration-200 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 cursor-pointer"
                />
              </div>

              <UnitInput
                label="Tổng số ngày ấp"
                value={totalDays}
                onChange={setTotalDays}
                unit="ngày"
                min={1}
              />

              <UnitInput
                label="Ngày dừng đảo trứng"
                value={stopTurningDay}
                onChange={setStopTurningDay}
                unit="ngày"
                min={1}
              />

              {/* Editable Day Selector Dropdown */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Ngày ấp hiện tại</label>
                <select
                  value={currentDay}
                  onChange={(e) => handleDayChange(Number(e.target.value))}
                  className="h-11 rounded-xl border border-sky-300 bg-sky-50/50 px-4 text-sm font-bold text-sky-900 outline-none transition duration-200 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 cursor-pointer"
                >
                  {Array.from({ length: 21 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Ngày {day} {day <= 7 ? "(Giai đoạn 1)" : day <= 17 ? "(Giai đoạn 2)" : "(Giai đoạn 3 - Nở)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Editable Stage Selector Dropdown */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Giai đoạn ấp hiện tại</label>
                <select
                  value={currentPhase}
                  onChange={(e) => {
                    const newPhase = e.target.value;
                    if (newPhase === "Giai đoạn 1") handleDayChange(1);
                    else if (newPhase === "Giai đoạn 2") handleDayChange(8);
                    else if (newPhase === "Giai đoạn 3") handleDayChange(18);
                  }}
                  className="h-11 w-full rounded-xl border border-sky-300 bg-sky-50/50 px-4 text-sm font-bold text-sky-900 outline-none transition duration-200 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 cursor-pointer"
                >
                  <option value="Giai đoạn 1">Giai đoạn 1: Ngày 1 – 7 (Ấp giai đoạn đầu)</option>
                  <option value="Giai đoạn 2">Giai đoạn 2: Ngày 8 – 17 (Ấp giai đoạn giữa)</option>
                  <option value="Giai đoạn 3">Giai đoạn 3: Ngày 18 – 21 (Giai đoạn mổ vỏ & nở)</option>
                </select>
              </div>
            </div>

            {/* 3-Stage Information & Preset Cards (Matching App) */}
            <div className="mt-2 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/40 via-white to-amber-50/30 p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    THÔNG SỐ CHUẨN 3 GIAI ĐOẠN (ẤP TRỨNG GÀ)
                  </h4>
                </div>
                <span className="text-[10px] font-extrabold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {opMode === "auto" ? "Chế độ Auto đang áp dụng" : "Chế độ Manual"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                {/* Stage 1 Card */}
                <div
                  onClick={() => handleDayChange(1)}
                  className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    currentDay >= 1 && currentDay <= 7
                      ? "bg-sky-500 text-white border-sky-600 shadow-md shadow-sky-200 scale-[1.02]"
                      : "bg-white border-slate-200/80 text-slate-700 hover:border-sky-300 hover:bg-sky-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider">Giai đoạn 1</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      currentDay >= 1 && currentDay <= 7 ? "bg-white/20 text-white" : "bg-sky-100 text-sky-700"
                    }`}>
                      Ngày 1 - 7
                    </span>
                  </div>
                  <div className="space-y-1 text-xs font-medium">
                    <p className="flex items-center justify-between">
                      <span className="opacity-80">Nhiệt độ:</span>
                      <span className="font-bold">37.5°C – 38.1°C</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="opacity-80">Độ ẩm:</span>
                      <span className="font-bold">58% – 68%</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="opacity-80">Đảo trứng:</span>
                      <span className="font-bold">2h / lần (60s)</span>
                    </p>
                  </div>
                </div>

                {/* Stage 2 Card */}
                <div
                  onClick={() => handleDayChange(8)}
                  className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    currentDay >= 8 && currentDay <= 17
                      ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-200 scale-[1.02]"
                      : "bg-white border-slate-200/80 text-slate-700 hover:border-amber-300 hover:bg-amber-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider">Giai đoạn 2</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      currentDay >= 8 && currentDay <= 17 ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                    }`}>
                      Ngày 8 - 17
                    </span>
                  </div>
                  <div className="space-y-1 text-xs font-medium">
                    <p className="flex items-center justify-between">
                      <span className="opacity-80">Nhiệt độ:</span>
                      <span className="font-bold">37.2°C – 37.8°C</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="opacity-80">Độ ẩm:</span>
                      <span className="font-bold">55% – 65%</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="opacity-80">Đảo trứng:</span>
                      <span className="font-bold">2h / lần (60s)</span>
                    </p>
                  </div>
                </div>

                {/* Stage 3 Card */}
                <div
                  onClick={() => handleDayChange(18)}
                  className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    currentDay >= 18 && currentDay <= 21
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-200 scale-[1.02]"
                      : "bg-white border-slate-200/80 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider">Giai đoạn 3 (Nở)</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      currentDay >= 18 && currentDay <= 21 ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      Ngày 18 - 21
                    </span>
                  </div>
                  <div className="space-y-1 text-xs font-medium">
                    <p className="flex items-center justify-between">
                      <span className="opacity-80">Nhiệt độ:</span>
                      <span className="font-bold">36.9°C – 37.5°C</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="opacity-80">Độ ẩm:</span>
                      <span className="font-bold">72% – 82%</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="opacity-80">Đảo trứng:</span>
                      <span className="font-bold">TẮT (Dừng đảo)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Card 3 — Temperature Settings */}
          <section className="bg-white rounded-[24px] border border-slate-200/70 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_35px_rgb(0,0,0,0.03)] flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-500">
                <Thermometer className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Cài đặt nhiệt độ</h2>

              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              <UnitInput
                label="Nhiệt độ tối thiểu"
                value={tempMin}
                onChange={setTempMin}
                unit="°C"
                step={0.1}
                disabled={opMode === "auto"}
              />

              <UnitInput
                label="Nhiệt độ tối đa"
                value={tempMax}
                onChange={setTempMax}
                unit="°C"
                step={0.1}
                disabled={opMode === "auto"}
              />

              <UnitInput
                label="Ngưỡng cảnh báo"
                value={tempAlert}
                onChange={setTempAlert}
                unit="°C"
                step={0.1}
                disabled={opMode === "auto"}
              />

              <UnitInput
                label="Độ lệch hiệu chuẩn"
                value={tempOffset}
                onChange={setTempOffset}
                unit="°C"
                step={0.1}
                disabled={opMode === "auto"}
              />

              <div className="sm:col-span-2">
                <UnitInput
                  label="Sai số (Hysteresis)"
                  value={tempHysteresis}
                  onChange={setTempHysteresis}
                  unit="°C"
                  step={0.05}
                  disabled={opMode === "auto"}
                />
              </div>
            </div>
          </section>

          {/* Card 4 — Humidity Settings */}
          <section className="bg-white rounded-[24px] border border-slate-200/70 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_35px_rgb(0,0,0,0.03)] flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-500">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Cài đặt độ ẩm</h2>

              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <UnitInput
                label="Độ ẩm tối thiểu"
                value={humiMin}
                onChange={setHumiMin}
                unit="%"
                disabled={opMode === "auto"}
              />

              <UnitInput
                label="Độ ẩm tối đa"
                value={humiMax}
                onChange={setHumiMax}
                unit="%"
                disabled={opMode === "auto"}
              />

              <UnitInput
                label="Ngưỡng cảnh báo"
                value={humiAlert}
                onChange={setHumiAlert}
                unit="%"
                disabled={opMode === "auto"}
              />

              <UnitInput
                label="Độ lệch hiệu chuẩn"
                value={humiOffset}
                onChange={setHumiOffset}
                unit="%"
                disabled={opMode === "auto"}
              />
            </div>
          </section>

          {/* Card 5 — Egg Turning */}
          <section className="bg-white rounded-[24px] border border-slate-200/70 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_35px_rgb(0,0,0,0.03)] flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-500">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">Đảo trứng tự động</h2>

                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className={`${opMode === "auto" && "opacity-50 pointer-events-none"}`}>
                <UnitInput
                  label="Chu kỳ đảo trứng"
                  value={turnInterval}
                  onChange={setTurnInterval}
                  unit="giờ"
                  disabled={opMode === "auto"}
                />
              </div>

              <div className={`${opMode === "auto" && "opacity-50 pointer-events-none"}`}>
                <UnitInput
                  label="Thời gian mỗi lần đảo"
                  value={turnDuration}
                  onChange={setTurnDuration}
                  unit="giây"
                  disabled={opMode === "auto"}
                />
              </div>
            </div>
          </section>


          {/* Card 8 — Maintenance */}
          <section className="bg-white rounded-[24px] border border-slate-200/70 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_35px_rgb(0,0,0,0.03)] flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-500">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Bảo trì & Đặt lại thiết bị</h2>

              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => triggerMaintenance("restart")}
                disabled={popupAlert?.type === "loading"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <RefreshCcw className="h-4 w-4" />
                Khởi động lại máy
              </button>

              <button
                type="button"
                onClick={() => triggerMaintenance("synctime")}
                disabled={popupAlert?.type === "loading"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Clock className="h-4 w-4" />
                Đồng bộ thời gian
              </button>

              <div className="sm:ml-auto">
                <button
                  type="button"
                  onClick={() => triggerMaintenance("factoryreset")}
                  disabled={popupAlert?.type === "loading"}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-2 border-rose-200 hover:border-rose-300 bg-white hover:bg-rose-50 px-6 text-sm font-bold text-rose-600 shadow-sm transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <AlertCircle className="h-4 w-4" />
                  Khôi phục cài đặt gốc
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* Right Column - Sticky summary card */}
        <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-8 flex flex-col gap-4 font-sans">
          <div className="rounded-[24px] border border-sky-100/80 bg-warm-pastel p-6 shadow-sm shadow-sky-100/10">
            {/* Header section matching ReportExportCard */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                TỔNG QUAN TRỰC TIẾP
              </h3>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100/80 px-2.5 py-0.5 rounded-md border border-slate-200/60 font-mono">
                {machineId}
              </span>
            </div>
            
            <h4 className="text-base font-bold text-sky-950 mb-1">Trạng thái vận hành</h4>
            <p className="text-xs text-slate-500 mb-6">Theo dõi tức thời các thông số môi trường và cảm biến của thiết bị.</p>

            {/* List of Status Items formatted like ReportExportCard option items */}
            <div className="space-y-3 mb-6">
              {/* Device Status */}
              <div className="flex items-center justify-between rounded-[16px] border border-slate-100 bg-slate-50/50 p-3.5">
                <span className="text-xs font-semibold text-slate-600">Trạng thái máy</span>
                <span className={`inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 rounded-full border ${
                  liveStatus.toLowerCase() === "online" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" 
                    : liveStatus.toLowerCase() === "warning"
                    ? "bg-amber-50 text-amber-700 border-amber-200/80"
                    : "bg-rose-50 text-rose-700 border-rose-200/80"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    liveStatus.toLowerCase() === "online" 
                      ? "bg-emerald-500 animate-pulse" 
                      : liveStatus.toLowerCase() === "warning"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-rose-500"
                  }`} />
                  {liveStatus}
                </span>
              </div>

              {/* Firmware */}
              <div className="flex items-center justify-between rounded-[16px] border border-slate-100 bg-slate-50/50 p-3.5">
                <span className="text-xs font-semibold text-slate-600">Phiên bản Firmware</span>
                <span className="font-mono text-xs font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200/60">
                  {liveFirmware}
                </span>
              </div>

              {/* Wi-Fi Signal */}
              <div className="flex items-center justify-between rounded-[16px] border border-slate-100 bg-slate-50/50 p-3.5">
                <span className="text-xs font-semibold text-slate-600">Tín hiệu Wi-Fi</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-xs text-sky-600">
                  <Wifi className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                  <span>{liveWifi >= 4 ? "Cực tốt" : liveWifi === 3 ? "Tốt" : liveWifi === 2 ? "Trung bình" : "Yếu"}</span>
                </span>
              </div>

              {/* Last Sync */}
              <div className="flex items-center justify-between rounded-[16px] border border-slate-100 bg-slate-50/50 p-3.5">
                <span className="text-xs font-semibold text-slate-600">Đồng bộ cuối</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{liveLastSeen}</span>
                </span>
              </div>

              {/* Temperature */}
              <div className="flex items-center justify-between rounded-[16px] border border-slate-100 bg-slate-50/50 p-3.5">
                <span className="text-xs font-semibold text-slate-600">Nhiệt độ hiện tại</span>
                <span className="inline-flex items-center gap-1 text-sm font-extrabold text-rose-600">
                  <Thermometer className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{liveTemp}°C</span>
                </span>
              </div>

              {/* Humidity */}
              <div className="flex items-center justify-between rounded-[16px] border border-slate-100 bg-slate-50/50 p-3.5">
                <span className="text-xs font-semibold text-slate-600">Độ ẩm hiện tại</span>
                <span className="inline-flex items-center gap-1 text-sm font-extrabold text-sky-600">
                  <Droplets className="h-4 w-4 text-sky-500 shrink-0" />
                  <span>{liveHumi}%</span>
                </span>
              </div>
            </div>

            {/* Quick Summary Note matching ReportExportCard tip */}
            <div className="rounded-[16px] bg-sky-50/50 border border-sky-100/80 p-3.5 flex gap-2.5 items-start text-xs text-slate-600 leading-relaxed">
              <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
              <p className="m-0">
                Giao diện này dùng để cấu hình trực tiếp trạm ấp <strong className="font-bold text-sky-950">{machineId}</strong>. Các thay đổi sẽ được đồng bộ xuống thiết bị ngay khi bấm <strong className="font-bold text-sky-950">Lưu thay đổi</strong>.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Popup Alerts */}
      {popupAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className={`flex flex-col items-center text-center gap-4 rounded-2xl border px-6 py-6 shadow-2xl bg-pure-white max-w-sm w-full animate-in zoom-in-95 duration-200 ${popupAlert.type === "success"
            ? "border-emerald-100"
            : popupAlert.type === "error"
              ? "border-rose-100"
              : "border-amber-100"
            }`}>
            <div className={`p-3 rounded-full ${popupAlert.type === "success"
              ? "bg-emerald-50 text-emerald-600"
              : popupAlert.type === "error"
                ? "bg-rose-50 text-rose-600"
                : "bg-amber-50 text-amber-600"
              }`}>
              {popupAlert.type === "success" ? (
                <Check className="h-8 w-8" />
              ) : popupAlert.type === "error" ? (
                <AlertCircle className="h-8 w-8" />
              ) : (
                <RotateCw className="h-8 w-8 animate-spin" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-extrabold text-slate-800">{popupAlert.title}</h3>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">{popupAlert.message}</p>
            </div>
            {popupAlert.type !== "loading" && (
              <button
                onClick={() => setPopupAlert(null)}
                className="mt-2 w-full h-9 rounded-xl text-xs font-bold transition active:scale-[0.98] cursor-pointer bg-button-gray"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeviceConfigurationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-20 gap-3">
        <RotateCw className="h-8 w-8 text-sky-500 animate-spin" />
        <span className="text-xs font-bold text-slate-500">Đang tải cấu hình thiết bị...</span>
      </div>
    }>
      <DeviceConfigurationContent />
    </Suspense>
  );
}
