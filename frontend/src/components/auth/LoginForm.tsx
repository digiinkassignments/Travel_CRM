import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Button, TextField, Typography, Alert, InputAdornment, IconButton,
  Checkbox, FormControlLabel, Avatar,
} from "@mui/material";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { apiClient } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import logo from "../../assets/digiink-logo.jpeg";

type Audience = "client" | "admin";

function getClientLanding(permissions: Record<string, { view?: boolean }> | undefined) {
  if (permissions?.dashboard?.view) return "/app/dashboard";
  if (permissions?.enquiries?.view) return "/app/enquiries";
  if (permissions?.bookings?.view) return "/app/bookings";
  if (permissions?.customers?.view) return "/app/customers";
  if (permissions?.reports?.view) return "/app/reports";
  return "/app/profile";
}

const COPY: Record<Audience, {
  heading: string; subheading: string; emailPlaceholder: string;
  accentColor: string; accentHover: string; wrongRoleMessage: string; switchHref: string; switchLabel: string;
  forgotPasswordHref: string;
}> = {
  client: {
    heading: "DigiInk CRM",
    subheading: "Sign in to manage your business",
    emailPlaceholder: "you@example.com",
    accentColor: "#2f6fed",
    accentHover: "#2559c4",
    wrongRoleMessage: "This is a platform administrator account. Please use the admin login instead.",
    switchHref: "/admin/login",
    switchLabel: "Platform administrator? Sign in here",
    forgotPasswordHref: "/forgot-password",
  },
  admin: {
    heading: "DigiInk Admin",
    subheading: "Sign in to the platform control panel",
    emailPlaceholder: "you@digiinksolutions.com",
    accentColor: "#16232e",
    accentHover: "#0d151c",
    wrongRoleMessage: "This account isn't a platform administrator. Please use the client login instead.",
    switchHref: "/login",
    switchLabel: "Client user? Sign in here",
    forgotPasswordHref: "/admin/forgot-password",
  },
};

export function LoginForm({ audience }: { audience: Audience }) {
  const copy = COPY[audience];
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/auth/login", { email, password });
      const role = data.data.role;

      // Each login page is scoped to one audience. The backend has no
      // separate admin-vs-client login endpoint, so this check is UX
      // only — it stops a client account from silently landing in the
      // admin shell (or vice versa) via the wrong page, without issuing
      // any tokens for the mismatched flow.
      const expectedRole = audience === "admin" ? "SUPER_ADMIN" : "CLIENT_USER";
      if (role !== expectedRole) {
        setError(copy.wrongRoleMessage);
        setSubmitting(false);
        return;
      }

      if (role === "SUPER_ADMIN") {
        const { accessToken, refreshToken } = data.data;
        setAuth({ accessToken, refreshToken, role });
        return navigate("/super-admin/dashboard");
      }

      // OTP is currently disabled server-side (see auth.controller.ts,
      // OTP_LOGIN_ENABLED) — the login response carries real tokens
      // directly. If OTP gets re-enabled later, data.data.otpRequired
      // will be true instead and this branch needs to route to
      // /verify-otp with data.data.otpToken, same as before.
      const { accessToken, refreshToken, subscriptionStatus, mustChangePassword, onboardingCompleted, permissions, isClientAdmin } = data.data;
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
      setError(err.response?.data?.message ?? "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
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
        <Typography variant="h5" fontWeight={800}>
          {copy.heading}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {copy.subheading}
        </Typography>
      </Box>

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
        sx={{ mb: 2.5 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <MailOutlineRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
            </InputAdornment>
          ),
        }}
      />

      <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
        Password
      </Typography>
      <TextField
        fullWidth
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type={showPassword ? "text" : "password"}
        required
        autoComplete="current-password"
        sx={{ mb: 1.5 }}
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

      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
          }
          label={<Typography variant="body2">Remember Me</Typography>}
        />
        <a
          href={copy.forgotPasswordHref}
          style={{ color: copy.accentColor, fontWeight: 600, fontSize: 14, textDecoration: "none" }}
        >
          Forgot password?
        </a>
      </Box>

      <Button
        fullWidth
        type="submit"
        variant="contained"
        disabled={submitting}
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
        {submitting ? "Signing in..." : "LOGIN"}
      </Button>

      <Typography variant="body2" textAlign="center" mt={2.5}>
        <a href={copy.switchHref} style={{ color: copy.accentColor, fontWeight: 600, textDecoration: "none" }}>
          {copy.switchLabel}
        </a>
      </Typography>

      <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
        © {new Date().getFullYear()} DigiInk Solutions
      </Typography>
    </Box>
  );
}
