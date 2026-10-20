import { Box, Typography } from "@mui/material";
import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";
import { ResetPasswordForm } from "../../components/auth/ResetPasswordForm";

export function ResetPasswordPage() {
  return (
    <Box display="flex" minHeight="100vh">
      <Box
        flex={1}
        display={{ xs: "none", md: "flex" }}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        px={6}
        sx={{ bgcolor: "#fff" }}
      >
        <Box
          sx={{
            width: 72, height: 72, borderRadius: 3, bgcolor: "#eaf1ff",
            display: "flex", alignItems: "center", justifyContent: "center", mb: 4,
          }}
        >
          <DashboardCustomizeRoundedIcon sx={{ color: "#2f6fed", fontSize: 36 }} />
        </Box>
        <Typography variant="h4" fontWeight={800} textAlign="center" gutterBottom>
          Run Your Business, Effortlessly
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={420}>
          Manage leads, bookings, invoices and your team from one dashboard built for your business.
        </Typography>
      </Box>

      <Box flex={1} display="flex" alignItems="center" justifyContent="center" px={3} sx={{ bgcolor: "#f6f7fb" }}>
        <ResetPasswordForm audience="client" />
      </Box>
    </Box>
  );
}
