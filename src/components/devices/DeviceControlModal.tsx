"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/src/lib/firebase";
import {
  X,
  Wind,
  Lightbulb,
  RefreshCw,
  Sliders,
  Settings,
  Hammer,
  Cpu
} from "lucide-react";

interface DeviceControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  deviceName: string;
}

const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (val: boolean) => void; disabled?: boolean }) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-amber-500" : "bg-slate-200"
      } ${disabled ? "cursor-not-allowed opacity-100" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
};

export default function DeviceControlModal({
  isOpen,
  onClose,
  deviceId,
  deviceName,
}: DeviceControlModalProps) {
  const [opMode, setOpMode] = useState<"auto" | "manual">("auto");
  const [fan, setFan] = useState(false);
  const [heater1, setHeater1] = useState(false);
  const [heater2, setHeater2] = useState(false);
  const [turner, setTurner] = useState(false);
  const [temp, setTemp] = useState(0);
  const [humi, setHumi] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const deviceRef = ref(rtdb, `incubators/${deviceId}`);
    const unsubscribe = onValue(deviceRef, (snapshot) => {
      if (snapshot.exists()) {
        const item = snapshot.val();
        if (item.mode) {
          setOpMode(item.mode);
        }
        if (item.control) {
          setFan(!!item.control.fan);
          setHeater1(!!item.control.heater1);
          setHeater2(!!item.control.heater2);
          setTurner(!!item.control.turner);
        }
        if (item.telemetry) {
          setTemp(Number(item.telemetry.temp ?? 0));
          setHumi(Number(item.telemetry.humi ?? 0));
        }
        if (item.settings) {
          setSettings(item.settings);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, deviceId]);

  // Ở Chế độ Tự động (Auto Mode), rơ-le phần cứng được điều khiển trực tiếp bởi ESP32 theo cảm biến.
  // Web App và App Flutter không ghi đè lệnh điều khiển client-side lên node control.

  if (!isOpen) return null;

  const handleModeChange = async (mode: "auto" | "manual") => {
    try {
      await set(ref(rtdb, `incubators/${deviceId}/mode`), mode);
      setOpMode(mode);
    } catch (err) {
      console.error("Lỗi đổi chế độ hoạt động:", err);
    }
  };

  const handleControlToggle = (field: "fan" | "heater1" | "heater2" | "turner", currentVal: boolean) => {
    if (opMode === "auto") return; // Only allowed in manual mode
    const newVal = !currentVal;
    // Optimistic UI update
    if (field === "fan") setFan(newVal);
    if (field === "heater1") setHeater1(newVal);
    if (field === "heater2") setHeater2(newVal);
    if (field === "turner") setTurner(newVal);

    set(ref(rtdb, `incubators/${deviceId}/control/${field}`), newVal).catch((err) => {
      console.error(`Lỗi điều khiển thiết bị ${field}:`, err);
      // Revert state on network error
      if (field === "fan") setFan(currentVal);
      if (field === "heater1") setHeater1(currentVal);
      if (field === "heater2") setHeater2(currentVal);
      if (field === "turner") setTurner(currentVal);
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-amber-50/30 rounded-[30px] border border-amber-100 bg-white p-6 sm:p-8 flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="relative flex flex-col items-center justify-center pb-4 border-b border-slate-100 w-full">
          <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wide text-center">
            Điều khiển {deviceName}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 text-center">
            ID: {deviceId}
          </p>
          <button
            onClick={onClose}
            className="absolute top-1/2 -translate-y-1/2 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 border border-slate-200/50 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors duration-150 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
            <span className="text-xs font-bold text-slate-500">Đang đồng bộ trạng thái...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-5">
            {/* Mode selection card section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                <Settings className="h-4 w-4 text-amber-500" />
                <span>Chế độ vận hành</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleModeChange("auto")}
                  className={`flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                    opMode === "auto"
                      ? "bg-amber-100/50 border-amber-400 text-amber-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50/50"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-sm ${
                    opMode === "auto" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    A
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wide">Tự động (Auto)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange("manual")}
                  className={`flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                    opMode === "manual"
                      ? "bg-orange-50 border-orange-300 text-orange-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50/50"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    opMode === "manual" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    <Hammer className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wide">Thủ công (Manual)</span>
                </button>
              </div>
            </div>

            {/* Hardware Controls section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                <Sliders className="h-4 w-4 text-amber-500" />
                <span>Điều khiển thiết bị</span>
              </div>

              {opMode === "auto" && (
                <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-2xl text-[11px] text-amber-800 font-semibold leading-relaxed">
                  ⚠️ Lò ấp đang chạy chế độ Tự động. Hãy chuyển sang chế độ Thủ công để điều khiển trực tiếp các bộ phận.
                </div>
              )}

              <div className="flex flex-col gap-3">
                {/* Fan control row */}
                <div className={`flex items-center justify-between p-4 bg-slate-50/60 border border-slate-100 rounded-2xl transition duration-150 ${
                  opMode === "auto" ? "bg-slate-50/40" : "hover:bg-slate-50"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${
                      fan ? "bg-sky-50 border-sky-100 text-sky-600" : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      <Wind className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">QUẠT</p>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 uppercase tracking-wide">
                        Trạng thái: {fan ? <span className="text-emerald-600">Bật</span> : "Tắt"}
                      </p>
                    </div>
                  </div>
                  <Toggle
                    checked={fan}
                    onChange={() => handleControlToggle("fan", fan)}
                    disabled={opMode === "auto"}
                  />
                </div>

                {/* Bulb 1 control row */}
                <div className={`flex items-center justify-between p-4 bg-slate-50/60 border border-slate-100 rounded-2xl transition duration-150 ${
                  opMode === "auto" ? "bg-slate-50/40" : "hover:bg-slate-50"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${
                      heater1 ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      <Lightbulb className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Bóng đèn 1</p>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 uppercase tracking-wide">
                        Trạng thái: {heater1 ? <span className="text-emerald-600">Bật</span> : "Tắt"}
                      </p>
                    </div>
                  </div>
                  <Toggle
                    checked={heater1}
                    onChange={() => handleControlToggle("heater1", heater1)}
                    disabled={opMode === "auto"}
                  />
                </div>

                {/* Bulb 2 control row */}
                <div className={`flex items-center justify-between p-4 bg-slate-50/60 border border-slate-100 rounded-2xl transition duration-150 ${
                  opMode === "auto" ? "bg-slate-50/40" : "hover:bg-slate-50"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${
                      heater2 ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      <Lightbulb className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Bóng đèn 2</p>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 uppercase tracking-wide">
                        Trạng thái: {heater2 ? <span className="text-emerald-600">Bật</span> : "Tắt"}
                      </p>
                    </div>
                  </div>
                  <Toggle
                    checked={heater2}
                    onChange={() => handleControlToggle("heater2", heater2)}
                    disabled={opMode === "auto"}
                  />
                </div>

                {/* Egg turner control row */}
                <div className={`flex items-center justify-between p-4 bg-slate-50/60 border border-slate-100 rounded-2xl transition duration-150 ${
                  opMode === "auto" ? "bg-slate-50/40" : "hover:bg-slate-50"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${
                      turner ? "bg-violet-50 border-violet-100 text-violet-600" : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      <RefreshCw className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">KHAY</p>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 uppercase tracking-wide">
                        Trạng thái: {turner ? <span className="text-emerald-600">Bật</span> : "Tắt"}
                      </p>
                    </div>
                  </div>
                  <Toggle
                    checked={turner}
                    onChange={() => handleControlToggle("turner", turner)}
                    disabled={opMode === "auto"}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
