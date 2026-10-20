import { useEffect, useState, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Link,
  Chip,
  Avatar,
  Divider,
  Button,
  TextField,
  InputAdornment,
  Alert,
  IconButton,
  Tooltip as MuiTooltip,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import { apiClient } from "../../api/client";

interface Summary {
  total: number;
  active: number;
  expiringSoon: number;
  grace: number;
  locked: number;
  deleted: number;
  pendingPayments: number;
}

interface ClientRow {
  id: string;
  clientCode: string;
  businessName: string;
  email: string;
  subscriptionStatus: string;
  subscriptionExpiry: string;
  plan: { name: string };
}

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  ACTIVE: "success",
  EXPIRING_SOON: "warning",
  GRACE: "warning",
  LOCKED: "error",
  DELETED: "default",
};

const CARDS: Array<{
  label: string;
  key: keyof Summary;
  icon: typeof DescriptionRoundedIcon;
  color: string;
  bgColor: string;
}> = [
  { label: "Total Clients", key: "total", icon: PeopleAltRoundedIcon, color: "#2563eb", bgColor: "#eff6ff" },
  { label: "Active", key: "active", icon: CheckCircleRoundedIcon, color: "#16a34a", bgColor: "#f0fdf4" },
  { label: "Expiring Soon", key: "expiringSoon", icon: HourglassBottomRoundedIcon, color: "#d97706", bgColor: "#fffbeb" },
  { label: "Grace Period", key: "grace", icon: DescriptionRoundedIcon, color: "#ca8a04", bgColor: "#fefce8" },
  { label: "Locked", key: "locked", icon: LockRoundedIcon, color: "#dc2626", bgColor: "#fef2f2" },
  { label: "Deleted", key: "deleted", icon: DeleteRoundedIcon, color: "#4b5563", bgColor: "#f3f4f6" },
  { label: "Pending Payments", key: "pendingPayments", icon: PaymentsRoundedIcon, color: "#9333ea", bgColor: "#faf5ff" },
];

export function SuperAdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentClients, setRecentClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [adminName] = useState<string>(() =>
    localStorage.getItem("role") === "SUPER_ADMIN" ? "Super Admin" : "Admin"
  );

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get("/super-admin/dashboard"),
      apiClient.get("/super-admin/clients"),
    ])
      .then(([dashRes, clientsRes]) => {
        setSummary(dashRes.data?.data ?? null);
        setRecentClients((clientsRes.data?.data ?? []).slice(0, 5));
      })
      .catch((err) => {
        console.error("Failed to load dashboard data", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filtered clients based on search input
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return recentClients;
    return recentClients.filter(
      (c) =>
        c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.plan?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recentClients, searchQuery]);

  // Bar chart metrics
  const barChartData = [
    { name: "Active", count: summary?.active ?? 0, fill: "#16a34a" },
    { name: "Grace", count: summary?.grace ?? 0, fill: "#ca8a04" },
    { name: "Expiring", count: summary?.expiringSoon ?? 0, fill: "#d97706" },
    { name: "Locked", count: summary?.locked ?? 0, fill: "#dc2626" },
    { name: "Pending", count: summary?.pendingPayments ?? 0, fill: "#9333ea" },
  ];

  // Pie chart metrics
  const pieChartData = [
    { name: "Active", value: summary?.active ?? 0, color: "#16a34a" },
    { name: "Expiring", value: summary?.expiringSoon ?? 0, color: "#d97706" },
    { name: "Grace", value: summary?.grace ?? 0, color: "#ca8a04" },
    { name: "Locked", value: summary?.locked ?? 0, color: "#dc2626" },
    { name: "Deleted", value: summary?.deleted ?? 0, color: "#64748b" },
  ].filter((item) => item.value > 0);

  // Expiry / Attention Count
  const criticalAccountsCount = (summary?.expiringSoon ?? 0) + (summary?.grace ?? 0) + (summary?.locked ?? 0);

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Header & Actions */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        mb={3}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ color: "#0f172a", letterSpacing: "-0.025em" }}
          >
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Welcome back! Platform overview & health status.
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5}>
          <MuiTooltip title="Sync / Refresh Data">
            <span>
              <IconButton
                onClick={fetchDashboardData}
                disabled={loading}
                sx={{
                  bgcolor: "#fff",
                  border: "1px solid #e2e8f0",
                  "&:hover": { bgcolor: "#f1f5f9" },
                }}
              >
                <RefreshRoundedIcon fontSize="small" sx={{ color: "#475569" }} />
              </IconButton>
            </span>
          </MuiTooltip>

          <Button
            component={RouterLink}
            to="/super-admin/clients"
            variant="contained"
            startIcon={<PersonAddAlt1RoundedIcon />}
            sx={{
              bgcolor: "#2563eb",
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            Manage Clients
          </Button>

          <Chip
            label={`Signed in as ${adminName}`}
            variant="outlined"
            sx={{
              bgcolor: "#ffffff",
              borderColor: "#e2e8f0",
              fontWeight: 600,
              color: "#475569",
              py: 0.5,
            }}
          />
        </Box>
      </Box>

      {/* Critical Alert Ribbon (Only shows if there are at-risk accounts) */}
      {criticalAccountsCount > 0 && (
        <Alert
          severity="warning"
          icon={<WarningAmberRoundedIcon fontSize="inherit" />}
          sx={{
            mb: 3,
            borderRadius: 2.5,
            border: "1px solid #fed7aa",
            bgcolor: "#fffbeb",
            color: "#92400e",
            "& .MuiAlert-icon": { color: "#d97706" },
          }}
        >
          <strong>Attention Needed:</strong> You have <strong>{summary?.expiringSoon ?? 0}</strong> subscriptions expiring soon,{" "}
          <strong>{summary?.grace ?? 0}</strong> in grace period, and <strong>{summary?.locked ?? 0}</strong> locked accounts.
        </Alert>
      )}

      {/* KPI Stats Cards */}
      <Grid container spacing={2} mb={4}>
        {CARDS.map(({ label, key, icon: Icon, color, bgColor }) => (
          <Grid item xs={12} sm={6} md={4} lg={12 / 7} key={key}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                bgcolor: "#ffffff",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
                },
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: "10px",
                    bgcolor: bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon sx={{ color: color }} fontSize="small" />
                </Box>
                <TrendingUpRoundedIcon sx={{ color: "#cbd5e1", fontSize: 20 }} />
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ color: "#0f172a", mb: 0.5 }}>
                {summary ? summary[key] : "—"}
              </Typography>
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                {label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Analytics Graphs */}
      <Grid container spacing={3} mb={4}>
        {/* Platform Volume Distribution (Bar Chart) */}
        <Grid item xs={12} md={7} lg={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
            }}
          >
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} sx={{ color: "#0f172a" }}>
                Platform Volume Distribution
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Distribution across active accounts, pending billing, and critical states
              </Typography>
            </Box>

            <Box sx={{ width: "100%", height: 280, pt: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: 8,
                      border: "none",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={46} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Status Breakdown (Donut Chart) */}
        <Grid item xs={12} md={5} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box mb={1}>
              <Typography variant="h6" fontWeight={700} sx={{ color: "#0f172a" }}>
                Status Breakdown
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active vs Risk ratio snapshot
              </Typography>
            </Box>

            <Box sx={{ width: "100%", height: 280, flexGrow: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData.length > 0 ? pieChartData : [{ name: "No Data", value: 1, color: "#e2e8f0" }]}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(pieChartData.length > 0 ? pieChartData : [{ name: "No Data", value: 1, color: "#e2e8f0" }]).map(
                      (entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      )
                    )}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: 8,
                      border: "none",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Clients Section (Graphs ke theek neeche) */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
        }}
      >
        <Box
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          gap={2}
          mb={2.5}
        >
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: "#0f172a" }}>
              Recent Clients
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Latest additions to the platform & their renewal status
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={2} width={{ xs: "100%", sm: "auto" }}>
            <TextField
              size="small"
              placeholder="Search client or plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: { xs: "100%", sm: 220 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                },
              }}
            />
            <Link
              component={RouterLink}
              to="/super-admin/clients"
              underline="hover"
              sx={{
                fontWeight: 600,
                color: "#2563eb",
                fontSize: "0.875rem",
                whiteSpace: "nowrap",
              }}
            >
              View All →
            </Link>
          </Box>
        </Box>

        <Divider sx={{ mb: 1, borderColor: "#f1f5f9" }} />

        {filteredClients.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={5}>
            {searchQuery ? "No matching clients found." : "No clients yet. "}
            {!searchQuery && (
              <Link component={RouterLink} to="/super-admin/clients" sx={{ color: "#2563eb", fontWeight: 600 }}>
                Add your first one.
              </Link>
            )}
          </Typography>
        ) : (
          <Box display="flex" flexDirection="column">
            {filteredClients.map((c) => (
              <Box
                key={c.id}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  py: 1.75,
                  px: 1,
                  borderRadius: 2,
                  transition: "background-color 0.15s ease",
                  borderBottom: "1px solid #f8fafc",
                  "&:hover": { bgcolor: "#f8fafc" },
                  "&:last-of-type": { borderBottom: "none" },
                }}
              >
                {/* Client Details */}
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: "#eff6ff",
                      color: "#2563eb",
                      fontSize: "0.875rem",
                    }}
                  >
                    <BusinessRoundedIcon fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ color: "#1e293b" }}>
                      {c.businessName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.email} · <strong>{c.plan?.name || "No Plan"}</strong>
                    </Typography>
                  </Box>
                </Box>

                {/* Expiry Date & Status Badge */}
                <Box display="flex" alignItems="center" gap={2}>
                  {c.subscriptionExpiry && (
                    <Box
                      display={{ xs: "none", md: "flex" }}
                      alignItems="center"
                      gap={0.5}
                      sx={{ color: "text.secondary", fontSize: "0.75rem" }}
                    >
                      <EventRoundedIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                      <span>
                        Expires: {new Date(c.subscriptionExpiry).toLocaleDateString()}
                      </span>
                    </Box>
                  )}

                  <Chip
                    size="small"
                    label={c.subscriptionStatus.replace("_", " ")}
                    color={STATUS_COLOR[c.subscriptionStatus] ?? "default"}
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.72rem",
                      borderRadius: "6px",
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}