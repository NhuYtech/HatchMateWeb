"use client";

import React, { useState } from "react";
import { 
  Eye, 
  Camera, 
  VideoOff,
  Settings
} from "lucide-react";
import { CameraItem } from "@/src/types/camera";
import DataTablePagination from "@/src/components/common/DataTablePagination";

interface CameraTableProps {
  cameras: CameraItem[];
  onSelectCamera?: (camera: CameraItem) => void;
  onCaptureNew?: (id: string) => void;
}

export default function CameraTable({ cameras, onSelectCamera, onCaptureNew }: CameraTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (cameras.length === 0) {
    return null;
  }

  const paginatedCameras = cameras.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getAiLabel = (status: CameraItem["aiStatus"]) => {
    switch (status) {
      case "analyzed":
        return "Đã quét";
      case "alert":
        return "Cảnh báo";
      default:
        return "Chờ quét";
    }
  };

  return (
    <div className="rounded-[24px] border border-sky-100/80 bg-white shadow-sm shadow-sky-100/10 overflow-hidden">
      {/* Table Toolbar */}
      <div className="border-b border-slate-100 bg-white px-4 py-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
          Danh sách Camera thiết bị
        </h3>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto relative min-h-[150px]">
        <table className="w-full min-w-[700px] border-collapse text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-700">
              <th className="px-5 py-3">Thông tin Máy ấp</th>
              <th className="px-5 py-3">Thông tin Camera</th>
              <th className="px-5 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedCameras.map((camera, index) => (
              <tr
                key={camera.id}
                className={`group transition-colors duration-150 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"
                } hover:bg-sky-50/30`}
              >
                {/* Thông tin Máy ấp */}
                <td className="px-5 py-3">
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold text-slate-800">
                      <span className="text-slate-400 font-medium">Tên máy:</span>{" "}
                      <span className="text-sky-950 font-bold">{camera.deviceName}</span>
                    </p>
                    <p className="font-mono text-slate-600">
                      <span className="text-slate-400 font-medium font-sans">Mã máy:</span>{" "}
                      <span className="font-bold text-slate-700">{camera.deviceId}</span>
                    </p>
                  </div>
                </td>

                {/* Thông tin Camera */}
                <td className="px-5 py-3">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800 text-sm">HatchMate-Cam</p>
                    <p className="text-xs text-slate-400 font-mono font-medium">
                      IP: {camera.ipAddress || "192.168.88.220"} · {camera.locationLabel}
                    </p>
                  </div>
                </td>

                {/* Trạng thái */}
                <td className="px-5 py-3">
                  {camera.status === "online" ? (
                    <span className="text-xs font-bold text-emerald-600">
                      Online
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
                      Offline
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={cameras.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemLabel="camera"
      />
    </div>
  );
}
