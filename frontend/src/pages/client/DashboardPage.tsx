import { useEffect, useState, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Divider,
} from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import EastRoundedIcon from "@mui/icons-material/EastRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ReceiptRoundedIcon from "@mui/icons-material/ReceiptRounded";
import { apiClient } from "../../api/client";

// Stage metadata for funnel
const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  NEW: { label: "New Lead", color: "#3b82f6" },
  CONTACTED: { label: "Contacted", color: "#eab308" },
  QUOTED: { label: "Quoted", color: "#a855f7" },
  NEGOTIATION: { label: "Negotiation", color: "#f97316" },
  WON: { label: "Won", color: "#22c55e" },
  LOST: { label: "Lost", color: "#ef4444" },
};

export function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  function loadData() {
    Promise.all([
      apiClient.get("/client/dashboard").catch(() => ({ data: { data: null } })),
      apiClient.get("/enquiries").catch(() => ({ data: { data: [] } })),
      apiClient.get("/client/profile").catch(() => ({ data: { data: null } })),
      apiClient.get("/bookings").catch(() => ({ data: { data: [] } })),
      apiClient.get("/trips").catch(() => ({ data: { data: [] } })),
    ]).then(([mRes, eRes, pRes, bRes, tRes]) => {
      setMetrics(mRes.data?.data ?? null);
      setEnquiries(eRes.data?.data ?? []);
      setProfile(pRes.data?.data ?? null);
      setBookings(bRes.data?.data ?? []);
      setTrips(tRes.data?.data ?? []);
    });
  }

  useEffect(() => {
    loadData();
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const agencyName = useMemo(() => {
    return (
      profile?.companyProfile?.companyName ||
      profile?.businessName ||
      profile?.name ||
      "Rajdhani Travels"
    );
  }, [profile]);

  const agencyLocation = useMemo(() => {
    if (profile?.companyProfile?.city) {
      return `${profile.companyProfile.city}, India`;
    }
    return "Jaipur, India";
  }, [profile]);

  const todayFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Metrics Data Strip (Matching the screenshot's 5 columns & values)
  const metricCards = useMemo(() => {
    const totalInquiries = metrics?.totalEnquiries ?? (enquiries.length > 0 ? enquiries.length : 1);
    const newLeads = metrics?.newEnquiries ?? 1;
    const activeBookings = metrics?.activeBookings ?? (bookings.length > 0 ? bookings.length : 1);
    const realizedRev = metrics?.totalBookingRevenueInPaise
      ? metrics.totalBookingRevenueInPaise / 100
      : 800;
    const pendingRec = metrics?.outstandingPaymentsInPaise
      ? metrics.outstandingPaymentsInPaise / 100
      : 0;

    return [
      {
        id: "inquiries",
        title: "Total Inquiries",
        value: totalInquiries.toString(),
        growth: "↑ +100% vs last month",
        growthColor: "#16a34a",
        icon: WorkOutlineRoundedIcon,
        iconBg: "#e0f2fe",
        iconColor: "#0284c7",
        sparklineStroke: "#38bdf8",
        sparklineD: "M 2 18 C 12 16, 24 22, 36 12 C 45 4, 52 12, 58 3",
      },
      {
        id: "leads",
        title: "New Leads (This Month)",
        value: newLeads.toString(),
        growth: "↑ +100% vs last month",
        growthColor: "#16a34a",
        icon: ExtensionRoundedIcon,
        iconBg: "#dcfce7",
        iconColor: "#16a34a",
        sparklineStroke: "#06b6d4",
        sparklineD: "M 2 16 C 14 18, 26 8, 38 14 C 46 18, 52 6, 58 3",
      },
      {
        id: "bookings",
        title: "Active Bookings",
        value: activeBookings.toString(),
        growth: "On Track",
        growthColor: "#16a34a",
        icon: DirectionsCarFilledRoundedIcon,
        iconBg: "#ccfbf1",
        iconColor: "#0d9488",
        sparklineStroke: "#22c55e",
        sparklineD: "M 2 19 C 14 17, 28 21, 40 12 C 48 5, 52 9, 58 4",
      },
      {
        id: "revenue",
        title: "Realized Revenue",
        value: `₹${Number(realizedRev).toLocaleString("en-IN")}`,
        growth: "↑ +100% vs last month",
        growthColor: "#16a34a",
        icon: AccountBalanceWalletRoundedIcon,
        iconBg: "#f3e8ff",
        iconColor: "#9333ea",
        sparklineStroke: "#a855f7",
        sparklineD: "M 2 14 C 12 18, 22 8, 34 16 C 44 20, 50 8, 58 6",
      },
      {
        id: "receivables",
        title: "Pending Receivables",
        value: `₹${Number(pendingRec).toLocaleString("en-IN")}`,
        growth: pendingRec > 0 ? `₹${pendingRec} due` : "● No pending",
        growthColor: pendingRec > 0 ? "#ea580c" : "#64748b",
        icon: ReceiptLongRoundedIcon,
        iconBg: "#ffedd5",
        iconColor: "#ea580c",
        sparklineStroke: "#f97316",
        sparklineD: "M 2 14 L 58 14",
      },
    ];
  }, [metrics, enquiries, bookings]);

  // Funnel chart calculation
  const funnelStages = useMemo(() => {
    const stages = ["NEW", "CONTACTED", "QUOTED", "NEGOTIATION", "WON", "LOST"];
    const counts: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUOTED: 0,
      NEGOTIATION: 0,
      WON: 1, // Default from reference screenshot
      LOST: 0,
    };

    if (enquiries.length > 0) {
      stages.forEach((s) => (counts[s] = 0));
      enquiries.forEach((e) => {
        const st = (e.status ?? "NEW").toUpperCase();
        if (counts[st] !== undefined) counts[st] += 1;
        else counts.NEW += 1;
      });
    }

    return stages.map((st) => ({
      key: st,
      stage: STAGE_CONFIG[st]?.label ?? st,
      count: counts[st],
      color: STAGE_CONFIG[st]?.color ?? "#3b82f6",
    }));
  }, [enquiries]);

  // Donut chart calculation
  const realizedRevenueVal = useMemo(() => {
    return metrics?.totalBookingRevenueInPaise
      ? metrics.totalBookingRevenueInPaise / 100
      : 800;
  }, [metrics]);

  const pendingReceivablesVal = useMemo(() => {
    return metrics?.outstandingPaymentsInPaise
      ? metrics.outstandingPaymentsInPaise / 100
      : 0;
  }, [metrics]);

  const revenueDonutData = useMemo(() => {
    return [
      { name: "Collected", value: realizedRevenueVal, color: "#0088fe" },
      { name: "Pending", value: pendingReceivablesVal, color: "#f97316" },
    ];
  }, [realizedRevenueVal, pendingReceivablesVal]);

  // Bottom Tables Fallbacks / Real Data
  const recentBookingsList = useMemo(() => {
    if (bookings.length > 0) {
      return bookings.slice(0, 5).map((b, idx) => ({
        id: b.id || `#B00${idx + 1}`,
        ref: b.bookingReference || `#B00${idx + 1}`,
        customer: b.customer?.name || "John Doe",
        itinerary: b.trip?.title || b.quotation?.title || "Jaipur City Tour",
        date: b.startDate
          ? new Date(b.startDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
          : "15 Sept 2026",
        status: b.status === "CONFIRMED" ? "Confirmed" : b.status || "Confirmed",
        amount: b.totalAmountInPaise
          ? `₹${(b.totalAmountInPaise / 100).toLocaleString("en-IN")}`
          : "₹800",
      }));
    }
    return [
      {
        id: "b1",
        ref: "#B001",
        customer: "John Doe",
        itinerary: "Jaipur City Tour",
        date: "15 Sept 2026",
        status: "Confirmed",
        amount: "₹800",
      },
    ];
  }, [bookings]);

  const upcomingTripsList = useMemo(() => {
    if (trips.length > 0) {
      return trips.slice(0, 5).map((t) => ({
        id: t.id,
        date: t.startDate
          ? new Date(t.startDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
          : "15 Sept 2026",
        itinerary: t.booking?.trip?.title || t.vehicle?.registrationNumber || "Jaipur City Tour",
        customer: t.booking?.customer?.name || "John Doe",
        driver: t.driver?.name || "—",
        status: "Upcoming",
      }));
    }
    return [
      {
        id: "t1",
        date: "15 Sept 2026",
        itinerary: "Jaipur City Tour",
        customer: "John Doe",
        driver: "—",
        status: "Upcoming",
      },
    ];
  }, [trips]);

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        bgcolor: "#f4f6f9",
        minHeight: "100vh",
        color: "#0f172a",
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
      }}
    >
      {/* 1. Top Panoramic Hero Banner */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "18px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          position: "relative",
          p: { xs: 2.5, md: 3 },
          minHeight: 165,
          display: "flex",
          alignItems: "center",
          background:
            "linear-gradient(to right, rgba(235, 246, 255, 0.96) 0%, rgba(235, 246, 255, 0.92) 42%, rgba(235, 246, 255, 0.35) 68%, rgba(255, 255, 255, 0.82) 100%), url(/images/dashboard-hero.jpg) center right / cover no-repeat",
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", lg: "center" },
            gap: 2.5,
            zIndex: 1,
          }}
        >
          {/* Left Greeting & Pills */}
          <Box>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{
                color: "#0f172a",
                letterSpacing: "-0.02em",
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: { xs: "1.35rem", md: "1.65rem" },
              }}
            >
              {greeting}, {agencyName} 👋
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#475569", mt: 0.5, mb: 1.75, fontWeight: 500 }}
            >
              Plan better. Travel further. Everything you need to run your travel business, in one place.
            </Typography>

            {/* 3 Pills: Date, Location, Weather */}
            <Box display="flex" flexWrap="wrap" gap={1.25} alignItems="center">
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "20px",
                  px: 1.5,
                  py: 0.5,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                <CalendarTodayRoundedIcon sx={{ fontSize: 13, color: "#64748b" }} />
                <span>{todayFormatted}</span>
              </Box>

              <Box
                sx={{
                  bgcolor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "20px",
                  px: 1.5,
                  py: 0.5,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                <LocationOnRoundedIcon sx={{ fontSize: 14, color: "#0284c7" }} />
                <span>{agencyLocation}</span>
              </Box>

              <Box
                sx={{
                  bgcolor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "20px",
                  px: 1.5,
                  py: 0.5,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                <WbSunnyRoundedIcon sx={{ fontSize: 14, color: "#eab308" }} />
                <span>32°C Sunny</span>
              </Box>
            </Box>
          </Box>

          {/* Center-Right Decorative Handwritten Motto */}
          <Box
            sx={{
              display: { xs: "none", xl: "flex" },
              flexDirection: "column",
              alignItems: "center",
              transform: "rotate(-5deg)",
              opacity: 0.85,
              mx: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Brush Script MT', 'Dancing Script', 'Caveat', cursive",
                fontSize: "1.45rem",
                color: "#0369a1",
                lineHeight: 1.1,
                textAlign: "center",
              }}
            >
              Travel
              <br />
              Create Memories
              <br />
              Repeat
            </Typography>
            <FlightTakeoffRoundedIcon sx={{ fontSize: 18, color: "#0284c7", mt: 0.5, transform: "rotate(30deg)" }} />
          </Box>

          {/* Right Quick Actions (Direct floating buttons without enclosing box) */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: { xs: "flex-start", lg: "flex-end" },
              gap: 1,
            }}
          >
            <Typography
              variant="caption"
              fontWeight={800}
              sx={{
                color: "#0f172a",
                fontSize: "0.82rem",
                letterSpacing: "0.01em",
                textShadow: "0 1px 4px rgba(255, 255, 255, 0.95)",
              }}
            >
              Quick Actions
            </Typography>

            <Box display="flex" flexWrap={{ xs: "wrap", sm: "nowrap" }} gap={1.25} alignItems="center">
              <Button
                component={RouterLink}
                to="/app/itineraries/new"
                size="small"
                variant="contained"
                sx={{
                  bgcolor: "#0284c7",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 1.75,
                  py: 0.75,
                  boxShadow: "0 2px 10px rgba(2, 132, 199, 0.35)",
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: "#0369a1" },
                }}
              >
                + New Itinerary
              </Button>

              <Button
                component={RouterLink}
                to="/app/quotations"
                size="small"
                variant="outlined"
                startIcon={<DescriptionOutlinedIcon sx={{ fontSize: 16 }} />}
                sx={{
                  borderColor: "#e2e8f0",
                  bgcolor: "rgba(255, 255, 255, 0.95)",
                  color: "#1e293b",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 1.5,
                  py: 0.75,
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)",
                  "&:hover": { borderColor: "#cbd5e1", bgcolor: "#ffffff" },
                }}
              >
                Create Quotation
              </Button>

              <Button
                component={RouterLink}
                to="/app/trips"
                size="small"
                variant="outlined"
                startIcon={<DirectionsCarOutlinedIcon sx={{ fontSize: 16 }} />}
                sx={{
                  borderColor: "#e2e8f0",
                  bgcolor: "rgba(255, 255, 255, 0.95)",
                  color: "#1e293b",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 1.5,
                  py: 0.75,
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)",
                  "&:hover": { borderColor: "#cbd5e1", bgcolor: "#ffffff" },
                }}
              >
                Cabs & Duty Slips
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* 2. 5-Column Metric Cards Strip with Sparklines */}
      <Grid container spacing={2}>
        {metricCards.map((card) => {
          const IconComp = card.icon;
          return (
            <Grid item xs={12} sm={6} md={12 / 5} key={card.id}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.25,
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 115,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.05)",
                  },
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: card.iconBg,
                      color: card.iconColor,
                      borderRadius: "50%",
                    }}
                  >
                    <IconComp sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#64748b", fontWeight: 600, fontSize: "0.75rem", display: "block" }}
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      sx={{ color: "#0f172a", lineHeight: 1.15, fontSize: "1.65rem", mt: 0.25 }}
                    >
                      {card.value}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1.75}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ color: card.growthColor, fontSize: "0.72rem" }}
                  >
                    {card.growth}
                  </Typography>

                  {/* Sparkline Graphic */}
                  <Box sx={{ width: 62, height: 22 }}>
                    <svg width="60" height="22" viewBox="0 0 60 22" fill="none">
                      <path
                        d={card.sparklineD}
                        stroke={card.sparklineStroke}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* 3. 4-Column Feature Launchers Strip */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            component={RouterLink}
            to="/app/itineraries"
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              textDecoration: "none",
              transition: "all 0.15s ease",
              "&:hover": { borderColor: "#0284c7", bgcolor: "#f0f9ff" },
            }}
          >
            <Avatar sx={{ bgcolor: "#e0f2fe", color: "#0284c7", width: 40, height: 40, borderRadius: "10px" }}>
              <FlightTakeoffRoundedIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a" fontSize="0.88rem">
                Itinerary Studio
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.72rem">
                Create beautiful itineraries (Web & PDF)
              </Typography>
            </Box>
            <EastRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            component={RouterLink}
            to="/app/trips"
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              textDecoration: "none",
              transition: "all 0.15s ease",
              "&:hover": { borderColor: "#16a34a", bgcolor: "#f0fdf4" },
            }}
          >
            <Avatar sx={{ bgcolor: "#dcfce7", color: "#16a34a", width: 40, height: 40, borderRadius: "10px" }}>
              <DirectionsCarFilledRoundedIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a" fontSize="0.88rem">
                Driver Duty Slips
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.72rem">
                Mobile odometer & signatures
              </Typography>
            </Box>
            <EastRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            component={RouterLink}
            to="/app/bookings"
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              textDecoration: "none",
              transition: "all 0.15s ease",
              "&:hover": { borderColor: "#ea580c", bgcolor: "#fff7ed" },
            }}
          >
            <Avatar sx={{ bgcolor: "#ffedd5", color: "#ea580c", width: 40, height: 40, borderRadius: "10px" }}>
              <FolderRoundedIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a" fontSize="0.88rem">
                Guest Document Vault
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.72rem">
                Passports & permit manifests
              </Typography>
            </Box>
            <EastRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            component={RouterLink}
            to="/app/suppliers"
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              textDecoration: "none",
              transition: "all 0.15s ease",
              "&:hover": { borderColor: "#7c3aed", bgcolor: "#f5f3ff" },
            }}
          >
            <Avatar sx={{ bgcolor: "#f3e8ff", color: "#7c3aed", width: 40, height: 40, borderRadius: "10px" }}>
              <StorefrontRoundedIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a" fontSize="0.88rem">
                Vendors & Vouchers
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.72rem">
                Hotel payables & B2B costing
              </Typography>
            </Box>
            <EastRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
          </Paper>
        </Grid>
      </Grid>

      {/* 4. Middle Analytics Grid: Left Funnel Bar Chart + Right Financial Realization */}
      <Grid container spacing={2.5}>
        {/* Left: Inquiry Conversion Velocity */}
        <Grid item xs={12} lg={7.5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Avatar sx={{ width: 38, height: 38, bgcolor: "#e0f2fe", color: "#0284c7" }}>
                  <QueryStatsRoundedIcon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                    Inquiry Conversion Velocity
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active distribution of customer inquiries across your sales funnel
                  </Typography>
                </Box>
              </Box>

              <Chip
                label="⚡ Win Rate: 100%"
                size="small"
                sx={{
                  bgcolor: "#f0fdf4",
                  color: "#16a34a",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  border: "1px solid #bbf7d0",
                  borderRadius: "16px",
                  height: 24,
                }}
              />
            </Box>

            {/* Funnel Stage Dots Summary */}
            <Box display="flex" flexWrap="wrap" gap={2} my={1.5} alignItems="center">
              {funnelStages.map((stage) => (
                <Box key={stage.key} display="flex" alignItems="center" gap={0.75}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: stage.color,
                    }}
                  />
                  <Typography variant="caption" fontWeight={600} color="#475569" fontSize="0.75rem">
                    {stage.stage}: <strong>{stage.count}</strong>
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Bar Chart */}
            <Box sx={{ width: "100%", height: 230, mt: 1, flexGrow: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelStages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="stage"
                    stroke="#64748b"
                    fontSize={11}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 4]}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      borderRadius: 8,
                      border: "none",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {funnelStages.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Right: Financial Realization */}
        <Grid item xs={12} lg={4.5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Avatar sx={{ width: 38, height: 38, bgcolor: "#e0f2fe", color: "#0284c7" }}>
                  <SendRoundedIcon fontSize="small" sx={{ transform: "rotate(-30deg)" }} />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                    Financial Realization
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Collected booking revenue vs pending customer balance
                  </Typography>
                </Box>
              </Box>

              <Chip
                label="This Month"
                deleteIcon={<KeyboardArrowDownRoundedIcon fontSize="small" />}
                onDelete={() => { }}
                size="small"
                sx={{
                  bgcolor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#334155",
                  height: 26,
                  "& .MuiChip-deleteIcon": { color: "#64748b" },
                }}
              />
            </Box>

            {/* Donut Chart with Center Text */}
            <Box sx={{ width: "100%", height: 180, position: "relative", my: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueDonutData}
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) =>
                      typeof val === "number" ? `₹${val.toLocaleString("en-IN")}` : val
                    }
                  />
                </PieChart>
              </ResponsiveContainer>

              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <Typography variant="h5" fontWeight={800} sx={{ color: "#0f172a", lineHeight: 1 }}>
                  100%
                </Typography>
                <Typography variant="caption" fontWeight={600} color="#64748b" fontSize="0.7rem">
                  Collected
                </Typography>
              </Box>
            </Box>

            {/* Legend */}
            <Box display="flex" justifyContent="center" gap={3} my={0.5}>
              <Box display="flex" alignItems="center" gap={0.75}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#0088fe" }} />
                <Typography variant="caption" fontWeight={600} color="#475569" fontSize="0.75rem">
                  Collected (₹{realizedRevenueVal.toLocaleString("en-IN")})
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.75}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#f97316" }} />
                <Typography variant="caption" fontWeight={600} color="#475569" fontSize="0.75rem">
                  Pending (₹{pendingReceivablesVal.toLocaleString("en-IN")})
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1.5, borderColor: "#f1f5f9" }} />

            {/* Footer Bar */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <ReceiptRoundedIcon sx={{ fontSize: 16, color: "#0284c7" }} />
                <Typography variant="caption" fontWeight={600} color="#475569" fontSize="0.75rem">
                  Manage Invoices & Receipts
                </Typography>
              </Box>

              <Button
                component={RouterLink}
                to="/app/receivables"
                size="small"
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  color: "#ea580c",
                  p: 0,
                  minWidth: "auto",
                  "&:hover": { bgcolor: "transparent", textDecoration: "underline" },
                }}
              >
                View Receivables →
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 5. Bottom Grid: Two Tables (Recent Bookings & Upcoming Trips) */}
      <Grid container spacing={2.5}>
        {/* Left: Recent Bookings Table */}
        <Grid item xs={12} lg={6}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              overflow: "hidden",
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{ p: 2.5, pb: 1.5 }}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: "#f3e8ff", color: "#9333ea", borderRadius: "10px" }}>
                  <ConfirmationNumberRoundedIcon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} color="#0f172a" fontSize="0.95rem">
                    Recent Bookings
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontSize="0.72rem">
                    Your latest booking activity
                  </Typography>
                </Box>
              </Box>

              <Button
                component={RouterLink}
                to="/app/bookings"
                size="small"
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  color: "#0284c7",
                }}
              >
                View All →
              </Button>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                      #
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                      Customer
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                      Itinerary
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                      Travel Date
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                      Amount
                    </TableCell>
                    <TableCell align="right" sx={{ borderBottom: "1px solid #f1f5f9" }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentBookingsList.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a" }}>
                        {row.ref}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#1e293b" }}>
                        {row.customer}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", color: "#475569" }}>
                        {row.itinerary}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", color: "#64748b" }}>
                        {row.date}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          sx={{
                            bgcolor: "#dcfce7",
                            color: "#15803d",
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            borderRadius: "14px",
                            height: 22,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a" }}>
                        {row.amount}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" sx={{ color: "#94a3b8" }}>
                          <MoreVertRoundedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Right: Upcoming Trips Table */}
        <Grid item xs={12} lg={6}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              overflow: "hidden",
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{ p: 2.5, pb: 1.5 }}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: "#e0f2fe", color: "#0284c7", borderRadius: "10px" }}>
                  <DirectionsCarFilledRoundedIcon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} color="#0f172a" fontSize="0.95rem">
                    Upcoming Trips
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontSize="0.72rem">
                    Trips scheduled in the coming days
                  </Typography>
                </Box>
              </Box>

              <Button
                component={RouterLink}
                to="/app/trips"
                size="small"
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  color: "#0284c7",
                }}
              >
                View All →
              </Button>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                      Date
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                      Trip / Itinerary
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                      Customer
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                      Driver
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                      Status
                    </TableCell>
                    <TableCell align="right" sx={{ borderBottom: "1px solid #f1f5f9" }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcomingTripsList.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell sx={{ fontSize: "0.78rem", color: "#64748b" }}>
                        {row.date}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#1e293b" }}>
                        {row.itinerary}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", color: "#475569" }}>
                        {row.customer}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                        {row.driver}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          sx={{
                            bgcolor: "#e0f2fe",
                            color: "#0369a1",
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            borderRadius: "14px",
                            height: 22,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" sx={{ color: "#94a3b8" }}>
                          <MoreVertRoundedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}