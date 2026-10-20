import { apiClient } from "./client";
import {
  BookingTraveler,
  BookingDocument,
  BookingVaultData,
  PublicVaultData,
} from "../types/documentVault";

// Authenticated Agency Endpoints
export async function fetchBookingVault(bookingId: string) {
  const { data } = await apiClient.get<{ data: BookingVaultData }>(
    `/bookings/${bookingId}/vault`
  );
  return data.data;
}

export async function addBookingTraveler(
  bookingId: string,
  payload: Partial<BookingTraveler>
) {
  const { data } = await apiClient.post<{ data: BookingTraveler }>(
    `/bookings/${bookingId}/travelers`,
    payload
  );
  return data.data;
}

export async function updateBookingTraveler(
  bookingId: string,
  travelerId: string,
  payload: Partial<BookingTraveler>
) {
  const { data } = await apiClient.patch<{ data: BookingTraveler }>(
    `/bookings/${bookingId}/travelers/${travelerId}`,
    payload
  );
  return data.data;
}

export async function deleteBookingTraveler(bookingId: string, travelerId: string) {
  const { data } = await apiClient.delete(`/bookings/${bookingId}/travelers/${travelerId}`);
  return data;
}

export async function uploadBookingDocument(
  bookingId: string,
  payload: {
    title: string;
    category: string;
    travelerId?: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: number;
    notes?: string;
  }
) {
  const { data } = await apiClient.post<{ data: BookingDocument }>(
    `/bookings/${bookingId}/documents`,
    payload
  );
  return data.data;
}

export async function verifyBookingDocument(
  bookingId: string,
  docId: string,
  verificationStatus: "VERIFIED" | "REJECTED" | "PENDING",
  rejectionReason?: string
) {
  const { data } = await apiClient.patch<{ data: BookingDocument }>(
    `/bookings/${bookingId}/documents/${docId}/verify`,
    { verificationStatus, rejectionReason }
  );
  return data.data;
}

export async function deleteBookingDocument(bookingId: string, docId: string) {
  const { data } = await apiClient.delete(`/bookings/${bookingId}/documents/${docId}`);
  return data;
}

export async function regenerateVaultToken(bookingId: string) {
  const { data } = await apiClient.post<{ data: { docShareToken: string } }>(
    `/bookings/${bookingId}/vault/token`
  );
  return data.data;
}

// Public Guest Portal Endpoints
export async function fetchPublicVault(shareToken: string) {
  const { data } = await apiClient.get<{ data: PublicVaultData }>(
    `/public/vault/${shareToken}`
  );
  return data.data;
}

export async function guestAddTraveler(
  shareToken: string,
  payload: Partial<BookingTraveler>
) {
  const { data } = await apiClient.post<{ data: BookingTraveler }>(
    `/public/vault/${shareToken}/traveler`,
    payload
  );
  return data.data;
}

export async function guestUploadDocument(
  shareToken: string,
  payload: {
    title: string;
    category: string;
    travelerId?: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: number;
    notes?: string;
  }
) {
  const { data } = await apiClient.post<{ data: BookingDocument }>(
    `/public/vault/${shareToken}/upload`,
    payload
  );
  return data.data;
}
