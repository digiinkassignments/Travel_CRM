export type UserRole = "SUPER_ADMIN" | "CLIENT_USER";

export type SubscriptionStatus = "ACTIVE" | "EXPIRING_SOON" | "GRACE" | "LOCKED" | "DELETED";

export interface AuthState {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  subscriptionStatus?: SubscriptionStatus;
  mustChangePassword?: boolean;
  isClientAdmin?: boolean;
  permissions?: Record<string, { view?: boolean }>;
}
