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
              <th className="px-5 py-3 text-center">Thao tác</th>
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
                  <div className="space-y-0.5">
                    <p className="font-bold text-sky-950 text-sm">{camera.deviceName}</p>
                    <p className="font-mono text-xs text-slate-400 font-semibold">{camera.deviceId}</p>
                  </div>
                </td>

                {/* Thông tin Camera */}
                <td className="px-5 py-3">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800 text-sm">{camera.cameraName}</p>
                    <p className="text-xs text-slate-400 font-mono font-medium">
                      IP: {camera.ipAddress || "192.168.88.220"} · {camera.locationLabel}
                    </p>
                  </div>
                </td>

                {/* Trạng thái */}
                <td className="px-5 py-3">
                  {camera.status === "online" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Đang hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      Ngoại tuyến
                    </span>
                  )}
                </td>

                {/* Thao tác */}
                <td className="px-5 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => onSelectCamera && onSelectCamera(camera)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-3 text-xs font-bold text-sky-700 shadow-sm transition hover:bg-sky-100 active:scale-95 duration-100 cursor-pointer"
                    title="Xem chi tiết Camera"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Xem chi tiết</span>
                  </button>
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
