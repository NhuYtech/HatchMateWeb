"use client";

import React, { useEffect, useState } from "react";
import WelcomeBanner from "@/src/components/dashboard/WelcomeBanner";
import StatCard from "@/src/components/dashboard/StatCard";
import DeviceOverviewTable from "@/src/components/dashboard/DeviceOverviewTable";
import RecentCameraCard from "@/src/components/dashboard/RecentCameraCard";
import { ref, onValue } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { auth, db, rtdb } from "@/src/lib/firebase";
import { Activity, ShieldCheck, Flame } from "lucide-react";
import type { DeviceItem, KpiSummary, CameraItem } from "@/src/types/dashboard";

const initialKpi: KpiSummary = {
  totalDevices: 0,
  onlineDevices: 0,
  incubatingDevices: 0,
  warningDevices: 0,
  avgTemperature: 0,
  avgHumidity: 0,
  openAlerts: 0,
};

export default function DashboardPage() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [kpi, setKpi] = useState<KpiSummary>(initialKpi);
  const [cameraFeeds, setCameraFeeds] = useState<CameraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerEmail, setOwnerEmail] = useState<string>("Đang tải...");

  useEffect(() => {
    // Listen for auth state change to fetch owner email once logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) return;

      const fetchOwnerEmail = async () => {
        try {
          const usersCol = collection(db, "users");
          const querySnapshot = await getDocs(usersCol);
          let foundEmail = "";

          // First look for role === "owner"
          querySnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.role === "owner" && userData.email) {
              foundEmail = userData.email;
            }
          });

          // Fallback to admin or first available email if no "owner" role found
          if (!foundEmail) {
            querySnapshot.forEach((doc) => {
              const userData = doc.data();
              if ((userData.role === "admin" || userData.role === "guest") && userData.email && !foundEmail) {
                foundEmail = userData.email;
              }
            });
          }

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

  useEffect(() => {
    const devicesRef = ref(rtdb, "incubators");

    // Clean up old RTDB mock nodes MATG02, MayAp01, MayAp02 if present in Realtime DB
    try {
      const { remove } = require("firebase/database");
      ["MATG02", "MayAp01", "MayAp02"].forEach((mockKey) => {
        remove(ref(rtdb, `incubators/${mockKey}`)).catch(() => {});
      });
    } catch (_) {}

    // 2. Listen to real-time updates from "incubators" node (no mock seeding)
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: DeviceItem[] = [];

        Object.keys(data).forEach((key) => {
          // Filter out old testing mock devices MATG02, MayAp01, MayAp02
          const lowerKey = key.trim().toLowerCase();
          if (lowerKey === "matg02" || lowerKey === "mayap01" || lowerKey === "mayap02") {
            return;
          }

          const item = data[key];
          if (typeof item === "object" && item !== null) {
            // Robust mapping to read temperature, humidity, incubating days, remaining days
            // Support both telemetry/cycle nested structure and flat object structure
            const temperature = item.telemetry?.temp !== undefined
              ? Number(item.telemetry.temp)
              : (item.temperature !== undefined ? Number(item.temperature) : Number(item.temp ?? 0));

            const humidity = item.telemetry?.humi !== undefined
              ? Number(item.telemetry.humi)
              : (item.humidity !== undefined ? Number(item.humidity) : Number(item.humi ?? 0));

            const incubatingDay = item.telemetry?.day !== undefined
              ? Number(item.telemetry.day)
              : (item.incubatingDay !== undefined ? Number(item.incubatingDay) : Number(item.day ?? 0));

            const totalIncubationDays = item.cycle?.totalDays !== undefined
              ? Number(item.cycle.totalDays)
              : Number(item.totalIncubationDays ?? 21);

            const remainingDays = item.remainingDays !== undefined
              ? Number(item.remainingDays)
              : Math.max(0, totalIncubationDays - incubatingDay);

            list.push({
              id: key,
              name: item.name ?? key,
              owner: ownerEmail, // Always map owner to ownerEmail from Firestore
              status: String(item.status ?? (item.alert === "NORMAL" ? "online" : (item.alert ? "warning" : "offline"))).toLowerCase() as any,
              temperature,
              humidity,
              incubatingDay,
              totalIncubationDays,
              remainingDays,
              hasCamera: Boolean(item.hasCamera ?? item.control?.camera),
              lastSeen: item.lastSeen ?? "Vừa xong",
            });
          }
        });

        // Ensure order is correct
        list.sort((a, b) => a.id.localeCompare(b.id));
        setDevices(list);

        // Recalculate KPIs dynamically
        const total = list.length;
        const online = list.filter((d) => d.status === "online").length;
        const warning = list.filter((d) => d.status === "warning").length;
        const incubating = list.filter((d) => d.incubatingDay > 0).length;

        const activeForMetrics = list.filter(d => d.status === "online" || d.status === "warning");
        const avgTemp = activeForMetrics.length > 0
          ? Number((activeForMetrics.reduce((sum, d) => sum + d.temperature, 0) / activeForMetrics.length).toFixed(1))
          : 0;
        const avgHumi = activeForMetrics.length > 0
          ? Math.round(activeForMetrics.reduce((sum, d) => sum + d.humidity, 0) / activeForMetrics.length)
          : 0;

        setKpi({
          totalDevices: total,
          onlineDevices: online,
          warningDevices: warning,
          incubatingDevices: incubating,
          avgTemperature: avgTemp,
          avgHumidity: avgHumi,
          openAlerts: warning,
        });

        // Set camera feeds dynamically from real devices with cameras
        const activeCameraFeeds: CameraItem[] = list
          .filter((d) => d.hasCamera)
          .map((d) => ({
            id: `cam-${d.id}`,
            deviceName: d.name,
            imageUrl: undefined,
            aiLabel: null,
            capturedAt: d.lastSeen,
          }));
        setCameraFeeds(activeCameraFeeds);
      } else {
        setDevices([]);
        setKpi(initialKpi);
        setCameraFeeds([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ownerEmail]); // Re-subscribe when ownerEmail is loaded to update owner column

  return (
    <div className="grid gap-4">
      <WelcomeBanner summary={kpi} />

      <section className="grid gap-4 xl:grid-cols-3">
        <StatCard
          label="Tổng số thiết bị"
          value={`${kpi.totalDevices}`}
          description="Tổng số trạm ấp đang quản lý"
          accent="default"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Thiết bị online"
          value={`${kpi.onlineDevices}`}
          description="Thiết bị đang kết nối ổn định"
          accent="success"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Thiết bị đang ấp"
          value={`${kpi.incubatingDevices}`}
          description="Thiết bị đang trong chu kỳ ấp"
          accent="temperature"
          icon={<Flame className="h-5 w-5" />}
        />
      </section>

      <DeviceOverviewTable devices={devices} />

      <RecentCameraCard feeds={cameraFeeds} />
    </div>
  );
}
