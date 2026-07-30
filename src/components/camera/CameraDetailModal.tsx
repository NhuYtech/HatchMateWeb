"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ref, onValue } from "firebase/database";
import { doc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";
import { rtdb, db } from "@/src/lib/firebase";
import { CameraItem } from "@/src/types/camera";
import {
  X,
  WifiOff,
  Image as ImageIcon,
  ImageOff,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles
} from "lucide-react";

import { analyzeImageWithAi } from "@/src/lib/aiDetection";

interface CameraDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  initialCamera: CameraItem;
}

interface EventItem {
  id: string;
  title: string;
  time: string;
  imageUrl: string | null;
}

export default function CameraDetailModal({
  isOpen,
  onClose,
  deviceId,
  initialCamera,
}: CameraDetailModalProps) {
  const [camera, setCamera] = useState<CameraItem>(initialCamera);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRunAiDetection = async () => {
    const targetUrl = selectedImageUrl || camera.previewImage;
    if (!targetUrl) {
      showToast("Không tìm thấy ảnh để nhận diện!");
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await analyzeImageWithAi(targetUrl, deviceId);

      if (result.success) {
        if (result.detectedCount === 0) {
          setCamera(prev => ({
            ...prev,
            eggCount: 0,
            lastAiSummary: "AI nhận diện: 0 quả trứng (Không tìm thấy trứng trong buồng ấp)",
            lastAiConfidence: null,
            aiStatus: "alert",
          }));
          showToast("✨ AI nhận diện xong: Không tìm thấy quả trứng nào!");
        } else {
          setCamera(prev => ({
            ...prev,
            eggCount: result.detectedCount,
            lastAiSummary: `AI nhận diện thành công: ${result.detectedCount} quả trứng`,
            lastAiConfidence: result.confidence,
            aiStatus: "analyzed",
            previewImage: result.processedImageUrl || prev.previewImage,
          }));
          if (result.processedImageUrl) {
            setSelectedImageUrl(result.processedImageUrl);
          }
          showToast(`✨ AI nhận diện thành công: ${result.detectedCount} quả trứng ${result.confidence ? `(${result.confidence}% độ tin cậy)` : ""}`);
        }
      } else {
        showToast(result.message || "Kết nối AI thất bại!");
      }
    } catch (err) {
      showToast("Phân tích AI thất bại, vui lòng thử lại!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sync with Firebase RTDB & Firestore
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);

    // 1. Sync telemetry and status from Firebase Realtime Database
    const deviceRef = ref(rtdb, `incubators/${deviceId}`);
    const unsubscribeRtdb = onValue(deviceRef, (snapshot) => {
      if (snapshot.exists()) {
        const item = snapshot.val();
        const cameraStatus = (item.camera?.status ?? item.status ?? "offline").toLowerCase() === "online" ? "online" : "offline";
        const status = String(item.status ?? (item.alert === "NORMAL" ? "online" : (item.alert ? "warning" : "offline"))).toLowerCase();
        const lastSeen = item.lastSeen ?? "Vừa xong";
        const deviceName = item.name ?? deviceId;

        const eggCount = item.telemetry?.eggCount !== undefined ? Number(item.telemetry.eggCount) : (initialCamera.eggCount || 24);
        const previousEggCount = status === "warning" ? 24 : eggCount;
        const hasVariation = eggCount !== previousEggCount;

        setCamera(prev => ({
          ...prev,
          status: cameraStatus,
          deviceName,
          cameraName: `Cam ${deviceName}`,
          eggCount,
          previousEggCount,
          aiStatus: hasVariation ? "alert" : "analyzed",
          aiAlertCount: hasVariation ? 1 : 0,
        }));
      }
    });

    // 2. Listen to latest AI image snapshots from Firestore doc: camera/current
    const cameraDocRef = doc(db, "camera", "current");
    const unsubscribeFirestoreDoc = onSnapshot(cameraDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const aiUrl = data.aiImageUrl || data.latestImageUrl || null;
        setCamera(prev => ({
          ...prev,
          previewImage: aiUrl,
          lastAiSummary: data.detectedLabel 
            ? `AI nhận diện thành công: ${data.detectedLabel} quả trứng`
            : prev.lastAiSummary,
          lastAiConfidence: data.confidence ? Math.round(data.confidence * 100) : prev.lastAiConfidence,
          lastCaptureAt: data.updatedAt 
            ? new Date(data.updatedAt.seconds * 1000).toLocaleTimeString("vi-VN")
            : prev.lastCaptureAt
        }));
        // Default to showing latest scanned image
        setSelectedImageUrl(prevUrl => prevUrl || aiUrl);
      }
    });

    // 3. Listen to recent historical frames list from Firestore: incubators/{deviceId}/camera_frames
    const framesRef = collection(db, "incubators", deviceId, "camera_frames");
    const q = query(framesRef, orderBy("updatedAt", "desc"), limit(5));
    const unsubscribeFirestoreCol = onSnapshot(q, (snapshot) => {
      const parsedEvents: EventItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const date = data.updatedAt
          ? new Date(data.updatedAt.seconds * 1000)
          : new Date();
        parsedEvents.push({
          id: docSnap.id,
          title: `Quét AI: ${data.detectedLabel ?? "0"} quả trứng`,
          time: date.toLocaleTimeString("vi-VN") + " " + date.toLocaleDateString("vi-VN"),
          imageUrl: data.aiImageUrl || data.latestImageUrl || null
        });
      });
      setEvents(parsedEvents);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore collection listen failed (maybe collection empty or missing permissions):", err);
      setLoading(false);
    });

    return () => {
      unsubscribeRtdb();
      unsubscribeFirestoreDoc();
      unsubscribeFirestoreCol();
    };
  }, [isOpen, deviceId, initialCamera]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 z-[10000] rounded-xl bg-slate-900/90 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-sm border border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
          {notification}
        </div>
      )}

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-[36px] bg-[#FAF2EB] p-6 shadow-2xl flex flex-col gap-4 border border-[#FBEBE3] overflow-y-auto max-h-[95vh] scrollbar-thin">
        
        {/* Modal Close & Title Info */}
        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-base font-extrabold text-sky-950">
              {camera.cameraName}
            </h3>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
              {camera.locationLabel} · Trạm: {camera.deviceName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-[#F5E1D6] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition duration-150 cursor-pointer shadow-sm"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* 1. Camera Viewfinder Panel (Displays static AI scan or connection status) */}
        <div className="relative aspect-video w-full rounded-[28px] bg-slate-900 overflow-hidden flex flex-col items-center justify-center gap-2 text-white/70 shadow-inner border border-slate-950/20 select-none">
          {selectedImageUrl ? (
            <>
              <img 
                src={selectedImageUrl} 
                alt="AI Camera Frame" 
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Overlay watermarks */}
              <div className="absolute top-3 left-3 bg-black/45 backdrop-blur-md rounded-lg px-2 py-1 text-[9px] font-bold text-white uppercase tracking-wider font-mono">
                CAM_STREAM_AI
              </div>
            </>
          ) : null}

          {/* Connection status overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-slate-900/80 px-3 py-1.5 backdrop-blur-sm border border-white/10">
            {camera.status === "online" ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white">Camera Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-[10px] font-bold text-white">Camera Offline</span>
              </>
            )}
          </div>

          <div className="absolute bottom-3 right-3 rounded-xl bg-slate-900/80 px-3 py-1.5 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white/70">
            Thời gian: {camera.lastCaptureAt}
          </div>
          
          {!selectedImageUrl && (
            <div className="text-center p-6 text-slate-500 flex flex-col items-center z-10">
              <ImageOff className="h-8 w-8 text-white/40 mb-2" />
              <p className="text-xs font-bold text-white/60">Chưa có ảnh quét AI nào từ máy</p>
            </div>
          )}
        </div>

        {/* NÚT AI NHẬN DIỆN TRỨNG - CHỈ CHO PHÉP NHẤN 1 LẦN */}
        {(() => {
          const isAlreadyAnalyzed = Boolean(
            camera.lastAiConfidence !== undefined && camera.lastAiConfidence !== null && camera.lastAiConfidence > 0
          );

          return (
            <button
              type="button"
              onClick={handleRunAiDetection}
              disabled={isAnalyzing || isAlreadyAnalyzed}
              className={`w-full h-12 rounded-[22px] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition duration-150 border ${
                isAlreadyAnalyzed
                  ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed shadow-none opacity-90"
                  : "bg-[#E5A00D] hover:bg-[#D99308] text-white shadow-amber-500/25 active:scale-[0.98] cursor-pointer border-amber-400/40 disabled:opacity-75 disabled:cursor-not-allowed"
              }`}
            >
              {isAlreadyAnalyzed ? (
                <span>✓ ĐÃ HOÀN THÀNH PHÂN TÍCH AI ({camera.eggCount} QUẢ TRỨNG)</span>
              ) : isAnalyzing ? (
                <>
                  <Sparkles className="h-4.5 w-4.5 text-orange-100 animate-spin" />
                  <span>ĐANG PHÂN TÍCH AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4.5 w-4.5 text-orange-100" />
                  <span>AI NHẬN DIỆN TRỨNG</span>
                </>
              )}
            </button>
          );
        })()}

        {/* 2. AI Details Panel */}
        <div className="bg-white border border-[#FBEBE3] rounded-[28px] p-5 shadow-sm flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-[#1E293B] flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-sky-600" />
              NHẬN DIỆN EGG COUNT (HATCHMATE AI)
            </h4>
            {camera.aiStatus === "alert" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-600 border border-rose-100 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                Cảnh báo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 border border-emerald-100">
                Ổn định
              </span>
            )}
          </div>

          <div className="flex items-center gap-5 bg-[#FFF8F6] border border-[#F5E1D6]/40 rounded-[20px] p-4.5">
            {/* Large counter */}
            <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-3 border border-[#F5E1D6] shadow-sm min-w-[76px]">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">ĐẾM ĐƯỢC</span>
              <span className={`text-2xl font-black font-mono mt-0.5 ${camera.aiStatus === "alert" ? "text-rose-600" : "text-sky-950"}`}>
                {camera.eggCount}
              </span>
            </div>

            {/* Stats progress bar & description */}
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-xs font-black text-sky-950">{camera.lastAiSummary}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Mô hình AI: YOLOv8l (Chạy tại local)</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-400">ĐỘ TIN CẬY (CONFIDENCE):</span>
                  <span className="text-sky-950 font-mono">
                    {camera.lastAiConfidence && camera.lastAiConfidence > 0 ? `${camera.lastAiConfidence}%` : "Không có"}
                  </span>
                </div>
                {camera.lastAiConfidence && camera.lastAiConfidence > 0 ? (
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${camera.aiStatus === "alert" ? "bg-rose-500" : "bg-sky-600"}`} 
                      style={{ width: `${camera.lastAiConfidence}%` }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Event logs "SỰ KIỆN LỊCH SỬ" list */}
        <div className="bg-[#FFF8F6] border border-[#F5E1D6] rounded-[28px] p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-[#1E293B] flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-600" />
              LỊCH SỬ ẢNH QUÉT AI GẦN ĐÂY
            </h4>
          </div>

          <div className="flex flex-col gap-3">
            {events.length === 0 ? (
              <p className="text-[11px] font-bold text-slate-400 text-center py-4">Chưa có lịch sử quét ảnh nào.</p>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => {
                    if (evt.imageUrl) {
                      setSelectedImageUrl(evt.imageUrl);
                      showToast("Đang xem ảnh chụp lịch sử");
                    }
                  }}
                  className={`flex items-center justify-between p-3.5 bg-white border rounded-2xl shadow-sm hover:shadow transition duration-150 cursor-pointer ${
                    selectedImageUrl === evt.imageUrl ? "border-amber-400 bg-amber-50/10" : "border-[#F5E1D6]/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 flex-shrink-0">
                      {evt.imageUrl ? (
                        <img src={evt.imageUrl} alt="History AI Preview" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sky-950">{evt.title}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{evt.time}</p>
                    </div>
                  </div>
                  
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg">
                    Xem ảnh
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
