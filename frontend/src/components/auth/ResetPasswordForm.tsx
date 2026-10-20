import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Button, TextField, Typography, Alert, InputAdornment, IconButton, Avatar } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { apiClient } from "../../api/client";
import logo from "../../assets/digiink-logo.jpeg";

type Audience = "client" | "admin";

const COPY: Record<Audience, { accentColor: string; accentHover: string; loginHref: string }> = {
  client: { accentColor: "#2f6fed", accentHover: "#2559c4", loginHref: "/login" },
  admin: { accentColor: "#16232e", accentHover: "#0d151c", loginHref: "/admin/login" },
};

export function ResetPasswordForm({ audience }: { audience: Audience }) {
  const copy = COPY[audience];
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", { token, newPassword });
      setDone(true);
      setTimeout(() => navigate(copy.loginHref), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "This reset link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 440,
        bgcolor: "#fff",
        borderRadius: 4,
        boxShadow: "0 8px 30px rgba(16,24,40,0.08)",
        p: { xs: 3, sm: 5 },
      }}
    >
      <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
        <Avatar src={logo} alt="DigiInk Solutions" sx={{ width: 72, height: 72, mb: 2 }} />
        <Typography variant="h5" fontWeight={800} textAlign="center">
          Set a new password
        </Typography>
      </Box>

      {!token && (
        <Alert severity="error" sx={{ mb: 2 }}>
          This link is missing required information. Please request a new reset link from the login page.
        </Alert>
      )}

      {done ? (
        <Alert severity="success">Password updated. Redirecting you to login...</Alert>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
            New Password
          </Typography>
          <TextField
            fullWidth
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            disabled={!token}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                    {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
            Confirm New Password
          </Typography>
          <TextField
            fullWidth
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            disabled={!token}
            sx={{ mb: 1.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={submitting || !token}
            sx={{
              mt: 1,
              py: 1.4,
              fontWeight: 700,
              letterSpacing: 0.5,
              borderRadius: 2,
              bgcolor: copy.accentColor,
              "&:hover": { bgcolor: copy.accentHover },
            }}
          >
            {submitting ? "Resetting..." : "RESET PASSWORD"}
          </Button>
        </Box>
      )}

      <Typography variant="body2" textAlign="center" mt={2.5}>
        <a href={copy.loginHref} style={{ color: copy.accentColor, fontWeight: 600, textDecoration: "none" }}>
          Back to login
        </a>
      </Typography>
    </Box>
  );
}
