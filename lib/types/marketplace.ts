// Generic marketplace types — backend naming is intentionally category-agnostic.
// The frontend MVP exposes massage only; these types must never reference massage directly.

export type Locale = 'nl' | 'en';

export type UserRole = 'customer' | 'provider' | 'admin';

// --- Providers (massage therapists in MVP, any service provider in future) ---

export interface Provider {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  city: string; // 'Utrecht' for MVP
  serviceAreaKm: number;
  isVerified: boolean;
  isActive: boolean;
  stripeAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Service Categories (e.g. massage, cleaning — only massage active in MVP) ---

export interface ServiceCategory {
  id: string;
  slug: string; // e.g. 'massage', 'cleaning'
  nameNl: string;
  nameEn: string;
  isActive: boolean;
}

// --- Services (individual offerings by a provider) ---

export interface Service {
  id: string;
  categoryId: string;
  nameNl: string;
  nameEn: string;
  descriptionNl: string | null;
  descriptionEn: string | null;
  durationMinutes: number;
  priceEuroCents: number; // Store in cents to avoid floating point issues
}

// --- Provider Services (which services a provider offers) ---

export interface ProviderService {
  id: string;
  providerId: string;
  serviceId: string;
  customPriceEuroCents: number | null; // Override base price if set
  isActive: boolean;
}

// --- Bookings ---

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  providerServiceId: string;
  status: BookingStatus;
  scheduledAt: string; // ISO 8601
  durationMinutes: number;
  address: string;
  addressLat: number | null;
  addressLng: number | null;
  totalEuroCents: number;
  platformFeeEuroCents: number;
  providerEarningsEuroCents: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Payments ---

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  bookingId: string;
  stripePaymentIntentId: string;
  status: PaymentStatus;
  amountEuroCents: number;
  createdAt: string;
}

// --- Reviews ---

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  providerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  isPublished: boolean;
  createdAt: string;
}

// --- API response wrappers ---

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;
