"use client";

import React, { useState, useEffect } from "react";
import { MoreHorizontal, Thermometer, Droplet, X, Calendar, Clock, Cpu } from "lucide-react";
import { ReportSummaryItem } from "@/src/types/report";
import DataTablePagination from "@/src/components/common/DataTablePagination";
import { createPortal } from "react-dom";
import DeviceRealtimeModalCharts from "./DeviceRealtimeModalCharts";

interface ReportSummaryTableProps {
  items: ReportSummaryItem[];
}

export default function ReportSummaryTable({ items }: ReportSummaryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedItem, setSelectedItem] = useState<ReportSummaryItem | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);



  // Reset to page 1 if items list changes
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setCurrentPage(1);
  }

  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getAlertBadge = (count: number) => {
    return (
      <span className="text-xs font-bold text-rose-600">
        {count} cảnh báo
      </span>
    );
  };


  return (
    <div className="rounded-[24px] border border-sky-100/80 bg-white shadow-sm shadow-sky-100/10 overflow-hidden w-full min-w-0 flex-1">
      {/* Table Title Header */}
      <div className="border-b border-slate-100 bg-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5 min-w-0 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            TỔNG HỢP HIỆU SUẤT
          </h3>
        </div>
        <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg self-start sm:self-auto shrink-0">
          30 ngày qua
        </span>
      </div>

      {/* Table Wrapper */}
      <div className="overflow-x-auto w-full min-w-0">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-700">
              <th className="px-6 py-4">Thiết bị</th>
              <th className="px-6 py-4">Nhiệt độ TB</th>
              <th className="px-6 py-4">Độ ẩm TB</th>
              <th className="px-6 py-4">Cảnh báo</th>
              <th className="px-6 py-4">Ngày ấp</th>
              <th className="px-6 py-4">Cập nhật cuối</th>
              <th className="px-6 py-4 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.map((item, index) => (
              <tr 
                key={item.deviceId} 
                className={`group transition-colors duration-150 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"
                } hover:bg-sky-50/30`}
              >
                {/* Thiết bị */}
                <td className="px-6 py-4">
                  <div>
                    <div className="font-semibold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer">
                      {item.deviceName}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">{item.deviceId}</p>
                  </div>
                </td>

                {/* Nhiệt độ TB */}
                <td className="px-6 py-4 font-bold text-sky-950 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Thermometer className="h-4 w-4 text-orange-500" />
                    <span>{item.avgTemperature.toFixed(1)}°C</span>
                  </div>
                </td>

                {/* Độ ẩm TB */}
                <td className="px-6 py-4 font-bold text-sky-950 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Droplet className="h-4 w-4 text-blue-500" />
                    <span>{item.avgHumidity}%</span>
                  </div>
                </td>

                {/* Cảnh báo */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {getAlertBadge(item.alertCount)}
                </td>

                {/* Ngày ấp */}
                <td className="px-6 py-4 font-semibold text-slate-600">
                  {item.incubationDay > 0 ? `Ngày ${item.incubationDay}/21` : "Tạm dừng"}
                </td>

                {/* Cập nhật cuối */}
                <td className="px-6 py-4 text-xs font-semibold text-slate-400 whitespace-nowrap">
                  {item.lastUpdated}
                </td>

                {/* Hành động */}
                <td className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    title="Xem chi tiết thiết bị"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition duration-150 cursor-pointer"
                  >
                    <MoreHorizontal className="h-4.5 w-4.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DataTablePagination
        totalItems={items.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        itemLabel="thiết bị"
      />

      {/* DEVICE DETAILS MODAL */}
      {mounted && selectedItem && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto font-sans">
          <div className="relative w-full max-w-4xl rounded-[32px] border border-sky-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <Cpu className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-sky-950">
                    Chi tiết thiết bị: {selectedItem.deviceName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedItem.deviceId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Device Parameters Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <div className="rounded-[20px] border border-sky-50 bg-sky-50/20 p-4">
                <div className="flex items-center gap-2 text-sky-600 mb-1">
                  <Thermometer className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Nhiệt độ hiện tại</span>
                </div>
                <p className="text-2xl font-black text-sky-950">{selectedItem.avgTemperature.toFixed(1)}°C</p>
              </div>

              <div className="rounded-[20px] border border-blue-50 bg-blue-50/20 p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Droplet className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Độ ẩm hiện tại</span>
                </div>
                <p className="text-2xl font-black text-sky-950">{selectedItem.avgHumidity}% RH</p>
              </div>

              <div className="rounded-[20px] border border-amber-50 bg-amber-50/20 p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ngày ấp trứng</span>
                </div>
                <p className="text-2xl font-black text-sky-950">
                  {selectedItem.incubationDay > 0 ? `Ngày ${selectedItem.incubationDay}/21` : "Tạm dừng"}
                </p>
              </div>

              <div className="rounded-[20px] border border-slate-100 bg-slate-50/30 p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cập nhật cuối</span>
                </div>
                <p className="text-md font-extrabold text-slate-600 mt-1.5">{selectedItem.lastUpdated}</p>
              </div>
            </div>

            {/* Realtime Temperature & Humidity Fluctuation Stream Charts */}
            <DeviceRealtimeModalCharts
              deviceId={selectedItem.deviceId}
              deviceName={selectedItem.deviceName}
              initialTemp={selectedItem.avgTemperature}
              initialHumi={selectedItem.avgHumidity}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
