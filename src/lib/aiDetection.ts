export interface AiAnalysisResult {
  success: boolean;
  detectedCount: number;
  confidence: number | null;
  processedImageUrl: string | null;
  message: string;
}

/**
 * Client-side utility for HatchMateWeb that sends image blobs to YOLOv8 AI server (port 8000 or Next.js proxy)
 * Mirrors the exact AI Detection workflow from the Flutter mobile app.
 */
export async function analyzeImageWithAi(
  imageUrl: string,
  deviceId: string = "MATG01"
): Promise<AiAnalysisResult> {
  try {
    let blob: Blob | null = null;

    if (!imageUrl || imageUrl.trim() === "") {
      return {
        success: false,
        detectedCount: 0,
        confidence: null,
        processedImageUrl: null,
        message: "Không tìm thấy URL hình ảnh để phân tích.",
      };
    }

    const cleanUrl = imageUrl.trim();

    if (cleanUrl.startsWith("data:image")) {
      const parts = cleanUrl.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mime });
    } else {
      const imgRes = await fetch(cleanUrl);
      if (imgRes.ok) {
        blob = await imgRes.blob();
      }
    }

    if (!blob) {
      return {
        success: false,
        detectedCount: 0,
        confidence: null,
        processedImageUrl: null,
        message: "Không thể đọc dữ liệu ảnh từ đường dẫn.",
      };
    }

    // Endpoints array matching Flutter App priority
    const endpoints = [
      "http://172.16.5.244:8000/predict",
      "http://127.0.0.1:8000/predict",
      "http://localhost:8000/predict",
      "/api/camera/detect",
    ];

    for (const url of endpoints) {
      try {
        const formData = new FormData();
        formData.append("file", blob, "captured_egg.jpg");
        formData.append("deviceId", deviceId);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(url, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          const count = Number(data.detectedCount ?? data.eggCount ?? 0);
          const rawConf = data.confidence !== undefined && data.confidence !== null ? Number(data.confidence) : null;
          const conf = rawConf !== null ? Math.round(rawConf <= 1 ? rawConf * 100 : rawConf) : null;
          
          let processedBase64: string | null = null;
          if (data.processedImageBase64) {
            processedBase64 = `data:image/jpeg;base64,${data.processedImageBase64}`;
          } else if (data.aiImageUrl) {
            processedBase64 = data.aiImageUrl;
          }

          return {
            success: true,
            detectedCount: count,
            confidence: conf,
            processedImageUrl: processedBase64,
            message: data.message || "Phân tích thành công",
          };
        }
      } catch (err) {
        console.warn(`AI Detection endpoint ${url} unreachable:`, err);
      }
    }

    return {
      success: false,
      detectedCount: 0,
      confidence: null,
      processedImageUrl: null,
      message: "Không thể kết nối máy chủ AI YOLOv8 (port 8000). Vui lòng kiểm tra server FastAPI đang chạy.",
    };
  } catch (err: any) {
    return {
      success: false,
      detectedCount: 0,
      confidence: null,
      processedImageUrl: null,
      message: err.message || "Lỗi xử lý hình ảnh AI",
    };
  }
}
