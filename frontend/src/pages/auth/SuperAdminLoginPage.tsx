import { Box, Typography } from "@mui/material";
import { LoginForm } from "../../components/auth/LoginForm";
import adminLogo from "../../assets/digiink-solutions-logo.png";

export function SuperAdminLoginPage() {
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
          component="img"
          src={adminLogo}
          alt="DigiInk Solutions"
          sx={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            mb: 4,
            objectFit: "cover",
            boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
            border: "2px solid rgba(255,255,255,0.15)",
          }}
        />
        <Typography variant="h4" fontWeight={800} textAlign="center" gutterBottom>
          Platform Control, Centralized
        </Typography>
        <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.7)" }} textAlign="center" maxWidth={420}>
          Oversee every client, plan and payment across the platform from a single admin panel.
        </Typography>
      </Box>

      <Box flex={1} display="flex" alignItems="center" justifyContent="center" px={3} sx={{ bgcolor: "#f6f7fb" }}>
        <LoginForm audience="admin" />
      </Box>
    </Box>
  );
}
