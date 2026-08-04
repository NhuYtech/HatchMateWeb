"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Thermometer,
  Droplet,
  Download,
  RotateCw,
  Cpu,
  Plus,
  Trash2,
  Settings,
  MoreHorizontal,
  MoreVertical,
  Sliders
} from "lucide-react";
import { DeviceItem } from "@/src/types/device";
import DataTablePagination from "@/src/components/common/DataTablePagination";
import Link from "next/link";
import DeviceControlModal from "./DeviceControlModal";

interface DeviceTableProps {
  devices: DeviceItem[];
  onAddDevice?: () => void;
  onRefresh?: () => void | Promise<void>;
  onDeleteDevice?: (id: string, name: string) => void;
}

export default function DeviceTable({ devices, onAddDevice, onRefresh, onDeleteDevice }: DeviceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [controlModalDevice, setControlModalDevice] = useState<{ id: string; name: string } | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset to page 1 if devices list changes (e.g. filtered)
  const [prevDevices, setPrevDevices] = useState(devices);
  if (devices !== prevDevices) {
    setPrevDevices(devices);
    setCurrentPage(1);
  }

  const getStatusBadge = (status: DeviceItem["status"]) => {
    if (status === "online") {
      return (
        <span className="text-xs font-bold text-emerald-600">
          Online
        </span>
      );
    } else if (status === "warning") {
      return (
        <span className="text-xs font-bold text-amber-600">
          Warning
        </span>
      );
    } else {
      return (
        <span className="text-xs font-bold text-slate-500">
          Offline
        </span>
      );
    }
  };

  const getIncubationBadge = (status: DeviceItem["incubationStatus"], day: number, total: number) => {
    if (status === "paused") {
      return (
        <span className="text-sm font-semibold text-slate-500">
          Tạm dừng
        </span>
      );
    }
    
    if (status === "hatchingSoon") {
      return (
        <div className="space-y-1">
          <span className="text-sm font-semibold text-orange-700">
            Sắp nở
          </span>
          <p className="text-[11px] font-medium text-slate-500 pl-0.5">
            Ngày {day}/{total}
          </p>
        </div>
      );
    }

    // Default 'incubating' cycle: just show the day text, no 'Đang ấp' badge
    return (
      <span className="text-sm font-semibold text-slate-700">
        Ngày {day}/{total}
      </span>
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (err) {
        console.error("Refresh error:", err);
      }
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleExport = () => {
    const headers = ["Mã máy", "Tên máy", "Chủ sở hữu", "Trạng thái", "Chu kỳ", "Nhiệt độ (°C)", "Độ ẩm (%)", "Cập nhật cuối"];
    const rows = devices.map(device => [
      device.id,
      device.name,
      device.owner,
      device.status === "online" ? "Online" : (device.status === "warning" ? "Cảnh báo" : "Offline"),
      device.incubationStatus === "incubating" ? "Đang ấp" : (device.incubationStatus === "hatchingSoon" ? "Sắp nở" : "Tạm dừng"),
      device.temperature > 0 ? device.temperature.toFixed(1) : "--",
      device.humidity > 0 ? device.humidity.toString() : "--",
      device.lastSeen
    ]);

    // Construct CSV with UTF-8 BOM to display Vietnamese characters correctly in Excel
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `danh_sach_thiet_bi_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Empty State Render
  if (devices.length === 0) {
    return (
      <div className="w-full max-w-full min-w-0 overflow-hidden rounded-[24px] border border-sky-100/80 bg-white p-8 sm:p-16 text-center shadow-sm shadow-sky-100/10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shadow-sm shadow-amber-100">
          <Cpu className="h-8 w-8 stroke-[2.2] animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-sky-950">Chưa có thiết bị nào</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 leading-relaxed">
          Hiện tại không tìm thấy trạm ấp trứng nào trong danh sách. Hãy thêm thiết bị mới để bắt đầu giám sát hệ thống.
        </p>
        <button
          type="button"
          onClick={onAddDevice}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-sm font-semibold text-white shadow-md shadow-orange-100 transition hover:from-amber-600 hover:to-orange-600 active:scale-95 duration-150"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Thêm thiết bị mới</span>
        </button>
      </div>
    );
  }

  const paginatedDevices = devices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rounded-[24px] border border-sky-100/80 bg-white shadow-sm shadow-sky-100/10 overflow-hidden">

      {/* Table Toolbar */}
      <div className="border-b border-slate-100 bg-white px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            Danh sách thiết bị máy ấp
          </h3>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-sky-500 to-blue-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-100/50 transition hover:from-sky-600 hover:to-blue-700 active:scale-95 duration-150 cursor-pointer"
          >
            <Download className="h-4 w-4 text-white" />
            <span>Xuất file Excel</span>
          </button>
        </div>
      </div>

      {/* Responsive Wrapper */}
      <div className="overflow-x-auto relative min-h-[300px]">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-700">
              <th className="px-6 py-4">Mã máy</th>
              <th className="px-6 py-4">Tên máy</th>
              <th className="px-6 py-4">Chủ sở hữu</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4">Chu kỳ ấp</th>
              <th className="px-6 py-4">Nhiệt độ</th>
              <th className="px-6 py-4">Độ ẩm</th>
              <th className="px-6 py-4">Cập nhật cuối</th>
              <th className="px-6 py-4 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedDevices.map((device, index) => {
              const isBottomRow = paginatedDevices.length > 3 && index >= paginatedDevices.length - 2;
              return (
                <tr
                  key={device.id}
                  className={`group transition-colors duration-150 ${
                    index % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"
                  } hover:bg-sky-50/30`}
                >
                {/* Device ID */}
                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">
                  {device.id}
                </td>

                {/* Tên máy */}
                <td className="px-6 py-4">
                  <div className="font-semibold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer">
                    {device.name}
                  </div>
                </td>

                {/* Chủ sở hữu */}
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-700 font-medium">{device.owner}</span>
                </td>

                {/* Trạng thái */}
                <td className="px-6 py-4">
                  {getStatusBadge(device.status)}
                </td>

                {/* Chu kỳ ấp */}
                <td className="px-6 py-4">
                  {getIncubationBadge(device.incubationStatus, device.incubatingDay, device.totalIncubationDays)}
                </td>

                {/* Nhiệt độ */}
                <td className="px-6 py-4">
                  {device.temperature <= 0 ? (
                    <span className="text-slate-300 font-semibold">--</span>
                  ) : (
                    <div className="flex items-center gap-1 font-bold text-red-600">
                      <Thermometer className="h-4 w-4 text-red-500" />
                      <span>{device.temperature.toFixed(1)}°C</span>
                    </div>
                  )}
                </td>

                {/* Độ ẩm */}
                <td className="px-6 py-4">
                  {device.humidity <= 0 ? (
                    <span className="text-slate-300 font-semibold">--</span>
                  ) : (
                    <div className="flex items-center gap-1 font-bold text-blue-600">
                      <Droplet className="h-4 w-4 text-blue-500" />
                      <span>{device.humidity}%</span>
                    </div>
                  )}
                </td>

                {/* Cập nhật cuối */}
                <td className="px-6 py-4 text-xs text-slate-400 font-semibold">
                  {device.lastSeen}
                </td>

                {/* Hành động */}
                <td className="px-6 py-4 align-middle text-center">
                  <div className={`relative inline-block text-left ${activeDropdownId === device.id ? "z-50" : ""}`}>
                    <button
                      type="button"
                      onClick={() => setActiveDropdownId(activeDropdownId === device.id ? null : device.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-sky-50 hover:text-sky-600 transition active:scale-95 duration-100 cursor-pointer"
                      title="Tác vụ"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {activeDropdownId === device.id && (
                      <div 
                        ref={dropdownRef}
                        className={`absolute right-0 ${
                          isBottomRow ? "bottom-full mb-1" : "top-full mt-1"
                        } z-[100] w-44 rounded-2xl border border-sky-100 bg-white p-1.5 shadow-2xl animate-in fade-in duration-100 text-left`}
                      >
                        <Link
                          href={`/settings?id=${device.id}`}
                          onClick={() => setActiveDropdownId(null)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition cursor-pointer"
                        >
                          <Sliders className="h-4 w-4 text-sky-600" />
                          <span>Cấu hình máy</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveDropdownId(null);
                            setControlModalDevice({ id: device.id, name: device.name });
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition cursor-pointer"
                        >
                          <Settings className="h-4 w-4 text-slate-500" />
                          <span>Điều khiển máy</span>
                        </button>

                        <div className="my-1 border-t border-slate-100" />

                        <button
                          type="button"
                          onClick={() => {
                            setActiveDropdownId(null);
                            if (onDeleteDevice) onDeleteDevice(device.id, device.name);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                          <span>Xóa máy ấp</span>
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>

      {/* Pagination component */}
      <DataTablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={devices.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemLabel="thiết bị"
      />

      {controlModalDevice && (
        <DeviceControlModal
          isOpen={!!controlModalDevice}
          onClose={() => setControlModalDevice(null)}
          deviceId={controlModalDevice.id}
          deviceName={controlModalDevice.name}
        />
      )}
    </div>
  );
}
