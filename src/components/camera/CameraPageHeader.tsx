import React from "react";

interface CameraPageHeaderProps {
  totalCameras: number;
}

export default function CameraPageHeader({ totalCameras }: CameraPageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div>
          <h5 className="text-1xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">CAMERA GIÁM SÁT VÀ NHẬN DIỆN</h5>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi camera thiết bị, ảnh chụp và kết quả phân tích AI trong hệ thống HatchMate
          </p>
        </div>
      </div>
    </div>
  );
}
