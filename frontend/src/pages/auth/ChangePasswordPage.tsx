import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Paper, TextField, Typography, Alert } from "@mui/material";
import { apiClient } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";

// Forced first-login password change (SRS section 2/13). The temporary
// password from the welcome email is the "current password" here.
export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { auth } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    try {
      await apiClient.post("/auth/change-password", { currentPassword, newPassword });
      const { data: statusRes } = await apiClient.get("/onboarding/status");
      const onboardingCompleted = Boolean(statusRes?.data?.onboardingCompleted);

      if (auth?.isClientAdmin) {
        if (!onboardingCompleted) {
          navigate("/onboarding");
        } else {
          navigate("/app/dashboard");
        }
      } else if (auth?.permissions?.dashboard?.view) {
        navigate("/app/dashboard");
      } else if (auth?.permissions?.enquiries?.view) {
        navigate("/app/enquiries");
      } else if (auth?.permissions?.bookings?.view) {
        navigate("/app/bookings");
      } else if (auth?.permissions?.customers?.view) {
        navigate("/app/customers");
      } else {
        navigate("/app/profile");
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Could not update password");
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="grey.100">
      <Paper sx={{ p: 4, width: 380 }} component="form" onSubmit={handleSubmit}>
        <Typography variant="h5" gutterBottom>Set a new password</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          For security, you must change your temporary password before continuing.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth label="Temporary / current password" type="password" margin="normal"
          value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        <TextField fullWidth label="New password" type="password" margin="normal"
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
          helperText="At least 8 characters" />
        <TextField fullWidth label="Confirm new password" type="password" margin="normal"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <Button fullWidth type="submit" variant="contained" sx={{ mt: 2 }}>Continue</Button>
      </Paper>
    </Box>
  );
}
