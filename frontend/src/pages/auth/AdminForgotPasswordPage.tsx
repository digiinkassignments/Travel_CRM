import { Box, Typography } from "@mui/material";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import { ForgotPasswordForm } from "../../components/auth/ForgotPasswordForm";

export function AdminForgotPasswordPage() {
  return (
    <Box display="flex" minHeight="100vh">
      <Box
        flex={1}
        display={{ xs: "none", md: "flex" }}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        px={6}
        sx={{ bgcolor: "#16232e", color: "#fff" }}
      >
        <Box
          sx={{
            width: 72, height: 72, borderRadius: 3, bgcolor: "rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center", mb: 4,
          }}
        >
          <AdminPanelSettingsRoundedIcon sx={{ color: "#fff", fontSize: 36 }} />
        </Box>
        <Typography variant="h4" fontWeight={800} textAlign="center" gutterBottom>
          Platform Control, Centralized
        </Typography>
        <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.7)" }} textAlign="center" maxWidth={420}>
          Oversee every client, plan and payment across the platform from a single admin panel.
        </Typography>
      </Box>

      <Box flex={1} display="flex" alignItems="center" justifyContent="center" px={3} sx={{ bgcolor: "#f6f7fb" }}>
        <ForgotPasswordForm audience="admin" />
      </Box>
    </Box>
  );
}
