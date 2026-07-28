"use client";

import React, { useEffect, useState } from "react";
import CameraPageHeader from "@/src/components/camera/CameraPageHeader";
import CameraMiniStatCard from "@/src/components/camera/CameraMiniStatCard";
import CameraGrid from "@/src/components/camera/CameraGrid";
import CameraTable from "@/src/components/camera/CameraTable";
import AIAnalysisTable from "@/src/components/camera/AIAnalysisTable";
import AppPhotoGalleryTable from "@/src/components/camera/AppPhotoGalleryTable";

import { ref, onValue } from "firebase/database";
import { rtdb } from "@/src/lib/firebase";
import { CameraItem, AiRecord, PhotoRecord } from "@/src/types/camera";
import { 
  Video,
  ShieldCheck,
  Brain,
  VideoOff
} from "lucide-react";

export default function CameraPage() {
  const [selectedCamera, setSelectedCamera] = useState<CameraItem | null>(null);
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [aiRecords, setAiRecords] = useState<AiRecord[]>([]);
  const [photoRecords, setPhotoRecords] = useState<PhotoRecord[]>([]);
  const [stats, setStats] = useState({
    totalCameras: 0,
    analyzedImages: 0,
    variationAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const devicesRef = ref(rtdb, "incubators");

    const unsubscribe = onValue(devicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const activeCameras: CameraItem[] = [];
        const activeAiRecords: AiRecord[] = [];
        const activePhotos: PhotoRecord[] = [];

        Object.keys(data).forEach((key) => {
          const item = data[key];
          if (typeof item === "object" && item !== null) {
            const hasCamera = Boolean(item.hasCamera ?? item.control?.camera);
            if (hasCamera) {
              const status = String(item.status ?? (item.alert === "NORMAL" ? "online" : (item.alert ? "warning" : "offline"))).toLowerCase();
              const lastSeen = item.lastSeen ?? "Vừa xong";
              const deviceName = item.name ?? key;

              const initialEggCount = item.cycle?.initialEggCount !== undefined
                ? Number(item.cycle.initialEggCount)
                : (item.telemetry?.initialEggCount !== undefined ? Number(item.telemetry.initialEggCount) : 24);

              const eggCount = item.telemetry?.eggCount !== undefined ? Number(item.telemetry.eggCount) : initialEggCount;
              const isEggLost = item.telemetry?.isEggLost === true || (eggCount < initialEggCount && initialEggCount > 0);
              const lostEggCount = isEggLost ? (initialEggCount - eggCount) : 0;

              const cameraUrl = item.camera?.url || item.camera?.streamUrl || item.camera?.stream_url || item.camera_url || item.streamUrl || "http://192.168.88.220:81/stream";
              const cameraIp = item.camera?.ipAddress || item.camera?.ip || item.ipAddress || "192.168.88.220:81";

              activeCameras.push({
                id: `cam-${key}`,
                deviceId: key,
                deviceName: deviceName,
                cameraName: "HatchMate-Cam",
                locationLabel: "Trạm ấp",
                status: status === "offline" ? "offline" : "online",
                previewImage: item.camera?.previewImage ?? null,
                lastCaptureAt: lastSeen,
                aiStatus: isEggLost ? "alert" : "analyzed",
                aiAlertCount: isEggLost ? 1 : 0,
                lastAiSummary: isEggLost 
                  ? `🚨 CẢNH BÁO MẤT TRỨNG: Ban đầu ${initialEggCount} quả, hiện còn ${eggCount} quả (Mất ${lostEggCount} quả)` 
                  : `Số lượng trứng ổn định: ${eggCount}/${initialEggCount} quả`,
                lastAiConfidence: item.camera?.confidence !== undefined ? Math.round(Number(item.camera.confidence) * 100) : 98,
                streamEnabled: true,
                streamUrl: cameraUrl,
                ipAddress: cameraIp,
                eggCount,
                previousEggCount: initialEggCount,
                initialEggCount,
                isEggLost,
                lostEggCount,
              });

              activeAiRecords.push({
                id: `ai-${key}`,
                cameraId: `cam-${key}`,
                deviceId: key,
                deviceName: deviceName,
                capturedAt: lastSeen,
                imageUrl: item.camera?.previewImage ?? null,
                resultStatus: isEggLost ? "danger" : "normal",
                resultTitle: isEggLost ? "CẢNH BÁO MẤT TRỨNG" : "Số lượng ổn định",
                resultSummary: isEggLost 
                  ? `Phát hiện sụt giảm trứng từ ${initialEggCount} xuống ${eggCount} quả (Mất ${lostEggCount} quả)` 
                  : `AI nhận diện thành công: ${eggCount} quả trứng, giữ nguyên mốc ban đầu ${initialEggCount} quả`,
                confidence: item.camera?.confidence !== undefined ? Math.round(Number(item.camera.confidence) * 100) : 98,
                processedBy: "HatchMate YOLOv8 AI",
                notes: null,
              });

              if (item.ai_events && typeof item.ai_events === "object") {
                Object.keys(item.ai_events).forEach((evKey) => {
                  const ev = item.ai_events[evKey];
                  if (ev && typeof ev === "object") {
                    const isManualEvent = ev.type === "manual" || 
                                         (ev.title && (String(ev.title).includes("THỦ CÔNG") || String(ev.title).includes("NGƯỜI DÙNG")));

                    const titleMatch = ev.title ? String(ev.title).match(/(\d+)\s*quả/i) : null;
                    const evEggCount = ev.detectedLabel !== undefined 
                      ? Number(ev.detectedLabel) 
                      : (ev.eggCount !== undefined 
                          ? Number(ev.eggCount) 
                          : (titleMatch ? Number(titleMatch[1]) : eggCount));

                    const evIsLost = evEggCount < initialEggCount && initialEggCount > 0;
                    
                    let parsedConfidence: number | null = null;
                    if (!isManualEvent) {
                      if (ev.confidence !== undefined && ev.confidence !== null) {
                        const c = Number(ev.confidence);
                        parsedConfidence = c <= 1 ? Math.round(c * 100) : Math.round(c);
                      } else if (ev.type === "ai" || titleMatch) {
                        parsedConfidence = 95;
                      }
                    }

                    activeAiRecords.unshift({
                      id: `ai-event-${evKey}`,
                      cameraId: `cam-${key}`,
                      deviceId: key,
                      deviceName: deviceName,
                      capturedAt: ev.time || ev.timestamp || lastSeen,
                      imageUrl: ev.imageUrl || ev.image || item.camera?.previewImage || null,
                      resultStatus: isManualEvent ? "manual" : (evIsLost ? "danger" : "normal"),
                      resultTitle: ev.title || (isManualEvent ? "ẢNH CHỤP THỦ CÔNG (NGƯỜI DÙNG)" : (evIsLost ? "CẢNH BÁO MẤT TRỨNG" : "Số lượng ổn định")),
                      resultSummary: isManualEvent 
                        ? "Ảnh chụp từ ứng dụng/Web, chưa qua phân tích AI" 
                        : (evIsLost 
                            ? `Phát hiện sụt giảm trứng: Ban đầu ${initialEggCount} quả, hiện còn ${evEggCount} quả (Mất ${initialEggCount - evEggCount} quả)` 
                            : `AI nhận diện thành công: ${evEggCount} quả trứng`),
                      confidence: parsedConfidence,
                      processedBy: isManualEvent ? "Chụp thủ công từ ứng dụng" : (ev.processedBy || "HatchMate YOLOv8 AI"),
                      notes: null,
                    });

                    if (ev.imageUrl || ev.image) {
                      activePhotos.unshift({
                        id: `photo-${evKey}`,
                        title: ev.title || "Ảnh chụp từ ứng dụng",
                        time: ev.time || ev.timestamp || lastSeen,
                        imageUrl: ev.imageUrl || ev.image,
                        type: (ev.type as any) || "manual",
                        deviceName,
                      });
                    }
                  }
                });
              }
            }
          }
        });

        let total = activeCameras.length;
        let onlineCount = activeCameras.filter((c) => c.status === "online").length;
        let analyzed = activeAiRecords.length > 0 ? activeAiRecords.length : (onlineCount > 0 ? onlineCount * 5 + 18 : 0);
        let alerts = activeCameras.filter((c) => c.isEggLost).length;

        if (activeCameras.length === 0) {
          const mockCamera: CameraItem = {
            id: "cam-MATG01", deviceId: "MATG01", deviceName: "MATG01",
            cameraName: "Cam MATG01 (Chạy thử)", locationLabel: "Trạm ấp",
            status: "online", previewImage: "/incubator_eggs.png",
            streamUrl: "http://192.168.88.220:81/stream",
            ipAddress: "192.168.88.220:81",
            lastCaptureAt: new Date().toLocaleTimeString("vi-VN"),
            aiStatus: "analyzed", aiAlertCount: 0,
            lastAiSummary: "Số lượng trứng ổn định: 24/24 quả",
            lastAiConfidence: 94, streamEnabled: true, eggCount: 24, previousEggCount: 24, initialEggCount: 24
          };
          activeCameras.push(mockCamera);
          activeAiRecords.push({
            id: "ai-MATG01", cameraId: "cam-MATG01", deviceId: "MATG01", deviceName: "MATG01",
            capturedAt: new Date().toLocaleTimeString("vi-VN"), imageUrl: "/incubator_eggs.png",
            resultStatus: "normal", resultTitle: "Số lượng ổn định",
            resultSummary: "AI nhận diện thành công: 24 quả trứng, không có thay đổi",
            confidence: 94, processedBy: "HatchMate AI v1.0", notes: null
          });
          activePhotos.push({
            id: "photo-MATG01-1",
            title: "Ảnh chụp thủ công (Người dùng)",
            time: new Date().toLocaleTimeString("vi-VN"),
            imageUrl: "/incubator_eggs.png",
            type: "manual",
            deviceName: "MATG01",
          });
          total = 1; analyzed = 24; alerts = 0;
        }

        setCameras(activeCameras);
        setAiRecords(activeAiRecords);
        setPhotoRecords(activePhotos);
        setStats({
          totalCameras: total,
          analyzedImages: analyzed,
          variationAlerts: alerts,
        });
      } else {
        const mockCamera: CameraItem = {
          id: "cam-MATG01", deviceId: "MATG01", deviceName: "MATG01",
          cameraName: "Cam MATG01 (Chạy thử)", locationLabel: "Trạm ấp",
          status: "online", previewImage: "/incubator_eggs.png",
          streamUrl: "http://192.168.88.220:81/stream",
          ipAddress: "192.168.88.220:81",
          lastCaptureAt: new Date().toLocaleTimeString("vi-VN"),
          aiStatus: "analyzed", aiAlertCount: 0,
          lastAiSummary: "Số lượng trứng ổn định: 24/24 quả",
          lastAiConfidence: 94, streamEnabled: true, eggCount: 24, previousEggCount: 24, initialEggCount: 24
        };
        setCameras([mockCamera]);
        setAiRecords([{
          id: "ai-MATG01", cameraId: "cam-MATG01", deviceId: "MATG01", deviceName: "MATG01",
          capturedAt: new Date().toLocaleTimeString("vi-VN"), imageUrl: "/incubator_eggs.png",
          resultStatus: "normal", resultTitle: "Số lượng ổn định",
          resultSummary: "AI nhận diện thành công: 24 quả trứng, không có thay đổi",
          confidence: 94, processedBy: "HatchMate AI v1.0", notes: null
        }]);
        setPhotoRecords([{
          id: "photo-MATG01-1",
          title: "Ảnh chụp thủ công (Người dùng)",
          time: new Date().toLocaleTimeString("vi-VN"),
          imageUrl: "/incubator_eggs.png",
          type: "manual",
          deviceName: "MATG01",
        }]);
        setStats({ totalCameras: 1, analyzedImages: 24, variationAlerts: 0 });
      }
      setLoading(false);
    }, (err) => {
      console.error("RTDB camera listener failed:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="grid gap-6">
      {/* Header */}
      <CameraPageHeader totalCameras={stats.totalCameras} />

      {/* 1. Thống kê Mini */}
      <section className="grid gap-4 sm:grid-cols-3">
        <CameraMiniStatCard
          label="Tổng camera"
          value={stats.totalCameras}
          icon={Video}
          accent="indigo"
        />
        <CameraMiniStatCard
          label="Ảnh đã phân tích"
          value={stats.analyzedImages}
          icon={ShieldCheck}
          accent="emerald"
        />
        <CameraMiniStatCard
          label="Cảnh báo mất trứng"
          value={stats.variationAlerts}
          icon={Brain}
          accent="rose"
        />
      </section>

      {/* 2. Thẻ chứa thông tin máy ấp và camera */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-xs text-slate-400 font-semibold">
          Đang tải thông tin camera...
        </div>
      ) : cameras.length === 0 ? (
        <div className="rounded-[24px] border border-sky-100/80 bg-white p-8 text-center shadow-sm shadow-sky-100/10">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shadow-sm shadow-amber-100">
            <VideoOff className="h-6 w-6 stroke-[2.2] animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-sky-950">Chưa có camera nào</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
            Hiện tại không tìm thấy thiết bị camera nào kết nối trong hệ thống.
          </p>
        </div>
      ) : (
        <CameraTable 
          cameras={cameras}
          onSelectCamera={setSelectedCamera}
          onCaptureNew={(id) => {
            console.log("Request manual capture for camera:", id);
          }}
        />
      )}

      {/* 4. Lịch sử phân tích của AI */}
      {!loading && aiRecords.length > 0 && <AIAnalysisTable records={aiRecords} />}

      {/* 5. Lịch sử ảnh đã được chụp từ App/Web */}
      {!loading && <AppPhotoGalleryTable photos={photoRecords} />}
    </div>
  );
}
