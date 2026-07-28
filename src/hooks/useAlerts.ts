"use client";

import { useState, useEffect } from "react";
import { ref, onValue, query, limitToLast } from "firebase/database";
import { rtdb } from "@/src/lib/firebase";
import { useAuth } from "@/src/components/AuthProvider";

export interface AlertLogItem {
  id: string;
  deviceId?: string;
  deviceName?: string;
  type: "warning" | "offline" | "info" | "new_device" | "new_user";
  message: string;
  timestamp: string | number;
  status?: "active" | "resolved";
}

export function useAlerts() {
  const { currentUser } = useAuth();
  const [alerts, setAlerts] = useState<AlertLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const userEmail = currentUser.email?.toLowerCase().trim() || "";
    const isAdmin = userEmail === "hnyhttt2211015@student.ctuet.edu.vn";

    // Query node alert_logs or user_alert_logs depending on role
    const alertNodePath = isAdmin ? "alert_logs" : `user_alert_logs/${currentUser.uid}`;
    const alertsQuery = query(ref(rtdb, alertNodePath), limitToLast(30));

    const unsubscribe = onValue(
      alertsQuery,
      (snapshot) => {
        if (!snapshot.exists()) {
          // Fallback: derive alerts directly from incubators node if alert_logs is empty
          const incubatorsRef = ref(rtdb, "incubators");
          onValue(
            incubatorsRef,
            (incSnap) => {
              if (incSnap.exists()) {
                const data = incSnap.val();
                const derived: AlertLogItem[] = [];

                Object.keys(data).forEach((key) => {
                  const item = data[key];
                  if (typeof item === "object" && item !== null) {
                    const devName = item.name || key;
                    const rawStatus = String(
                      item.status ?? (item.alert === "NORMAL" ? "online" : item.alert ? "warning" : "offline")
                    ).toLowerCase();

                    const temp = item.telemetry?.temp ?? item.temperature ?? item.temp ?? "–";
                    const humi = item.telemetry?.humi ?? item.humidity ?? item.humi ?? "–";

                    if (rawStatus === "warning") {
                      derived.push({
                        id: `derived-warn-${key}`,
                        deviceId: key,
                        deviceName: devName,
                        type: "warning",
                        message: `Chỉ số vượt ngưỡng: ${temp}°C, ${humi}% RH ở trạm ${devName}`,
                        timestamp: new Date().toISOString(),
                        status: "active",
                      });
                    } else if (rawStatus === "offline") {
                      derived.push({
                        id: `derived-off-${key}`,
                        deviceId: key,
                        deviceName: devName,
                        type: "offline",
                        message: `Thiết bị ${devName} bị mất kết nối mạng`,
                        timestamp: new Date().toISOString(),
                        status: "active",
                      });
                    }
                  }
                });

                setAlerts(derived.slice(0, 30));
              } else {
                setAlerts([]);
              }
              setLoading(false);
            },
            { onlyOnce: true }
          );
          return;
        }

        const data = snapshot.val();
        const list: AlertLogItem[] = [];
        Object.keys(data).forEach((key) => {
          list.push({
            id: key,
            ...data[key],
          });
        });

        // Sort by timestamp descending (newest first)
        list.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime() || 0;
          const timeB = new Date(b.timestamp).getTime() || 0;
          return timeB - timeA;
        });

        setAlerts(list.slice(0, 30));
        setLoading(false);
      },
      (error) => {
        console.warn("useAlerts listener error:", error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const activeCount = alerts.filter((a) => a.status === "active" || a.type === "warning").length;

  return {
    alerts,
    activeCount,
    loading,
  };
}
