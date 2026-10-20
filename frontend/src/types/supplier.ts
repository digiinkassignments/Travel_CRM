export type SupplierType =
  | "HOTEL"
  | "TRANSPORTER"
  | "TOUR_GUIDE"
  | "ACTIVITY_PROVIDER"
  | "VISA_AGENT"
  | "OTHER";

export type CostItemType =
  | "HOTEL"
  | "TRANSPORT"
  | "ACTIVITY"
  | "GUIDE"
  | "FLIGHT"
  | "VISA"
  | "MISC";

export type SupplierPaymentMode =
  | "UPI"
  | "BANK_TRANSFER"
  | "CASH"
  | "CHEQUE"
  | "CREDIT_CARD";

export type SupplierPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export type MealPlan = "EP" | "CP" | "MAP" | "AP";

export type VoucherStatus = "ISSUED" | "CONFIRMED" | "CANCELLED";

export interface Supplier {
  id: string;
  clientId: string;
  name: string;
  type: SupplierType;
  contactPerson?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  starRating?: number | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalBilledInPaise?: number;
  totalPaidInPaise?: number;
  balanceDueInPaise?: number;
}

export interface BookingCostItem {
  id: string;
  clientId: string;
  bookingId: string;
  supplierId?: string | null;
  supplier?: Supplier | null;
  itemType: CostItemType;
  description: string;
  quantity: number;
  unitCostInPaise: number;
  totalCostInPaise: number;
  paymentStatus: SupplierPaymentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPayment {
  id: string;
  clientId: string;
  supplierId: string;
  supplier?: { id: string; name: string; type: SupplierType } | null;
  bookingId?: string | null;
  booking?: { id: string; customer: { name: string } } | null;
  amountInPaise: number;
  paymentDate: string;
  mode: SupplierPaymentMode;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CostingSummary {
  bookingId: string;
  customer?: { id: string; name: string; phone: string } | null;
  sellingPriceInPaise: number;
  totalCostInPaise: number;
  grossProfitInPaise: number;
  profitMarginPct: number;
  totalPaidToSuppliersInPaise: number;
  pendingPayablesInPaise: number;
  costItems: BookingCostItem[];
  supplierPayments: SupplierPayment[];
}

export interface HotelVoucher {
  id: string;
  clientId: string;
  bookingId: string;
  supplierId?: string | null;
  supplier?: { id: string; name: string; phone?: string | null; city?: string | null } | null;
  voucherNumber: string;
  hotelName: string;
  city?: string | null;
  checkInDate: string;
  checkOutDate: string;
  roomCategory: string;
  numberOfRooms: number;
  mealPlan: MealPlan;
  guestNames?: string[] | null;
  specialRequests?: string | null;
  status: VoucherStatus;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    customer: { id: string; name: string; phone: string; email?: string | null };
  };
  client?: {
    businessName: string;
    companyProfile?: {
      companyName?: string | null;
      logoUrl?: string | null;
      address?: string | null;
      gstNumber?: string | null;
      phone?: string | null;
      email?: string | null;
      websiteUrl?: string | null;
      primaryColor?: string | null;
    } | null;
  };
}

export interface PayablesSummary {
  totalBilledInPaise: number;
  totalPaidInPaise: number;
  totalPendingInPaise: number;
  supplierCount: number;
}
