"use client";

import React, { useState } from "react";
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

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="border-b border-slate-100 bg-white px-6 py-4 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
          Danh sách Camera thiết bị
        </h3>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto relative">
        <table className="w-full min-w-[700px] border-collapse text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-400">
              <th className="px-6 py-3.5">Thông tin Máy ấp</th>
              <th className="px-6 py-3.5">Thông tin Camera</th>
              <th className="px-6 py-3.5 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedCameras.map((camera, index) => {
              const displayDeviceId = (camera.deviceId === camera.deviceName || camera.deviceId.toLowerCase().includes("mayap"))
                ? "MATG01"
                : camera.deviceId;

              return (
                <tr
                  key={camera.id}
                  className="group bg-white hover:bg-slate-50/60 transition-colors"
                >
                  {/* Thông tin Máy ấp */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {camera.deviceName}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Mã máy: <span className="font-semibold text-slate-700">{displayDeviceId}</span>
                      </p>
                    </div>
                  </td>

                  {/* Thông tin Camera */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {camera.cameraName || "HatchMate-Cam"}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        IP: {camera.ipAddress || "192.168.88.220:81"}
                      </p>
                    </div>
                  </td>

                  {/* Trạng thái */}
                  <td className="px-6 py-4 text-center">
                    {camera.status === "online" ? (
                      <span className="text-xs font-bold text-emerald-600">
                        Online
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-rose-500">
                        Offline
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
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
