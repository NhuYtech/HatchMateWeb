"use client";

import React, { useEffect, useState } from "react";
import IncubationStageBarChart from "@/src/components/dashboard/IncubationStageBarChart";
import ReportSummaryTable from "@/src/components/reports/ReportSummaryTable";
import ReportExportCard from "@/src/components/reports/ReportExportCard";
import type { ReportSummaryItem } from "@/src/types/report";
import { ref, onValue } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { auth, db, rtdb } from "@/src/lib/firebase";
import { Cpu, Activity, Sparkles, Users } from "lucide-react";
import type { DeviceItem, KpiSummary } from "@/src/types/dashboard";

const initialKpi: KpiSummary = {
  totalDevices: 0,
  onlineDevices: 0,
  incubatingDevices: 0,
  warningDevices: 0,
  avgTemperature: 0,
  avgHumidity: 0,
  openAlerts: 0,
};

export default function ReportsPage() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [kpi, setKpi] = useState<KpiSummary>(initialKpi);
  const [ownerEmail, setOwnerEmail] = useState<string>("Đang tải...");
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [userCount, setUserCount] = useState<number>(3);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) return;

      const fetchOwnerEmail = async () => {
        try {
          const usersCol = collection(db, "users");
          const querySnapshot = await getDocs(usersCol);
          let foundEmail = "";
          const map: Record<string, string> = {};

          if (querySnapshot.size > 0) {
            setUserCount(querySnapshot.size);
          }

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
          setOwnerEmail("owner@hatchmate.com");
        }
      };

      fetchOwnerEmail();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const devicesRef = ref(rtdb, "incubators");

    const unsubscribe = onValue(devicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: DeviceItem[] = [];

        Object.keys(data).forEach((key) => {
          const lowerKey = key.trim().toLowerCase();
          if (lowerKey === "matg02" || lowerKey === "mayap01" || lowerKey === "mayap02") {
            return;
          }

          const item = data[key];
          if (typeof item === "object" && item !== null) {
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

            const rawOwner = item.ownerEmail || ownerEmail;
            const resolvedOwner = usersMap[rawOwner.toLowerCase()] || rawOwner;

            list.push({
              id: key,
              name: item.name ?? key,
              owner: resolvedOwner,
              status: String(item.status ?? (item.alert === "NORMAL" ? "online" : (item.alert ? "warning" : "offline"))).toLowerCase() as any,
              temperature,
              humidity,
              incubatingDay,
              totalIncubationDays,
              remainingDays,
              lastSeen: item.lastSeen ?? "Vừa xong",
            });
          }
        });

        list.sort((a, b) => a.id.localeCompare(b.id));
        setDevices(list);

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
      } else {
        setDevices([]);
        setKpi(initialKpi);
      }
    });

    return () => unsubscribe();
  }, [ownerEmail, usersMap]);

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const warningCount = devices.filter((d) => d.status === "warning").length;
  const offlineCount = devices.filter((d) => d.status === "offline").length;

  const reportSummaryList: ReportSummaryItem[] = devices.map((d) => ({
    deviceId: d.id,
    deviceName: d.name,
    avgTemperature: d.temperature,
    avgHumidity: d.humidity,
    alertCount: d.status === "warning" ? 1 : 0,
    uptimeRate: d.status === "offline" ? 0 : 99,
    incubationDay: d.incubatingDay,
    lastUpdated: d.lastSeen,
  }));

  const reportStats = {
    trackedDevices: kpi.totalDevices,
    activeIncubatingCount: onlineCount,
    maintenanceCount: warningCount,
  };

  return (
    <div className="grid gap-6">
      {/* Title Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 uppercase tracking-wide">
          THỐNG KẾ
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
          Xem phân tích hiệu suất thiết bị, biểu đồ xu hướng và theo dõi lịch sử hoạt động hệ thống HatchMate
        </p>
      </div>

      {/* Biểu đồ Cột Thông số Ấp 3 Giai đoạn */}
      <section className="w-full">
        <IncubationStageBarChart />
      </section>

      {/* HÀNG 2: Tổng hợp hiệu suất & Xuất báo cáo */}
      <section className="flex flex-col lg:flex-row gap-6 lg:items-start w-full min-w-0">
        <div className="w-full min-w-0 flex-1">
          <ReportSummaryTable items={reportSummaryList} />
        </div>
        <ReportExportCard items={reportSummaryList} stats={reportStats} />
      </section>
    </div>
  );
}
