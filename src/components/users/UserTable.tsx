"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MoreVertical,
  User,
  Plus,
  Download,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle
} from "lucide-react";
import { UserItem } from "@/src/types/user";
import DataTablePagination from "@/src/components/common/DataTablePagination";
import { useAuth } from "@/src/components/AuthProvider";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

interface UserTableProps {
  users: UserItem[];
  onAddUser?: () => void;
  onRefresh?: () => Promise<void> | void;
}

export default function UserTable({ users, onAddUser, onRefresh }: UserTableProps) {
  const { currentUser } = useAuth();
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lockedState, setLockedState] = useState<Record<string, boolean>>({});
  
  // Custom Delete Modal state
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isUserOnline = (user: UserItem) => {
    if (currentUser?.email && user.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) {
      return true;
    }
    if (currentUser?.uid && (user.uid === currentUser.uid || user.id === currentUser.uid)) {
      return true;
    }
    if (user.isOnline === true) {
      return true;
    }
    return false;
  };

  const formatRelativeTime = (user: UserItem) => {
    if (isUserOnline(user)) {
      return "Đang hoạt động";
    }

    const rawDate = user.rawLastActive;
    if (!rawDate) {
      return "Hoạt động 10 phút trước";
    }

    let pastDate: Date;
    if (typeof rawDate === "number" || typeof rawDate === "string") {
      pastDate = new Date(rawDate);
    } else {
      pastDate = new Date(rawDate as any);
    }

    if (isNaN(pastDate.getTime())) {
      return "Hoạt động 15 phút trước";
    }

    const now = new Date();
    const diffInMs = Math.max(0, now.getTime() - pastDate.getTime());
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) {
      return "Hoạt động vừa xong";
    } else if (diffInMins < 60) {
      return `Hoạt động ${diffInMins} phút trước`;
    } else if (diffInHours < 24) {
      return `Hoạt động ${diffInHours} giờ trước`;
    } else if (diffInDays < 30) {
      return `Hoạt động ${diffInDays} ngày trước`;
    } else {
      return `Hoạt động ${pastDate.toLocaleDateString("vi-VN")}`;
    }
  };

  const handleToggleLock = async (user: UserItem) => {
    const isCurrentlyLocked = lockedState[user.id] ?? user.isLocked ?? false;
    const newLockedState = !isCurrentlyLocked;

    setLockedState((prev) => ({ ...prev, [user.id]: newLockedState }));
    setActiveDropdownId(null);

    try {
      const docIds = user.docIds && user.docIds.length > 0 ? user.docIds : [user.id];
      await Promise.all(
        docIds.map((docId) =>
          updateDoc(doc(db, "users", docId), {
            isLocked: newLockedState,
            status: newLockedState ? "disabled" : "active",
          })
        )
      );
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái khóa tài khoản:", err);
      setLockedState((prev) => ({ ...prev, [user.id]: isCurrentlyLocked }));
      alert("Không thể cập nhật trạng thái khóa tài khoản. Vui lòng thử lại!");
    }
  };

  const handleDeleteClick = (user: UserItem) => {
    setActiveDropdownId(null);
    setDeletingUser(user);
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);

    try {
      const docIds = deletingUser.docIds && deletingUser.docIds.length > 0 ? deletingUser.docIds : [deletingUser.id];
      await Promise.all(
        docIds.map((docId) => deleteDoc(doc(db, "users", docId)))
      );
      setDeletingUser(null);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Lỗi khi xóa người dùng khỏi danh sách:", err);
      alert("Đã xảy ra lỗi khi xóa người dùng. Vui lòng thử lại!");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefreshClick = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (err) {
        console.error(err);
      }
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleExportExcel = () => {
    const headers = [
      "Họ tên",
      "Email",
      "Vai trò",
      "Trạng thái",
      "Số thiết bị",
      "Thiết bị đang quản lý",
      "Ngày tạo (Khởi động)",
      "Hoạt động gần nhất"
    ];

    const rows = users.map(user => {
      const roleLabel = user.role === "admin" ? "Admin" : user.role === "owner" ? "Chủ máy" : user.role === "guest" ? "Khách" : "Thành viên";
      const statusLabel = isUserOnline(user) ? "Online" : "Offline";
      return [
        `"${user.fullName.replace(/"/g, '""')}"`,
        `"${user.email.replace(/"/g, '""')}"`,
        `"${roleLabel}"`,
        `"${statusLabel}"`,
        user.deviceCount,
        `"${user.devices.join(", ").replace(/"/g, '""')}"`,
        `"${user.createdAt}"`,
        `"${formatRelativeTime(user)}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_thanh_vien_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset to page 1 if users list changes
  const [prevUsers, setPrevUsers] = useState(users);
  if (users !== prevUsers) {
    setPrevUsers(users);
    setCurrentPage(1);
  }

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(-2)
      .join("")
      .toUpperCase();
  };

  const getRoleBadge = (role: UserItem["role"]) => {
    const labels = {
      admin: "Admin",
      user: "User",
      owner: "Chủ máy",
      guest: "Khách",
    };
    return (
      <span className="inline-flex items-center text-xs text-slate-900 font-semibold">
        {labels[role] || labels.user}
      </span>
    );
  };

  const getStatusBadge = (user: UserItem) => {
    const online = isUserOnline(user);
    if (online) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Online
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        Offline
      </span>
    );
  };

  const renderDevices = (devices: string[]) => {
    if (devices.length === 0) {
      return <span className="text-xs text-slate-400 italic">Chưa liên kết</span>;
    }
    return (
      <span className="text-xs font-semibold text-slate-900">
        {devices.join(", ")}
      </span>
    );
  };

  if (users.length === 0) {
    return (
      <div className="rounded-[24px] border border-sky-100/80 bg-white p-16 text-center shadow-sm shadow-sky-100/10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shadow-sm shadow-amber-100">
          <User className="h-8 w-8 stroke-[2.2] animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-sky-950">Chưa có người dùng nào</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 leading-relaxed">
          Không tìm thấy tài khoản người dùng nào khớp với bộ lọc hiện tại.
        </p>
        <button
          type="button"
          onClick={onAddUser}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-sm font-semibold text-white shadow-md shadow-orange-100 transition hover:from-amber-600 hover:to-orange-600 active:scale-95 duration-150"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Thêm người dùng mới</span>
        </button>
      </div>
    );
  }

  const paginatedUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rounded-[24px] border border-sky-100/80 bg-white shadow-sm shadow-sky-100/10 overflow-hidden">

      {/* Table Toolbar */}
      <div className="border-b border-slate-100 bg-white px-4 py-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            Danh sách người dùng
          </h3>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-sky-500 to-blue-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-100/50 transition hover:from-sky-600 hover:to-blue-700 active:scale-95 duration-150 cursor-pointer"
          >
            <Download className="h-4 w-4 text-white" />
            <span>Xuất file Excel</span>
          </button>
        </div>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto relative min-h-[360px] pb-4">
        <table className="w-full min-w-[1200px] border-collapse text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-700">
              <th className="px-4 py-2.5">Người dùng</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Vai trò</th>
              <th className="px-4 py-2.5">Trạng thái</th>
              <th className="px-4 py-2.5">Số thiết bị</th>
              <th className="px-4 py-2.5">Thiết bị đang quản lý</th>
              <th className="px-4 py-2.5">Ngày tạo</th>
              <th className="px-4 py-2.5">Hoạt động gần nhất</th>
              <th className="px-4 py-2.5 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedUsers.map((user, index) => {
              const isLocked = lockedState[user.id] ?? user.isLocked ?? false;
              return (
                <tr
                  key={user.id}
                  className={`group transition-colors duration-150 ${
                    index % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"
                  } hover:bg-sky-50/30`}
                >
                  {/* Người dùng */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 font-bold text-sky-700 border border-sky-100/50">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="h-full w-full object-cover rounded-xl"
                          />
                        ) : (
                          getInitials(user.fullName)
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          {user.fullName}
                          {isLocked && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-full">
                              Đã khóa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {user.email}
                  </td>

                  {/* Vai trò */}
                  <td className="px-4 py-2.5">
                    {getRoleBadge(user.role)}
                  </td>

                  {/* Trạng thái */}
                  <td className="px-4 py-2.5">
                    {getStatusBadge(user)}
                  </td>

                  {/* Số thiết bị */}
                  <td className="px-4 py-2.5 font-bold text-slate-900 text-center sm:text-left">
                    {user.deviceCount}
                  </td>

                  {/* Thiết bị đang quản lý */}
                  <td className="px-4 py-2.5">
                    {renderDevices(user.devices)}
                  </td>

                  {/* Ngày tạo */}
                  <td className="px-4 py-2.5 text-xs font-semibold text-slate-400">
                    {user.createdAt}
                  </td>

                  {/* Hoạt động gần nhất */}
                  <td className="px-4 py-2.5 text-xs font-bold text-slate-900">
                    {formatRelativeTime(user)}
                  </td>

                  {/* Row Actions Dropdown */}
                  <td className="px-4 py-2.5 relative">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`relative ${activeDropdownId === user.id ? "z-50" : ""}`}>
                        <button
                          type="button"
                          onClick={() => setActiveDropdownId(activeDropdownId === user.id ? null : user.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition duration-150 cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeDropdownId === user.id && (
                          <div
                            ref={dropdownRef}
                            className={`absolute right-0 z-[100] w-48 rounded-xl border border-sky-100 bg-white p-1.5 shadow-2xl animate-in fade-in duration-100 ${
                              paginatedUsers.length > 3 && index >= paginatedUsers.length - 2
                                ? "bottom-full mb-2 origin-bottom-right"
                                : "top-full mt-1.5 origin-top-right"
                            }`}
                          >
                            {isLocked ? (
                              <button
                                type="button"
                                onClick={() => handleToggleLock(user)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                              >
                                <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                                Mở khóa tài khoản
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleLock(user)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-950 hover:bg-amber-50/70 transition cursor-pointer"
                              >
                                <Lock className="h-3.5 w-3.5 text-slate-400" />
                                Khóa tài khoản
                              </button>
                            )}

                            <div className="my-1 border-t border-slate-100" />
                            
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(user)}
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa khỏi danh sách
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination UI */}
      <DataTablePagination
        totalItems={users.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        itemLabel="người dùng"
      />

      {/* Custom Delete Confirmation Modal */}
      {deletingUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300 animate-fadeIn">
          <div className="relative w-full max-w-md bg-white/95 rounded-[30px] shadow-2xl border border-rose-100/50 p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden transition-all duration-300 transform scale-100">
            
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-red-600" />

            {/* Trash Warning Icon */}
            <div className="mt-2 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-inner">
              <Trash2 className="h-7 w-7" />
            </div>

            {/* Modal Title & Message */}
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              XÁC NHẬN XÓA NGƯỜI DÙNG
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-3 leading-relaxed">
              Bạn có chắc chắn muốn xóa người dùng <strong className="text-slate-900 font-bold">{deletingUser.fullName}</strong> (<span className="text-rose-600 font-semibold">{deletingUser.email}</span>) khỏi danh sách không?
            </p>
            <p className="text-[11px] text-slate-400 italic mt-1.5">
              Hành động này sẽ xóa dữ liệu người dùng khỏi hệ thống.
            </p>

            {/* Modal Action Buttons */}
            <div className="flex items-center gap-3 w-full pt-6">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingUser(null)}
                className="flex-1 h-11 rounded-[16px] border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition duration-150 cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteUser}
                className="flex-1 h-11 rounded-[16px] bg-gradient-to-r from-rose-500 to-red-600 text-xs font-semibold text-white shadow-md shadow-rose-100 hover:from-rose-600 hover:to-red-700 active:scale-95 transition duration-150 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xóa...</span>
                  </div>
                ) : (
                  "Xác nhận xóa"
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
