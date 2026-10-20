import { apiClient } from "./client";
import type {
  WhatsAppConfig,
  WhatsAppTemplate,
  WhatsAppMessage,
  SendWhatsAppPayload,
  SendWhatsAppResult,
} from "../types/whatsapp";

export const whatsappApi = {
  // Config
  getConfig: async () => {
    const { data } = await apiClient.get<{ ok: boolean; data: WhatsAppConfig }>("/whatsapp/config");
    return data.data;
  },

  updateConfig: async (payload: Partial<WhatsAppConfig> & { accessToken?: string }) => {
    const { data } = await apiClient.post<{ ok: boolean; data: WhatsAppConfig; message: string }>(
      "/whatsapp/config",
      payload
    );
    return data;
  },

  // Templates
  getTemplates: async () => {
    const { data } = await apiClient.get<{ ok: boolean; data: WhatsAppTemplate[] }>("/whatsapp/templates");
    return data.data;
  },

  createTemplate: async (payload: { name: string; category: string; body: string; isActive?: boolean }) => {
    const { data } = await apiClient.post<{ ok: boolean; data: WhatsAppTemplate; message: string }>(
      "/whatsapp/templates",
      payload
    );
    return data;
  },

  updateTemplate: async (id: string, payload: Partial<{ name: string; category: string; body: string; isActive: boolean }>) => {
    const { data } = await apiClient.put<{ ok: boolean; data: WhatsAppTemplate; message: string }>(
      `/whatsapp/templates/${id}`,
      payload
    );
    return data;
  },

  deleteTemplate: async (id: string) => {
    const { data } = await apiClient.delete<{ ok: boolean; message: string }>(`/whatsapp/templates/${id}`);
    return data;
  },

  resetDefaultTemplates: async () => {
    const { data } = await apiClient.post<{ ok: boolean; data: WhatsAppTemplate[]; message: string }>(
      "/whatsapp/templates/reset-defaults"
    );
    return data.data;
  },

  // Messages & Dispatch
  getMessages: async (params?: { enquiryId?: string; page?: number; limit?: number }) => {
    const { data } = await apiClient.get<{
      ok: boolean;
      data: { messages: WhatsAppMessage[]; total: number; page: number; limit: number };
    }>("/whatsapp/messages", { params });
    return data.data;
  },

  sendMessage: async (payload: SendWhatsAppPayload) => {
    const { data } = await apiClient.post<{ ok: boolean; data: SendWhatsAppResult; message: string }>(
      "/whatsapp/send",
      payload
    );
    return data;
  },
};
