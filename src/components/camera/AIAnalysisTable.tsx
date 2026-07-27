"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Eye, 
  Image as ImageIcon, 
  MoreVertical, 
  Brain, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle,
  Download,
  X
} from "lucide-react";
import { AiRecord } from "@/src/types/camera";
import DataTablePagination from "@/src/components/common/DataTablePagination";

interface AIAnalysisTableProps {
  records: AiRecord[];
  onRefresh?: () => void;
}

function formatReadableDateTime(timeStr: string): string {
  if (!timeStr) return "Vừa xong";
  if (timeStr.includes(" - ") || timeStr.includes("Vừa xong")) return timeStr;
  
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      const hours = d.getHours().toString().padStart(2, "0");
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const seconds = d.getSeconds().toString().padStart(2, "0");
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear();
      return `${hours}:${minutes}:${seconds} - ${day}/${month}/${year}`;
    }
  } catch (_) {}
  return timeStr;
}

export default function AIAnalysisTable({ records, onRefresh }: AIAnalysisTableProps) {
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [previewRecord, setPreviewRecord] = useState<AiRecord | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Reset to page 1 if records list changes
  const [prevRecords, setPrevRecords] = useState(records);
  if (records !== prevRecords) {
    setPrevRecords(records);
    setCurrentPage(1);
  }

  const getStatusBadge = (status: AiRecord["resultStatus"]) => {
    switch (status) {
      case "normal":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-100/50">
            <ShieldCheck className="h-3.5 w-3.5" />
            Bình thường
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-100">
            <AlertTriangle className="h-3.5 w-3.5" />
            Cảnh báo
          </span>
        );
      case "danger":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-100">
            <XCircle className="h-3.5 w-3.5 animate-pulse" />
            Nguy hiểm
          </span>
        );
    }
  };

  if (records.length === 0) {
    return (
      <div className="rounded-[24px] border border-sky-100/80 bg-white p-16 text-center shadow-sm shadow-sky-100/10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-sm shadow-sky-100/50">
          <Brain className="h-8 w-8 stroke-[2.2] animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-sky-950">Chưa có bản ghi AI</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 leading-relaxed">
          Hiện tại chưa có dữ liệu kết quả phân tích AI nào được lưu trữ trong hệ thống.
        </p>
      </div>
    );
  }

  const paginatedRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rounded-[24px] border border-sky-100/80 bg-white shadow-sm shadow-sky-100/10 overflow-hidden">
      
      {/* Table Toolbar */}
      <div className="border-b border-slate-100 bg-white px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            Lịch sử phân tích AI
          </h3>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] border border-sky-100 bg-sky-50/20 px-4 text-xs font-bold text-sky-700 shadow-sm transition hover:bg-sky-50 hover:text-sky-800 active:scale-95 duration-150 cursor-pointer"
          >
            <Download className="h-4 w-4 text-sky-600" />
            <span>Xuất báo cáo AI</span>
          </button>
        </div>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto relative min-h-[300px]">
        <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-700">
              <th className="px-6 py-4">Thời gian chụp</th>
              <th className="px-6 py-4">Ảnh quét</th>
              <th className="px-6 py-4">Thiết bị / Camera</th>
              <th className="px-6 py-4">Kết quả AI</th>
              <th className="px-6 py-4">Confidence</th>
              <th className="px-6 py-4">Chi tiết chuẩn đoán</th>
              <th className="px-6 py-4">Ghi chú</th>
              <th className="px-6 py-4 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRecords.map((record, index) => (
              <tr 
                key={record.id} 
                className={`group transition-colors duration-150 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"
                } hover:bg-sky-50/30`}
              >
                {/* Thời gian chụp */}
                <td className="px-6 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap font-mono">
                  {formatReadableDateTime(record.capturedAt)}
                </td>

                {/* Ảnh quét */}
                <td className="px-6 py-4">
                  <div 
                    onClick={() => setPreviewRecord(record)}
                    className="relative h-12 w-16 shrink-0 rounded-lg bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:shadow-md transition"
                  >
                    {record.imageUrl ? (
                      <img 
                        src={record.imageUrl} 
                        alt={record.resultTitle} 
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-600" />
                    )}
                  </div>
                </td>

                {/* Thiết bị / Camera */}
                <td className="px-6 py-4">
                  <div>
                    <div className="font-semibold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer">
                      {record.deviceName}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                      HatchMate-Cam · {record.deviceId}
                    </p>
                  </div>
                </td>

                {/* Kết quả AI */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(record.resultStatus)}
                </td>

                {/* Confidence */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex rounded-lg bg-sky-50 border border-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700 font-mono">
                    {record.confidence}%
                  </span>
                </td>

                {/* Chi tiết chuẩn đoán */}
                <td className="px-6 py-4">
                  <div className="max-w-[280px]">
                    <p className="font-bold text-sky-950 text-xs mb-0.5">{record.resultTitle}</p>
                    <p className="text-[11px] font-semibold text-slate-500 line-clamp-2 leading-relaxed">
                      {record.resultSummary}
                    </p>
                  </div>
                </td>

                {/* Ghi chú */}
                <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                  {record.notes || <span className="italic text-slate-300">Không có</span>}
                </td>

                {/* Hành động */}
                <td className="px-6 py-4 text-center">
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      onClick={() => setActiveDropdownId(activeDropdownId === record.id ? null : record.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition duration-150 cursor-pointer"
                      title="Tác vụ"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {activeDropdownId === record.id && (
                      <div 
                        ref={dropdownRef}
                        className="absolute right-0 top-full z-[100] mt-1 w-36 rounded-xl border border-sky-100 bg-white p-1.5 shadow-xl animate-in fade-in duration-100"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewRecord(record);
                            setActiveDropdownId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-sky-950 hover:bg-sky-50 transition cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-sky-600" />
                          <span>Xem chi tiết</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (record.imageUrl) {
                              window.open(record.imageUrl, '_blank');
                            }
                            setActiveDropdownId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-sky-950 hover:bg-sky-50 transition cursor-pointer"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                          <span>Xem ảnh gốc</span>
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <DataTablePagination
        totalItems={records.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        itemLabel="bản ghi phân tích"
      />

      {/* Modal Xem chi tiết kết quả phân tích AI */}
      {previewRecord && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-xl w-full rounded-[28px] bg-white p-6 shadow-2xl border border-sky-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-extrabold text-sky-950">Chi tiết Phân tích AI (YOLOv8)</h4>
                <p className="text-xs text-slate-500 font-semibold">Thiết bị: {previewRecord.deviceName} · Thời gian: {formatReadableDateTime(previewRecord.capturedAt)}</p>
              </div>
              <button
                onClick={() => setPreviewRecord(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
              {previewRecord.imageUrl ? (
                <img 
                  src={previewRecord.imageUrl} 
                  alt={previewRecord.resultTitle} 
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <ImageIcon className="h-10 w-10 text-slate-600" />
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">KẾT QUẢ CHẨN ĐOÁN:</span>
                {getStatusBadge(previewRecord.resultStatus)}
              </div>
              <p className="text-sm font-bold text-sky-950">{previewRecord.resultTitle}</p>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">{previewRecord.resultSummary}</p>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-500 font-mono">
                <span>Độ tin cậy: <strong className="text-sky-700">{previewRecord.confidence}%</strong></span>
                <span>Mô hình: <strong>{previewRecord.processedBy}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
