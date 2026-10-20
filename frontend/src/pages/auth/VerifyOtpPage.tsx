import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Paper, TextField, Typography, Alert } from "@mui/material";
import { apiClient } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";

function getClientLanding(permissions: Record<string, { view?: boolean }> | undefined) {
  if (permissions?.dashboard?.view) return "/app/dashboard";
  if (permissions?.enquiries?.view) return "/app/enquiries";
  if (permissions?.bookings?.view) return "/app/bookings";
  if (permissions?.customers?.view) return "/app/customers";
  if (permissions?.reports?.view) return "/app/reports";
  return "/app/profile";
}

export function VerifyOtpPage() {
  const location = useLocation() as { state?: { otpToken?: string; email?: string } };
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const otpToken = location.state?.otpToken;

  if (!otpToken) {
    navigate("/login", { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await apiClient.post("/auth/verify-otp", { otpToken, code });
      const { accessToken, refreshToken, role, subscriptionStatus, mustChangePassword, onboardingCompleted, permissions, isClientAdmin } = data.data;
      setAuth({ accessToken, refreshToken, role, subscriptionStatus, mustChangePassword, permissions, isClientAdmin });

      if (subscriptionStatus === "LOCKED") {
        navigate("/payment-renewal");
      } else if (mustChangePassword) {
        navigate("/change-password");
      } else if (!onboardingCompleted) {
        navigate("/onboarding");
      } else {
        navigate(getClientLanding(permissions));
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Invalid code");
    }
  }

  async function handleResend() {
    setError(null);
    try {
      await apiClient.post("/auth/resend-otp", { otpToken });
      setResent(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Could not resend code");
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="grey.100">
      <Paper sx={{ p: 4, width: 360 }} component="form" onSubmit={handleSubmit}>
        <Typography variant="h5" gutterBottom>Enter your code</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          We emailed a 6-digit code to {location.state?.email ?? "your address"}.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {resent && <Alert severity="success" sx={{ mb: 2 }}>Code resent.</Alert>}
        <TextField
          fullWidth label="6-digit code" margin="normal" value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputProps={{ maxLength: 6 }} required
        />
        <Button fullWidth type="submit" variant="contained" sx={{ mt: 2 }}>Verify</Button>
        <Button fullWidth onClick={handleResend} sx={{ mt: 1 }}>Resend code</Button>
      </Paper>
    </Box>
  );
}
