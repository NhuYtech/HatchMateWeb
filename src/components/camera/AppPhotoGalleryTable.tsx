"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Image as ImageIcon, X } from "lucide-react";
import { PhotoRecord } from "@/src/types/camera";
import DataTablePagination from "@/src/components/common/DataTablePagination";

interface AppPhotoGalleryTableProps {
  photos: PhotoRecord[];
  onDeletePhoto?: (photo: PhotoRecord) => void;
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

export default function AppPhotoGalleryTable({ photos, onDeletePhoto }: AppPhotoGalleryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoRecord | null>(null);

  if (photos.length === 0) {
    return (
      <div className="rounded-[24px] border border-sky-100/80 bg-white p-12 text-center shadow-sm shadow-sky-100/10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm">
          <ImageIcon className="h-7 w-7 stroke-[2]" />
        </div>
        <h3 className="text-base font-bold text-sky-950">Chưa có lịch sử ảnh chụp từ App</h3>
        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
          Ảnh chụp thủ công hoặc tự động từ ứng dụng di động sẽ tự động đồng bộ và xuất hiện tại đây.
        </p>
      </div>
    );
  }

  const paginatedPhotos = photos.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getTypeText = (type: PhotoRecord["type"]) => {
    switch (type) {
      case "manual":
        return <span className="font-semibold text-slate-800 text-xs">Thủ công (App)</span>;
      case "auto":
        return <span className="font-semibold text-amber-700 text-xs">Định kỳ (3h)</span>;
      case "ai":
        return <span className="font-semibold text-purple-700 text-xs">AI Nhận diện</span>;
      default:
        return <span className="font-semibold text-slate-800 text-xs">Ảnh chụp</span>;
    }
  };

  return (
    <div className="rounded-[24px] border border-sky-100/80 bg-white shadow-sm shadow-sky-100/10 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white px-6 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
            Lịch sử ảnh chụp từ App & Web ({photos.length} ảnh)
          </h3>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto relative min-h-[180px]">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-700">
              <th className="px-5 py-3">Xem ảnh</th>
              <th className="px-5 py-3">Tên sự kiện</th>
              <th className="px-5 py-3">Tên máy ấp</th>
              <th className="px-5 py-3">Loại chụp</th>
              <th className="px-5 py-3">Thời gian chụp</th>
              <th className="px-5 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedPhotos.map((photo, index) => (
              <tr
                key={photo.id}
                className={`group transition-colors duration-150 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"
                } hover:bg-sky-50/40`}
              >
                {/* Image Thumbnail */}
                <td className="px-5 py-3">
                  <div 
                    onClick={() => setPreviewPhoto(photo)}
                    className="relative h-12 w-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer group-hover:shadow-md transition duration-200"
                  >
                    {photo.imageUrl ? (
                      <img 
                        src={photo.imageUrl} 
                        alt={photo.title} 
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </td>

                {/* Event Title */}
                <td className="px-5 py-3 font-bold text-sky-950">
                  {photo.title}
                </td>

                {/* Device Name */}
                <td className="px-5 py-3 font-semibold text-slate-700">
                  {photo.deviceName}
                </td>

                {/* Type Plain Text */}
                <td className="px-5 py-3">
                  {getTypeText(photo.type)}
                </td>

                {/* Time */}
                <td className="px-5 py-3 text-xs font-semibold text-slate-500">
                  {formatReadableDateTime(photo.time)}
                </td>

                {/* Action Plain Text Link */}
                <td className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(photo)}
                      className="font-bold text-sky-600 hover:text-sky-800 text-xs cursor-pointer hover:underline"
                    >
                      Xem phóng to
                    </button>
                    {onDeletePhoto && (
                      <button
                        type="button"
                        onClick={() => onDeletePhoto(photo)}
                        className="font-bold text-rose-600 hover:text-rose-800 text-xs cursor-pointer hover:underline"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
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
        totalItems={photos.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemLabel="bức ảnh"
      />

      {/* Lightbox Modal Sạch Đẹp - Nền trắng, căn giữa */}
      {previewPhoto && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-2xl w-full rounded-[28px] bg-white p-6 shadow-2xl border border-sky-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="relative border-b border-slate-100 pb-3 text-center">
              <h4 className="text-base font-extrabold text-sky-950 uppercase tracking-wide">
                {previewPhoto.title}
              </h4>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Thiết bị: {previewPhoto.deviceName} · Thời gian: {formatReadableDateTime(previewPhoto.time)}
              </p>
              <div className="absolute right-0 top-0 flex items-center gap-2">
                {onDeletePhoto && (
                  <button
                    onClick={() => {
                      const photoToDelete = previewPhoto;
                      setPreviewPhoto(null);
                      onDeletePhoto(photoToDelete);
                    }}
                    className="flex h-8 px-3 items-center justify-center rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold transition cursor-pointer"
                  >
                    Xóa ảnh
                  </button>
                )}
                <button
                  onClick={() => setPreviewPhoto(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-sm flex items-center justify-center">
              <img 
                src={previewPhoto.imageUrl} 
                alt={previewPhoto.title} 
                className="w-full h-auto max-h-[65vh] object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
