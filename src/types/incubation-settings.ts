export interface IncubationSettingsSummary {
  activeProfile: string;
  appliedDevices: number;
  turnInterval: string;
  mainAlert: string;
}

export interface IncubationProfile {
  id: string;
  name: string;
  totalDays: number;
  stagesCount: number;
  description: string;
}

export interface EnvironmentSettings {
  targetTemperature: number;
  targetHumidity: number;
  tempTolerance: number;
  sensorIntervalSec: number;
  syncIntervalSec: number;
}

export type TurningMode = "auto" | "manual" | "disabled";

export interface IncubationPhase {
  id: string;
  phaseName: string;
  startDay: number;
  endDay: number;
  targetTemperature: number;
  targetHumidity: number;
  turnIntervalMin: number;
  turnDurationSec: number;
  turningMode: TurningMode;
  notes?: string;
}

export interface TurningSettings {
  autoTurningEnabled: boolean;
  turnIntervalMin: number;
  turnDurationSec: number;
  maxTurnsPerDay: number;
  stopTurningLastDays: boolean;
}

export interface AlertSettings {
  // A. Temperature alerts
  highTempAlertEnabled: boolean;
  highTempThreshold: number;
  lowTempAlertEnabled: boolean;
  lowTempThreshold: number;

  // B. Humidity alerts
  lowHumidityAlertEnabled: boolean;
  lowHumidityThreshold: number;
  highHumidityAlertEnabled: boolean;
  highHumidityThreshold: number;

  // C. Connectivity / system alerts
  deviceOfflineAlert: boolean;
  sensorNoResponseAlert: boolean;

  // D. Notification channels
  pushNotificationEnabled: boolean;
  adminNotificationEnabled: boolean;
  realtimeAlertEnabled: boolean;
}

