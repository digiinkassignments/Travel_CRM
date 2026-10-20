import { useEffect, useState, useRef } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Button,
  IconButton,
  LinearProgress,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import MemoryRoundedIcon from "@mui/icons-material/MemoryRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ComputerRoundedIcon from "@mui/icons-material/ComputerRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import { apiClient } from "../../api/client";

interface TelemetryData {
  timestamp: string;
  overallStatus: "HEALTHY" | "DEGRADED" | "CRITICAL";
  process: {
    pid: number;
    nodeVersion: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
    platform: string;
    arch: string;
    hostname: string;
  };
  cpu: {
    cores: number;
    model: string;
    speedMhz: number;
    loadAvg: [number, number, number];
  };
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    externalMb: number;
    heapPercent: number;
    systemTotalMb: number;
    systemFreeMb: number;
    systemUsedMb: number;
    systemPercent: number;
  };
  disk?: {
    totalGb: number;
    freeGb: number;
    usedGb: number;
    usedPercent: number;
  };
  database: {
    status: "HEALTHY" | "DEGRADED" | "DOWN";
    latencyMs: number;
    version?: string;
    sizeMb?: number;
    activeConnections?: number;
    tableCounts: {
      clients: number;
      users: number;
      enquiries: number;
      bookings: number;
      quotations: number;
      invoices: number;
      trips: number;
      auditLogs: number;
      paymentNotices: number;
    };
    error?: string;
  };
  redis: {
    status: "HEALTHY" | "DOWN";
    latencyMs: number;
    error?: string;
  };
  queues: {
    subscriptionLifecycle: {
      active: number;
      waiting: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    automationEngine: {
      active: number;
      waiting: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  };
  smtp: {
    configured: boolean;
    connected: boolean;
    host?: string;
    port?: number;
    from?: string;
    latencyMs?: number;
    error?: string;
  };
}

export function SystemHealthPage() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // seconds
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const timerRef = useRef<any>(null);

  const fetchTelemetry = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      setError(null);
      const res = await apiClient.get("/super-admin/system-health");
      setTelemetry(res.data.data);
      setLastFetchedAt(new Date());
    } catch (err: any) {
      console.error("Failed to fetch system telemetry", err);
      setError(err?.response?.data?.message || "Could not retrieve system telemetry");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefreshInterval > 0) {
      timerRef.current = setInterval(() => {
        fetchTelemetry(false);
      }, autoRefreshInterval * 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefreshInterval]);

  const getStatusBadge = (status: "HEALTHY" | "DEGRADED" | "CRITICAL") => {
    switch (status) {
      case "HEALTHY":
        return {
          label: "Systems Operational",
          color: "#16a34a",
          bg: "#f0fdf4",
          border: "#bbf7d0",
          icon: <CheckCircleRoundedIcon sx={{ fontSize: 18, color: "#16a34a" }} />,
        };
      case "DEGRADED":
        return {
          label: "Performance Degraded",
          color: "#d97706",
          bg: "#fffbeb",
          border: "#fde68a",
          icon: <WarningAmberRoundedIcon sx={{ fontSize: 18, color: "#d97706" }} />,
        };
      case "CRITICAL":
        return {
          label: "Critical Service Interruption",
          color: "#dc2626",
          bg: "#fef2f2",
          border: "#fecaca",
          icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 18, color: "#dc2626" }} />,
        };
    }
  };

  if (loading && !telemetry) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="70vh">
        <CircularProgress size={48} sx={{ color: "#2563eb", mb: 2 }} />
        <Typography variant="body1" color="text.secondary" fontWeight={500}>
          Collecting server telemetry & probing infrastructure...
        </Typography>
      </Box>
    );
  }

  const badge = telemetry ? getStatusBadge(telemetry.overallStatus) : null;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header & Controls */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        mb={3}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
            <DnsRoundedIcon sx={{ color: "#2563eb", fontSize: 32 }} />
            <Typography variant="h5" fontWeight={800} color="#0f172a">
              System Health & Telemetry
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Real-time infrastructure performance, database latency, background workers, and memory telemetry.
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          {badge && (
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              sx={{
                bgcolor: badge.bg,
                border: `1px solid ${badge.border}`,
                px: 1.75,
                py: 0.75,
                borderRadius: 2,
              }}
            >
              {badge.icon}
              <Typography variant="body2" fontWeight={700} sx={{ color: badge.color }}>
                {badge.label}
              </Typography>
            </Box>
          )}

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="auto-refresh-label">Live Polling</InputLabel>
            <Select
              labelId="auto-refresh-label"
              value={autoRefreshInterval}
              label="Live Polling"
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
            >
              <MenuItem value={0}>Manual Only</MenuItem>
              <MenuItem value={5}>Every 5 seconds</MenuItem>
              <MenuItem value={10}>Every 10 seconds</MenuItem>
              <MenuItem value={30}>Every 30 seconds</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshRoundedIcon />}
            onClick={() => fetchTelemetry(true)}
            disabled={refreshing}
            sx={{ borderRadius: 2, fontWeight: 600, textTransform: "none" }}
          >
            Refresh Probe
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Top Telemetry KPI Bar */}
      {telemetry && (
        <Grid container spacing={2.5} mb={3}>
          {/* Database Health Card */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Database (RDBMS)
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#0f172a">
                    {telemetry.database.latencyMs} ms
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: telemetry.database.status === "HEALTHY" ? "#f0fdf4" : "#fef2f2",
                    color: telemetry.database.status === "HEALTHY" ? "#16a34a" : "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StorageRoundedIcon />
                </Box>
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Status: <strong>{telemetry.database.status}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Size: <strong>{telemetry.database.sizeMb ?? 0} MB</strong>
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {telemetry.database.version || "MySQL / MariaDB"}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Process Heap Memory */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Node.js Heap
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#0f172a">
                    {telemetry.memory.heapUsedMb} MB
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MemoryRoundedIcon />
                </Box>
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Heap Allocated
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {telemetry.memory.heapPercent}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(telemetry.memory.heapPercent, 100)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: "#e2e8f0",
                    "& .MuiLinearProgress-bar": {
                      bgcolor:
                        telemetry.memory.heapPercent > 85
                          ? "#dc2626"
                          : telemetry.memory.heapPercent > 70
                          ? "#d97706"
                          : "#2563eb",
                    },
                  }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Redis & Queues */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Redis / Worker Queue
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#0f172a">
                    {telemetry.redis.status === "HEALTHY" ? `${telemetry.redis.latencyMs} ms` : "Offline"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: telemetry.redis.status === "HEALTHY" ? "#f0fdf4" : "#fffbeb",
                    color: telemetry.redis.status === "HEALTHY" ? "#16a34a" : "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <HubRoundedIcon />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Active Jobs:{" "}
                  <strong>
                    {telemetry.queues.subscriptionLifecycle.active + telemetry.queues.automationEngine.active}
                  </strong>{" "}
                  · Failed:{" "}
                  <strong style={{ color: "#dc2626" }}>
                    {telemetry.queues.subscriptionLifecycle.failed + telemetry.queues.automationEngine.failed}
                  </strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {telemetry.redis.status === "HEALTHY" ? "BullMQ Workers Connected" : "Local Redis standalone / idle"}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Mail Gateway */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    SMTP Mail Service
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#0f172a">
                    {telemetry.smtp.connected ? `${telemetry.smtp.latencyMs ?? 0} ms` : "Standby"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: telemetry.smtp.connected ? "#f0fdf4" : "#fef2f2",
                    color: telemetry.smtp.connected ? "#16a34a" : "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <EmailRoundedIcon />
                </Box>
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Host: <strong>{telemetry.smtp.host ?? "Not configured"}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Port: <strong>{telemetry.smtp.port ?? 587}</strong>
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: telemetry.smtp.connected ? "#16a34a" : "#dc2626" }} noWrap display="block">
                  {telemetry.smtp.connected ? "Authenticated & Handshake Verified" : "SMTP Handshake Offline"}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Main Telemetry Breakdown */}
      {telemetry && (
        <Grid container spacing={2.5}>
          {/* Server Process & OS Telemetry */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
                height: "100%",
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                <ComputerRoundedIcon sx={{ color: "#2563eb" }} />
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                  Server Runtime & OS Environment
                </Typography>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontWeight: 500 }}>Process Uptime</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#16a34a" }}>
                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.75}>
                          <AccessTimeRoundedIcon fontSize="small" sx={{ color: "#16a34a" }} />
                          {telemetry.process.uptimeFormatted}
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontWeight: 500 }}>Node.js Version</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {telemetry.process.nodeVersion}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontWeight: 500 }}>Process ID (PID)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {telemetry.process.pid}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontWeight: 500 }}>Host Platform & Arch</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {telemetry.process.platform} ({telemetry.process.arch})
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontWeight: 500 }}>Hostname</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {telemetry.process.hostname}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontWeight: 500 }}>CPU Topology</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {telemetry.cpu.cores} Cores · {telemetry.cpu.model.split(" ")[0]} ({telemetry.cpu.speedMhz} MHz)
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontWeight: 500 }}>System RAM Allocation</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {telemetry.memory.systemUsedMb} MB / {telemetry.memory.systemTotalMb} MB ({telemetry.memory.systemPercent}%)
                      </TableCell>
                    </TableRow>
                    {telemetry.disk && (
                      <TableRow>
                        <TableCell sx={{ color: "text.secondary", fontWeight: 500 }}>Disk Storage Footprint</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {telemetry.disk.usedGb} GB / {telemetry.disk.totalGb} GB ({telemetry.disk.usedPercent}%)
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Database Entities & Record Counter */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
                height: "100%",
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <StorageRoundedIcon sx={{ color: "#2563eb" }} />
                  <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                    RDBMS Storage & Records Index
                  </Typography>
                </Box>
                <Chip
                  label={telemetry.database.status}
                  size="small"
                  color={telemetry.database.status === "HEALTHY" ? "success" : "error"}
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Table / Module</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary" }}>
                        Active Records
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Client Tenants</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {telemetry.database.tableCounts.clients}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Registered Users & Staff</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {telemetry.database.tableCounts.users}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Leads & Enquiries</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {telemetry.database.tableCounts.enquiries}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Confirmed Bookings</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {telemetry.database.tableCounts.bookings}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Quotations & Itineraries</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {telemetry.database.tableCounts.quotations}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Trips & Fleet Dispatches</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {telemetry.database.tableCounts.trips}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Super Admin Audit Log Entries</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {telemetry.database.tableCounts.auditLogs}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Worker Queues Detailed Inspector */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                <SpeedRoundedIcon sx={{ color: "#2563eb" }} />
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                  BullMQ Queue Workers & Job Scheduler Status
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#0f172a" gutterBottom>
                      Subscription Lifecycle Queue (`subscription-lifecycle`)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                      Automates client hourly lifecycle state transitions, grace periods, and expiration alerts.
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={2.4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: "center", bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                          <Typography variant="caption" color="text.secondary">Active</Typography>
                          <Typography variant="h6" fontWeight={700} color="#2563eb">{telemetry.queues.subscriptionLifecycle.active}</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: "center", bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                          <Typography variant="caption" color="text.secondary">Waiting</Typography>
                          <Typography variant="h6" fontWeight={700} color="#4b5563">{telemetry.queues.subscriptionLifecycle.waiting}</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: "center", bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                          <Typography variant="caption" color="text.secondary">Completed</Typography>
                          <Typography variant="h6" fontWeight={700} color="#16a34a">{telemetry.queues.subscriptionLifecycle.completed}</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: "center", bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                          <Typography variant="caption" color="text.secondary">Delayed</Typography>
                          <Typography variant="h6" fontWeight={700} color="#ca8a04">{telemetry.queues.subscriptionLifecycle.delayed}</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: "center", bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                          <Typography variant="caption" color="text.secondary">Failed</Typography>
                          <Typography variant="h6" fontWeight={700} color="#dc2626">{telemetry.queues.subscriptionLifecycle.failed}</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#0f172a" gutterBottom>
                      Automation Engine Queue (`automation-engine`)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                      Dispatches triggered webhook tasks, payment follow-ups, and scheduled CRM automations.
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={2.4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: "center", bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                          <Typography variant="caption" color="text.secondary">Active</Typography>
                          <Typography variant="h6" fontWeight={700} color="#2563eb">{telemetry.queues.automationEngine.active}</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: "center", bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                          <Typography variant="caption" color="text.secondary">Waiting</Typography>
                          <Typography variant="h6" fontWeight={700} color="#4b5563">{telemetry.queues.automationEngine.waiting}</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: "center", bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                          <Typography variant="caption" color="text.secondary">Completed</Typography>
                          <Typography variant="h6" fontWeight={700} color="#16a34a">{telemetry.queues.automationEngine.completed}</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: "center", bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                          <Typography variant="caption" color="text.secondary">Delayed</Typography>
                          <Typography variant="h6" fontWeight={700} color="#ca8a04">{telemetry.queues.automationEngine.delayed}</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={2.4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: "center", bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                          <Typography variant="caption" color="text.secondary">Failed</Typography>
                          <Typography variant="h6" fontWeight={700} color="#dc2626">{telemetry.queues.automationEngine.failed}</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Footer Timestamp */}
      {lastFetchedAt && (
        <Box textAlign="center" mt={4}>
          <Typography variant="caption" color="text.secondary">
            Last telemetry probe executed at: {lastFetchedAt.toLocaleTimeString()} · Server Time:{" "}
            {telemetry ? new Date(telemetry.timestamp).toLocaleString() : ""}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
