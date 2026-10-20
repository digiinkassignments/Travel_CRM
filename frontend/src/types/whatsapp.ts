export type WhatsAppProvider = "QUICK_LINK" | "META_CLOUD" | "SIMULATED";

export interface WhatsAppConfig {
  id?: string;
  clientId?: string;
  provider: WhatsAppProvider;
  phoneNumberId?: string | null;
  businessAccountId?: string | null;
  webhookVerifyToken?: string | null;
  autoWelcomeEnabled: boolean;
  autoItineraryShare: boolean;
  autoCabDispatch: boolean;
  isActive: boolean;
  hasAccessToken?: boolean;
}

export type WhatsAppCategory =
  | "ITINERARY_SHARE"
  | "ENQUIRY_WELCOME"
  | "CAB_DISPATCH"
  | "BOOKING_CONFIRMATION"
  | "PAYMENT_REMINDER"
  | "CUSTOM";

export interface WhatsAppTemplate {
  id: string;
  clientId: string;
  name: string;
  category: WhatsAppCategory;
  body: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppMessage {
  id: string;
  clientId: string;
  enquiryId?: string | null;
  direction: "INBOUND" | "OUTBOUND";
  fromNumber: string;
  toNumber: string;
  body: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "RECEIVED";
  createdAt: string;
}

export interface SendWhatsAppPayload {
  toNumber: string;
  body: string;
  enquiryId?: string;
  mode?: "QUICK_LINK" | "META_CLOUD" | "AUTO";
}

export interface SendWhatsAppResult {
  status: string;
  simulated: boolean;
  waUrl?: string;
  messageId?: string;
  error?: string;
}
