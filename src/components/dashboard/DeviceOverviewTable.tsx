import { ArrowRight, Camera, CameraOff } from "lucide-react";
import type { DeviceItem } from "../../types/dashboard";
import Link from "next/link";

interface DeviceOverviewTableProps {
  devices: DeviceItem[];
}

export default function DeviceOverviewTable({ devices }: DeviceOverviewTableProps) {
  const filteredDevices = devices.filter((device) => {
    const id = device.id.trim().toLowerCase();
    return id !== "matg02" && id !== "mayap01" && id !== "mayap02";
  });

  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-4 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md min-w-0 overflow-hidden">
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Tổng quan thiết bị</h3>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6">
        <table className="w-full min-w-[1050px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-700">
              <th className="pb-4 pt-2 font-semibold">Mã máy</th>
              <th className="pb-4 pt-2 font-semibold">Tên máy</th>
              <th className="pb-4 pt-2 font-semibold">Chủ sở hữu</th>
              <th className="pb-4 pt-2 font-semibold text-center">Trạng thái</th>
              <th className="pb-4 pt-2 font-semibold text-center">Nhiệt độ</th>
              <th className="pb-4 pt-2 font-semibold text-center">Độ ẩm</th>
              <th className="pb-4 pt-2 font-semibold text-center">Ngày ấp</th>
              <th className="pb-4 pt-2 font-semibold text-center">Còn lại</th>
              <th className="pb-4 pt-2 font-semibold text-center">Trạng thái Camera</th>
              <th className="pb-4 pt-2 font-semibold text-center">Cập nhật cuối</th>
              <th className="pb-4 pt-2 font-semibold text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {filteredDevices.map((device, index) => {
              // Status Badge configuration
              let statusBadge = null;
              if (device.status === "online") {
                statusBadge = (
                  <span className="text-xs font-bold text-emerald-600">
                    Online
                  </span>
                );
              } else if (device.status === "warning") {
                statusBadge = (
                  <span className="text-xs font-bold text-amber-600">
                    Warning
                  </span>
                );
              } else {
                statusBadge = (
                  <span className="text-xs font-bold text-slate-500">
                    Offline
                  </span>
                );
              }

              return (
                <tr
                  key={device.id}
                  className={`group transition-colors duration-200 ${
                    index % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"
                  } hover:bg-slate-100/30`}
                >
                  {/* Device ID */}
                  <td className="py-4 align-middle text-sm font-semibold text-slate-900">
                    {device.id}
                  </td>
                  {/* Name */}
                  <td className="py-4 align-middle text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer">
                    {device.name}
                  </td>
                  {/* Owner */}
                  <td className="py-4 align-middle text-sm text-slate-700 font-medium">
                    {device.owner}
                  </td>
                  {/* Status */}
                  <td className="py-4 align-middle text-center">
                    {statusBadge}
                  </td>
                  {/* Temp */}
                  <td className="py-4 align-middle text-center text-sm font-semibold text-red-600">
                    {device.temperature > 0 ? `${device.temperature.toFixed(1)}°C` : "—"}
                  </td>
                  {/* Humidity */}
                  <td className="py-4 align-middle text-center text-sm font-semibold text-blue-600">
                    {device.humidity > 0 ? `${device.humidity}%` : "—"}
                  </td>
                  {/* Incubating Days */}
                  <td className="py-4 align-middle text-center text-sm text-slate-700">
                    {device.incubatingDay > 0 ? (
                      <span>
                        {device.incubatingDay}
                        <span className="text-slate-400">/{device.totalIncubationDays}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  {/* Remaining Days */}
                  <td className="py-4 align-middle text-center text-sm text-slate-700">
                    {device.incubatingDay > 0 ? (
                      <span className="font-medium text-sky-600">
                        {device.remainingDays} ngày
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  {/* Camera */}
                  <td className="py-4 align-middle text-center">
                    {device.hasCamera ? (
                      <span className="text-xs font-bold text-sky-700">
                        Online
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        Offline
                      </span>
                    )}
                  </td>
                  {/* Last Seen */}
                  <td className="py-4 align-middle text-center text-xs text-slate-500">
                    {device.lastSeen}
                  </td>
                  {/* Action */}
                  <td className="py-4 align-middle text-center">
                    <Link href={`/settings?id=${device.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-3.5 py-1.5 text-xs font-semibold text-amber-800 transition active:scale-95 cursor-pointer">
                      Xem chi tiết
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
