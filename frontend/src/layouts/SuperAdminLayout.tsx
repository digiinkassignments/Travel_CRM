import { NavLink, Outlet } from "react-router-dom";
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar } from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import CardMembershipRoundedIcon from "@mui/icons-material/CardMembershipRounded";
import MarkEmailUnreadRoundedIcon from "@mui/icons-material/MarkEmailUnreadRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/digiink-solutions-logo.png";

const NAV = [
  { to: "/super-admin/dashboard", label: "Dashboard", icon: DashboardRoundedIcon },
  { to: "/super-admin/clients", label: "Clients", icon: PeopleAltRoundedIcon },
  { to: "/super-admin/plans", label: "Plan Manager", icon: CardMembershipRoundedIcon },
  { to: "/super-admin/payment-notices", label: "Payment Notices", icon: MarkEmailUnreadRoundedIcon },
  { to: "/super-admin/audit-logs", label: "Audit Log", icon: HistoryRoundedIcon },
  { to: "/super-admin/system-health", label: "System Health", icon: MonitorHeartRoundedIcon },
];

const DRAWER_WIDTH = 260;
const SIDEBAR_BG = "#16232e";

export function SuperAdminLayout() {
  const { logout } = useAuth();

  return (
    <Box display="flex" minHeight="100vh" sx={{ bgcolor: "#f4f6f9" }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          bgcolor: SIDEBAR_BG,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 4, pb: 3 }}>
          <Box
            component="img"
            src={logo}
            alt="DigiInk Solutions"
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              mb: 1.5,
              objectFit: "cover",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
              border: "2px solid rgba(255,255,255,0.12)",
            }}
          />
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            DigiInk Admin
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
            Super Admin Panel
          </Typography>
        </Box>

        <Typography
          variant="caption"
          sx={{ color: "rgba(255,255,255,0.4)", letterSpacing: 1, px: 3, mb: 1, fontWeight: 600 }}
        >
          MAIN MENU
        </Typography>

        <List sx={{ px: 2, flexGrow: 1 }}>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  color: "rgba(255,255,255,0.75)",
                  "&.active": {
                    bgcolor: "#2f6fed",
                    color: "#fff",
                    "& .MuiListItemIcon-root": { color: "#fff" },
                  },
                  "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
              </ListItemButton>
            );
          })}
        </List>

        <Box sx={{ px: 2, pb: 3 }}>
          <ListItemButton
            onClick={logout}
            sx={{
              borderRadius: 2,
              color: "#ff6b6b",
              "&:hover": { bgcolor: "rgba(255,107,107,0.08)" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: "#ff6b6b" }}>
              <LogoutRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
          </ListItemButton>
        </Box>
      </Box>

      {/* Main content */}
      <Box component="main" flexGrow={1} sx={{ ml: `${DRAWER_WIDTH}px`, width: `calc(100% - ${DRAWER_WIDTH}px)` }}>
        <Outlet />
      </Box>
    </Box>
  );
}
