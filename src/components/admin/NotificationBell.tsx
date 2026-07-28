"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, WifiOff, AlertTriangle, X, CheckCheck, PlusCircle, UserPlus } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { collection, onSnapshot } from "firebase/firestore";
import { db, rtdb } from "@/src/lib/firebase";

type NotifType = "warning" | "offline" | "new_device" | "new_user";

interface NotifItem {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: Date;
}

/** Format a Date into a human-readable relative or absolute string */
function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;

  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return time;
  return `${time} · ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

const TYPE_CONFIG: Record<NotifType, { icon: React.ReactNode; bg: string; badge: string; label: string }> = {
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    bg: "bg-amber-100 text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    label: "Cảnh báo",
  },
  offline: {
    icon: <WifiOff className="h-4 w-4" />,
    bg: "bg-slate-100 text-slate-500",
    badge: "bg-slate-100 text-slate-500",
    label: "Offline",
  },
  new_device: {
    icon: <PlusCircle className="h-4 w-4" />,
    bg: "bg-sky-100 text-sky-600",
    badge: "bg-sky-100 text-sky-700",
    label: "Thiết bị mới",
  },
  new_user: {
    icon: <UserPlus className="h-4 w-4" />,
    bg: "bg-emerald-100 text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    label: "Người dùng mới",
  },
};

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hatchmate_read_notifications");
        if (saved) {
          return new Set(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Error reading readIds from localStorage:", e);
      }
    }
    return new Set();
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync readIds to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hatchmate_read_notifications", JSON.stringify(Array.from(readIds)));
      } catch (e) {
        console.error("Error saving readIds to localStorage:", e);
      }
    }
  }, [readIds]);

  const handleNotifClick = (notif: NotifItem) => {
    // Mark as read (hide red dot, reduce unread count) without navigating away
    setReadIds((prev) => new Set([...prev, notif.id]));
  };

  const handleDismissNotif = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Explicitly delete notification item when X button is clicked
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  // ── 1. Device alerts + new device detection ──
  useEffect(() => {
    const knownDeviceIds = new Set<string>();
    let initialized = false;

    const devicesRef = ref(rtdb, "incubators");
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      const now = new Date();

      if (!snapshot.exists()) {
        setNotifs((prev) => prev.filter((n) => n.type !== "warning" && n.type !== "offline" && n.type !== "new_device"));
        initialized = true;
        return;
      }

      const data = snapshot.val();
      const alertNotifs: NotifItem[] = [];
      const newDeviceNotifs: NotifItem[] = [];

      Object.keys(data).forEach((key) => {
        const lowerKey = key.trim().toLowerCase();
        if (lowerKey === "matg02" || lowerKey === "mayap01" || lowerKey === "mayap02") {
          return;
        }

        const item = data[key];
        if (typeof item !== "object" || item === null) return;

        // Detect new devices (added after initial load)
        if (initialized && !knownDeviceIds.has(key)) {
          newDeviceNotifs.push({
            id: `new-device-${key}-${now.getTime()}`,
            type: "new_device",
            title: "Thiết bị mới được thêm",
            message: `Máy "${item.name ?? key}" vừa được kết nối vào hệ thống.`,
            timestamp: now,
          });
        }
        knownDeviceIds.add(key);

        // Alert / offline
        const rawStatus = String(
          item.status ??
          (item.alert === "NORMAL" ? "online" : item.alert ? "warning" : "offline")
        ).toLowerCase();

        if (rawStatus === "warning") {
          const temp = item.telemetry?.temp ?? item.temperature ?? item.temp ?? "–";
          const humi = item.telemetry?.humi ?? item.humidity ?? item.humi ?? "–";
          alertNotifs.push({
            id: `alert-${key}`,
            type: "warning",
            title: item.name ?? key,
            message: `Chỉ số vượt ngưỡng: ${temp}°C, ${humi}% RH`,
            timestamp: now,
          });
        } else if (rawStatus === "offline") {
          alertNotifs.push({
            id: `offline-${key}`,
            type: "offline",
            title: item.name ?? key,
            message: "Thiết bị mất kết nối",
            timestamp: now,
          });
        }
      });

      initialized = true;

      setNotifs((prev) => {
        // For each newly constructed alertNotif, if it already exists in `prev`,
        // preserve its original timestamp so we don't reset it to the current time.
        const updatedAlertNotifs = alertNotifs.map((newNotif) => {
          const existing = prev.find((n) => n.id === newNotif.id);
          if (existing) {
            return { ...newNotif, timestamp: existing.timestamp };
          }
          return newNotif;
        });

        // Remove stale alert/offline/new_device notifs, keep user notifs
        const userNotifs = prev.filter((n) => n.type === "new_user");
        const prevNewDevices = prev.filter((n) => n.type === "new_device");
        const combined = [...newDeviceNotifs, ...updatedAlertNotifs, ...prevNewDevices, ...userNotifs];
        return combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      });
    });

    return () => unsubscribe();
  }, []);

  // ── 2. New user detection from Firestore ──
  useEffect(() => {
    const knownUserIds = new Set<string>();
    let initialized = false;

    const usersCol = collection(db, "users");
    const unsubscribe = onSnapshot(
      usersCol, 
      (snapshot) => {
        const now = new Date();
        const newUserNotifs: NotifItem[] = [];

        snapshot.docs.forEach((doc) => {
          if (initialized && !knownUserIds.has(doc.id)) {
            const data = doc.data();
            const name = data.fullName || data.displayName || data.email || "Người dùng mới";
            
            let userTime = new Date();
            if (data.createdAt) {
              const parsed = new Date(typeof data.createdAt === "string" ? data.createdAt : (data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt));
              if (!isNaN(parsed.getTime())) {
                userTime = parsed;
              }
            }

            newUserNotifs.push({
              id: `new-user-${doc.id}-${userTime.getTime()}`,
              type: "new_user",
              title: "Người dùng mới",
              message: `"${name}" vừa được thêm vào hệ thống.`,
              timestamp: userTime,
            });
          }
          knownUserIds.add(doc.id);
        });

        initialized = true;

        if (newUserNotifs.length > 0) {
          setNotifs((prev) => {
            const combined = [...newUserNotifs, ...prev];
            return combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          });
        }
      },
      (err) => {
        // Silently catch permission-denied or unauthenticated listeners
        console.warn("Firestore users listener warning:", err.message);
      }
    );

    return () => unsubscribe();
  }, []);

  // ── Close on outside click ──
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Sort by timestamp descending (newest first, with id tie-breaker)
  const sorted = [...notifs].sort((a, b) => {
    const diff = b.timestamp.getTime() - a.timestamp.getTime();
    if (diff !== 0) return diff;
    return b.id.localeCompare(a.id);
  });
  const unreadCount = sorted.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => setReadIds(new Set(sorted.map((n) => n.id)));

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center justify-center rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
        aria-label="Thông báo"
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-[340px] rounded-2xl border border-slate-100 bg-white shadow-[0_16px_50px_rgba(0,0,0,0.14)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
              <span className="text-sm font-bold text-slate-800">Thông báo</span>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 transition px-2 py-1 rounded-lg hover:bg-sky-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Đã đọc tất cả
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 mb-3">
                  <Bell className="h-6 w-6 text-emerald-500" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-semibold text-slate-500">Không có thông báo mới</p>
                <p className="text-xs text-slate-400 mt-1">Mọi hoạt động đang diễn ra bình thường</p>
              </div>
            ) : (
              sorted.map((notif) => {
                const isUnread = !readIds.has(notif.id);
                const cfg = TYPE_CONFIG[notif.type];
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isUnread ? "bg-orange-50/30" : "bg-white"
                    } hover:bg-sky-50/50`}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-800 truncate">{notif.title}</p>
                        {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">{formatTime(notif.timestamp)}</p>
                    </div>

                    {/* Badge & Delete Button */}
                    <div className="flex flex-col items-end gap-1 shrink-0 mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDismissNotif(e, notif.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-rose-500 rounded"
                        title="Xóa thông báo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {sorted.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/60 text-center">
              <p className="text-[11px] text-slate-400 font-semibold">
                {sorted.length} thông báo · {unreadCount} chưa đọc
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
