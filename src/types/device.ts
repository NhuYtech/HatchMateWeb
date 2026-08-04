export type DeviceStatus = "online" | "offline" | "warning";
export type IncubationStatus = "incubating" | "hatchingSoon" | "paused";

export interface DeviceItem {
  id: string;
  name: string;
  owner: string;
  status: DeviceStatus;
  incubationStatus: IncubationStatus;
  temperature: number;
  humidity: number;
  incubatingDay: number;
  totalIncubationDays: number;
  remainingDays: number;
  battery: number;
  wifi: number; // 1-5 signal strength
  lastSeen: string;
}

export interface DevicesSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  warningDevices: number;
}
