import { apiClient } from "./client";
import { DutySlip, DutySlipExpense } from "../types/dutySlip";

// Authenticated Dispatcher endpoints
export async function fetchTripDutySlip(tripId: string) {
  const { data } = await apiClient.get<{ data: DutySlip }>(`/trips/${tripId}/duty-slip`);
  return data.data;
}

export async function generateTripDutySlip(tripId: string) {
  const { data } = await apiClient.post<{ data: DutySlip }>(`/trips/${tripId}/duty-slip`);
  return data.data;
}

export async function dispatchDutySlip(tripId: string) {
  const { data } = await apiClient.post<{ data: DutySlip }>(`/trips/${tripId}/duty-slip/dispatch`);
  return data.data;
}

export async function updateTripDutySlip(tripId: string, payload: Partial<DutySlip>) {
  const { data } = await apiClient.patch<{ data: DutySlip }>(`/trips/${tripId}/duty-slip`, payload);
  return data.data;
}

// Public Driver Mobile endpoints (secured by shareToken)
export async function fetchPublicDutySlip(shareToken: string) {
  const { data } = await apiClient.get<{ data: DutySlip }>(`/public/duty-slip/${shareToken}`);
  return data.data;
}

export async function startDutyTrip(
  shareToken: string,
  payload: { startOdometer: number; startOdoPhotoUrl?: string }
) {
  const { data } = await apiClient.post<{ data: DutySlip }>(
    `/public/duty-slip/${shareToken}/start`,
    payload
  );
  return data.data;
}

export async function addDutyExpense(
  shareToken: string,
  payload: {
    expenseType: string;
    amountInPaise: number;
    notes?: string;
    receiptUrl?: string;
  }
) {
  const { data } = await apiClient.post<{ data: { expense: DutySlipExpense; dutySlip: DutySlip } }>(
    `/public/duty-slip/${shareToken}/expense`,
    payload
  );
  return data.data;
}

export async function completeDutyTrip(
  shareToken: string,
  payload: {
    endOdometer: number;
    endOdoPhotoUrl?: string;
    customerSignature?: string;
    customerRating?: number;
    customerFeedback?: string;
  }
) {
  const { data } = await apiClient.post<{ data: DutySlip }>(
    `/public/duty-slip/${shareToken}/complete`,
    payload
  );
  return data.data;
}

export async function uploadDutyAttachment(shareToken: string, dataUrl: string, fileName?: string) {
  const { data } = await apiClient.post<{ data: { url: string } }>(
    `/public/duty-slip/${shareToken}/upload`,
    { dataUrl, fileName }
  );
  return data.data.url;
}

export async function confirmDriverArrival(shareToken: string) {
  const { data } = await apiClient.post<{ data: DutySlip }>(
    `/public/duty-slip/${shareToken}/arrive`
  );
  return data.data;
}

export async function syncDutySlipBilling(tripId: string) {
  const { data } = await apiClient.post<{
    data: {
      dutySlip: DutySlip;
      totalRecoverableInRupees: number;
      totalKm: number;
      totalHours: number;
    };
  }>(`/trips/${tripId}/duty-slip/sync-billing`);
  return data.data;
}

