export type DeviceStatus = "online" | "offline" | "warning";
export type AlertLevel = "danger" | "warning" | "info";

export interface KpiSummary {
  totalDevices: number;
  onlineDevices: number;
  incubatingDevices: number;
  warningDevices: number;
  avgTemperature: number;
  avgHumidity: number;
  openAlerts: number;
}

export interface DeviceItem {
  id: string;
  name: string;
  owner: string;
  status: DeviceStatus;
  temperature: number;
  humidity: number;
  incubatingDay: number;
  totalIncubationDays: number;
  remainingDays: number;
  lastSeen: string;
  eggCount?: number;
}

export interface AlertItem {
  id: string;
  deviceId: string;
  deviceName: string;
  title: string;
  message: string;
  level: AlertLevel;
  timestamp: string;
}

export interface ChartPoint {
  time: string;
  temperature: number;
  humidity: number;
}
