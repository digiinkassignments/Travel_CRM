import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  InputAdornment,
  Avatar,
  TablePagination,
  IconButton,
  Tooltip,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import AirlineSeatReclineNormalRoundedIcon from "@mui/icons-material/AirlineSeatReclineNormalRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import HealthAndSafetyRoundedIcon from "@mui/icons-material/HealthAndSafetyRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import LocalGasStationRoundedIcon from "@mui/icons-material/LocalGasStationRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { apiClient } from "../../api/client";
import {
  fetchFleetComplianceOverview,
  downloadFleetComplianceCsv,
  fetchDriverComplianceOverview,
  FleetComplianceOverview,
  DriverComplianceOverview,
  ComplianceDocItem,
} from "../../api/fleet";

function ComplianceBadge({ doc, label }: { doc?: ComplianceDocItem; label: string }) {
  if (!doc || doc.status === "MISSING" || !doc.expiry) {
    return (
      <Tooltip title={`${label}: Not uploaded / recorded`}>
        <Chip
          size="small"
          label="Not Set"
          sx={{
            fontWeight: 600,
            fontSize: "0.7rem",
            bgcolor: "#f1f5f9",
            color: "#64748b",
            borderRadius: "6px",
            height: 22,
          }}
        />
      </Tooltip>
    );
  }

  const dateStr = new Date(doc.expiry).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (doc.status === "EXPIRED") {
    return (
      <Tooltip title={`${label} expired on ${dateStr} (${Math.abs(doc.daysRemaining || 0)}d ago)`}>
        <Chip
          size="small"
          icon={<EventBusyRoundedIcon style={{ fontSize: 13 }} />}
          label="Expired"
          sx={{
            fontWeight: 700,
            fontSize: "0.7rem",
            bgcolor: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            height: 22,
          }}
        />
      </Tooltip>
    );
  }

  if (doc.status === "EXPIRING_SOON") {
    return (
      <Tooltip title={`${label} expires on ${dateStr} (${doc.daysRemaining} days left)`}>
        <Chip
          size="small"
          icon={<WarningAmberRoundedIcon style={{ fontSize: 13 }} />}
          label={`${doc.daysRemaining}d left`}
          sx={{
            fontWeight: 700,
            fontSize: "0.7rem",
            bgcolor: "#fffbeb",
            color: "#b45309",
            border: "1px solid #fde68a",
            borderRadius: "6px",
            height: 22,
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={`${label} is valid until ${dateStr}`}>
      <Chip
        size="small"
        icon={<CheckCircleRoundedIcon style={{ fontSize: 13, color: "#059669" }} />}
        label={dateStr}
        sx={{
          fontWeight: 600,
          fontSize: "0.7rem",
          bgcolor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          color: "#166534",
          borderRadius: "6px",
          height: 22,
        }}
      />
    </Tooltip>
  );
}

export function VehiclesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [complianceData, setComplianceData] = useState<FleetComplianceOverview | null>(null);
  const [driverComplianceData, setDriverComplianceData] = useState<DriverComplianceOverview | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [form, setForm] = useState({
    vehicleType: "",
    vehicleName: "",
    slug: "",
    pricePerKm: 0,
    sortOrder: 0,
    seats: 4,
    bags: 2,
    acType: "AC",
    pricingType: "PER_KM",
    fuelType: "DIESEL",
    description: "",
    vehicleImage: "",
    catalogStatus: "ACTIVE",
    featured: false,
    registrationNumber: "",
    capacity: 4,
    currentOdometer: 0,
    operationalStatus: "AVAILABLE",
    chassisNumber: "",
    engineNumber: "",
    fastagTagNumber: "",
    rcExpiry: "",
    insuranceExpiry: "",
    permitExpiry: "",
    fitnessExpiry: "",
    pucExpiry: "",
    taxExpiry: "",
    assignedDriverId: "",
  });

  function loadAll() {
    setLoading(true);
    Promise.all([
      apiClient.get("/vehicles").then(({ data }) => setVehicles(data.data ?? [])),
      apiClient.get("/drivers").then(({ data }) => setDrivers(data.data ?? [])),
      fetchFleetComplianceOverview().then((data) => setComplianceData(data)),
      fetchDriverComplianceOverview().then((data) => setDriverComplianceData(data)),
    ])
      .catch((err) => console.error("Error loading fleet data", err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleExportCsv() {
    try {
      setExporting(true);
      await downloadFleetComplianceCsv();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
    }
  }

  async function handleCreate() {
    try {
      setCreating(true);
      await apiClient.post("/vehicles", {
        ...form,
        capacity: Number(form.capacity),
        pricePerKm: Number(form.pricePerKm),
        sortOrder: Number(form.sortOrder),
        seats: Number(form.seats),
        bags: Number(form.bags),
        currentOdometer: Number(form.currentOdometer),
        assignedDriverId: form.assignedDriverId || undefined,
        rcExpiry: form.rcExpiry || undefined,
        insuranceExpiry: form.insuranceExpiry || undefined,
        permitExpiry: form.permitExpiry || undefined,
        fitnessExpiry: form.fitnessExpiry || undefined,
        pucExpiry: form.pucExpiry || undefined,
        taxExpiry: form.taxExpiry || undefined,
      });
      setOpenAddModal(false);
      resetForm();
      loadAll();
    } catch (err) {
      console.error("Error creating vehicle", err);
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setForm({
      vehicleType: "",
      vehicleName: "",
      slug: "",
      pricePerKm: 0,
      sortOrder: 0,
      seats: 4,
      bags: 2,
      acType: "AC",
      pricingType: "PER_KM",
      fuelType: "DIESEL",
      description: "",
      vehicleImage: "",
      catalogStatus: "ACTIVE",
      featured: false,
      registrationNumber: "",
      capacity: 4,
      currentOdometer: 0,
      operationalStatus: "AVAILABLE",
      chassisNumber: "",
      engineNumber: "",
      fastagTagNumber: "",
      rcExpiry: "",
      insuranceExpiry: "",
      permitExpiry: "",
      fitnessExpiry: "",
      pucExpiry: "",
      taxExpiry: "",
      assignedDriverId: "",
    });
    setAddModalTab(0);
  }

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.toLowerCase();
      const reg = v.registrationNumber?.toLowerCase() ?? "";
      const name = (v.vehicleName || v.vehicleType)?.toLowerCase() ?? "";
      const driver = v.assignedDriver?.name?.toLowerCase() ?? "";
      const matchesSearch = reg.includes(q) || name.includes(q) || driver.includes(q);

      if (statusFilter === "ALL") return matchesSearch;
      if (statusFilter === "AVAILABLE") return matchesSearch && v.operationalStatus === "AVAILABLE";
      if (statusFilter === "ON_TRIP") return matchesSearch && v.operationalStatus === "ON_TRIP";
      if (statusFilter === "MAINTENANCE") return matchesSearch && v.operationalStatus === "MAINTENANCE";
      if (statusFilter === "GROUNDED") return matchesSearch && v.operationalStatus === "GROUNDED";
      return matchesSearch;
    });
  }, [vehicles, searchQuery, statusFilter]);

  const paginatedVehicles = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredVehicles.slice(start, start + rowsPerPage);
  }, [filteredVehicles, page, rowsPerPage]);

  const summary = complianceData?.summary ?? {
    totalVehicles: vehicles.length,
    compliantCount: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
    inMaintenanceCount: 0,
    onTripCount: 0,
    availableCount: 0,
    complianceRate: 100,
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Header */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        gap={2}
        mb={3}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: "#0284c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 8px 16px -4px rgba(2, 132, 199, 0.3)",
              }}
            >
              <LocalShippingRoundedIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#0f172a" letterSpacing="-0.02em">
                Fleet Operations & Compliance
              </Typography>
              <Typography variant="body2" color="#64748b">
                RTO statutory documents, chauffeur readiness, vehicle availability & preventive maintenance
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<DownloadRoundedIcon />}
            onClick={handleExportCsv}
            disabled={exporting || vehicles.length === 0}
            sx={{
              borderColor: "#cbd5e1",
              color: "#334155",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 2,
              bgcolor: "#ffffff",
              "&:hover": { bgcolor: "#f1f5f9", borderColor: "#94a3b8" },
            }}
          >
            {exporting ? "Generating..." : "Export Compliance (CSV)"}
          </Button>

          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              resetForm();
              setOpenAddModal(true);
            }}
            sx={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 2,
              px: 2.5,
              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
            }}
          >
            Add New Vehicle
          </Button>
        </Box>
      </Box>

      {/* KPI Overview Strip */}
      <Grid container spacing={2} mb={3.5}>
        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="caption" fontWeight={700} color="#64748b" textTransform="uppercase">
                Total Fleet
              </Typography>
              <Typography variant="h5" fontWeight={900} color="#0f172a" mt={0.5}>
                {summary.totalVehicles}
              </Typography>
              <Typography variant="caption" color="#0284c7" fontWeight={600}>
                Registered Assets
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: "1px solid #bbf7d0", borderRadius: 3, bgcolor: "#f0fdf4" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" fontWeight={700} color="#166534" textTransform="uppercase">
                  100% Compliant
                </Typography>
                <VerifiedUserRoundedIcon sx={{ fontSize: 18, color: "#16a34a" }} />
              </Box>
              <Typography variant="h5" fontWeight={900} color="#15803d" mt={0.5}>
                {summary.compliantCount}
              </Typography>
              <Typography variant="caption" color="#16a34a" fontWeight={700}>
                {summary.complianceRate}% of Fleet
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: "1px solid #fde68a", borderRadius: 3, bgcolor: "#fffbeb" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" fontWeight={700} color="#92400e" textTransform="uppercase">
                  Expiring ≤30d
                </Typography>
                <WarningAmberRoundedIcon sx={{ fontSize: 18, color: "#d97706" }} />
              </Box>
              <Typography variant="h5" fontWeight={900} color="#b45309" mt={0.5}>
                {summary.expiringSoonCount}
              </Typography>
              <Typography variant="caption" color="#b45309" fontWeight={600}>
                Renewal Window
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: "1px solid #fecaca", borderRadius: 3, bgcolor: "#fef2f2" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" fontWeight={700} color="#991b1b" textTransform="uppercase">
                  Expired / Grounded
                </Typography>
                <EventBusyRoundedIcon sx={{ fontSize: 18, color: "#dc2626" }} />
              </Box>
              <Typography variant="h5" fontWeight={900} color="#b91c1c" mt={0.5}>
                {summary.expiredCount}
              </Typography>
              <Typography variant="caption" color="#b91c1c" fontWeight={700}>
                Do Not Dispatch!
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: "1px solid #bae6fd", borderRadius: 3, bgcolor: "#f0f9ff" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" fontWeight={700} color="#0369a1" textTransform="uppercase">
                  On Active Trips
                </Typography>
                <DirectionsCarRoundedIcon sx={{ fontSize: 18, color: "#0284c7" }} />
              </Box>
              <Typography variant="h5" fontWeight={900} color="#0369a1" mt={0.5}>
                {summary.onTripCount}
              </Typography>
              <Typography variant="caption" color="#0284c7" fontWeight={600}>
                Dispatched Duty Slips
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: "1px solid #fed7aa", borderRadius: 3, bgcolor: "#fff7ed" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" fontWeight={700} color="#c2410c" textTransform="uppercase">
                  In Workshop
                </Typography>
                <BuildRoundedIcon sx={{ fontSize: 18, color: "#ea580c" }} />
              </Box>
              <Typography variant="h5" fontWeight={900} color="#c2410c" mt={0.5}>
                {summary.inMaintenanceCount}
              </Typography>
              <Typography variant="caption" color="#c2410c" fontWeight={600}>
                Under Service
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Tabbed Interface */}
      <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden", bgcolor: "#ffffff" }}>
        <Box sx={{ borderBottom: 1, borderColor: "#f1f5f9", px: 2, pt: 1, bgcolor: "#ffffff" }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              "& .MuiTab-root": {
                fontWeight: 700,
                textTransform: "none",
                fontSize: "0.92rem",
                minHeight: 48,
              },
            }}
          >
            <Tab icon={<LocalShippingRoundedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Fleet Inventory" />
            <Tab
              icon={<HealthAndSafetyRoundedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  Statutory Compliance Matrix
                  {summary.expiredCount > 0 && (
                    <Chip size="small" label={summary.expiredCount} color="error" sx={{ height: 18, fontSize: "0.68rem" }} />
                  )}
                </Box>
              }
            />
            <Tab icon={<BadgeRoundedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Chauffeur Readiness" />
          </Tabs>
        </Box>

        {/* TAB 0: FLEET INVENTORY ROSTER */}
        {activeTab === 0 && (
          <Box p={3}>
            {/* Filter & Search Bar */}
            <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center" justifyContent="space-between">
              <Box display="flex" gap={1.5} flexWrap="wrap" flex={1} maxWidth={{ xs: "100%", sm: 500 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search license plate, vehicle model, chauffeur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ bgcolor: "#ffffff" }}
                />
              </Box>

              <Box display="flex" gap={1} flexWrap="wrap">
                {["ALL", "AVAILABLE", "ON_TRIP", "MAINTENANCE", "GROUNDED"].map((status) => (
                  <Chip
                    key={status}
                    clickable
                    label={status === "ALL" ? "All Status" : status.replace("_", " ")}
                    onClick={() => setStatusFilter(status)}
                    color={statusFilter === status ? "primary" : "default"}
                    variant={statusFilter === status ? "filled" : "outlined"}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.76rem",
                      borderRadius: 2,
                    }}
                  />
                ))}
                <IconButton onClick={loadAll} size="small" sx={{ border: "1px solid #e2e8f0" }}>
                  <RefreshRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Vehicles Table */}
            <Paper elevation={0} sx={{ border: "1px solid #f1f5f9", borderRadius: 2.5, overflow: "hidden" }}>
              <Table size="medium">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>VEHICLE ASSET</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>TYPE & CAPACITY</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>STATUS</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>CHAUFFEUR</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>COMPLIANCE</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>ODOMETER</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>
                      ACTION
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <LocalShippingRoundedIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }} />
                        <Typography variant="body1" fontWeight={700} color="#64748b">
                          No vehicles found matching your criteria.
                        </Typography>
                        <Button
                          variant="text"
                          startIcon={<AddRoundedIcon />}
                          onClick={() => setOpenAddModal(true)}
                          sx={{ mt: 1, fontWeight: 700 }}
                        >
                          Add a Vehicle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVehicles.map((v) => {
                      const compItem = complianceData?.matrix.find((m) => m.id === v.id);
                      const isNonCompliant = compItem?.overallCompliance === "NON_COMPLIANT";
                      const isExpiring = compItem?.overallCompliance === "EXPIRING_SOON";

                      return (
                        <TableRow
                          key={v.id}
                          hover
                          sx={{
                            cursor: "pointer",
                            "&:hover": { bgcolor: "#f8fafc" },
                          }}
                          onClick={() => navigate(`/app/vehicles/${v.id}`)}
                        >
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              {v.vehicleImage ? (
                                <Avatar
                                  src={v.vehicleImage}
                                  variant="rounded"
                                  sx={{ width: 48, height: 48, borderRadius: 2, border: "1px solid #e2e8f0" }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: "#f1f5f9",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#64748b",
                                  }}
                                >
                                  <DirectionsCarRoundedIcon />
                                </Box>
                              )}
                              <Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Chip
                                    label={v.registrationNumber}
                                    size="small"
                                    sx={{
                                      fontWeight: 900,
                                      fontSize: "0.75rem",
                                      bgcolor: "#0f172a",
                                      color: "#ffffff",
                                      letterSpacing: "0.05em",
                                      borderRadius: "6px",
                                    }}
                                  />
                                  {v.featured && (
                                    <Chip
                                      label="★ Featured"
                                      size="small"
                                      sx={{ bgcolor: "#fef3c7", color: "#b45309", fontWeight: 700, fontSize: "0.68rem" }}
                                    />
                                  )}
                                </Box>
                                <Typography variant="body2" fontWeight={800} color="#0f172a" mt={0.5}>
                                  {v.vehicleName || v.vehicleType}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" fontWeight={700} color="#334155">
                              {v.vehicleType}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1.5} mt={0.5}>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <AirlineSeatReclineNormalRoundedIcon sx={{ fontSize: 15, color: "#64748b" }} />
                                <Typography variant="caption" color="#64748b" fontWeight={600}>
                                  {v.seats || v.capacity} Seats
                                </Typography>
                              </Box>
                              <Chip
                                label={v.fuelType || "DIESEL"}
                                size="small"
                                sx={{
                                  fontSize: "0.68rem",
                                  height: 18,
                                  fontWeight: 700,
                                  bgcolor: "#f1f5f9",
                                  color: "#475569",
                                }}
                              />
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={v.operationalStatus || "AVAILABLE"}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.72rem",
                                borderRadius: 1.5,
                                bgcolor:
                                  v.operationalStatus === "AVAILABLE"
                                    ? "#ecfdf5"
                                    : v.operationalStatus === "ON_TRIP"
                                    ? "#f0f9ff"
                                    : v.operationalStatus === "MAINTENANCE"
                                    ? "#fff7ed"
                                    : "#fef2f2",
                                color:
                                  v.operationalStatus === "AVAILABLE"
                                    ? "#059669"
                                    : v.operationalStatus === "ON_TRIP"
                                    ? "#0284c7"
                                    : v.operationalStatus === "MAINTENANCE"
                                    ? "#ea580c"
                                    : "#dc2626",
                                border: `1px solid ${
                                  v.operationalStatus === "AVAILABLE"
                                    ? "#a7f3d0"
                                    : v.operationalStatus === "ON_TRIP"
                                    ? "#bae6fd"
                                    : v.operationalStatus === "MAINTENANCE"
                                    ? "#fed7aa"
                                    : "#fecaca"
                                }`,
                              }}
                            />
                          </TableCell>

                          <TableCell>
                            {v.assignedDriver ? (
                              <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 26, height: 26, fontSize: "0.75rem", bgcolor: "#0284c7" }}>
                                  {v.assignedDriver.name.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={700} color="#0f172a">
                                    {v.assignedDriver.name}
                                  </Typography>
                                  <Typography variant="caption" color="#64748b">
                                    {v.assignedDriver.contact}
                                  </Typography>
                                </Box>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="#94a3b8" fontStyle="italic">
                                Unassigned
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            {isNonCompliant ? (
                              <Chip
                                icon={<CancelRoundedIcon style={{ fontSize: 14 }} />}
                                label="Action Required"
                                size="small"
                                sx={{ bgcolor: "#fef2f2", color: "#dc2626", fontWeight: 800, fontSize: "0.7rem", border: "1px solid #fecaca" }}
                              />
                            ) : isExpiring ? (
                              <Chip
                                icon={<WarningAmberRoundedIcon style={{ fontSize: 14 }} />}
                                label="Expiring Soon"
                                size="small"
                                sx={{ bgcolor: "#fffbeb", color: "#d97706", fontWeight: 800, fontSize: "0.7rem", border: "1px solid #fde68a" }}
                              />
                            ) : (
                              <Chip
                                icon={<CheckCircleRoundedIcon style={{ fontSize: 14, color: "#16a34a" }} />}
                                label="100% Compliant"
                                size="small"
                                sx={{ bgcolor: "#f0fdf4", color: "#15803d", fontWeight: 800, fontSize: "0.7rem", border: "1px solid #bbf7d0" }}
                              />
                            )}
                          </TableCell>

                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <SpeedRoundedIcon sx={{ fontSize: 16, color: "#64748b" }} />
                              <Typography variant="body2" fontWeight={700} color="#0f172a">
                                {(v.currentOdometer || 0).toLocaleString()} KM
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell align="right">
                            <Button
                              size="small"
                              endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />}
                              sx={{ fontWeight: 700, textTransform: "none", color: "#0284c7" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/app/vehicles/${v.id}`);
                              }}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Paper>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredVehicles.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </Box>
        )}

        {/* TAB 1: STATUTORY COMPLIANCE MATRIX */}
        {activeTab === 1 && (
          <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" gap={1.5}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                  Statutory RTO & Legal Document Matrix
                </Typography>
                <Typography variant="body2" color="#64748b">
                  Live monitoring of commercial paperwork required for tourist cabs and coaches
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadRoundedIcon />}
                onClick={handleExportCsv}
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
              >
                Download Audit Sheet
              </Button>
            </Box>

            <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2.5, overflow: "hidden" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.5 }}>VEHICLE NUMBER</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>FITNESS CERT</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>INSURANCE</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>AITP / PERMIT</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>PUC (EMISSION)</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>REGISTRATION (RC)</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>ROAD TAX</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>
                      AUDIT STATUS
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {complianceData?.matrix.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: "#64748b" }}>
                        No fleet records available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    complianceData?.matrix.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate(`/app/vehicles/${row.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={800} color="#0f172a">
                            {row.registrationNumber}
                          </Typography>
                          <Typography variant="caption" color="#64748b">
                            {row.vehicleName}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <ComplianceBadge doc={row.complianceDocs.fitness} label="Fitness Certificate" />
                        </TableCell>

                        <TableCell>
                          <ComplianceBadge doc={row.complianceDocs.insurance} label="Commercial Insurance" />
                        </TableCell>

                        <TableCell>
                          <ComplianceBadge doc={row.complianceDocs.permit} label="Tourist Permit" />
                        </TableCell>

                        <TableCell>
                          <ComplianceBadge doc={row.complianceDocs.puc} label="PUC Certificate" />
                        </TableCell>

                        <TableCell>
                          <ComplianceBadge doc={row.complianceDocs.rc} label="Registration Certificate" />
                        </TableCell>

                        <TableCell>
                          <ComplianceBadge doc={row.complianceDocs.tax} label="Commercial Road Tax" />
                        </TableCell>

                        <TableCell align="right">
                          {row.overallCompliance === "NON_COMPLIANT" ? (
                            <Chip
                              size="small"
                              label="NON-COMPLIANT"
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.68rem",
                                bgcolor: "#fef2f2",
                                color: "#b91c1c",
                                border: "1px solid #fecaca",
                              }}
                            />
                          ) : row.overallCompliance === "EXPIRING_SOON" ? (
                            <Chip
                              size="small"
                              label="EXPIRING SOON"
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.68rem",
                                bgcolor: "#fffbeb",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                              }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              label="VALID & CLEAR"
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.68rem",
                                bgcolor: "#f0fdf4",
                                color: "#166534",
                                border: "1px solid #bbf7d0",
                              }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}

        {/* TAB 2: CHAUFFEUR / DRIVER COMPLIANCE */}
        {activeTab === 2 && (
          <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" gap={1.5}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                  Chauffeur Verification & License Audit
                </Typography>
                <Typography variant="body2" color="#64748b">
                  Track driving license validity, commercial badges, police verification, and medical readiness
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate("/app/drivers")}
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
              >
                Manage Driver Roster
              </Button>
            </Box>

            <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2.5, overflow: "hidden" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.5 }}>CHAUFFEUR NAME</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>LICENSE NUMBER</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>LICENSE EXPIRY</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>BADGE NUMBER</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>POLICE VERIFICATION</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>EMERGENCY CONTACT</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>
                      AVAILABILITY
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {driverComplianceData?.drivers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#64748b" }}>
                        No drivers recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    driverComplianceData?.drivers.map((d) => (
                      <TableRow key={d.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Avatar sx={{ width: 30, height: 30, fontSize: "0.8rem", bgcolor: "#0284c7" }}>
                              {d.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={800} color="#0f172a">
                                {d.name}
                              </Typography>
                              <Typography variant="caption" color="#64748b">
                                {d.contact}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={d.licenseNumber}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#f1f5f9" }}
                          />
                        </TableCell>

                        <TableCell>
                          <ComplianceBadge doc={d.compliance.license} label="Driving License" />
                        </TableCell>

                        <TableCell>
                          {d.badgeNumber ? (
                            <Chip
                              label={d.badgeNumber}
                              size="small"
                              sx={{ fontWeight: 600, fontSize: "0.72rem", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}
                            />
                          ) : (
                            <Typography variant="caption" color="#94a3b8">
                              None
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={d.policeVerificationStatus || "PENDING"}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.7rem",
                              bgcolor: d.policeVerificationStatus === "VERIFIED" ? "#ecfdf5" : "#fffbeb",
                              color: d.policeVerificationStatus === "VERIFIED" ? "#059669" : "#b45309",
                              border: `1px solid ${d.policeVerificationStatus === "VERIFIED" ? "#a7f3d0" : "#fde68a"}`,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" color="#334155" fontWeight={600}>
                            {d.emergencyContact || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Chip
                            label={d.isAvailable ? "Ready" : "On Duty"}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              bgcolor: d.isAvailable ? "#f0fdf4" : "#eff6ff",
                              color: d.isAvailable ? "#15803d" : "#1d4ed8",
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </Paper>

      {/* ADD NEW VEHICLE MODAL */}
      <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1, borderBottom: "1px solid #f1f5f9" }}>
          <Typography variant="h6" fontWeight={800} color="#0f172a">
            Register Fleet Asset & Compliance Dates
          </Typography>
          <Typography variant="caption" color="#64748b">
            Add a vehicle with technical specs and statutory paperwork renewal dates
          </Typography>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3, bgcolor: "#f8fafc" }}>
          <Tabs value={addModalTab} onChange={(_, v) => setAddModalTab(v)}>
            <Tab label="1. Core Profile" sx={{ fontWeight: 700, textTransform: "none" }} />
            <Tab label="2. Statutory Expiry Dates" sx={{ fontWeight: 700, textTransform: "none" }} />
            <Tab label="3. Technical Identification" sx={{ fontWeight: 700, textTransform: "none" }} />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          {addModalTab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Registration Number (Plate)"
                  placeholder="e.g. DL-01-TA-1234"
                  value={form.registrationNumber}
                  onChange={(e) => setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Vehicle Model / Category"
                  placeholder="e.g. Toyota Innova Crysta"
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Customer Display Name"
                  placeholder="e.g. Luxury 7-Seater Crysta"
                  value={form.vehicleName}
                  onChange={(e) => setForm({ ...form, vehicleName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Seating Capacity"
                  value={form.seats}
                  onChange={(e) => setForm({ ...form, seats: Number(e.target.value), capacity: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Luggage (Bags)"
                  value={form.bags}
                  onChange={(e) => setForm({ ...form, bags: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Fuel Type"
                  value={form.fuelType}
                  onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                >
                  <MenuItem value="DIESEL">Diesel</MenuItem>
                  <MenuItem value="PETROL">Petrol</MenuItem>
                  <MenuItem value="CNG">CNG</MenuItem>
                  <MenuItem value="ELECTRIC">Electric (EV)</MenuItem>
                  <MenuItem value="HYBRID">Hybrid</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Climate Control"
                  value={form.acType}
                  onChange={(e) => setForm({ ...form, acType: e.target.value })}
                >
                  <MenuItem value="AC">Air Conditioned (AC)</MenuItem>
                  <MenuItem value="NON_AC">Non-AC</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Base Rate Per KM (₹)"
                  value={form.pricePerKm}
                  onChange={(e) => setForm({ ...form, pricePerKm: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Assigned Chauffeur"
                  value={form.assignedDriverId}
                  onChange={(e) => setForm({ ...form, assignedDriverId: e.target.value })}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {drivers.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name} ({d.contact})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Operational Status"
                  value={form.operationalStatus}
                  onChange={(e) => setForm({ ...form, operationalStatus: e.target.value })}
                >
                  <MenuItem value="AVAILABLE">Available in Yard</MenuItem>
                  <MenuItem value="ON_TRIP">On Trip</MenuItem>
                  <MenuItem value="MAINTENANCE">In Maintenance / Garage</MenuItem>
                  <MenuItem value="GROUNDED">Grounded / Non-Compliant</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          )}

          {addModalTab === 1 && (
            <Box>
              <Typography variant="body2" color="#64748b" mb={2}>
                Enter the expiry dates as printed on statutory certificates to receive timely renewal alerts:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="RTO Fitness Expiry"
                    InputLabelProps={{ shrink: true }}
                    value={form.fitnessExpiry}
                    onChange={(e) => setForm({ ...form, fitnessExpiry: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Commercial Insurance Expiry"
                    InputLabelProps={{ shrink: true }}
                    value={form.insuranceExpiry}
                    onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Tourist Permit Expiry (AITP/State)"
                    InputLabelProps={{ shrink: true }}
                    value={form.permitExpiry}
                    onChange={(e) => setForm({ ...form, permitExpiry: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="PUC (Pollution/Emission) Expiry"
                    InputLabelProps={{ shrink: true }}
                    value={form.pucExpiry}
                    onChange={(e) => setForm({ ...form, pucExpiry: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="RC (Registration Certificate) Expiry"
                    InputLabelProps={{ shrink: true }}
                    value={form.rcExpiry}
                    onChange={(e) => setForm({ ...form, rcExpiry: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Road / Motor Vehicle Tax Expiry"
                    InputLabelProps={{ shrink: true }}
                    value={form.taxExpiry}
                    onChange={(e) => setForm({ ...form, taxExpiry: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {addModalTab === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Chassis Number"
                  placeholder="e.g. MBJA824109..."
                  value={form.chassisNumber}
                  onChange={(e) => setForm({ ...form, chassisNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Engine Number"
                  placeholder="e.g. 2GD74829..."
                  value={form.engineNumber}
                  onChange={(e) => setForm({ ...form, engineNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fastag Tag Number"
                  placeholder="e.g. 34161FA8209..."
                  value={form.fastagTagNumber}
                  onChange={(e) => setForm({ ...form, fastagTagNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Current Odometer Reading (KM)"
                  value={form.currentOdometer}
                  onChange={(e) => setForm({ ...form, currentOdometer: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Fleet Asset Notes / Special Amenities"
                  placeholder="e.g. Carrier fitted, GPS tracker installed, WiFi onboard..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: "1px solid #f1f5f9" }}>
          <Button onClick={() => setOpenAddModal(false)} sx={{ fontWeight: 700, color: "#64748b" }}>
            Cancel
          </Button>
          {addModalTab < 2 ? (
            <Button
              variant="contained"
              onClick={() => setAddModalTab((prev) => prev + 1)}
              sx={{ fontWeight: 700, textTransform: "none", borderRadius: 2 }}
            >
              Next Step
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={creating || !form.registrationNumber || !form.vehicleType}
              sx={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: 2,
                px: 3,
              }}
            >
              {creating ? "Adding Asset..." : "Save Vehicle to Fleet"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}