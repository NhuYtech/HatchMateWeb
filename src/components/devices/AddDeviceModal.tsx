"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Cpu, KeyRound, Tag, Calendar, AlertCircle, User } from "lucide-react";
import { ref, set, get } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { rtdb, db } from "@/src/lib/firebase";

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDeviceModal({ isOpen, onClose, onSuccess }: AddDeviceModalProps) {
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [eggType, setEggType] = useState("chicken"); // chicken (21), duck (28), pigeon (18), custom
  const [customDays, setCustomDays] = useState("21");
  const [users, setUsers] = useState<{ email: string; fullName: string; uid: string }[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [mounted, setMounted] = useState(false);

  // Set mounted status on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch users from Firestore when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const usersCol = collection(db, "users");
          const querySnapshot = await getDocs(usersCol);
          const list: { email: string; fullName: string; uid: string }[] = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.email) {
              list.push({
                email: data.email,
                fullName: data.fullName || data.name || "Người dùng ẩn danh",
                uid: data.uid || doc.id,
              });
            }
          });

          setUsers(list);
          // Default to the first owner found, or if none, the first user, or empty
          const owner = list.find((u) => u.email === "owner@hatchmate.com") || list[0];
          if (owner) {
            setSelectedUserEmail(owner.email);
          }
        } catch (err) {
          console.error("Lỗi khi tải danh sách người dùng:", err);
        } finally {
          setLoadingUsers(false);
        }
      };

      fetchUsers();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setDeviceId("");
      setDeviceName("");
      setPinCode("");
      setEggType("chicken");
      setCustomDays("21");
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Helper to generate a random 6-digit PIN
  const handleGeneratePin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPinCode(randomPin);
    if (errors.pinCode) {
      setErrors((prev) => ({ ...prev, pinCode: "" }));
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: { [key: string]: string } = {};

    // 1. Device ID Validation
    const idTrimmed = deviceId.trim();
    if (!idTrimmed) {
      newErrors.deviceId = "Mã thiết bị không được để trống";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(idTrimmed)) {
      newErrors.deviceId = "Mã thiết bị chỉ chứa chữ cái, số, dấu gạch ngang (-) và gạch dưới (_)";
    } else {
      // Check if device ID already exists in Firebase RTDB
      try {
        const deviceRef = ref(rtdb, `incubators/${idTrimmed}`);
        const snapshot = await get(deviceRef);
        if (snapshot.exists()) {
          newErrors.deviceId = "Mã thiết bị này đã tồn tại trên hệ thống";
        }
      } catch (err) {
        console.error("Lỗi kiểm tra trùng lặp ID:", err);
      }
    }

    // 2. Device Name Validation
    if (!deviceName.trim()) {
      newErrors.deviceName = "Tên thiết bị không được để trống";
    }

    // 3. PIN Code Validation
    if (!pinCode.trim()) {
      newErrors.pinCode = "Mã PIN kích hoạt không được để trống";
    } else if (!/^\d{6}$/.test(pinCode.trim())) {
      newErrors.pinCode = "Mã PIN phải chứa đúng 6 chữ số";
    }

    // 4. Owner Validation
    const emailTrimmed = selectedUserEmail.trim();
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      newErrors.owner = "Địa chỉ email không đúng định dạng";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isValid = await validateForm();
    if (!isValid) {
      setLoading(false);
      return;
    }

    const totalDays = 21; // Mặc định chu kỳ ấp trứng gà (21 ngày)

    const selectedUser = users.find((u) => u.email === selectedUserEmail);
    const ownerUid = selectedUser ? selectedUser.uid : "";

    const newDeviceData = {
      name: deviceName.trim(),
      code: pinCode.trim(),
      ownerEmail: selectedUserEmail,
      ownerUid: ownerUid,
      status: "Offline",
      alert: "NORMAL",
      control: {
        fan: false,
        heater1: false,
        heater2: false,
        reset: false,
        turner: false
      },
      cycle: {
        isActive: false,
        startDate: "",
        totalDays: totalDays
      },
      telemetry: {
        day: 0,
        humi: 0,
        temp: 0,
        phase: 1
      },
      settings: {
        humidityAlert: 48,
        humidityMax: 68,
        humidityMin: 58,
        servoAngle: 45,
        tempAdjustment: 0,
        tempAlert: 39,
        tempMax: 38.1,
        tempMin: 37.5,
        turnDuration: 60,
        turnInterval: 2
      }
    };

    try {
      const targetRef = ref(rtdb, `incubators/${deviceId.trim()}`);
      await set(targetRef, newDeviceData);
      setLoading(false);
      onSuccess();
    } catch (err: any) {
      setLoading(false);
      setErrors({ global: err.message || "Đã xảy ra lỗi khi tạo thiết bị. Vui lòng thử lại." });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300 animate-fadeIn">
      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white/95 rounded-[30px] shadow-2xl border border-sky-100/50 p-6 sm:p-8 flex flex-col relative overflow-hidden transition-all duration-300 transform scale-100">

        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150 cursor-pointer disabled:opacity-50"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-6 pb-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">
            THÊM MÁY ẤP MỚI
          </h3>
        </div>

        {/* Global Error Banner */}
        {errors.global && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-100 p-3.5 text-xs text-rose-700 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{errors.global}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Device ID Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block pl-1">
              Mã thiết bị<span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Tag className="absolute left-3.5 h-4 w-4 text-slate-400 z-10" />
              <input
                type="text"
                disabled={loading}
                value={deviceId}
                onChange={(e) => {
                  setDeviceId(e.target.value.toUpperCase());
                  if (errors.deviceId) setErrors((prev) => ({ ...prev, deviceId: "" }));
                }}
                placeholder="Ví dụ: MATG02"
                className={`w-full pl-10 pr-4 py-3 bg-white border rounded-[16px] text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all duration-200 ${errors.deviceId
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                  : "border-slate-200 focus:border-amber-500 focus:ring-amber-100"
                  }`}
              />
            </div>
            {errors.deviceId && (
              <p className="text-xs text-rose-600 font-semibold pl-1 flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                {errors.deviceId}
              </p>
            )}
          </div>

          {/* Device Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block pl-1">
              Tên thiết bị <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Cpu className="absolute left-3.5 h-4 w-4 text-slate-400 z-10" />
              <input
                type="text"
                disabled={loading}
                value={deviceName}
                onChange={(e) => {
                  setDeviceName(e.target.value);
                  if (errors.deviceName) setErrors((prev) => ({ ...prev, deviceName: "" }));
                }}
                placeholder="Ví dụ: Máy ấp trứng gà 02"
                className={`w-full pl-10 pr-4 py-3 bg-white border rounded-[16px] text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all duration-200 ${errors.deviceName
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                  : "border-slate-200 focus:border-amber-500 focus:ring-amber-100"
                  }`}
              />
            </div>
            {errors.deviceName && (
              <p className="text-xs text-rose-600 font-semibold pl-1 flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                {errors.deviceName}
              </p>
            )}
          </div>

          {/* PIN Code Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block pl-1">
              Mã PIN Kích hoạt (6 số) <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 flex items-center">
                <KeyRound className="absolute left-3.5 h-4 w-4 text-slate-400 z-10" />
                <input
                  type="text"
                  maxLength={6}
                  disabled={loading}
                  value={pinCode}
                  onChange={(e) => {
                    // Only allow numbers
                    const val = e.target.value.replace(/\D/g, "");
                    setPinCode(val);
                    if (errors.pinCode) setErrors((prev) => ({ ...prev, pinCode: "" }));
                  }}
                  placeholder="Ví dụ: 123456"
                  className={`w-full pl-10 pr-4 py-3 bg-white border rounded-[16px] text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all duration-200 ${errors.pinCode
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-amber-500 focus:ring-amber-100"
                    }`}
                />
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleGeneratePin}
                className="h-[46px] rounded-[16px] px-4 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition active:scale-95 duration-100 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
              >
                Tạo ngẫu nhiên
              </button>
            </div>
            {errors.pinCode && (
              <p className="text-xs text-rose-600 font-semibold pl-1 flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                {errors.pinCode}
              </p>
            )}
          </div>

          {/* Owner Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block pl-1">
              Chủ sở hữu (Email)
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 h-4 w-4 text-slate-400 z-10" />
              <input
                type="text"
                disabled={loading}
                value={selectedUserEmail}
                onChange={(e) => {
                  setSelectedUserEmail(e.target.value);
                  if (errors.owner) setErrors((prev) => ({ ...prev, owner: "" }));
                }}
                placeholder="Ví dụ: owner@hatchmate.com"
                className={`w-full pl-10 pr-4 py-3 bg-white border rounded-[16px] text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all duration-200 ${errors.owner
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                  : "border-slate-200 focus:border-amber-500 focus:ring-amber-100"
                  }`}
              />
            </div>
            {errors.owner && (
              <p className="text-xs text-rose-600 font-semibold pl-1 flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                {errors.owner}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 h-12 flex items-center justify-center rounded-[18px] border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition active:scale-98 duration-100 cursor-pointer disabled:opacity-50 text-sm"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 flex items-center justify-center rounded-[18px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-orange-200/50 hover:shadow-lg transition active:scale-95 duration-100 cursor-pointer disabled:opacity-50 text-sm"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </div>
              ) : (
                "Xác nhận thêm"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
