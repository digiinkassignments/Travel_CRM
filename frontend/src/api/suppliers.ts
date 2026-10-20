import { apiClient } from "./client";
import {
  Supplier,
  CostingSummary,
  BookingCostItem,
  SupplierPayment,
  HotelVoucher,
  PayablesSummary,
} from "../types/supplier";

export async function fetchSuppliers(params?: { search?: string; type?: string; city?: string }) {
  const { data } = await apiClient.get<{ data: Supplier[] }>("/suppliers", { params });
  return data.data;
}

export async function fetchSupplier(id: string) {
  const { data } = await apiClient.get<{ data: Supplier & { costItems: any[]; payments: any[]; vouchers: any[] } }>(
    `/suppliers/${id}`
  );
  return data.data;
}

export async function fetchPayablesSummary() {
  const { data } = await apiClient.get<{ data: PayablesSummary }>("/suppliers/payables/summary");
  return data.data;
}

export async function createSupplier(payload: Partial<Supplier>) {
  const { data } = await apiClient.post<{ data: Supplier }>("/suppliers", payload);
  return data.data;
}

export async function updateSupplier(id: string, payload: Partial<Supplier>) {
  const { data } = await apiClient.patch<{ data: Supplier }>(`/suppliers/${id}`, payload);
  return data.data;
}

export async function deleteSupplier(id: string) {
  const { data } = await apiClient.delete(`/suppliers/${id}`);
  return data;
}

export async function fetchBookingCosting(bookingId: string) {
  const { data } = await apiClient.get<{ data: CostingSummary }>(`/bookings/${bookingId}/costing`);
  return data.data;
}

export async function addBookingCostItem(bookingId: string, payload: Partial<BookingCostItem>) {
  const { data } = await apiClient.post<{ data: BookingCostItem }>(`/bookings/${bookingId}/costing`, payload);
  return data.data;
}

export async function updateBookingCostItem(bookingId: string, itemId: string, payload: Partial<BookingCostItem>) {
  const { data } = await apiClient.patch<{ data: BookingCostItem }>(
    `/bookings/${bookingId}/costing/${itemId}`,
    payload
  );
  return data.data;
}

export async function deleteBookingCostItem(bookingId: string, itemId: string) {
  const { data } = await apiClient.delete(`/bookings/${bookingId}/costing/${itemId}`);
  return data;
}

export async function recordSupplierPayment(payload: {
  supplierId: string;
  bookingId?: string | null;
  amountInPaise: number;
  paymentDate?: string;
  mode: string;
  reference?: string;
  notes?: string;
}) {
  const { data } = await apiClient.post<{ data: SupplierPayment }>("/suppliers/payments", payload);
  return data.data;
}

export async function fetchBookingVouchers(bookingId: string) {
  const { data } = await apiClient.get<{ data: HotelVoucher[] }>(`/bookings/${bookingId}/vouchers`);
  return data.data;
}

export async function createHotelVoucher(bookingId: string, payload: any) {
  const { data } = await apiClient.post<{ data: HotelVoucher }>(`/bookings/${bookingId}/vouchers`, payload);
  return data.data;
}

export async function fetchVoucher(id: string) {
  const { data } = await apiClient.get<{ data: HotelVoucher }>(`/vouchers/${id}`);
  return data.data;
}

export async function updateVoucherStatus(id: string, status: string) {
  const { data } = await apiClient.patch<{ data: HotelVoucher }>(`/vouchers/${id}/status`, { status });
  return data.data;
}

export async function deleteVoucher(id: string) {
  const { data } = await apiClient.delete(`/vouchers/${id}`);
  return data;
}
