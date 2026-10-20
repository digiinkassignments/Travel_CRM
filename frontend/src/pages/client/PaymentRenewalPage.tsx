import { useEffect, useState } from "react";
import { Alert, Box, Button, Paper, Typography, Stack, CircularProgress } from "@mui/material";
import LockPersonRoundedIcon from "@mui/icons-material/LockPersonRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";

export function PaymentRenewalPage() {
  const { auth, setAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ subscriptionStatus: string; subscriptionExpiry: string } | null>(null);
  const [notified, setNotified] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = () => {
    setLoading(true);
    apiClient
      .get("/payment-renewal")
      .then(({ data }) => {
        setInfo(data.data);
        if (data.data && data.data.subscriptionStatus !== "LOCKED") {
          // Account has been reactivated or unlocked!
          if (auth) {
            setAuth({ ...auth, subscriptionStatus: data.data.subscriptionStatus });
          } else {
            localStorage.setItem("subscriptionStatus", data.data.subscriptionStatus);
          }
          navigate("/app/dashboard", { replace: true });
        }
      })
      .catch((err) => {
        console.error("Failed to load /payment-renewal status", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    checkStatus();
  }, []);

  async function handlePaid() {
    await apiClient.post("/payment-renewal/notify", {});
    setNotified(true);
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const isUnlocked = info && info.subscriptionStatus !== "LOCKED";

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ bgcolor: "#0f172a", p: 2 }}>
      <Paper sx={{ p: 4, width: "100%", maxWidth: 460, borderRadius: 3, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: isUnlocked ? "#dcfce7" : "#fee2e2",
              color: isUnlocked ? "#16a34a" : "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isUnlocked ? <CheckCircleOutlineRoundedIcon fontSize="medium" /> : <LockPersonRoundedIcon fontSize="medium" />}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {isUnlocked ? "Account Restored" : "Account Locked / Deactivated"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Digiink Cloud Business Suite
            </Typography>
          </Box>
        </Box>

        {isUnlocked ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your account is now active and full access has been restored!
          </Alert>
        ) : (
          <Alert severity="error" sx={{ mb: 3 }}>
            This account has been deactivated or locked. Access to CRM modules is currently restricted.
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={28} />
          </Box>
        ) : info ? (
          <Box sx={{ p: 2, mb: 3, bgcolor: "grey.50", borderRadius: 2, border: "1px solid #e2e8f0" }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Status: <strong style={{ color: info.subscriptionStatus === "LOCKED" ? "#dc2626" : "#16a34a" }}>{info.subscriptionStatus}</strong>
            </Typography>
            {info.subscriptionExpiry && (
              <Typography variant="body2" color="text.secondary">
                Valid Until: {new Date(info.subscriptionExpiry).toLocaleDateString()}
              </Typography>
            )}
          </Box>
        ) : null}

        {!isUnlocked && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              If you have recently made a renewal payment, please notify our admin team below or contact your system administrator.
            </Typography>
            {notified ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                We've notified the Super Admin team — your access will be restored once reviewed.
              </Alert>
            ) : (
              <Button fullWidth variant="contained" size="large" sx={{ mb: 2, py: 1.2 }} onClick={handlePaid}>
                I Have Made The Payment / Request Review
              </Button>
            )}
            <Button fullWidth variant="outlined" size="small" sx={{ mb: 3 }} onClick={checkStatus}>
              Check Account Status
            </Button>
          </>
        )}

        {isUnlocked && (
          <Button fullWidth variant="contained" size="large" sx={{ mb: 3 }} onClick={() => navigate("/app/dashboard", { replace: true })}>
            Proceed to Dashboard
          </Button>
        )}

        <Stack direction="row" justifyContent="center">
          <Button
            size="small"
            color="inherit"
            startIcon={<LogoutRoundedIcon />}
            onClick={handleLogout}
            sx={{ color: "text.secondary" }}
          >
            Sign Out
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
