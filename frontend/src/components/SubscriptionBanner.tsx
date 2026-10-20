import { Alert } from "@mui/material";

// Warning banners per SRS section 4.1 — shown on every client screen
// during EXPIRING_SOON / GRACE, never during ACTIVE/LOCKED (LOCKED already
// redirects to the dedicated payment-renewal page).
export function SubscriptionBanner({ status, expiry }: { status?: string; expiry?: string }) {
  if (status === "EXPIRING_SOON") {
    return (
      <Alert severity="warning" sx={{ borderRadius: 0 }}>
        Your plan is expiring soon{expiry ? ` (${new Date(expiry).toLocaleDateString()})` : ""} — renew to avoid interruption.
      </Alert>
    );
  }
  if (status === "GRACE") {
    return (
      <Alert severity="error" sx={{ borderRadius: 0 }}>
        Your plan has expired. Please renew within a few days to avoid losing access. Everything still works during this grace period.
      </Alert>
    );
  }
  return null;
}
