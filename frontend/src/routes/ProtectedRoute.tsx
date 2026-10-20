import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/auth";

/**
 * Route guard mirroring the backend guard chain on the frontend: this is
 * UX only (hiding routes a user shouldn't see) — the backend's
 * authenticate/resolveTenant/entitlement/RBAC chain is what actually
 * enforces access, per SRS section 42. A user who manually edits the URL
 * still gets rejected server-side even if they briefly see this route.
 */
export function ProtectedRoute({ allow }: { allow: UserRole[] }) {
  const { auth } = useAuth();
  const location = useLocation();

  if (!auth) return <Navigate to="/login" replace />;
  if (!allow.includes(auth.role)) return <Navigate to="/login" replace />;

  // A LOCKED client must only ever reach the payment-renewal page,
  // regardless of which URL they typed — per SRS section 43.
  if (auth.role === "CLIENT_USER" && auth.subscriptionStatus === "LOCKED") {
    if (location.pathname !== "/payment-renewal") {
      return <Navigate to="/payment-renewal" replace />;
    }
  }

  return <Outlet />;
}
