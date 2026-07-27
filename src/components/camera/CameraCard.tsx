"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  ShieldCheck,
  Eye,
  Info,
  AlertTriangle
} from "lucide-react";
import { CameraItem } from "@/src/types/camera";

interface CameraCardProps {
  camera: CameraItem;
  onRefreshCapture?: (id: string) => void;
  onViewDetail?: (camera: CameraItem) => void;
}

export default function CameraCard({ camera, onRefreshCapture, onViewDetail }: CameraCardProps) {
  const [activeDropdown, setActiveDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getAiBadge = (status: CameraItem["aiStatus"]) => {
    switch (status) {
      case "analyzed":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            AI: Đã quét
          </span>
        );
      case "alert":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
            AI: Cảnh báo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            <Info className="h-3.5 w-3.5" />
            AI: Chờ quét
          </span>
        );
    }
  };

  return (
    <div className="group rounded-[24px] border border-sky-100/80 bg-white p-5 shadow-sm shadow-sky-100/10 hover:shadow-lg transition duration-200 flex flex-col justify-between">
      <div>
        {/* Preview / Static AI Capture image slot */}
        <div className="relative aspect-video w-full rounded-[18px] bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 overflow-hidden flex items-center justify-center border border-slate-100">
          {camera.previewImage ? (
            <img 
              src={camera.previewImage} 
              alt={camera.cameraName} 
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (camera.ipAddress || camera.streamUrl) ? (
            <img 
              src={camera.ipAddress ? (camera.ipAddress.startsWith('http') ? `${camera.ipAddress.replace(/\/stream$/, '')}/capture` : `http://${camera.ipAddress.replace(/\/stream$/, '')}/capture`) : '/incubator_eggs.png'} 
              alt={camera.cameraName} 
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                // If static capture fails, fallback smoothly to mock image placeholder
                (e.target as HTMLImageElement).src = '/incubator_eggs.png';
              }}
            />
          ) : (
            <div className="relative h-full w-full flex items-center justify-center">
              {/* Corner Viewfinder Brackets */}
              <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-slate-500/60 rounded-tr-sm"></div>
              <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-slate-500/60 rounded-tl-sm"></div>
              <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-slate-500/60 rounded-br-sm"></div>
              <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-slate-500/60 rounded-tl-sm"></div>

              <div className="text-center p-6 text-slate-500 flex flex-col items-center z-10">
                <Camera className="h-9 w-9 text-slate-400/80 mb-2 stroke-[1.5] group-hover:scale-110 transition duration-300" />
                <p className="text-xs font-bold text-slate-300 font-mono tracking-wider">{camera.cameraName}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">{camera.locationLabel}</p>
              </div>
            </div>
          )}

          {/* Dark capsule badge overlay */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-extrabold text-white border border-white/10 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>AI SNAPSHOT</span>
          </div>
        </div>
      </div>

      {/* Camera Info */}
      <div className="mt-4 flex justify-between items-start">
        <div className="space-y-0.5">
          <h4 className="font-bold text-sky-950 text-sm group-hover:text-sky-600 transition-colors">
            {camera.cameraName}
          </h4>
          <p className="text-xs font-semibold text-slate-500">{camera.deviceName}</p>
          <p className="text-[10px] font-medium text-slate-400 font-mono mt-0.5">{camera.deviceId} · {camera.locationLabel}</p>
        </div>

        {/* Dropdown removed for admin privacy */}
      </div>

      {/* AI Analytics Status */}
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          {getAiBadge(camera.aiStatus)}
          {camera.aiAlertCount > 0 && (
            <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 animate-bounce">
              {camera.aiAlertCount} cảnh báo AI
            </span>
          )}
        </div>

        {/* Egg Detection Stats grid */}
        {camera.eggCount !== undefined && (
          <div className="grid grid-cols-3 gap-2 bg-slate-50/60 rounded-[16px] p-3 border border-slate-100/50 text-center">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Hiện tại</span>
              <span className="text-base font-extrabold text-sky-950 font-mono">{camera.eggCount}</span>
            </div>
            <div className="space-y-0.5 border-x border-slate-200/50">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Ban đầu</span>
              <span className="text-base font-extrabold text-slate-500 font-mono">
                {camera.previousEggCount ?? camera.eggCount}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Biến động</span>
              {camera.previousEggCount !== undefined && camera.eggCount !== camera.previousEggCount ? (
                <span className="text-xs font-extrabold text-rose-600 animate-pulse block mt-1">
                  {camera.eggCount > camera.previousEggCount ? "+" : ""}
                  {camera.eggCount - camera.previousEggCount} quả
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-600 block mt-1">Ổn định</span>
              )}
            </div>
          </div>
        )}

        <div className="bg-slate-50/60 rounded-[14px] p-3 text-xs border border-slate-100/50">
          <span className="font-bold text-sky-950 block mb-0.5">Phân tích AI:</span>
          <span className="text-slate-500 font-semibold">{camera.lastAiSummary}</span>
        </div>
      </div>

      {/* Action triggers */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => onViewDetail && onViewDetail(camera)}
          className="inline-flex w-full h-9 items-center justify-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50/20 text-xs font-bold text-sky-700 shadow-sm transition hover:bg-sky-50 active:scale-95 duration-150 cursor-pointer"
        >
          <Eye className="h-4 w-4" />
          <span>Xem chi tiết</span>
        </button>
      </div>
    </div>
  );
}
