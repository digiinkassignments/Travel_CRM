import { prisma } from "../db/prisma";
import { sendWhatsAppMessage, cleanPhoneNumber } from "../whatsapp/whatsapp.service";
import { sendHtmlMail } from "../email/email.service";
import { getEffectiveEntitlements } from "../guards/entitlement.guard";

export interface WorkflowEventPayload {
  clientId: string;
  eventType: string; // NEW_LEAD_CREATED | BOOKING_CONFIRMED | PAYMENT_RECEIVED | DUTY_SLIP_DISPATCHED | ITINERARY_SHARED
  targetType: "ENQUIRY" | "BOOKING" | "PAYMENT" | "TRIP" | "QUOTATION";
  targetId: string;
  metadata?: Record<string, any>;
}

export const WORKFLOW_TRIGGER_CATALOG = [
  {
    type: "NEW_LEAD_CREATED",
    category: "Leads & Enquiries",
    label: "New Lead Created (Web / Form / CSV)",
    description: "Triggers instantly when a new lead enters the CRM",
    isRealTime: true,
  },
  {
    type: "BOOKING_CONFIRMED",
    category: "Bookings & Sales",
    label: "Booking Confirmed",
    description: "Triggers when a booking status changes to Confirmed",
    isRealTime: true,
  },
  {
    type: "PAYMENT_RECEIVED",
    category: "Bookings & Sales",
    label: "Customer Payment Logged",
    description: "Triggers when an advance or partial payment is recorded",
    isRealTime: true,
  },
  {
    type: "DUTY_SLIP_DISPATCHED",
    category: "Fleet & Cab Dispatch",
    label: "Cab Duty Slip Dispatched",
    description: "Triggers when cab and driver details are dispatched to driver",
    isRealTime: true,
  },
  {
    type: "ITINERARY_SHARED",
    category: "Itineraries & Proposals",
    label: "Itinerary Proposal Shared",
    description: "Triggers when an itinerary link is generated and shared",
    isRealTime: true,
  },
  {
    type: "PRE_DEPARTURE_REMINDER",
    category: "Traveler Lifecycle",
    label: "Pre-Departure Briefing (X Days Before Trip)",
    description: "Scheduled reminder before trip start date",
    isRealTime: false,
  },
  {
    type: "POST_TRIP_FEEDBACK",
    category: "Traveler Lifecycle",
    label: "Post-Trip Review Request (X Days After Trip)",
    description: "Scheduled review request after trip end date",
    isRealTime: false,
  },
  {
    type: "PAYMENT_DUE_REMINDER",
    category: "Bookings & Sales",
    label: "Payment Balance Due Reminder (X Days Before Due)",
    description: "Scheduled reminder for unpaid balances",
    isRealTime: false,
  },
  {
    type: "ENQUIRY_NO_CONTACT_WITHIN_HOURS",
    category: "Leads & Enquiries",
    label: "Lead Uncontacted Escalation (X Hours)",
    description: "Escalates lead if no agent follow-up within X hours",
    isRealTime: false,
  },
  {
    type: "QUOTATION_NOT_FOLLOWED_UP",
    category: "Itineraries & Proposals",
    label: "Quotation Unfollowed Reminder (X Days)",
    description: "Reminds agent when quotation has no response",
    isRealTime: false,
  },
  {
    type: "VEHICLE_DOCUMENT_EXPIRING",
    category: "Fleet & Cab Dispatch",
    label: "Vehicle RTO Paper Expiring (X Days)",
    description: "Alerts when vehicle insurance/permit/fitness expires",
    isRealTime: false,
  },
];

export const WORKFLOW_ACTION_CATALOG = [
  { type: "WHATSAPP_CUSTOMER", label: "Send WhatsApp to Customer", channel: "WHATSAPP" },
  { type: "EMAIL_CUSTOMER", label: "Send Branded HTML Email to Customer", channel: "EMAIL" },
  { type: "WHATSAPP_AND_EMAIL_CUSTOMER", label: "Send Both WhatsApp & Email to Customer", channel: "BOTH" },
  { type: "EMAIL_STAFF", label: "Email Assigned Staff Member or Manager", channel: "EMAIL" },
  { type: "WHATSAPP_STAFF", label: "WhatsApp Assigned Staff Member", channel: "WHATSAPP" },
  { type: "CREATE_FOLLOWUP_NOTE", label: "Log Automatic CRM Activity Note", channel: "INTERNAL" },
  { type: "REASSIGN_ENQUIRY", label: "Reassign Lead to Another Agent", channel: "INTERNAL" },
];

export const AVAILABLE_PLACEHOLDERS = [
  { tag: "{customer_name}", label: "Customer Name", example: "Rahul Sharma" },
  { tag: "{customer_phone}", label: "Customer Phone", example: "+91 9876543210" },
  { tag: "{customer_email}", label: "Customer Email", example: "rahul@gmail.com" },
  { tag: "{destination}", label: "Destination", example: "Goa / Manali / Dubai" },
  { tag: "{booking_number}", label: "Booking Number", example: "BK-2026-0042" },
  { tag: "{lead_id}", label: "Lead Ref ID", example: "ENQ-1049" },
  { tag: "{amount}", label: "Total Package Amount", example: "₹45,000" },
  { tag: "{amount_paid}", label: "Amount Paid", example: "₹15,000" },
  { tag: "{balance_due}", label: "Balance Pending", example: "₹30,000" },
  { tag: "{departure_date}", label: "Departure Date", example: "18-Oct-2026" },
  { tag: "{return_date}", label: "Return Date", example: "24-Oct-2026" },
  { tag: "{due_date}", label: "Payment Due Date", example: "10-Oct-2026" },
  { tag: "{pickup_location}", label: "Pickup Address", example: "Terminal 3, IGI Airport" },
  { tag: "{driver_name}", label: "Driver Name", example: "Suresh Kumar" },
  { tag: "{driver_phone}", label: "Driver Mobile", example: "+91 9811122233" },
  { tag: "{vehicle_model}", label: "Vehicle Model", example: "Toyota Innova Crysta" },
  { tag: "{vehicle_number}", label: "Vehicle Reg Number", example: "DL 1Z AB 1234" },
  { tag: "{payment_amount}", label: "Recent Payment Amount", example: "₹15,000" },
  { tag: "{payment_mode}", label: "Payment Mode", example: "UPI / Bank Transfer" },
  { tag: "{itinerary_link}", label: "Online Itinerary Link", example: "https://crm.../itinerary/goa-4n5d" },
  { tag: "{agent_name}", label: "Assigned Agent Name", example: "Pooja Verma" },
  { tag: "{company_name}", label: "Company / Brand Name", example: "Royal Holidays" },
  { tag: "{company_phone}", label: "Helpline Phone", example: "+91 8000011111" },
  { tag: "{review_link}", label: "Review / Website Link", example: "https://g.page/r/..." },
];

export const DEFAULT_TRAVEL_RECIPES = [
  {
    name: "Instant WhatsApp & Email Welcome on New Lead",
    triggerType: "NEW_LEAD_CREATED",
    triggerConfig: {},
    actionType: "WHATSAPP_AND_EMAIL_CUSTOMER",
    actionConfig: {
      messageTemplate: `Namaste {customer_name}! 🙏

Thank you for reaching out to *{company_name}*. We have received your inquiry for *{destination}*.

Our travel specialist *{agent_name}* is reviewing your requirements and will share a customized travel proposal shortly.

If you have specific travel dates or hotel preferences, please reply right here!`,
      emailSubject: `Thank you for contacting {company_name} - Your {destination} travel inquiry`,
      emailBody: `<p>Dear <strong>{customer_name}</strong>,</p>
<p>Thank you for contacting <strong>{company_name}</strong> regarding your travel plans to <strong>{destination}</strong>!</p>
<p>Our destination specialist <strong>{agent_name}</strong> has received your inquiry and is currently crafting a tailored holiday proposal with the best flight, hotel, and sightseeing recommendations.</p>
<div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:16px 0;">
  <p style="margin:0;"><strong>Inquiry Reference:</strong> #{lead_id}</p>
  <p style="margin:4px 0 0;"><strong>Destination:</strong> {destination}</p>
</div>
<p>If you have any urgent questions or specific requests, feel free to reply directly to this email or call us at <strong>{company_phone}</strong>.</p>
<p>Warm regards,<br/>Team {company_name}</p>`,
    },
  },
  {
    name: "Trip Booking Confirmed & Advance Receipt",
    triggerType: "BOOKING_CONFIRMED",
    triggerConfig: {},
    actionType: "WHATSAPP_AND_EMAIL_CUSTOMER",
    actionConfig: {
      messageTemplate: `Congratulations {customer_name}! 🎉

Your holiday package for *{destination}* is officially confirmed with *{company_name}*!
*Booking Reference:* #{booking_number}
*Travel Dates:* {departure_date}
*Advance Received:* ₹{advance_amount}
*Balance Due:* ₹{balance_due}

Hotel vouchers and chauffeur duty slips will be shared before your departure. Thank you for choosing us!`,
      emailSubject: `Booking Confirmed: #{booking_number} - {destination} with {company_name}`,
      emailBody: `<p>Dear <strong>{customer_name}</strong>,</p>
<p>Congratulations! Your holiday package for <strong>{destination}</strong> is officially confirmed.</p>
<div style="background:#f1f5f9;padding:18px;border-radius:8px;margin:16px 0;">
  <p style="margin:0;"><strong>Booking Reference:</strong> #{booking_number}</p>
  <p style="margin:6px 0 0;"><strong>Travel Dates:</strong> {departure_date}</p>
  <p style="margin:6px 0 0;"><strong>Advance Received:</strong> ₹{advance_amount}</p>
  <p style="margin:6px 0 0;color:#0284c7;"><strong>Balance Due:</strong> ₹{balance_due}</p>
</div>
<p>Our operations team will issue your final hotel vouchers and driver contact details prior to departure. We are excited to make your journey extraordinary!</p>`,
    },
  },
  {
    name: "Customer Payment Acknowledgment",
    triggerType: "PAYMENT_RECEIVED",
    triggerConfig: {},
    actionType: "WHATSAPP_AND_EMAIL_CUSTOMER",
    actionConfig: {
      messageTemplate: `Dear {customer_name},

We have successfully received your payment of *₹{amount}* towards Booking *#{booking_number}*.
*Remaining Balance:* ₹{balance_due}

Thank you for choosing *{company_name}*!`,
      emailSubject: `Payment Receipt: ₹{amount} received for Booking #{booking_number}`,
      emailBody: `<p>Dear <strong>{customer_name}</strong>,</p>
<p>Thank you! We have received your payment of <strong>₹{amount}</strong>.</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:8px;margin:16px 0;">
  <p style="margin:0;"><strong>Booking No:</strong> #{booking_number}</p>
  <p style="margin:6px 0 0;"><strong>Amount Paid:</strong> ₹{amount}</p>
  <p style="margin:6px 0 0;"><strong>Payment Method:</strong> {payment_method}</p>
  <p style="margin:6px 0 0;"><strong>Remaining Balance:</strong> ₹{balance_due}</p>
</div>
<p>We appreciate your prompt settlement!</p>`,
    },
  },
  {
    name: "Pre-Departure Travel Briefing (2 Days Prior)",
    triggerType: "PRE_DEPARTURE_REMINDER",
    triggerConfig: { days: 2 },
    actionType: "WHATSAPP_AND_EMAIL_CUSTOMER",
    actionConfig: {
      messageTemplate: `Dear {customer_name},

Your trip to *{destination}* starts in 2 days on *{departure_date}*! ✈️🎒

Please keep your identity cards and vouchers ready. If you need any assistance, our dedicated helpline is *{company_phone}*.

Wishing you a safe and memorable journey with *{company_name}*!`,
      emailSubject: `Trip Reminder: Your holiday to {destination} starts in 2 days!`,
      emailBody: `<p>Dear <strong>{customer_name}</strong>,</p>
<p>Your upcoming holiday to <strong>{destination}</strong> starts in just 2 days (starting <strong>{departure_date}</strong>)!</p>
<p><strong>Quick Travel Checklist:</strong></p>
<ul>
  <li>Govt ID proofs / Passports</li>
  <li>Printed or digital vouchers & flight tickets</li>
  <li>Weather-appropriate clothing & personal medication</li>
</ul>
<p>If you need any adjustments or coordination, contact our customer desk at <strong>{company_phone}</strong> or reply here.</p>
<p>Bon voyage!</p>`,
    },
  },
  {
    name: "Post-Trip Review & Feedback Request (1 Day After)",
    triggerType: "POST_TRIP_FEEDBACK",
    triggerConfig: { days: 1 },
    actionType: "WHATSAPP_AND_EMAIL_CUSTOMER",
    actionConfig: {
      messageTemplate: `Welcome back {customer_name}! 🌟

We hope you had a fantastic vacation in *{destination}*. Could you please take 30 seconds to rate your experience with *{company_name}*?

🔗 *Leave a Review:* {review_link}

Your feedback means the world to our team! Thank you!`,
      emailSubject: `Welcome back! How was your journey to {destination}?`,
      emailBody: `<p>Dear <strong>{customer_name}</strong>,</p>
<p>Welcome home! We hope your journey to <strong>{destination}</strong> was filled with wonderful moments.</p>
<p>As a valued traveler, your feedback helps us continuously improve our tour quality and service excellence.</p>
<p style="text-align:center;margin:24px 0;">
  <a class="btn" href="{review_link}">Rate Your Experience</a>
</p>
<p>We look forward to planning your next adventure soon!</p>`,
    },
  },
  {
    name: "Payment Balance Due Reminder (3 Days Before Due)",
    triggerType: "PAYMENT_DUE_REMINDER",
    triggerConfig: { days: 3 },
    actionType: "WHATSAPP_AND_EMAIL_CUSTOMER",
    actionConfig: {
      messageTemplate: `Dear {customer_name},

Greetings from *{company_name}*. This is a gentle reminder that a balance payment of *₹{balance_due}* for your booking *#{booking_number}* is due on *{due_date}*.

Kindly complete the payment to ensure smooth voucher issuance. Thank you!`,
      emailSubject: `Payment Reminder: ₹{balance_due} due for Booking #{booking_number}`,
      emailBody: `<p>Dear <strong>{customer_name}</strong>,</p>
<p>This is a gentle reminder that the pending balance of <strong>₹{balance_due}</strong> for booking #{booking_number} is scheduled for <strong>{due_date}</strong>.</p>
<p>Please settle the balance at your earliest convenience so our team can finalize your hotel and transport vouchers.</p>`,
    },
  },
];

/**
 * Replace placeholders like {customer_name} or {{customer_name}} with real data
 */
export function interpolateVariables(template: string, vars: Record<string, any>): string {
  if (!template) return "";
  return template.replace(/\{\{?([a-zA-Z0-9_]+)\}?\}/g, (match, key) => {
    const val = vars[key];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val);
    }
    return match;
  });
}

/**
 * Resolves full context variables for a given entity target
 */
async function buildVariableContext(
  clientId: string,
  targetType: string,
  targetId: string,
  extraMetadata?: Record<string, any>
): Promise<Record<string, any>> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { companyProfile: true },
  });

  const companyName = client?.companyProfile?.companyName || client?.businessName || "Travel Agency";
  const companyPhone = client?.companyProfile?.phone || client?.companyProfile?.whatsappNumber || "";
  const companyEmail = client?.companyProfile?.email || "";
  const logoUrl = client?.companyProfile?.logoUrl || "";
  const primaryColor = client?.companyProfile?.primaryColor || "#0284c7";
  const reviewLink = client?.companyProfile?.websiteUrl || "https://google.com";

  const context: Record<string, any> = {
    company_name: companyName,
    company_phone: companyPhone,
    company_email: companyEmail,
    logo_url: logoUrl,
    primary_color: primaryColor,
    review_link: reviewLink,
    ...(extraMetadata || {}),
  };

  if (targetType === "ENQUIRY") {
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: targetId },
      include: { customer: true, assignedTo: true },
    });
    if (enquiry) {
      context.customer_name = enquiry.customer?.name || "Traveler";
      context.customer_phone = enquiry.customer?.phone || "";
      context.customer_email = enquiry.customer?.email || "";
      context.destination = enquiry.destination || "Your Destination";
      context.lead_id = enquiry.id.slice(-6).toUpperCase();
      context.agent_name = enquiry.assignedTo?.name || "Travel Specialist";
      context.agent_email = enquiry.assignedTo?.email || "";
    }
  } else if (targetType === "BOOKING") {
    const booking = await prisma.booking.findUnique({
      where: { id: targetId },
      include: {
        customer: true,
        payments: true,
        trip: { include: { driver: true, vehicle: true } },
        quotation: { include: { enquiry: true } },
      },
    });
    if (booking) {
      context.customer_name = booking.customer?.name || "Traveler";
      context.customer_phone = booking.customer?.phone || "";
      context.customer_email = booking.customer?.email || "";
      context.booking_number = booking.id.slice(-6).toUpperCase();
      context.destination = booking.quotation?.enquiry?.destination || "Tour Package";
      context.departure_date = booking.travelStart
        ? new Date(booking.travelStart).toLocaleDateString("en-IN", { dateStyle: "medium" })
        : "Scheduled Date";
      context.due_date = booking.paymentDueDate
        ? new Date(booking.paymentDueDate).toLocaleDateString("en-IN", { dateStyle: "medium" })
        : "Prior to Departure";

      const totalAmountRupees = (booking.amountInPaise || 0) / 100;
      const totalPaidRupees = booking.payments.reduce((sum: number, p) => sum + (p.amountInPaise || 0) / 100, 0);
      const balanceRupees = Math.max(0, totalAmountRupees - totalPaidRupees);

      context.total_amount = totalAmountRupees.toFixed(2);
      context.amount = totalAmountRupees.toFixed(2);
      context.advance_amount = totalPaidRupees.toFixed(2);
      context.amount_paid = totalPaidRupees.toFixed(2);
      context.balance_due = balanceRupees.toFixed(2);

      const trip = booking.trip;
      if (trip) {
        context.driver_name = trip.driver?.name || "Assigned Driver";
        context.driver_phone = trip.driver?.contact || "";
        context.vehicle_number = trip.vehicle?.registrationNumber || "";
        context.vehicle_model = trip.vehicle?.vehicleType || "";
      }
    }
  } else if (targetType === "PAYMENT") {
    const payment = await prisma.payment.findUnique({
      where: { id: targetId },
      include: {
        booking: { include: { customer: true, payments: true } },
      },
    });
    if (payment) {
      const b = payment.booking;
      context.customer_name = b?.customer?.name || "Traveler";
      context.customer_phone = b?.customer?.phone || "";
      context.customer_email = b?.customer?.email || "";
      context.booking_number = b?.id.slice(-6).toUpperCase() || "Booking";
      context.amount = ((payment.amountInPaise || 0) / 100).toFixed(2);
      context.payment_amount = ((payment.amountInPaise || 0) / 100).toFixed(2);
      context.payment_method = payment.mode || "Online Transfer";
      context.payment_mode = payment.mode || "Online Transfer";

      const totalPaid = (b?.payments || []).reduce((sum: number, p) => sum + (p.amountInPaise || 0) / 100, 0);
      const totalAmount = ((b?.amountInPaise || 0) / 100);
      const bal = Math.max(0, totalAmount - totalPaid);
      context.balance_due = bal.toFixed(2);
    }
  } else if (targetType === "TRIP") {
    const trip = await prisma.trip.findUnique({
      where: { id: targetId },
      include: {
        booking: { include: { customer: true } },
        driver: true,
        vehicle: true,
        dutySlip: true,
      },
    });
    if (trip) {
      context.customer_name = trip.booking?.customer?.name || "Traveler";
      context.customer_phone = trip.booking?.customer?.phone || "";
      context.customer_email = trip.booking?.customer?.email || "";
      context.pickup_location = trip.pickup || "Designated Location";
      context.drop_location = trip.drop || "Drop Location";
      context.driver_name = trip.driver?.name || "Chauffeur";
      context.driver_phone = trip.driver?.contact || "";
      context.vehicle_number = trip.vehicle?.registrationNumber || "";
      context.vehicle_model = trip.vehicle?.vehicleType || "";
      context.duty_slip_number = trip.dutySlip?.slipNumber || "";
      if (trip.dutySlip?.shareToken) {
        context.duty_slip_link = `${process.env.APP_URL || "http://localhost:5173"}/duty-slip/${trip.dutySlip.shareToken}`;
      }
    }
  }

  return context;
}

/**
 * Checks if a rule already fired against target within cooldown hours
 */
async function hasFiredRecently(ruleId: string, targetId: string, cooldownHours = 24): Promise<boolean> {
  const since = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
  const recent = await prisma.automationLog.findFirst({
    where: { ruleId, targetId, createdAt: { gte: since } },
  });
  return Boolean(recent);
}

/**
 * Real-time event dispatcher called by CRM controllers
 */
export async function emitWorkflowEvent(payload: WorkflowEventPayload) {
  try {
    const { clientId, eventType, targetType, targetId, metadata } = payload;

    // Check if client has active workflow_automation entitlement
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { plan: true },
    });
    if (!client) return;

    const entitlements = getEffectiveEntitlements(client);
    if (!entitlements.workflow_automation) {
      return; // Not entitled to automations on their tier
    }

    // Find active rules for this event
    const rules = await prisma.automationRule.findMany({
      where: {
        clientId,
        isActive: true,
        triggerType: eventType,
      },
    });

    if (rules.length === 0) return;

    const context = await buildVariableContext(clientId, targetType, targetId, metadata);

    for (const rule of rules) {
      // Cooldown check for real-time events (default 6 hours to avoid double firing)
      if (await hasFiredRecently(rule.id, targetId, 6)) {
        continue;
      }

      await executeRuleAction(rule, targetType, targetId, context);
    }
  } catch (err) {
    console.error("[automation:emitWorkflowEvent:error]", err);
  }
}

/**
 * Executes a single automation rule's actions
 */
export async function executeRuleAction(
  rule: any,
  targetType: string,
  targetId: string,
  context: Record<string, any>,
  isTest = false
) {
  const { clientId, actionType, actionConfig } = rule;
  const config = actionConfig as Record<string, any>;

  const customerPhone = context.customer_phone || "";
  const customerEmail = context.customer_email || "";

  // 1. WhatsApp to Customer
  if (
    actionType === "WHATSAPP_CUSTOMER" ||
    actionType === "WHATSAPP_AND_EMAIL_CUSTOMER"
  ) {
    if (customerPhone) {
      const msgText = interpolateVariables(config.messageTemplate || "", context);
      if (msgText.trim()) {
        try {
          const res = await sendWhatsAppMessage({
            clientId,
            toNumber: customerPhone,
            body: msgText,
            mode: "AUTO",
          });

          await prisma.automationLog.create({
            data: {
              clientId,
              ruleId: rule.id,
              targetType,
              targetId,
              channel: "WHATSAPP",
              status: res.status === "SENT" ? "SENT" : res.waUrl ? "READY_LINK" : "FAILED",
              recipient: customerPhone,
              message: isTest ? `[TEST] ${rule.name}` : rule.name,
            },
          });
        } catch (waErr: any) {
          console.error("[automation:whatsapp:error]", waErr);
        }
      }
    }
  }

  // 2. Email to Customer
  if (
    actionType === "EMAIL_CUSTOMER" ||
    actionType === "WHATSAPP_AND_EMAIL_CUSTOMER"
  ) {
    if (customerEmail) {
      const subject = interpolateVariables(config.emailSubject || `Notice from ${context.company_name}`, context);
      const htmlBody = interpolateVariables(config.emailBody || "", context);

      if (subject && htmlBody) {
        try {
          const emailRes = await sendHtmlMail({
            to: customerEmail,
            subject,
            html: htmlBody,
            companyName: context.company_name,
            logoUrl: context.logo_url,
            primaryColor: context.primary_color,
          });

          await prisma.automationLog.create({
            data: {
              clientId,
              ruleId: rule.id,
              targetType,
              targetId,
              channel: "EMAIL",
              status: emailRes.success ? (emailRes.simulated ? "SIMULATED" : "SENT") : "FAILED",
              recipient: customerEmail,
              message: isTest ? `[TEST] ${rule.name}` : rule.name,
            },
          });
        } catch (emailErr: any) {
          console.error("[automation:email:error]", emailErr);
        }
      }
    }
  }

  // 3. Email to Staff Member
  if (actionType === "EMAIL_STAFF") {
    let staffEmail = "";
    if (config.recipient === "ASSIGNED_STAFF" && context.agent_email) {
      staffEmail = context.agent_email;
    } else {
      const admin = await prisma.user.findFirst({ where: { clientId, isClientAdmin: true } });
      staffEmail = admin?.email || "";
    }

    if (staffEmail) {
      const subject = interpolateVariables(config.emailSubject || `[Alert] ${rule.name}`, context);
      const html = interpolateVariables(
        config.emailBody || `<p>Automation rule <strong>${rule.name}</strong> triggered for ${targetType} #${targetId}.</p>`,
        context
      );
      await sendHtmlMail({ to: staffEmail, subject, html, companyName: context.company_name });
      await prisma.automationLog.create({
        data: {
          clientId,
          ruleId: rule.id,
          targetType,
          targetId,
          channel: "EMAIL",
          status: "SENT",
          recipient: staffEmail,
          message: `Staff Alert: ${rule.name}`,
        },
      });
    }
  }

  // 4. Create FollowUp / Activity Note in CRM
  if (actionType === "CREATE_FOLLOWUP_NOTE" && targetType === "ENQUIRY") {
    const admin = await prisma.user.findFirst({ where: { clientId, isClientAdmin: true } });
    await prisma.followUp.create({
      data: {
        clientId,
        enquiryId: targetId,
        loggedById: admin?.id || "system",
        activityType: "NOTE",
        description: `Automated Workflow: ${rule.name}`,
      },
    });
    await prisma.automationLog.create({
      data: {
        clientId,
        ruleId: rule.id,
        targetType,
        targetId,
        channel: "INTERNAL",
        status: "SENT",
        recipient: "CRM Lead Timeline",
        message: `Activity Note Logged: ${rule.name}`,
      },
    });
  }

  // 5. Reassign Enquiry
  if (actionType === "REASSIGN_ENQUIRY" && targetType === "ENQUIRY" && config.toUserId) {
    await prisma.enquiry.update({
      where: { id: targetId },
      data: { assignedToId: config.toUserId },
    });
    await prisma.automationLog.create({
      data: {
        clientId,
        ruleId: rule.id,
        targetType,
        targetId,
        channel: "INTERNAL",
        status: "SENT",
        recipient: `User ID: ${config.toUserId}`,
        message: `Lead Reassigned: ${rule.name}`,
      },
    });
  }
}

/**
 * 1-Click Installer for the 6 Pre-built Travel Agency Automation Recipes
 */
export async function seedDefaultRecipes(clientId: string) {
  const existingRules = await prisma.automationRule.findMany({ where: { clientId } });
  const existingNames = new Set(existingRules.map((r) => r.name));

  const toCreate = DEFAULT_TRAVEL_RECIPES.filter((r) => !existingNames.has(r.name));

  for (const recipe of toCreate) {
    await prisma.automationRule.create({
      data: {
        clientId,
        name: recipe.name,
        isActive: true,
        triggerType: recipe.triggerType,
        triggerConfig: recipe.triggerConfig,
        actionType: recipe.actionType,
        actionConfig: recipe.actionConfig,
      },
    });
  }

  return prisma.automationRule.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });
}
