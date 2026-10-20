import { apiClient } from "./client";

export interface ComplianceDocItem {
  expiry: string | null;
  status: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "MISSING";
  daysRemaining: number | null;
}

export interface VehicleComplianceItem {
  id: string;
  registrationNumber: string;
  vehicleName: string;
  vehicleType: string;
  fuelType: string;
  currentOdometer: number;
  operationalStatus: "AVAILABLE" | "ON_TRIP" | "MAINTENANCE" | "GROUNDED";
  assignedDriver?: { id: string; name: string; contact: string } | null;
  overallCompliance: "COMPLIANT" | "EXPIRING_SOON" | "NON_COMPLIANT";
  complianceDocs: {
    rc: ComplianceDocItem;
    insurance: ComplianceDocItem;
    permit: ComplianceDocItem;
    fitness: ComplianceDocItem;
    puc: ComplianceDocItem;
    tax: ComplianceDocItem;
  };
  lastServiceDate?: string | null;
  nextServiceDueKm?: number | null;
  nextServiceDueDate?: string | null;
}

export interface FleetComplianceOverview {
  summary: {
    totalVehicles: number;
    compliantCount: number;
    expiringSoonCount: number;
    expiredCount: number;
    inMaintenanceCount: number;
    onTripCount: number;
    availableCount: number;
    complianceRate: number;
  };
  matrix: VehicleComplianceItem[];
}

export interface DriverComplianceItem {
  id: string;
  name: string;
  contact: string;
  licenseNumber: string;
  badgeNumber?: string | null;
  isAvailable: boolean;
  assignedVehicles: Array<{ id: string; registrationNumber: string }>;
  policeVerificationStatus: "VERIFIED" | "PENDING" | "EXPIRED" | "NOT_DONE";
  policeVerificationDate?: string | null;
  emergencyContact?: string | null;
  bloodGroup?: string | null;
  compliance: {
    license: ComplianceDocItem;
    badge: ComplianceDocItem;
    medical: ComplianceDocItem;
  };
}

export interface DriverComplianceOverview {
  summary: {
    totalDrivers: number;
    verifiedPoliceCount: number;
    pendingPoliceCount: number;
    licenseExpiredCount: number;
    licenseExpiringSoonCount: number;
  };
  drivers: DriverComplianceItem[];
}

export interface MaintenanceLog {
  id: string;
  clientId: string;
  vehicleId: string;
  serviceType: string;
  serviceDate: string;
  odometerAtService?: number | null;
  garageWorkshopName?: string | null;
  garagePhone?: string | null;
  costInPaise: number;
  invoiceBillUrl?: string | null;
  notes?: string | null;
  nextServiceDueKm?: number | null;
  nextServiceDueDate?: string | null;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
}

export async function fetchFleetComplianceOverview(): Promise<FleetComplianceOverview> {
  const { data } = await apiClient.get<{ data: FleetComplianceOverview }>("/vehicles/compliance/overview");
  return data.data;
}

export async function downloadFleetComplianceCsv() {
  const response = await apiClient.get("/vehicles/compliance/export-csv", {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `fleet-compliance-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function fetchDriverComplianceOverview(): Promise<DriverComplianceOverview> {
  const { data } = await apiClient.get<{ data: DriverComplianceOverview }>("/drivers/compliance/overview");
  return data.data;
}

export async function fetchVehicleMaintenanceLogs(vehicleId: string): Promise<MaintenanceLog[]> {
  const { data } = await apiClient.get<{ data: MaintenanceLog[] }>(`/vehicles/${vehicleId}/maintenance`);
  return data.data ?? [];
}

export async function addVehicleMaintenanceLog(vehicleId: string, payload: Partial<MaintenanceLog>) {
  const { data } = await apiClient.post<{ data: MaintenanceLog }>(`/vehicles/${vehicleId}/maintenance`, payload);
  return data.data;
}

export async function deleteVehicleMaintenanceLog(vehicleId: string, maintenanceId: string) {
  const { data } = await apiClient.delete(`/vehicles/${vehicleId}/maintenance/${maintenanceId}`);
  return data;
}

export async function uploadVehicleDocument(
  vehicleId: string,
  payload: { type: string; fileUrl: string; fileKey?: string; expiryDate?: string; fileSize?: number }
) {
  const { data } = await apiClient.post(`/vehicles/${vehicleId}/documents`, payload);
  return data.data;
}

export async function deleteVehicleDocument(vehicleId: string, docId: string) {
  const { data } = await apiClient.delete(`/vehicles/${vehicleId}/documents/${docId}`);
  return data;
}
