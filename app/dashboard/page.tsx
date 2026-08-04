"use client";

import React, { useEffect, useState } from "react";
import WelcomeBanner from "@/src/components/dashboard/WelcomeBanner";
import StatCard from "@/src/components/dashboard/StatCard";
import { ref, onValue } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { auth, db, rtdb } from "@/src/lib/firebase";
import { Cpu, Activity, Sparkles, Users } from "lucide-react";
import type { DeviceItem, KpiSummary } from "@/src/types/dashboard";

import MonthlyMetricsBarChart from "@/src/components/dashboard/MonthlyMetricsBarChart";

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
  const [userCount, setUserCount] = useState<number>(6);
  const [rawUsers, setRawUsers] = useState<any[]>([]);
  const [rawIncubators, setRawIncubators] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) return;
      const fetchUsers = async () => {
        try {
          const usersCol = collection(db, "users");
          const querySnapshot = await getDocs(usersCol);
          const uList: any[] = [];
          querySnapshot.forEach((doc) => {
            uList.push({ id: doc.id, ...doc.data() });
          });
          setRawUsers(uList);
          if (querySnapshot.size > 0) {
            setUserCount(querySnapshot.size);
          }
        } catch (_) {
          setUserCount(6);
        }
      };
      fetchUsers();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const devicesRef = ref(rtdb, "incubators");
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: DeviceItem[] = [];
        const incList: any[] = [];

        Object.keys(data).forEach((key) => {
          const lowerKey = key.trim().toLowerCase();
          if (lowerKey === "matg02" || lowerKey === "mayap01" || lowerKey === "mayap02") return;
          const item = data[key];
          if (typeof item === "object" && item !== null) {
            incList.push({ id: key, ...item });
            const temperature = Number(item.telemetry?.temp ?? item.temperature ?? 0);
            const humidity = Number(item.telemetry?.humi ?? item.humidity ?? 0);
            const incubatingDay = Number(item.telemetry?.day ?? item.incubatingDay ?? 0);
            const eggCount = item.telemetry?.eggCount !== undefined ? Number(item.telemetry.eggCount) : 24;

            list.push({
              id: key,
              name: item.name ?? key,
              owner: "",
              status: String(item.status ?? (item.alert === "NORMAL" ? "online" : (item.alert ? "warning" : "offline"))).toLowerCase() as any,
              temperature,
              humidity,
              incubatingDay,
              totalIncubationDays: 21,
              remainingDays: Math.max(0, 21 - incubatingDay),
              lastSeen: item.lastSeen ?? "Vừa xong",
              eggCount,
            });
          }
        });

        setDevices(list);
        setRawIncubators(incList);

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
      }
    });

    return () => unsubscribe();
  }, []);

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const totalEggCount = devices.reduce((sum, d) => sum + (d.eggCount ?? 24), 0) || 24;

  return (
    <div className="grid gap-6">
      {/* Welcome Header */}
      <WelcomeBanner summary={kpi} />

      {/* 4 Thẻ KPI Thống Kê Tổng Quan */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng số máy ấp"
          value={`${kpi.totalDevices}`}
          description="Tổng số trạm ấp đang quản lý"
          accent="default"
          icon={<Cpu className="h-5 w-5 text-indigo-600" />}
        />
        <StatCard
          label="Thiết bị online"
          value={`${onlineCount}`}
          description="Kết nối hoạt động ổn định"
          accent="success"
          icon={<Activity className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          label="Số trứng đang ấp"
          value={`${totalEggCount}`}
          description="Tổng số trứng trong các trạm ấp"
          accent="temperature"
          icon={<Sparkles className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          label="Tài khoản người dùng"
          value={`${userCount}`}
          description="Tài khoản truy cập hệ thống"
          accent="users"
          icon={<Users className="h-5 w-5 text-sky-600" />}
        />
      </section>

      {/* Biểu đồ Cột Thống kê 1 tháng: Người dùng, Máy ấp */}
      <section className="w-full">
        <MonthlyMetricsBarChart
          userCount={userCount}
          deviceCount={kpi.totalDevices}
          rawUsers={rawUsers}
          rawIncubators={rawIncubators}
        />
      </section>
    </div>
  );
}
