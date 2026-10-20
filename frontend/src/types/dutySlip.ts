export type DutySlipStatus =
  | "GENERATED"
  | "DISPATCHED"
  | "STARTED"
  | "COMPLETED"
  | "BILLED"
  | "CANCELLED";

export type DutyExpenseType =
  | "TOLL"
  | "PARKING"
  | "STATE_TAX"
  | "FUEL"
  | "DRIVER_ALLOWANCE"
  | "MISC";

export interface DutySlipExpense {
  id: string;
  clientId: string;
  dutySlipId: string;
  expenseType: DutyExpenseType;
  amountInPaise: number;
  receiptUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface DutySlip {
  id: string;
  clientId: string;
  tripId: string;
  slipNumber: string;
  shareToken: string;

  passengerName?: string | null;
  passengerPhone?: string | null;
  pickupAddress?: string | null;
  dropAddress?: string | null;
  reportingTime?: string | null;

  driverName?: string | null;
  driverPhone?: string | null;
  vehicleNumber?: string | null;
  vehicleModel?: string | null;

  startOdometer?: number | null;
  endOdometer?: number | null;
  totalKm?: number | null;

  startTime?: string | null;
  endTime?: string | null;
  totalHours?: number | null;

  startOdoPhotoUrl?: string | null;
  endOdoPhotoUrl?: string | null;

  tollChargesInPaise: number;
  parkingChargesInPaise: number;
  stateTaxInPaise: number;
  fuelChargesInPaise: number;
  driverAllowanceInPaise: number;
  otherChargesInPaise: number;
  totalExpensesInPaise: number;

  customerOtp?: string | null;
  otpVerified: boolean;
  customerSignature?: string | null;
  customerRating?: number | null;
  customerFeedback?: string | null;

  status: DutySlipStatus;
  notes?: string | null;
  dispatchedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  expenses?: DutySlipExpense[];
  trip?: {
    id: string;
    pickup?: string | null;
    drop?: string | null;
    status: string;
    driver?: { id: string; name: string; contact: string } | null;
    vehicle?: { id: string; registrationNumber: string; vehicleType: string; vehicleName?: string | null } | null;
    booking?: {
      id: string;
      customer: { name: string; phone: string; email?: string | null };
    } | null;
  };
  client?: {
    businessName: string;
    companyProfile?: {
      companyName?: string | null;
      logoUrl?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      gstNumber?: string | null;
      primaryColor?: string | null;
    } | null;
  };
}
