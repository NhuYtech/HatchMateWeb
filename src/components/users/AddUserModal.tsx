"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "lucide-react";
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { db, rtdb } from "@/src/lib/firebase";

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddUserModal({ onClose, onSuccess }: AddUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("owner");
  const [status, setStatus] = useState("active");
  const [selectedDevice, setSelectedDevice] = useState(""); // Holds stringified incubator data: "code|name"

  const [incubators, setIncubators] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available devices from RTDB
  useEffect(() => {
    const incubatorsRef = ref(rtdb, "incubators");
    const unsubscribe = onValue(incubatorsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map((key) => ({
          id: key,
          code: data[key].code || key,
          name: data[key].name || data[key].id || key,
        }));
        setIncubators(list);
      }
    }, (error) => {
      console.error("Failed to load incubators for dropdown:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "Họ và tên không được để trống";
    if (!email.trim()) {
      newErrors.email = "Email không được để trống";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email không đúng định dạng";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      let deviceCode = "";
      let deviceName = "";
      if (selectedDevice) {
        const parts = selectedDevice.split("|");
        deviceCode = parts[0];
        deviceName = parts[1];
      }

      const usersCol = collection(db, "users");
      const normalizedEmail = email.trim().toLowerCase();

      // Check if user with this email already exists
      const existingQuery = query(usersCol, where("email", "==", normalizedEmail));
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        // Update existing user document role and details
        const existingDoc = existingSnapshot.docs[0];
        await updateDoc(doc(db, "users", existingDoc.id), {
          fullName: fullName.trim(),
          role,
          status,
          ...(deviceCode ? { deviceCode, deviceName } : {}),
          isActive: status === "active",
        });
      } else {
        // Add new user doc
        await addDoc(usersCol, {
          fullName: fullName.trim(),
          email: normalizedEmail,
          role,
          status,
          deviceCode,
          deviceName,
          createdAt: new Date().toISOString(),
          profilePicture: "",
          isActive: status === "active",
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error adding user:", err);
      setErrors({ global: err.message || "Đã xảy ra lỗi khi thêm người dùng mới" });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300 animate-fadeIn">
      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white/95 rounded-[30px] shadow-2xl border border-sky-100/50 p-6 sm:p-8 flex flex-col overflow-hidden transition-all duration-300 transform scale-100">
        
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
            THÊM NGƯỜI DÙNG MỚI
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
          
          {/* Full Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block pl-1">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                disabled={loading}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
                }}
                placeholder="Ví dụ: Nguyễn Văn A"
                className={`w-full px-4 py-3 bg-white border rounded-[16px] text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all duration-200 ${
                  errors.fullName
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-amber-500 focus:ring-amber-100"
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-rose-600 font-semibold pl-1 flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block pl-1">
              Địa chỉ Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="email"
                disabled={loading}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="Ví dụ: anguyen@gmail.com"
                className={`w-full px-4 py-3 bg-white border rounded-[16px] text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:outline-none transition-all duration-200 ${
                  errors.email
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-amber-500 focus:ring-amber-100"
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-600 font-semibold pl-1 flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Role Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block pl-1">
              Vai trò tài khoản
            </label>
            <div className="relative flex items-center">
              <select
                disabled={loading}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-[16px] text-sm text-slate-800 focus:ring-4 focus:outline-none focus:border-amber-500 focus:ring-amber-100 transition-all duration-200 cursor-pointer"
              >
                <option value="owner">Chủ máy</option>
                <option value="guest">Khách</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
          </div>

          {/* Linked Device Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block pl-1">
              Gán thiết bị quản lý (Tùy chọn)
            </label>
            <div className="relative flex items-center">
              <select
                disabled={loading}
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-[16px] text-sm text-slate-800 focus:ring-4 focus:outline-none focus:border-amber-500 focus:ring-amber-100 transition-all duration-200 cursor-pointer"
              >
                <option value="">Không gán thiết bị nào</option>
                {incubators.map((inc) => (
                  <option key={inc.id} value={`${inc.code}|${inc.name}`}>
                    {inc.code} - {inc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-12 rounded-[16px] border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition duration-150 cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 rounded-[16px] bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-semibold text-white shadow-md shadow-orange-100 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition duration-150 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
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
