import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Button, TextField, Typography, Alert, InputAdornment, IconButton, Avatar } from "@mui/material";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { apiClient } from "../../api/client";
import logo from "../../assets/digiink-logo.jpeg";

type Audience = "client" | "admin";
type Step = "email" | "otp";

// Mirrors the COPY table in LoginForm.tsx so both screens read as one flow.
const COPY: Record<Audience, { accentColor: string; accentHover: string; loginHref: string; emailPlaceholder: string }> = {
  client: { accentColor: "#2f6fed", accentHover: "#2559c4", loginHref: "/login", emailPlaceholder: "you@example.com" },
  admin: { accentColor: "#16232e", accentHover: "#0d151c", loginHref: "/admin/login", emailPlaceholder: "you@digiinksolutions.com" },
};

export function ForgotPasswordForm({ audience }: { audience: Audience }) {
  const copy = COPY[audience];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialEmail = searchParams.get("email") || "";
  const initialOtp = searchParams.get("otp") || "";

  const [step, setStep] = useState<Step>(initialOtp ? "otp" : "email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(initialOtp);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      // Backend always returns the same generic message regardless of
      // whether the email exists, so this screen can't be used to
      // enumerate accounts either.
      setInfo("If an account exists with that email, a 6-digit code has been sent.");
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendOtp() {
    setError(null);
    setInfo(null);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setInfo("A new code has been sent to your email.");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Could not resend the code. Please try again.");
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", { email, otp, newPassword });
      setDone(true);
      setTimeout(() => navigate(copy.loginHref), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "This code is invalid or has expired.");
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
          {step === "email" ? "Reset your password" : (initialOtp ? "Set your new password" : "Enter your code")}
        </Typography>
        {step === "email" && !done && (
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={0.5}>
            Enter your account email and we'll send you a 6-digit reset code.
          </Typography>
        )}
        {step === "otp" && !done && (
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={0.5}>
            {initialOtp
              ? `Your setup verification code is pre-filled. Enter your new password for ${email || "your account"} below.`
              : `We sent a 6-digit code to ${email}. Enter it below with your new password.`}
          </Typography>
        )}
      </Box>

      {done ? (
        <Alert severity="success">Password updated. Redirecting you to login...</Alert>
      ) : step === "email" ? (
        <Box component="form" onSubmit={handleSendOtp}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
            Email Address
          </Typography>
          <TextField
            fullWidth
            placeholder={copy.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="username"
            autoFocus
            sx={{ mb: 2.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailOutlineRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{
              mt: 1, py: 1.4, fontWeight: 700, letterSpacing: 0.5, borderRadius: 2,
              bgcolor: copy.accentColor, "&:hover": { bgcolor: copy.accentHover },
            }}
          >
            {submitting ? "Sending..." : "SEND CODE"}
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleReset}>
          {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
            6-Digit Code
          </Typography>
          <TextField
            fullWidth
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputProps={{ inputMode: "numeric", maxLength: 6, style: { letterSpacing: 4, fontWeight: 600 } }}
            required
            autoFocus
            sx={{ mb: 2 }}
          />

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
            disabled={submitting}
            sx={{
              mt: 1, py: 1.4, fontWeight: 700, letterSpacing: 0.5, borderRadius: 2,
              bgcolor: copy.accentColor, "&:hover": { bgcolor: copy.accentHover },
            }}
          >
            {submitting ? "Resetting..." : "RESET PASSWORD"}
          </Button>

          <Button fullWidth onClick={handleResendOtp} sx={{ mt: 1, fontWeight: 600, color: copy.accentColor }}>
            Resend code
          </Button>
        </Box>
      )}

      <Typography variant="body2" textAlign="center" mt={2.5}>
        <a href={copy.loginHref} style={{ color: copy.accentColor, fontWeight: 600, textDecoration: "none" }}>
          Back to login
        </a>
      </Typography>

      <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
        © {new Date().getFullYear()} DigiInk Solutions
      </Typography>
    </Box>
  );
}
