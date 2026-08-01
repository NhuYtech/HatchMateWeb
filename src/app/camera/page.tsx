"use client";

import React, { useEffect, useState } from "react";
import CameraPageHeader from "@/src/components/camera/CameraPageHeader";
import CameraMiniStatCard from "@/src/components/camera/CameraMiniStatCard";
import CameraGrid from "@/src/components/camera/CameraGrid";
import CameraTable from "@/src/components/camera/CameraTable";
import AIAnalysisTable from "@/src/components/camera/AIAnalysisTable";
import AppPhotoGalleryTable from "@/src/components/camera/AppPhotoGalleryTable";

import { ref, onValue, remove, get, update } from "firebase/database";
import { doc, deleteDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { rtdb, db } from "@/src/lib/firebase";
import { CameraItem, AiRecord, PhotoRecord } from "@/src/types/camera";
import { 
  Video,
  ShieldCheck,
  Brain,
  VideoOff,
  Camera as CameraIcon
} from "lucide-react";

export default function CameraPage() {
  const [selectedCamera, setSelectedCamera] = useState<CameraItem | null>(null);
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [aiRecords, setAiRecords] = useState<AiRecord[]>([]);
  const [photoRecords, setPhotoRecords] = useState<PhotoRecord[]>([]);
  const [stats, setStats] = useState({
    totalCameras: 0,
    totalCapturedImages: 0,
    analyzedImages: 0,
    variationAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  const handleDeletePhoto = async (photo: PhotoRecord) => {
    try {
      const deviceId = photo.deviceId || (photo.id ? photo.id.replace(/^(ai-event-|photo-)/, "") : "");
      const evKey = photo.id.replace(/^(ai-event-|photo-)/, "");

      // 1. RTDB ai_events
      if (deviceId) {
        try {
          const evRef = ref(rtdb, `incubators/${deviceId}/ai_events/${evKey}`);
          await remove(evRef);
        } catch (e) {
          console.warn("Lỗi khi xóa ai_event trên RTDB:", e);
        }

        // 2. RTDB camera node
        try {
          const camRef = ref(rtdb, `incubators/${deviceId}/camera`);
          const camSnap = await get(camRef);
          if (camSnap.exists()) {
            const camData = camSnap.val();
            const imgUrl = photo.imageUrl;
            if (
              !imgUrl ||
              camData.previewImage === imgUrl ||
              camData.url === imgUrl ||
              camData.latestImageUrl === imgUrl ||
              camData.aiImageUrl === imgUrl
            ) {
              await update(camRef, {
                previewImage: null,
                url: null,
                latestImageUrl: null,
                aiImageUrl: null,
                confidence: null,
              });
            }
          }
        } catch (e) {}

        // 3. Firestore camera_frames
        try { await deleteDoc(doc(db, "incubators", deviceId, "camera_frames", photo.id)); } catch (e) {}
        try { await deleteDoc(doc(db, "incubators", deviceId, "camera_frames", evKey)); } catch (e) {}
        try { await deleteDoc(doc(db, "incubators", deviceId, "camera_frames", "latest_frame")); } catch (e) {}
      }

      // 4. Firestore camera/current
      try {
        const cameraCurrentRef = doc(db, "camera", "current");
        const docSnap = await getDoc(cameraCurrentRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const imgUrl = photo.imageUrl;
          if (!imgUrl || data.latestImageUrl === imgUrl || data.aiImageUrl === imgUrl) {
            await updateDoc(cameraCurrentRef, {
              latestImageUrl: null,
              aiImageUrl: null,
              detectedLabel: null,
              confidence: null,
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (e) {}

      setPhotoRecords(prev => prev.filter(p => p.id !== photo.id));
    } catch (err) {
      console.error("Lỗi khi xóa ảnh:", err);
    }
  };

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

              const rawCamUrl = item.telemetry?.ip || item.telemetry?.camera_ip || item.camera?.ip || item.ip || item.camera_ip || item.camera?.url || item.camera?.streamUrl || item.camera?.stream_url || item.device_info?.ip || item.status?.ip || item.camera_url || item.streamUrl || "";
              const formatCamUrl = (raw: string) => {
                if (!raw || !raw.trim() || raw.includes("192.168.88.220")) return "http://172.16.6.48:81/stream";
                let u = raw.trim();
                if (!u.startsWith("http://") && !u.startsWith("https://")) {
                  u = `http://${u}`;
                }
                try {
                  const parsed = new URL(u);
                  const host = parsed.hostname;
                  const port = parsed.port || "81";
                  let path = parsed.pathname;
                  if (!path || path === "/") path = "/stream";
                  return `http://${host}:${port}${path}`;
                } catch (e) {
                  return u;
                }
              };

              const cameraUrl = formatCamUrl(rawCamUrl);
              const cameraIp = item.camera?.ipAddress || item.camera?.ip || item.telemetry?.ip || item.ip || "192.168.88.220:81";

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

              if (item.ai_events && typeof item.ai_events === "object") {
                Object.keys(item.ai_events).forEach((evKey) => {
                  const ev = item.ai_events[evKey];
                  if (ev && typeof ev === "object") {
                    const isManualEvent = ev.type === "manual" || 
                                         (ev.title && (String(ev.title).includes("THỦ CÔNG") || String(ev.title).includes("NGƯỜI DÙNG")));

                    const evImgUrl = ev.imageUrl || ev.image || item.camera?.previewImage || "";
                    const isNoEggImage = evImgUrl.includes("no_egg");

                    const titleMatch = ev.title ? String(ev.title).match(/(\d+)\s*quả/i) : null;
                    
                    let evEggCount: number = 0;
                    if (isNoEggImage) {
                      evEggCount = 0;
                    } else if (ev.detectedLabel !== undefined && ev.detectedLabel !== null) {
                      evEggCount = Number(ev.detectedLabel);
                    } else if (ev.eggCount !== undefined && ev.eggCount !== null) {
                      evEggCount = Number(ev.eggCount);
                    } else if (titleMatch) {
                      evEggCount = Number(titleMatch[1]);
                    } else {
                      evEggCount = 0;
                    }

                    const evIsLost = evEggCount < initialEggCount && initialEggCount > 0 && !isNoEggImage;
                    
                    let parsedConfidence: number | null = null;
                    if (!isManualEvent && !isNoEggImage) {
                      if (ev.confidence !== undefined && ev.confidence !== null && Number(ev.confidence) > 0) {
                        const c = Number(ev.confidence);
                        parsedConfidence = c <= 1 ? Math.round(c * 100) : Math.round(c);
                      } else if (ev.type === "ai" || titleMatch) {
                        if (item.camera?.confidence !== undefined && item.camera?.confidence !== null && Number(item.camera.confidence) > 0) {
                          const camConf = Number(item.camera.confidence);
                          parsedConfidence = camConf <= 1 ? Math.round(camConf * 100) : Math.round(camConf);
                        }
                      }
                    }

                    let summaryText = "";
                    if (isManualEvent) {
                      summaryText = "Ảnh chụp từ ứng dụng/Web, chưa qua phân tích AI";
                    } else if (isNoEggImage || evEggCount === 0) {
                      summaryText = "AI nhận diện: 0 quả trứng (Không tìm thấy trứng trong buồng ấp)";
                    } else if (evIsLost) {
                      summaryText = `Phát hiện sụt giảm trứng: Ban đầu ${initialEggCount} quả, hiện còn ${evEggCount} quả (Mất ${initialEggCount - evEggCount} quả)`;
                    } else {
                      summaryText = "AI nhận diện thành công";
                    }

                    activeAiRecords.unshift({
                      id: `ai-event-${evKey}`,
                      cameraId: `cam-${key}`,
                      deviceId: key,
                      deviceName: deviceName,
                      capturedAt: ev.time || ev.timestamp || lastSeen,
                      imageUrl: evImgUrl || null,
                      resultStatus: isManualEvent ? "manual" : (isNoEggImage || evEggCount === 0 ? "warning" : (evIsLost ? "danger" : "normal")),
                      resultTitle: ev.title || (isManualEvent ? "ẢNH CHỤP THỦ CÔNG (NGƯỜI DÙNG)" : (isNoEggImage || evEggCount === 0 ? "KHÔNG TÌM THẤY TRỨNG" : (evIsLost ? "CẢNH BÁO MẤT TRỨNG" : (evEggCount > 0 ? `${evEggCount} quả trứng` : "Số lượng ổn định")))),
                      resultSummary: summaryText,
                      confidence: parsedConfidence,
                      processedBy: isManualEvent ? "Chụp thủ công từ ứng dụng" : (ev.processedBy || "HatchMate YOLOv8 AI"),
                      notes: null,
                    });

                    if (ev.imageUrl || ev.image) {
                      activePhotos.unshift({
                        id: `photo-${evKey}`,
                        deviceId: key,
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
        let analyzed = activeAiRecords.length;
        let alerts = activeCameras.filter((c) => c.isEggLost).length;

        setCameras(activeCameras);
        setAiRecords(activeAiRecords);
        setPhotoRecords(activePhotos);
        setStats({
          totalCameras: total,
          totalCapturedImages: activePhotos.length,
          analyzedImages: analyzed,
          variationAlerts: alerts,
        });
      } else {
        setCameras([]);
        setAiRecords([]);
        setPhotoRecords([]);
        setStats({
          totalCameras: 0,
          totalCapturedImages: 0,
          analyzedImages: 0,
          variationAlerts: 0,
        });
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

      {/* 1. Thống kê Mini (4 thẻ: Tổng camera, Số ảnh đã chụp, Ảnh đã phân tích, Cảnh báo mất trứng) */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CameraMiniStatCard
          label="Tổng camera"
          value={stats.totalCameras}
          icon={Video}
          accent="indigo"
        />
        <CameraMiniStatCard
          label="Số ảnh đã chụp"
          value={stats.totalCapturedImages}
          icon={CameraIcon}
          accent="sky"
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

      {/* 3. Lịch sử ảnh chụp từ App & Web */}
      {!loading && photoRecords.length > 0 && (
        <AppPhotoGalleryTable 
          photos={photoRecords}
          onDeletePhoto={handleDeletePhoto}
        />
      )}

      {/* 4. Lịch sử phân tích của AI */}
      {!loading && aiRecords.length > 0 && (
        <AIAnalysisTable 
          records={aiRecords}
          onDeleteRecord={(deletedId) => {
            const record = aiRecords.find(r => r.id === deletedId);
            if (record) {
              handleDeletePhoto({
                id: record.id,
                deviceId: record.deviceId,
                title: record.resultTitle,
                time: record.capturedAt,
                imageUrl: record.imageUrl || "",
                type: "ai",
                deviceName: record.deviceName,
              });
            } else {
              setAiRecords(prev => prev.filter(r => r.id !== deletedId));
            }
          }}
        />
      )}
    </div>
  );
}
