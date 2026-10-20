export type TravelerType = "ADULT" | "CHILD" | "INFANT";
export type TravelerGender = "MALE" | "FEMALE" | "OTHER";
export type DocumentVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type DocumentCategory =
  | "PASSPORT_FRONT"
  | "PASSPORT_BACK"
  | "AADHAAR_FRONT"
  | "AADHAAR_BACK"
  | "PAN_CARD"
  | "DRIVING_LICENSE"
  | "VISA"
  | "AIR_TICKET"
  | "TRAVEL_INSURANCE"
  | "VACCINATION_CERT"
  | "HOTEL_VOUCHER"
  | "PERMIT"
  | "OTHER";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  PASSPORT_FRONT: "Passport (Front / Photo Page)",
  PASSPORT_BACK: "Passport (Address Page)",
  AADHAAR_FRONT: "Aadhaar Card (Front)",
  AADHAAR_BACK: "Aadhaar Card (Back)",
  PAN_CARD: "PAN Card",
  DRIVING_LICENSE: "Driving License",
  VISA: "Visa Copy",
  AIR_TICKET: "Flight / Train Ticket",
  TRAVEL_INSURANCE: "Travel Insurance",
  VACCINATION_CERT: "Vaccination / Health Cert",
  HOTEL_VOUCHER: "Hotel Voucher",
  PERMIT: "Inner Line / Border Permit",
  OTHER: "Other ID / Document",
};

export interface BookingTraveler {
  id: string;
  clientId: string;
  bookingId: string;
  travelerType: TravelerType;
  fullName: string;
  gender: TravelerGender;
  dateOfBirth?: string | null;
  nationality?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  passportWarning?: "VALID" | "EXPIRING_SOON" | "EXPIRED" | null;
  idType?: string | null;
  idNumber?: string | null;
  foodPreference?: string | null;
  specialRequests?: string | null;
  isLeadPassenger: boolean;
  createdAt: string;
  updatedAt: string;
  documents?: BookingDocument[];
}

export interface BookingDocument {
  id: string;
  clientId: string;
  bookingId: string;
  travelerId?: string | null;
  category: DocumentCategory;
  title: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  verificationStatus: DocumentVerificationStatus;
  rejectionReason?: string | null;
  uploadedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  traveler?: {
    id: string;
    fullName: string;
  } | null;
}

export interface BookingVaultData {
  booking: {
    id: string;
    travelStart?: string | null;
    travelEnd?: string | null;
    status: string;
    docShareToken: string;
    customer?: {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
    } | null;
  };
  travelers: BookingTraveler[];
  documents: BookingDocument[];
}

export interface PublicVaultData {
  booking: {
    id: string;
    travelStart?: string | null;
    travelEnd?: string | null;
    status: string;
    customer?: {
      name: string;
      phone: string;
      email?: string | null;
    } | null;
  };
  company: {
    companyName?: string | null;
    logoUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    primaryColor?: string | null;
  };
  travelers: BookingTraveler[];
  documents: BookingDocument[];
}
