"use client";

import React, { useState, useEffect } from "react";
import UserPageHeader from "@/src/components/users/UserPageHeader";
import UserMiniStatCard from "@/src/components/users/UserMiniStatCard";
import UserTable from "@/src/components/users/UserTable";
import AddUserModal from "@/src/components/users/AddUserModal";
import { ref, onValue } from "firebase/database";
import { collection, onSnapshot } from "firebase/firestore";
import { db, rtdb } from "@/src/lib/firebase";
import { UserItem } from "@/src/types/user";
import { useAuth } from "@/src/components/AuthProvider";
import {
  Users,
  UserCheck,
  UserMinus,
  ShieldCheck
} from "lucide-react";

export default function UsersPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const usersCol = collection(db, "users");
    const incubatorsRef = ref(rtdb, "incubators");

    let currentUsersData: any[] = [];
    let currentIncubatorsData: any = {};

    const combineAndSet = (usersData: any[], incubatorsData: any) => {
      // Group raw user docs by email to prevent 1 account from having multiple role rows
      const usersByEmail = new Map<string, any[]>();
      usersData.forEach((u) => {
        const emailKey = (u.email || "").toLowerCase().trim();
        const key = emailKey || u.uid || u.id;
        if (!usersByEmail.has(key)) {
          usersByEmail.set(key, []);
        }
        usersByEmail.get(key)!.push(u);
      });

      const roleHierarchy: Record<string, number> = {
        admin: 4,
        owner: 3,
        user: 2,
        guest: 1,
      };

      const mappedUsers: UserItem[] = Array.from(usersByEmail.entries()).map(([emailKey, docs]) => {
        // Pick primary doc (the one with highest role or newest)
        const primaryDoc = docs.reduce((prev, curr) => {
          const prevRank = roleHierarchy[prev.role] || 0;
          const currRank = roleHierarchy[curr.role] || 0;
          return currRank > prevRank ? curr : prev;
        }, docs[0]);

        // Determine combined highest role
        let highestRole = primaryDoc.role || "guest";
        docs.forEach((d) => {
          if ((roleHierarchy[d.role] || 0) > (roleHierarchy[highestRole] || 0)) {
            highestRole = d.role;
          }
        });

        // Find all incubators matching any of this user's deviceCodes or deviceNames
        const userIncubators: any[] = [];
        if (incubatorsData) {
          const matchedKeys = new Set<string>();
          Object.keys(incubatorsData).forEach((key) => {
            const inc = incubatorsData[key];
            docs.forEach((u) => {
              if (
                (u.deviceCode && String(inc.code) === String(u.deviceCode)) ||
                (u.deviceName && String(inc.name) === String(u.deviceName))
              ) {
                if (!matchedKeys.has(key)) {
                  matchedKeys.add(key);
                  userIncubators.push({ id: key, ...inc });
                }
              }
            });
          });
        }

        // 1. Machine running status
        let mappedStatus: any = "pending";
        if (userIncubators.length > 0) {
          const primaryInc = userIncubators[0];
          const rawStatus = String(primaryInc.status || "").toLowerCase();
          if (rawStatus === "online" || primaryInc.alert === "NORMAL") {
            mappedStatus = "active";
          } else {
            mappedStatus = "disabled";
          }
        }

        // 2. Devices count & names
        const deviceCount = userIncubators.length;
        const devices = userIncubators.map((inc) => inc.name || inc.id);

        // 3. Created date
        let createdAtStr = primaryDoc.createdAt || "";
        if (userIncubators.length > 0 && userIncubators[0].cycle?.startDate) {
          const startDate = new Date(userIncubators[0].cycle.startDate);
          if (!isNaN(startDate.getTime())) {
            createdAtStr = startDate.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          }
        } else if (createdAtStr) {
          const dateObj = new Date(createdAtStr);
          if (!isNaN(dateObj.getTime())) {
            createdAtStr = dateObj.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });
          }
        } else {
          createdAtStr = "Chưa khởi động";
        }

        const isLocked = docs.some((d) => d.isLocked === true);
        const isOnline = docs.some((d) => d.isOnline === true);
        const docIds = docs.map((d) => d.id);
        const rawLastActive = primaryDoc.lastActiveAt || primaryDoc.updatedAt || primaryDoc.createdAt || null;

        return {
          id: primaryDoc.uid || primaryDoc.id,
          fullName: primaryDoc.fullName || "Người dùng ẩn danh",
          email: primaryDoc.email || "Chưa cập nhật",
          uid: primaryDoc.uid || primaryDoc.id,
          role: (highestRole || "user") as any,
          status: mappedStatus,
          deviceCount: deviceCount,
          devices: devices,
          createdAt: createdAtStr,
          lastActiveAt: primaryDoc.lastActiveAt || primaryDoc.createdAt || "",
          avatarUrl: primaryDoc.profilePicture || null,
          isLocked: isLocked,
          isOnline: isOnline,
          docIds: docIds,
          rawLastActive: rawLastActive,
        };
      });

      setUsers(mappedUsers);
    };

    // Listen to users from Firestore
    const unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      currentUsersData = list;
      combineAndSet(currentUsersData, currentIncubatorsData);
      setLoading(false);
    }, (err) => {
      currentUsersData = [];
      combineAndSet(currentUsersData, currentIncubatorsData);
      setLoading(false);
    });

    // Listen to incubators from Realtime Database
    const unsubscribeIncubators = onValue(incubatorsRef, (snapshot) => {
      if (snapshot.exists()) {
        currentIncubatorsData = snapshot.val();
      } else {
        currentIncubatorsData = {};
      }
      combineAndSet(currentUsersData, currentIncubatorsData);
    }, (err) => {
      console.error("RTDB incubators listener failed:", err);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeIncubators();
    };
  }, [refreshTrigger]);

  const sortedUsers = [...users].sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Calculate live summary stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => currentUser?.email && u.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()).length;
  const adminUsers = users.filter((u) => u.role === "admin" || u.role === "owner").length;
  const disabledUsers = totalUsers - activeUsers;

  return (
    <div className="grid gap-4">
      {/* Header */}
      <UserPageHeader totalUsers={totalUsers} onAddUser={() => setIsAddModalOpen(true)} />

      {/* Mini Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UserMiniStatCard
          label="Tổng người dùng"
          value={totalUsers}
          icon={Users}
          accent="indigo"
        />
        <UserMiniStatCard
          label="Đang hoạt động"
          value={activeUsers}
          icon={UserCheck}
          accent="emerald"
        />
        <UserMiniStatCard
          label="Chủ máy"
          value={adminUsers}
          icon={ShieldCheck}
          accent="sky"
        />
        <UserMiniStatCard
          label="Máy ngoại tuyến"
          value={disabledUsers}
          icon={UserMinus}
          accent="rose"
        />
      </section>

      {/* User Table Component Section */}
      <UserTable 
        users={sortedUsers} 
        onAddUser={() => setIsAddModalOpen(true)}
        onRefresh={() => setRefreshTrigger((prev) => prev + 1)} 
      />

      {/* Add User Modal */}
      {isAddModalOpen && (
        <AddUserModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
