"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Cpu, Tag, AlertCircle, User } from "lucide-react";
import { ref, update, get, child } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { rtdb, db } from "@/src/lib/firebase";
import type { DeviceItem } from "@/src/types/device";

interface EditDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  device: DeviceItem | null;
}

export default function EditDeviceModal({ isOpen, onClose, onSuccess, device }: EditDeviceModalProps) {
  const [deviceName, setDeviceName] = useState("");
  const [users, setUsers] = useState<{ email: string; fullName: string; uid: string }[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch users list from Firestore and device details from RTDB
  useEffect(() => {
    if (isOpen && device) {
      const fetchUsersAndDeviceDetails = async () => {
        setLoadingUsers(true);
        try {
          // 1. Fetch users list
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

          // 2. Fetch device details from Firebase RTDB
          const incubatorsRef = ref(rtdb, "incubators");
          const snapshot = await get(incubatorsRef);
          
          if (snapshot.exists()) {
            const allIncubators = snapshot.val();
            const data = allIncubators ? allIncubators[device.id] : null;
            if (data) {
              setDeviceName(data.name || device.name);

              const currentOwner = data.ownerEmail || device.owner;
              const matchedUser = list.find(
                (u) => u.email.toLowerCase() === currentOwner.toLowerCase() || u.fullName === currentOwner
              );
              if (matchedUser) {
                setSelectedUserEmail(matchedUser.email);
              } else if (list.length > 0) {
                setSelectedUserEmail(list[0].email);
              } else {
                setSelectedUserEmail(currentOwner);
              }
            } else {
              setDeviceName(device.name);
              setSelectedUserEmail(device.owner);
            }
          } else {
            setDeviceName(device.name);
            setSelectedUserEmail(device.owner);
          }
        } catch (err) {
          console.error("Lỗi khi tải thông tin chi tiết thiết bị:", err);
        } finally {
          setLoadingUsers(false);
        }
      };

      fetchUsersAndDeviceDetails();
    }
  }, [isOpen, device]);

  // Reset errors when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen || !mounted || !device) return null;

  const validateForm = async (): Promise<boolean> => {
    const newErrors: { [key: string]: string } = {};

    // Device Name Validation
    const nameTrimmed = deviceName.trim();
    if (!nameTrimmed) {
      newErrors.deviceName = "Tên thiết bị không được để trống";
    } else {
      try {
        const incubatorsRef = ref(rtdb, "incubators");
        const snapshot = await get(incubatorsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const isDuplicateName = Object.keys(data).some((key) => {
            if (key === device.id) return false; // Ignore current device being edited
            const inc = data[key];
            return inc && inc.name && String(inc.name).trim().toLowerCase() === nameTrimmed.toLowerCase();
          });
          if (isDuplicateName) {
            newErrors.deviceName = "Tên thiết bị này đã tồn tại trên hệ thống";
          }
        }
      } catch (err) {
        console.error("Lỗi kiểm tra trùng lặp tên thiết bị:", err);
      }
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

    try {
      const incubatorsRef = ref(rtdb, "incubators");
      const deviceRef = child(incubatorsRef, device.id);
      await update(deviceRef, {
        name: deviceName.trim(),
        ownerEmail: selectedUserEmail.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Lỗi khi lưu thông tin thiết bị:", err);
      setErrors({ submit: err?.message || "Không thể lưu thay đổi. Vui lòng thử lại!" });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-sky-100 bg-white p-6 sm:p-8 shadow-2xl shadow-sky-900/10 animate-in zoom-in-95 duration-200 z-10 my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-sky-950">CHỈNH SỬA THÔNG TIN MÁY ẤP</h3>
            <p className="text-xs text-slate-500 font-medium">Cập nhật tên máy và chủ sở hữu trên hệ thống</p>
          </div>
        </div>

        {/* Error Alert */}
        {errors.submit && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-3.5 text-xs text-rose-700 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{errors.submit}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Device ID (Read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              Mã thiết bị (ID)
            </label>
            <input
              type="text"
              value={device.id}
              disabled
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs font-mono font-bold text-slate-500 cursor-not-allowed select-none"
            />
          </div>

          {/* Device Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-amber-500" />
              Tên máy ấp <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => {
                setDeviceName(e.target.value);
                if (errors.deviceName) setErrors((prev) => ({ ...prev, deviceName: "" }));
              }}
              placeholder="VD: Máy ấp trứng gà MATG01"
              className={`w-full rounded-2xl border px-4 py-3 text-xs font-medium text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 ${errors.deviceName ? "border-rose-400 bg-rose-50/20" : "border-slate-200 bg-white"
                }`}
            />
            {errors.deviceName && <p className="text-[11px] font-semibold text-rose-500">{errors.deviceName}</p>}
          </div>

          {/* Owner Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-amber-500" />
              Chủ sở hữu máy ấp
            </label>
            <select
              value={selectedUserEmail}
              onChange={(e) => setSelectedUserEmail(e.target.value)}
              disabled={loadingUsers}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 cursor-pointer"
            >
              {loadingUsers ? (
                <option value="">Đang tải danh sách người dùng...</option>
              ) : users.length === 0 ? (
                <option value={selectedUserEmail}>{selectedUserEmail || "Không có dữ liệu người dùng"}</option>
              ) : (
                users.map((u, index) => (
                  <option key={`${u.uid}-${u.email}-${index}`} value={u.email}>
                    {u.fullName} ({u.email})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95 duration-150 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-100 hover:from-amber-600 hover:to-orange-600 transition active:scale-95 duration-150 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Đang lưu...</span>
              ) : (
                <span>Lưu thay đổi</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    ,
    document.body
  );
}
