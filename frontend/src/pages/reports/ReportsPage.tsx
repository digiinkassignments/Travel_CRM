import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Avatar,
  LinearProgress,
  Divider,
  Grid,
  IconButton,
  Tooltip as MuiTooltip,
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
  Legend,
} from "recharts";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import DonutSmallRoundedIcon from "@mui/icons-material/DonutSmallRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { apiClient } from "../../api/client";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const REPORTS = [
  { key: "sales-by-agent", label: "Sales by Agent", advanced: false, icon: LeaderboardRoundedIcon },
  { key: "bookings-by-status", label: "Bookings by Status", advanced: false, icon: DonutSmallRoundedIcon },
  { key: "revenue-by-destination", label: "Revenue by Destination", advanced: true, icon: MapRoundedIcon },
  { key: "driver-utilization", label: "Driver Utilization", advanced: true, icon: BadgeRoundedIcon },
  { key: "vehicle-utilization", label: "Vehicle Utilization", advanced: true, icon: DirectionsCarRoundedIcon },
  { key: "agent-performance-trends", label: "Performance Trends", advanced: true, icon: AutoGraphRoundedIcon },
];

const STATUS_COLOR_MAP: Record<string, string> = {
  CONFIRMED: "#0284c7",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#16a34a",
  CANCELLED: "#ef4444",
};

export function ReportsPage() {
  const [tab, setTab] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [advancedEntitled, setAdvancedEntitled] = useState(true);
  const [loading, setLoading] = useState(false);

  const report = REPORTS[tab];

  function setPreset(preset: "all" | "thisMonth" | "last30" | "thisQuarter") {
    const now = new Date();
    if (preset === "all") {
      setFrom("");
      setTo("");
      return;
    }
    if (preset === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFrom(start.toISOString().slice(0, 10));
      setTo(now.toISOString().slice(0, 10));
      return;
    }
    if (preset === "last30") {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setFrom(start.toISOString().slice(0, 10));
      setTo(now.toISOString().slice(0, 10));
      return;
    }
    if (preset === "thisQuarter") {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterMonth, 1);
      setFrom(start.toISOString().slice(0, 10));
      setTo(now.toISOString().slice(0, 10));
      return;
    }
  }

  function csvRows(): Record<string, unknown>[] {
    if (report.key === "agent-performance-trends") {
      return rows.flatMap((agent) =>
        agent.months.map((m: any) => ({
          agent: agent.agentName,
          month: m.month,
          wonEnquiries: m.wonEnquiries,
          revenueInPaise: m.revenueInPaise,
        }))
      );
    }
    return rows;
  }

  function load() {
    setLoading(true);
    apiClient
      .get(`/reports/${report.key}`, { params: { from: from || undefined, to: to || undefined } })
      .then(({ data }) => {
        setRows(data.data ?? []);
        setAdvancedEntitled(true);
      })
      .catch((err) => {
        if (err.response?.data?.code === "FEATURE_NOT_ENTITLED") setAdvancedEntitled(false);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [tab, from, to]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* 1. Executive Analytics Header */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3.5,
          borderRadius: 4,
          background: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)",
          color: "#ffffff",
          boxShadow: "0 20px 30px -10px rgba(3, 105, 161, 0.25)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)",
            pointerEvents: "none",
          }}
        />

        <Box
          display="flex"
          flexDirection={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", lg: "center" }}
          gap={2.5}
          position="relative"
          zIndex={1}
        >
          <Box>
            <Box display="flex" alignItems="center" gap={1.5} mb={1}>
              <Chip
                icon={
                  <FiberManualRecordIcon
                    sx={{
                      fontSize: 10,
                      color: "#4ade80 !important",
                      animation: "pulse 2s infinite",
                      "@keyframes pulse": {
                        "0%": { opacity: 0.6, transform: "scale(0.9)" },
                        "50%": { opacity: 1, transform: "scale(1.2)" },
                        "100%": { opacity: 0.6, transform: "scale(0.9)" },
                      },
                    }}
                  />
                }
                label="ANALYTICS & AUDIT INTELLIGENCE"
                size="small"
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(8px)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "0.68rem",
                  letterSpacing: "0.05em",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  px: 0.5,
                }}
              />
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                Agency Telemetry Active
              </Typography>
            </Box>

            <Typography
              variant="h4"
              fontWeight={900}
              sx={{
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                fontSize: { xs: "1.75rem", md: "2.2rem" },
              }}
            >
              Operational Travel Reports 📊
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.85)", mt: 0.75, maxWidth: 650 }}>
              Cross-sectional performance audits, team pipeline throughput, driver fleet hours, and destination earnings.
            </Typography>
          </Box>

          {/* Export & Actions Toolbar */}
          <Box
            display="flex"
            flexWrap="wrap"
            alignItems="center"
            gap={1.25}
            sx={{
              p: 1.25,
              borderRadius: 3,
              bgcolor: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
            }}
          >
            <Button
              variant="contained"
              size="small"
              startIcon={<FileDownloadRoundedIcon sx={{ fontSize: 18 }} />}
              onClick={() => downloadCsv(`${report.key}.csv`, csvRows())}
              disabled={rows.length === 0}
              sx={{
                bgcolor: "#f97316", // Adventure Sunset
                color: "#ffffff",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: 2,
                px: 2,
                boxShadow: "0 4px 12px rgba(249, 115, 22, 0.35)",
                "&:hover": { bgcolor: "#ea580c" },
                "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)" },
              }}
            >
              Export CSV
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={<PrintRoundedIcon sx={{ fontSize: 18 }} />}
              onClick={() => window.print()}
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.95)",
                color: "#0c4a6e",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: 2,
                px: 2,
                "&:hover": { bgcolor: "#ffffff" },
              }}
            >
              Print Report
            </Button>

            <MuiTooltip title="Reload Report">
              <span>
                <IconButton
                  onClick={load}
                  disabled={loading}
                  size="small"
                  sx={{
                    color: "#ffffff",
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 2,
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                  }}
                >
                  <RefreshRoundedIcon
                    fontSize="small"
                    sx={{
                      animation: loading ? "spin 1s linear infinite" : "none",
                      "@keyframes spin": { "100%": { transform: "rotate(360deg)" } },
                    }}
                  />
                </IconButton>
              </span>
            </MuiTooltip>
          </Box>
        </Box>
      </Paper>

      {/* 2. Date Filter Presets & Picker Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
        }}
      >
        {/* Fast Preset Chips */}
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Typography variant="caption" fontWeight={800} color="#64748b" textTransform="uppercase" mr={0.5}>
            Filter Window:
          </Typography>
          <Chip
            label="All Time"
            size="small"
            clickable
            onClick={() => setPreset("all")}
            sx={{
              fontWeight: !from && !to ? 800 : 600,
              bgcolor: !from && !to ? "#0284c7" : "#f1f5f9",
              color: !from && !to ? "#ffffff" : "#475569",
              borderRadius: 2,
              "&:hover": { bgcolor: !from && !to ? "#0369a1" : "#e2e8f0" },
            }}
          />
          <Chip
            label="This Month"
            size="small"
            clickable
            onClick={() => setPreset("thisMonth")}
            sx={{
              fontWeight: 600,
              bgcolor: "#f1f5f9",
              color: "#475569",
              borderRadius: 2,
              "&:hover": { bgcolor: "#e2e8f0" },
            }}
          />
          <Chip
            label="Last 30 Days"
            size="small"
            clickable
            onClick={() => setPreset("last30")}
            sx={{
              fontWeight: 600,
              bgcolor: "#f1f5f9",
              color: "#475569",
              borderRadius: 2,
              "&:hover": { bgcolor: "#e2e8f0" },
            }}
          />
          <Chip
            label="This Quarter"
            size="small"
            clickable
            onClick={() => setPreset("thisQuarter")}
            sx={{
              fontWeight: 600,
              bgcolor: "#f1f5f9",
              color: "#475569",
              borderRadius: 2,
              "&:hover": { bgcolor: "#e2e8f0" },
            }}
          />
        </Box>

        {/* Date Inputs */}
        <Box display="flex" alignItems="center" gap={1.5} width={{ xs: "100%", md: "auto" }}>
          <TextField
            size="small"
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              width: { xs: "50%", sm: 145 },
              "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" },
            }}
          />
          <TextField
            size="small"
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              width: { xs: "50%", sm: 145 },
              "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" },
            }}
          />
        </Box>
      </Paper>

      {/* 3. Navigation Tabs */}
      <Box sx={{ mb: 3.5, borderBottom: "1px solid #e2e8f0" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0", bgcolor: "#0284c7" },
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 800,
              fontSize: "0.85rem",
              color: "#64748b",
              minHeight: 48,
              px: 2.25,
              "&.Mui-selected": { color: "#0284c7" },
            },
          }}
        >
          {REPORTS.map((r) => {
            const TabIcon = r.icon;
            return (
              <Tab
                key={r.key}
                icon={<TabIcon style={{ fontSize: 18 }} />}
                iconPosition="start"
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <span>{r.label}</span>
                    {r.advanced && (
                      <Chip
                        label="BUSINESS+"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.62rem",
                          fontWeight: 800,
                          bgcolor: "#e0f2fe",
                          color: "#0369a1",
                          borderRadius: "4px",
                        }}
                      />
                    )}
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Box>

      {/* 4. Main Report Display */}
      {!advancedEntitled ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            borderRadius: 4,
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
            textAlign: "center",
          }}
        >
          <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} maxWidth={460} mx="auto">
            <Avatar sx={{ width: 64, height: 64, bgcolor: "#fff7ed", color: "#ea580c", mb: 1 }}>
              <LockRoundedIcon fontSize="large" />
            </Avatar>
            <Typography variant="h6" fontWeight={900} color="#0f172a">
              Tier Lock: Advanced Travel Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This report requires elevated operational access included with Business and Enterprise plans.
              Upgrade your subscription to unlock route profitability, fleet utilization, and agent monthly telemetry.
            </Typography>
          </Box>
        </Paper>
      ) : (
        <ReportContent reportKey={report.key} rows={rows} />
      )}
    </Box>
  );
}

function ReportContent({ reportKey, rows }: { reportKey: string; rows: any[] }) {
  if (rows.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 8,
          textAlign: "center",
          borderRadius: 4,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
        }}
      >
        <Avatar
          sx={{
            width: 56,
            height: 56,
            mx: "auto",
            mb: 2,
            bgcolor: "#f0f9ff",
            color: "#0284c7",
          }}
        >
          <AssessmentRoundedIcon fontSize="medium" />
        </Avatar>
        <Typography variant="body1" fontWeight={800} color="#0f172a">
          No records captured for this window
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Try expanding your date range filters above or logging new customer bookings.
        </Typography>
      </Paper>
    );
  }

  // 1. Sales By Agent
  if (reportKey === "sales-by-agent") {
    const totalRev = rows.reduce((acc, r) => acc + (r.revenueInPaise || 0), 0);
    const totalWon = rows.reduce((acc, r) => acc + (r.wonEnquiries || 0), 0);
    const topAgent = rows[0]?.agentName || "—";
    const avgDeal = totalWon > 0 ? Math.round(totalRev / totalWon / 100) : 0;

    const chartData = rows.slice(0, 7).map((r) => ({
      agent: r.agentName,
      revenue: (r.revenueInPaise || 0) / 100,
      deals: r.wonEnquiries,
    }));

    return (
      <Box display="flex" flexDirection="column" gap={3}>
        {/* KPI Mini Bento Row */}
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Aggregate Sales Revenue"
              value={`₹${(totalRev / 100).toLocaleString("en-IN")}`}
              icon={<AccountBalanceWalletRoundedIcon sx={{ fontSize: 20 }} />}
              color="#0284c7"
              bg="#e0f2fe"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Inquiries Won"
              value={`${totalWon} Deals`}
              icon={<TrendingUpRoundedIcon sx={{ fontSize: 20 }} />}
              color="#16a34a"
              bg="#dcfce7"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Average Deal Size"
              value={`₹${avgDeal.toLocaleString("en-IN")}`}
              icon={<AssessmentRoundedIcon sx={{ fontSize: 20 }} />}
              color="#4f46e5"
              bg="#e0e7ff"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Top Performing Agent"
              value={topAgent}
              icon={<EmojiEventsRoundedIcon sx={{ fontSize: 20 }} />}
              color="#ea580c"
              bg="#ffedd5"
            />
          </Grid>
        </Grid>

        {/* Visual Chart Card */}
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
          <Typography variant="subtitle1" fontWeight={900} color="#0f172a" mb={0.5}>
            Agent Revenue Leaderboard
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={3}>
            Comparative booking revenue closed per sales agent
          </Typography>
          <Box sx={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="agent" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val: any) => `₹${val.toLocaleString("en-IN")}`}
                  contentStyle={{
                    backgroundColor: "#0c4a6e",
                    color: "#ffffff",
                    borderRadius: 10,
                    border: "none",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <Bar dataKey="revenue" fill="#0284c7" radius={[8, 8, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Detail Table */}
        <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden", bgcolor: "#ffffff" }}>
          <Table>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
                <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2, px: 3 }}>AGENT PROFILE</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2 }}>WON INQUIRIES</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 2, px: 3 }}>REVENUE PRODUCED</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Box display="flex" alignItems="center" gap={1.75}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: "#e0f2fe", color: "#0369a1", fontSize: "0.85rem", fontWeight: 800 }}>
                        {r.agentName?.slice(0, 2).toUpperCase() || <PersonRoundedIcon fontSize="small" />}
                      </Avatar>
                      <Typography variant="body2" fontWeight={800} color="#0f172a">
                        {r.agentName}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Chip size="small" label={`${r.wonEnquiries} Deals Won`} sx={{ fontWeight: 800, bgcolor: "#dcfce7", color: "#15803d", borderRadius: 1.5 }} />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
                    <Typography variant="body2" fontWeight={900} color="#0f172a" fontFamily="monospace" fontSize="0.95rem">
                      ₹{((r.revenueInPaise || 0) / 100).toLocaleString("en-IN")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    );
  }

  // 2. Bookings By Status
  if (reportKey === "bookings-by-status") {
    const totalBookings = rows.reduce((acc, r) => acc + (r.count || 0), 0);
    const totalAmount = rows.reduce((acc, r) => acc + (r.totalAmountInPaise || 0), 0);

    const donutData = rows.map((r) => ({
      name: r.status.replace(/_/g, " "),
      value: r.count,
      color: STATUS_COLOR_MAP[r.status] || "#94a3b8",
    }));

    return (
      <Box display="flex" flexDirection="column" gap={3}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <StatCard
              title="Total Bookings Logged"
              value={`${totalBookings} Tours`}
              icon={<DonutSmallRoundedIcon sx={{ fontSize: 20 }} />}
              color="#0284c7"
              bg="#e0f2fe"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <StatCard
              title="Cumulative Booking Value"
              value={`₹${(totalAmount / 100).toLocaleString("en-IN")}`}
              icon={<AccountBalanceWalletRoundedIcon sx={{ fontSize: 20 }} />}
              color="#16a34a"
              bg="#dcfce7"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Status Donut Visual */}
          <Grid item xs={12} md={5}>
            <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #e2e8f0", bgcolor: "#ffffff", height: "100%" }}>
              <Typography variant="subtitle1" fontWeight={900} color="#0f172a" mb={0.5}>
                Status Distribution
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Volume breakdown by current state
              </Typography>

              <Box sx={{ width: "100%", height: 240, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} innerRadius={58} outerRadius={84} paddingAngle={4} dataKey="value">
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => `${val} Bookings`}
                      contentStyle={{ backgroundColor: "#0c4a6e", color: "#fff", borderRadius: 10, border: "none", fontSize: 12 }}
                    />
                    <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Status Breakdown Table */}
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden", bgcolor: "#ffffff", height: "100%" }}>
              <Table>
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
                    <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2, px: 3 }}>STATUS</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2 }}>COUNT</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 2, px: 3 }}>TOTAL AMOUNT</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} hover sx={{ "&:last-child td": { border: 0 } }}>
                      <TableCell sx={{ py: 2, px: 3 }}>
                        <Chip
                          size="small"
                          label={r.status.replace(/_/g, " ")}
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.72rem",
                            bgcolor: (STATUS_COLOR_MAP[r.status] || "#64748b") + "18",
                            color: STATUS_COLOR_MAP[r.status] || "#64748b",
                            border: `1px solid ${(STATUS_COLOR_MAP[r.status] || "#64748b")}40`,
                            borderRadius: 1.5,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                          {r.count} Bookings
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 2, px: 3 }}>
                        <Typography variant="body2" fontWeight={900} color="#0f172a" fontFamily="monospace">
                          ₹{((r.totalAmountInPaise || 0) / 100).toLocaleString("en-IN")}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // 3. Revenue By Destination
  if (reportKey === "revenue-by-destination") {
    const totalDestRev = rows.reduce((acc, r) => acc + (r.revenueInPaise || 0), 0);
    const topDest = rows[0]?.destination || "—";

    const chartData = rows.slice(0, 8).map((r) => ({
      destination: r.destination,
      revenue: (r.revenueInPaise || 0) / 100,
    }));

    return (
      <Box display="flex" flexDirection="column" gap={3}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <StatCard
              title="Total Route Earnings"
              value={`₹${(totalDestRev / 100).toLocaleString("en-IN")}`}
              icon={<AccountBalanceWalletRoundedIcon sx={{ fontSize: 20 }} />}
              color="#0284c7"
              bg="#e0f2fe"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <StatCard
              title="Highest Grossing Destination"
              value={topDest}
              icon={<MapRoundedIcon sx={{ fontSize: 20 }} />}
              color="#f97316"
              bg="#fff7ed"
            />
          </Grid>
        </Grid>

        {/* Visual Bar Chart */}
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
          <Typography variant="subtitle1" fontWeight={900} color="#0f172a" mb={0.5}>
            Top Destination Revenues
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={3}>
            Geographic earnings distribution across popular holiday packages
          </Typography>
          <Box sx={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="destination" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val: any) => `₹${val.toLocaleString("en-IN")}`}
                  contentStyle={{ backgroundColor: "#0c4a6e", color: "#fff", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 600 }}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[8, 8, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden", bgcolor: "#ffffff" }}>
          <Table>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
                <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2, px: 3 }}>DESTINATION / TOUR</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 2, px: 3 }}>GENERATED REVENUE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Typography variant="body2" fontWeight={800} color="#0f172a">
                      📍 {r.destination}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
                    <Typography variant="body2" fontWeight={900} color="#0f172a" fontFamily="monospace" fontSize="0.95rem">
                      ₹{((r.revenueInPaise || 0) / 100).toLocaleString("en-IN")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    );
  }

  // 4. Driver Utilization
  if (reportKey === "driver-utilization") {
    return (
      <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden", bgcolor: "#ffffff" }}>
        <Table>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2, px: 3 }}>DRIVER PROFILE</TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2 }}>ASSIGNED TRIPS</TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2, px: 3, minWidth: 220 }}>UTILIZATION RATE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => {
              const util = Math.min(r.utilizationPercent || 0, 100);
              const color = util > 80 ? "#16a34a" : util > 40 ? "#0284c7" : "#f59e0b";
              return (
                <TableRow key={i} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Box display="flex" alignItems="center" gap={1.75}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: "#e0f2fe", color: "#0369a1", fontWeight: 800, fontSize: "0.85rem" }}>
                        {r.driverName?.slice(0, 2).toUpperCase() || "DR"}
                      </Avatar>
                      <Typography variant="body2" fontWeight={800} color="#0f172a">
                        {r.driverName}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="body2" fontWeight={700} color="#475569">
                      {r.tripCount} Trips
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box flexGrow={1}>
                        <LinearProgress
                          variant="determinate"
                          value={util}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: "#f1f5f9",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: color,
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                      <Chip
                        label={`${r.utilizationPercent}%`}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: color + "18",
                          color: color,
                          border: `1px solid ${color}40`,
                          borderRadius: 1.5,
                        }}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    );
  }

  // 5. Vehicle Utilization
  if (reportKey === "vehicle-utilization") {
    return (
      <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden", bgcolor: "#ffffff" }}>
        <Table>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2, px: 3 }}>VEHICLE REGISTRATION</TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2 }}>TOTAL TRIPS</TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2, px: 3, minWidth: 220 }}>UTILIZATION RATE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => {
              const util = Math.min(r.utilizationPercent || 0, 100);
              const color = util > 80 ? "#16a34a" : util > 40 ? "#0284c7" : "#f59e0b";
              return (
                <TableRow key={i} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Chip
                      icon={<DirectionsCarRoundedIcon sx={{ fontSize: 16 }} />}
                      label={r.registrationNumber}
                      sx={{
                        fontWeight: 800,
                        fontFamily: "monospace",
                        letterSpacing: "0.05em",
                        bgcolor: "#f1f5f9",
                        color: "#0f172a",
                        borderRadius: 2,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="body2" fontWeight={700} color="#475569">
                      {r.tripCount} Trips
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box flexGrow={1}>
                        <LinearProgress
                          variant="determinate"
                          value={util}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: "#f1f5f9",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: color,
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                      <Chip
                        label={`${r.utilizationPercent}%`}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: color + "18",
                          color: color,
                          border: `1px solid ${color}40`,
                          borderRadius: 1.5,
                        }}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    );
  }

  // 6. Agent Performance Trends
  if (reportKey === "agent-performance-trends") {
    return (
      <Box display="flex" flexDirection="column" gap={3}>
        {rows.map((agent) => (
          <Paper key={agent.agentId} elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden", bgcolor: "#ffffff" }}>
            <Box
              sx={{
                px: 3.5,
                py: 2.25,
                bgcolor: "#f8fafc",
                borderBottom: "1px solid #eef2f6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box display="flex" alignItems="center" gap={1.75}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: "#e0f2fe", color: "#0369a1", fontWeight: 800, fontSize: "0.85rem" }}>
                  {agent.agentName?.slice(0, 2).toUpperCase() || "AG"}
                </Avatar>
                <Typography variant="subtitle1" fontWeight={900} color="#0f172a">
                  {agent.agentName}
                </Typography>
              </Box>
              <Chip label="Monthly Performance Run" size="small" sx={{ fontWeight: 800, fontSize: "0.68rem", bgcolor: "#f1f5f9" }} />
            </Box>

            <Table size="small">
              <TableHead sx={{ bgcolor: "#ffffff" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.75, px: 3.5 }}>TIMELINE MONTH</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.75 }}>WON LEADS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 1.75, px: 3.5 }}>REVENUE GENERATED</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {agent.months.map((m: any) => (
                  <TableRow key={m.month} hover sx={{ "&:last-child td": { border: 0 } }}>
                    <TableCell sx={{ py: 1.75, px: 3.5 }}>
                      <Typography variant="body2" fontWeight={700} color="#334155">
                        🗓️ {m.month}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.75 }}>
                      <Chip size="small" label={`${m.wonEnquiries} Deals Won`} sx={{ fontWeight: 800, bgcolor: "#dcfce7", color: "#15803d", borderRadius: 1.5 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.75, px: 3.5 }}>
                      <Typography variant="body2" fontWeight={900} color="#0f172a" fontFamily="monospace" fontSize="0.95rem">
                        ₹{((m.revenueInPaise || 0) / 100).toLocaleString("en-IN")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        ))}
      </Box>
    );
  }

  return null;
}

function StatCard({
  title,
  value,
  icon,
  color,
  bg,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.75,
        borderRadius: 3.5,
        border: "1px solid #e2e8f0",
        bgcolor: "#ffffff",
        transition: "all 0.2s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 12px 24px -6px rgba(15, 23, 42, 0.06)",
        },
      }}
    >
      <Box display="flex" alignItems="center" gap={1.5} mb={1.25}>
        <Avatar sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: bg, color: color }}>
          {icon}
        </Avatar>
        <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" letterSpacing="0.04em">
          {title}
        </Typography>
      </Box>
      <Typography variant="h5" fontWeight={900} color="#0f172a" letterSpacing="-0.02em">
        {value}
      </Typography>
    </Paper>
  );
}