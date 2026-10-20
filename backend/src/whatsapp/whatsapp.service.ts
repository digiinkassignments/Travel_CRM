import { prisma } from "../db/prisma";
import { decryptSecret } from "../common/crypto";

export interface DefaultTemplateDef {
  name: string;
  category: "ITINERARY_SHARE" | "ENQUIRY_WELCOME" | "CAB_DISPATCH" | "BOOKING_CONFIRMATION" | "PAYMENT_REMINDER" | "CUSTOM";
  body: string;
}

export const DEFAULT_TRAVEL_TEMPLATES: DefaultTemplateDef[] = [
  {
    name: "Itinerary Proposal & Pricing",
    category: "ITINERARY_SHARE",
    body: `Namaste {customer_name}! 🙏

Here is your customized travel itinerary for *{destination}* ({duration}) prepared by {company_name}:

🔗 *View Itinerary & Pricing:* {itinerary_link}

✨ Highlights include curated day-wise plans, hotel options, and transparent pricing. You can accept or request any changes directly on the web link above.

Feel free to reply here if you have any questions!
Warm regards,
*{agent_name}* | {company_name}`,
  },
  {
    name: "Lead Acknowledgment & Welcome",
    category: "ENQUIRY_WELCOME",
    body: `Hello {customer_name}! 👋

Thank you for contacting *{company_name}*. We have received your inquiry for *{destination}*.

Our travel specialist *{agent_name}* is reviewing your travel requirements and will share a tailored itinerary shortly.

If you have specific preferences (travel dates, hotel category, or budget), feel free to reply right here!`,
  },
  {
    name: "Chauffeur & Cab Dispatch Details",
    category: "CAB_DISPATCH",
    body: `Dear {customer_name},

Your cab and chauffeur details for your upcoming trip with *{company_name}*:

🚗 *Vehicle:* {vehicle_number} ({vehicle_model})
👤 *Chauffeur:* {driver_name}
📞 *Driver Contact:* {driver_phone}
📍 *Reporting Time:* {pickup_time}
📌 *Pickup Location:* {pickup_location}

Our driver will coordinate with you prior to pickup. Have a safe and pleasant journey!`,
  },
  {
    name: "Trip Booking Confirmed",
    category: "BOOKING_CONFIRMATION",
    body: `Congratulations {customer_name}! 🎉

Your holiday package for *{destination}* is officially confirmed with *{company_name}*.
Booking Reference: *#{booking_id}*

Advance Received: ₹{advance_amount}
Balance Due: ₹{balance_due}

Thank you for choosing us! Hotel confirmation vouchers and driver duty slips will be shared before your trip.`,
  },
  {
    name: "Payment Balance Due Reminder",
    category: "PAYMENT_REMINDER",
    body: `Dear {customer_name},

Greetings from *{company_name}*! This is a gentle reminder regarding the pending balance payment of *₹{balance_due}* for your booking *#{booking_id}*.

Kindly complete the payment to ensure smooth voucher issuance and hotel check-in. Let us know once done. Thank you!`,
  },
];

/**
 * Replace placeholders like {customer_name} or {{customer_name}} with real values.
 */
export function interpolateTemplate(template: string, vars: Record<string, any>): string {
  return template.replace(/\{\{?([a-zA-Z0-9_]+)\}?\}/g, (match, key) => {
    const val = vars[key];
    if (val !== undefined && val !== null) {
      return String(val);
    }
    return match; // preserve if not found
  });
}

/**
 * Format phone number into clean international format (digits only, e.g. 919876543210).
 */
export function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  // If Indian 10-digit number without country code, prepend 91
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
}

/**
 * Fetches existing templates for a tenant, or seeds the 5 defaults if none exist.
 */
export async function getOrSeedTemplates(clientId: string) {
  const existing = await prisma.whatsAppTemplate.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });

  if (existing.length > 0) {
    return existing;
  }

  // Seed default templates
  await prisma.whatsAppTemplate.createMany({
    data: DEFAULT_TRAVEL_TEMPLATES.map((t) => ({
      clientId,
      name: t.name,
      category: t.category,
      body: t.body,
      isDefault: true,
      isActive: true,
    })),
  });

  return prisma.whatsAppTemplate.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Reset templates to default travel agency templates.
 */
export async function resetDefaultTemplates(clientId: string) {
  await prisma.whatsAppTemplate.deleteMany({ where: { clientId } });
  return getOrSeedTemplates(clientId);
}

/**
 * Dual-Mode WhatsApp Dispatch Engine:
 * Supports Quick Link (`wa.me` for instant zero-friction agent sending) and Meta Cloud API (automated background).
 */
export async function sendWhatsAppMessage(params: {
  clientId: string;
  toNumber: string;
  body: string;
  enquiryId?: string;
  mode?: "QUICK_LINK" | "META_CLOUD" | "AUTO";
}): Promise<{
  status: string;
  simulated: boolean;
  waUrl?: string;
  messageId?: string;
  error?: string;
}> {
  const config = await prisma.whatsAppConfig.findUnique({ where: { clientId: params.clientId } });
  const cleanPhone = cleanPhoneNumber(params.toNumber);
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(params.body)}`;

  const hasRealCredentials = Boolean(config?.isActive && config.phoneNumberId && config.accessTokenEncrypted);
  const effectiveMode = params.mode && params.mode !== "AUTO" 
    ? params.mode 
    : (config?.provider === "META_CLOUD" && hasRealCredentials ? "META_CLOUD" : "QUICK_LINK");

  let status = "QUEUED";
  let simulated = false;
  let errorMsg: string | undefined;

  if (effectiveMode === "META_CLOUD") {
    if (!hasRealCredentials) {
      status = "FAILED";
      simulated = true;
      errorMsg = "Meta Cloud API credentials not configured or inactive.";
    } else {
      const accessToken = decryptSecret(config!.accessTokenEncrypted!);
      if (!accessToken) {
        status = "FAILED";
        errorMsg = "Unable to decrypt Meta API token.";
      } else {
        try {
          const response = await fetch(`https://graph.facebook.com/v19.0/${config!.phoneNumberId}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: cleanPhone,
              type: "text",
              text: { preview_url: true, body: params.body },
            }),
          });

          const resData = (await response.json()) as any;
          if (response.ok && resData?.messages?.[0]?.id) {
            status = "SENT";
          } else {
            status = "FAILED";
            errorMsg = resData?.error?.message || "Meta API rejected message dispatch.";
            console.error("[whatsapp:meta-error]", resData);
          }
        } catch (err: any) {
          status = "FAILED";
          errorMsg = err.message || "Network error while connecting to Meta API.";
          console.error("[whatsapp:fetch-error]", err);
        }
      }
    }
  } else {
    // QUICK_LINK Mode (wa.me)
    status = "SENT";
    simulated = false;
  }

  const log = await prisma.whatsAppMessage.create({
    data: {
      clientId: params.clientId,
      enquiryId: params.enquiryId,
      direction: "OUTBOUND",
      fromNumber: config?.phoneNumberId || (effectiveMode === "QUICK_LINK" ? "Quick Link (wa.me)" : "system"),
      toNumber: cleanPhone,
      body: params.body,
      status,
    },
  });

  return {
    status,
    simulated,
    waUrl,
    messageId: log.id,
    error: errorMsg,
  };
}

/**
 * Auto-trigger lead acknowledgment welcome message when a new enquiry is received.
 */
export async function triggerAutoWelcome(clientId: string, enquiryId: string) {
  try {
    const config = await prisma.whatsAppConfig.findUnique({ where: { clientId } });
    if (!config?.autoWelcomeEnabled) {
      return; // Tenant has not enabled auto-welcome
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      include: {
        customer: true,
        client: {
          include: { companyProfile: true },
        },
        assignedTo: true,
      },
    });

    if (!enquiry || !enquiry.customer?.phone) {
      return;
    }

    const templates = await getOrSeedTemplates(clientId);
    const welcomeTemplate = templates.find((t) => t.category === "ENQUIRY_WELCOME" && t.isActive) || templates[0];

    if (!welcomeTemplate) return;

    const companyName = enquiry.client.companyProfile?.companyName || enquiry.client.businessName;
    const body = interpolateTemplate(welcomeTemplate.body, {
      customer_name: enquiry.customer.name,
      destination: enquiry.destination || "your requested destination",
      company_name: companyName,
      agent_name: enquiry.assignedTo?.name || "our team",
    });

    await sendWhatsAppMessage({
      clientId,
      toNumber: enquiry.customer.phone,
      body,
      enquiryId,
      mode: "AUTO",
    });
  } catch (err) {
    console.error("[whatsapp:triggerAutoWelcome-failed]", err);
  }
}

export async function recordInboundWhatsAppMessage(params: {
  clientId: string;
  fromNumber: string;
  toNumber: string;
  body: string;
}) {
  const enquiry = await prisma.enquiry.findFirst({
    where: { clientId: params.clientId, customer: { phone: params.fromNumber } },
    orderBy: { createdAt: "desc" },
  });

  return prisma.whatsAppMessage.create({
    data: {
      clientId: params.clientId,
      enquiryId: enquiry?.id,
      direction: "INBOUND",
      fromNumber: params.fromNumber,
      toNumber: params.toNumber,
      body: params.body,
      status: "RECEIVED",
    },
  });
}
