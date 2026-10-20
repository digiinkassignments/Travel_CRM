import { apiClient } from "./client";
import { Itinerary, PublicItineraryView } from "../types/itinerary";
import axios from "axios";

export async function listItineraries(params?: {
  status?: string;
  destination?: string;
  customerId?: string;
  enquiryId?: string;
}): Promise<Itinerary[]> {
  const { data } = await apiClient.get("/itineraries", { params });
  return data.data;
}

export async function getItinerary(id: string): Promise<Itinerary> {
  const { data } = await apiClient.get(`/itineraries/${id}`);
  return data.data;
}

export async function createItinerary(payload: Partial<Itinerary>): Promise<Itinerary> {
  const { data } = await apiClient.post("/itineraries", payload);
  return data.data;
}

export async function updateItinerary(id: string, payload: Partial<Itinerary>): Promise<Itinerary> {
  const { data } = await apiClient.put(`/itineraries/${id}`, payload);
  return data.data;
}

export async function duplicateItinerary(id: string): Promise<Itinerary> {
  const { data } = await apiClient.post(`/itineraries/${id}/duplicate`);
  return data.data;
}

export async function deleteItinerary(id: string): Promise<void> {
  await apiClient.delete(`/itineraries/${id}`);
}

export async function uploadItineraryPhoto(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("photo", file);
  const { data } = await apiClient.post("/itineraries/upload-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function getTourTemplates(): Promise<any[]> {
  const { data } = await apiClient.get("/itineraries/templates/all");
  return data.data;
}

export async function saveTemplateFromItinerary(itineraryId: string): Promise<any> {
  const { data } = await apiClient.post(`/itineraries/templates/save-from-itinerary/${itineraryId}`);
  return data.data;
}

// Public endpoint (uses base axios without auth token)
export async function getPublicItinerary(shareSlug: string): Promise<PublicItineraryView> {
  const { data } = await axios.get(`/api/public/itinerary/${shareSlug}`);
  return data.data;
}

export async function acceptPublicItinerary(shareSlug: string): Promise<{ success: boolean; message: string }> {
  const { data } = await axios.post(`/api/public/itinerary/${shareSlug}/accept`);
  return data;
}

export async function sendPublicItineraryFeedback(
  shareSlug: string,
  payload: { travelerName: string; phone?: string; email?: string; message: string }
): Promise<{ success: boolean; message: string }> {
  const { data } = await axios.post(`/api/public/itinerary/${shareSlug}/feedback`, payload);
  return data;
}
