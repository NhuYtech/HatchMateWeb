"use client";

import React, { useEffect, useState } from "react";
import DevicePageHeader from "@/src/components/devices/DevicePageHeader";
import DeviceMiniStatCard from "@/src/components/devices/DeviceMiniStatCard";
import DeviceTable from "@/src/components/devices/DeviceTable";
import AddDeviceModal from "@/src/components/devices/AddDeviceModal";
import DeleteConfirmModal from "@/src/components/devices/DeleteConfirmModal";
import { ref, onValue, get } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { auth, db, rtdb } from "@/src/lib/firebase";
import {
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle
} from "lucide-react";
import type { DeviceItem } from "@/src/types/device";

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerEmail, setOwnerEmail] = useState<string>("Đang tải...");
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteDeviceId, setDeleteDeviceId] = useState("");
  const [deleteDeviceName, setDeleteDeviceName] = useState("");

  // 1. Fetch Owner Email from Firestore "users" collection
  useEffect(() => {
    // Listen for auth state change to fetch owner email once logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) return;

      const fetchOwnerEmail = async () => {
        try {
          const usersCol = collection(db, "users");
          const querySnapshot = await getDocs(usersCol);
          let foundEmail = "";
          const map: Record<string, string> = {};

          querySnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.email) {
              const fullName = userData.fullName || userData.name || "Người dùng ẩn danh";
              map[userData.email.toLowerCase()] = fullName;
              if (userData.role === "owner") {
                foundEmail = userData.email;
              }
            }
          });

          if (!foundEmail) {
            querySnapshot.forEach((doc) => {
              const userData = doc.data();
              if ((userData.role === "admin" || userData.role === "guest") && userData.email && !foundEmail) {
                foundEmail = userData.email;
              }
            });
          }

          setUsersMap(map);
          if (foundEmail) {
            setOwnerEmail(foundEmail);
          } else {
            setOwnerEmail("owner@hatchmate.com");
          }
        } catch (err) {
          // Fallback silently to prevent F12 console noise
          setOwnerEmail("owner@hatchmate.com");
        }
      };

      fetchOwnerEmail();
    });

    return () => unsubscribe();
  }, []);

  const formatLastSeenTime = (lastSeenVal: any) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    if (!lastSeenVal) {
      return `${pad(now.getHours())}:${pad(now.getMinutes())} · ${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
    }

    let date: Date;
    if (typeof lastSeenVal === "number") {
      date = new Date(lastSeenVal);
    } else if (typeof lastSeenVal === "string") {
      const parsed = Date.parse(lastSeenVal);
      if (!isNaN(parsed)) {
        date = new Date(parsed);
      } else {
        return lastSeenVal;
      }
    } else {
      date = new Date();
    }

    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;

    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) return time;
    return `${time} · ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  };

  // Map snapshot value into DeviceItem array
  const mapDataToDevices = (data: any): DeviceItem[] => {
    const list: DeviceItem[] = [];
    Object.keys(data).forEach((key) => {
      // Filter out old testing mock devices MATG02, MayAp01, MayAp02
      const lowerKey = key.trim().toLowerCase();
      if (lowerKey === "matg02" || lowerKey === "mayap01" || lowerKey === "mayap02") {
        return;
      }

      const item = data[key];
      if (typeof item === "object" && item !== null) {
        const tempRaw = item.telemetry?.temp ?? item.telemetry?.temperature ?? item.sensors?.temp ?? item.temperature ?? item.temp;
        const temperature = tempRaw !== undefined && tempRaw !== null ? Number(tempRaw) : 0;

        const humiRaw = item.telemetry?.humi ?? item.telemetry?.humidity ?? item.sensors?.humi ?? item.sensors?.humidity ?? item.humidity ?? item.humi;
        const humidity = humiRaw !== undefined && humiRaw !== null ? Number(humiRaw) : 0;

        const incubatingDay = item.telemetry?.day !== undefined
          ? Number(item.telemetry.day)
          : (item.incubatingDay !== undefined ? Number(item.incubatingDay) : Number(item.day ?? 0));

        const totalIncubationDays = item.cycle?.totalDays !== undefined
          ? Number(item.cycle.totalDays)
          : Number(item.totalIncubationDays ?? 21);

        const remainingDays = item.remainingDays !== undefined
          ? Number(item.remainingDays)
          : Math.max(0, totalIncubationDays - incubatingDay);

        const incubationStatus =
          incubatingDay === 0
            ? "paused"
            : (totalIncubationDays - incubatingDay <= 3 ? "hatchingSoon" : "incubating");

        const rawOwner = item.ownerEmail || ownerEmail;
        const resolvedOwner = usersMap[rawOwner.toLowerCase()] || rawOwner;

        const rawStatus = String(item.status ?? (item.alert === "NORMAL" ? "online" : (item.alert ? "warning" : "offline"))).toLowerCase();
        const hasSensorError =
          item.sensor_error === true ||
          item.sensor_error === 1 ||
          item.sensorError === true ||
          item.telemetry?.sensor_error === true ||
          item.telemetry?.sensorError === true ||
          item.alert === "SENSOR_ERROR" ||
          (rawStatus !== "offline" && (temperature <= 0 || humidity <= 0 || temperature < 15 || temperature > 60 || humidity > 100));

        const resolvedStatus = hasSensorError ? "warning" : (rawStatus as any);
        const lastSeenFormatted = formatLastSeenTime(item.lastSeen ?? item.updatedAt ?? item.telemetry?.updatedAt);

        list.push({
          id: key,
          name: item.name ?? key,
          owner: resolvedOwner,
          status: resolvedStatus,
          incubationStatus,
          temperature,
          humidity,
          incubatingDay,
          totalIncubationDays,
          remainingDays,
          battery: Number(item.battery ?? 100),
          wifi: Number(item.wifi ?? 5),
          lastSeen: lastSeenFormatted,
        });
      }
    });

    list.sort((a, b) => a.id.localeCompare(b.id));
    return list;
  };

  // 2. Fetch Devices list from Realtime Database (real-time listener)
  useEffect(() => {
    const devicesRef = ref(rtdb, "incubators");

    // Clean up old RTDB mock nodes MATG02 and MayAp01 if present in Realtime DB
    try {
      const { remove } = require("firebase/database");
      ["MATG02", "MayAp01", "MayAp02"].forEach((mockKey) => {
        remove(ref(rtdb, `incubators/${mockKey}`)).catch(() => { });
      });
    } catch (_) { }

    const unsubscribe = onValue(devicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const list = mapDataToDevices(snapshot.val());
        setDevices(list);
      } else {
        setDevices([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ownerEmail, usersMap]);

  // 3. Manual refresh function triggered by clicking RotateCw
  const handleRefresh = async () => {
    const devicesRef = ref(rtdb, "incubators");
    try {
      const snapshot = await get(devicesRef);
      if (snapshot.exists()) {
        const list = mapDataToDevices(snapshot.val());
        setDevices(list);
      } else {
        setDevices([]);
      }
    } catch (err) {
      console.error("Manual refresh failed:", err);
    }
  };

  const sortedDevices = [...devices].sort((a, b) => a.id.localeCompare(b.id));

  // Calculate live KPI statistics
  const total = devices.length;
  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;
  const warning = devices.filter((d) => d.status === "warning").length;

  return (
    <div className="grid gap-4 w-full max-w-full min-w-0 overflow-hidden">
      {/* Header */}
      <DevicePageHeader totalDevices={total} onAddDevice={() => setIsAddModalOpen(true)} />

      {/* Mini Stats Component Section */}
      <section className="grid gap-4 sm:grid-cols-3">
        <DeviceMiniStatCard
          label="Tổng số máy ấp"
          value={total}
          icon={Cpu}
          accent="indigo"
        />
        <DeviceMiniStatCard
          label="Thiết bị online"
          value={online}
          icon={Wifi}
          accent="emerald"
        />
        <DeviceMiniStatCard
          label="Thiết bị offline"
          value={offline}
          icon={WifiOff}
          accent="rose"
        />
      </section>

      {/* Device Table Component Section */}
      <DeviceTable
        devices={sortedDevices}
        onAddDevice={() => setIsAddModalOpen(true)}
        onRefresh={handleRefresh}
        onDeleteDevice={(id, name) => {
          setDeleteDeviceId(id);
          setDeleteDeviceName(name);
          setIsDeleteModalOpen(true);
        }}
      />

      {/* Add Device Popup Modal */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          handleRefresh();
        }}
      />

      {/* Delete Confirmation Popup Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={() => {
          setIsDeleteModalOpen(false);
          handleRefresh();
        }}
        deviceId={deleteDeviceId}
        deviceName={deleteDeviceName}
      />
    </div>
  );
}
