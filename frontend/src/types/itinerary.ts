export interface ItineraryDay {
  id?: string;
  dayNumber: number;
  date?: string | null;
  title: string;
  stayCity?: string | null;
  description: string;
  meals?: string[];
  hotelName?: string | null;
  roomCategory?: string | null;
  hotelRating?: number | null;
  transferDetails?: string | null;
  photos?: string[];
}

export interface ItineraryPricingTier {
  id?: string;
  tierName: string;
  pricePerPerson: number; // in Paise
  totalPrice: number;     // in Paise
  hotelOverview?: string | null;
  isRecommended: boolean;
}

export type ItineraryStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface Itinerary {
  id: string;
  clientId: string;
  enquiryId?: string | null;
  customerId?: string | null;
  shareSlug: string;
  passcode?: string | null;
  status: ItineraryStatus;

  tripTitle: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  totalDays: number;
  totalNights: number;
  adultsCount: number;
  childrenCount: number;
  coverImageUrl?: string | null;

  inclusions?: string[];
  exclusions?: string[];
  termsAndConditions?: string | null;
  cancellationPolicy?: string | null;

  showPricing: boolean;
  showHotels: boolean;
  allowDirectAccept: boolean;

  createdAt: string;
  updatedAt: string;

  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;

  enquiry?: {
    id: string;
    destination?: string | null;
    travelDate?: string | null;
  } | null;

  days: ItineraryDay[];
  pricingTiers: ItineraryPricingTier[];

  _count?: {
    days: number;
    pricingTiers: number;
  };
}

export interface PublicItineraryView {
  id: string;
  shareSlug: string;
  tripTitle: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  totalDays: number;
  totalNights: number;
  adultsCount: number;
  childrenCount: number;
  coverImageUrl?: string | null;
  inclusions?: string[];
  exclusions?: string[];
  termsAndConditions?: string | null;
  cancellationPolicy?: string | null;
  status: ItineraryStatus;
  allowDirectAccept: boolean;
  showPricing: boolean;
  showHotels: boolean;
  customerName?: string | null;
  agency: {
    name: string;
    logoUrl?: string | null;
    phone: string;
    email: string;
    address?: string | null;
    primaryColor: string;
    secondaryColor: string;
    whatsappNumber: string;
    websiteUrl?: string | null;
    footerNotes?: string | null;
  };
  days: Array<{
    id: string;
    dayNumber: number;
    date?: string | null;
    title: string;
    stayCity?: string | null;
    description: string;
    meals?: string[];
    hotelName?: string | null;
    roomCategory?: string | null;
    hotelRating?: number | null;
    transferDetails?: string | null;
    photos?: string[];
  }>;
  pricingTiers: Array<{
    id: string;
    tierName: string;
    pricePerPerson: number;
    totalPrice: number;
    hotelOverview?: string | null;
    isRecommended: boolean;
  }>;
}
