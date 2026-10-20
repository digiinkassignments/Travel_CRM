import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Paper, TextField, Typography, Alert } from "@mui/material";
import { apiClient } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await apiClient.post("/auth/login", { email, password });

      if (data.data.role === "SUPER_ADMIN") {
        const { accessToken, refreshToken, role } = data.data;
        setAuth({ accessToken, refreshToken, role });
        return navigate("/super-admin/dashboard");
      }

      // OTP is currently disabled server-side (see auth.controller.ts,
      // OTP_LOGIN_ENABLED) — the login response carries real tokens
      // directly. If OTP gets re-enabled later, data.data.otpRequired
      // will be true instead and this branch needs to route to
      // /verify-otp with data.data.otpToken, same as before.
      const { accessToken, refreshToken, role, subscriptionStatus, mustChangePassword, onboardingCompleted } = data.data;
      setAuth({ accessToken, refreshToken, role, subscriptionStatus, mustChangePassword });

      if (subscriptionStatus === "LOCKED") {
        navigate("/payment-renewal");
      } else if (mustChangePassword) {
        navigate("/change-password");
      } else if (!onboardingCompleted) {
        navigate("/onboarding");
      } else {
        navigate("/app/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Login failed");
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="grey.100">
      <Paper sx={{ p: 4, width: 360 }} component="form" onSubmit={handleSubmit}>
        <Typography variant="h5" gutterBottom>Digiink Travel CRM</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          fullWidth label="Email" margin="normal" value={email}
          onChange={(e) => setEmail(e.target.value)} type="email" required
        />
        <TextField
          fullWidth label="Password" margin="normal" value={password}
          onChange={(e) => setPassword(e.target.value)} type="password" required
        />
        <Button fullWidth type="submit" variant="contained" sx={{ mt: 2 }}>Log in</Button>
      </Paper>
    </Box>
  );
}
