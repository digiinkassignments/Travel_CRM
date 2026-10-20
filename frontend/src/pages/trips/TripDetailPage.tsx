import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Chip, Select, MenuItem, TextField, Button, Grid, Alert,
  Avatar, IconButton, Tooltip, Stack, AlertTitle
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import { apiClient } from "../../api/client";
import { WhatsAppModal } from "../../components/whatsapp/WhatsAppModal";
import { DutySlipDispatcherSection } from "../../components/trips/DutySlipDispatcherSection";

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  SCHEDULED: { bg: "#eff6ff", color: "#1d4ed8" },
  IN_PROGRESS: { bg: "#fff7ed", color: "#c2410c" },
  COMPLETED: { bg: "#f0fdf4", color: "#15803d" },
  CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
};

function getVehicleComplianceIssues(v?: any) {
  if (!v) return [];
  const issues: string[] = [];
  const now = Date.now();

  function check(dateStr: string | null | undefined, name: string) {
    if (dateStr && new Date(dateStr).getTime() < now) {
      issues.push(`${name} Expired`);
    }
  }

  check(v.fitnessExpiry, "Fitness Certificate");
  check(v.insuranceExpiry, "Commercial Insurance");
  check(v.permitExpiry, "Tourist Permit");
  check(v.pucExpiry, "PUC Certificate");
  check(v.taxExpiry, "Road Tax");
  check(v.rcExpiry, "RC Registration");

  if (v.operationalStatus === "GROUNDED") issues.push("Vehicle is Marked GROUNDED");
  if (v.operationalStatus === "MAINTENANCE") issues.push("Vehicle is In Workshop Maintenance");

  return issues;
}

function getDriverComplianceIssues(d?: any) {
  if (!d) return [];
  const issues: string[] = [];
  const now = Date.now();

  if (d.licenseExpiry && new Date(d.licenseExpiry).getTime() < now) {
    issues.push("Driving License EXPIRED");
  }
  if (d.policeVerificationStatus === "EXPIRED") {
    issues.push("Police Verification Expired");
  } else if (d.policeVerificationStatus === "PENDING" || d.policeVerificationStatus === "NOT_DONE") {
    issues.push("Police Verification Pending");
  }
  return issues;
}

export function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [notes, setNotes] = useState({ pickup: "", drop: "", itineraryNotes: "" });
  const [assignError, setAssignError] = useState<string | null>(null);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  function load() {
    apiClient.get(`/trips/${id}`).then(({ data }) => {
      setTrip(data.data);
      setNotes({
        pickup: data.data.pickup ?? "",
        drop: data.data.drop ?? "",
        itineraryNotes: data.data.itineraryNotes ?? "",
      });
    });
  }
  useEffect(load, [id]);
  useEffect(() => {
    apiClient.get("/drivers").then(({ data }) => setDrivers(data.data ?? [])).catch(() => {});
    apiClient.get("/vehicles").then(({ data }) => setVehicles(data.data ?? [])).catch(() => {});
  }, []);

  async function updateStatus(status: string) {
    await apiClient.patch(`/trips/${id}/status`, { status });
    load();
  }

  async function assign(field: "driverId" | "vehicleId", value: string) {
    setAssignError(null);
    try {
      await apiClient.patch(`/trips/${id}/assign`, { [field]: value || null });
      load();
    } catch (err: any) {
      setAssignError(err.response?.data?.message ?? "Could not update assignment");
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await apiClient.patch(`/trips/${id}`, notes);
      load();
    } finally {
      setSavingNotes(false);
    }
  }

  const assignedVehicleIssues = useMemo(() => {
    return getVehicleComplianceIssues(trip?.vehicle);
  }, [trip?.vehicle]);

  const assignedDriverIssues = useMemo(() => {
    return getDriverComplianceIssues(trip?.driver);
  }, [trip?.driver]);

  if (!trip) {
    return (
      <Box sx={{ p: 4, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="body1" color="text.secondary" fontWeight={600}>
          Loading trip dispatch...
        </Typography>
      </Box>
    );
  }

  const currentStatusConfig = STATUS_CONFIG[trip.status] || { bg: "#f1f5f9", color: "#475569" };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Meta Bar */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
        <Tooltip title="Back to Trips">
          <IconButton
            onClick={() => navigate("/app/trips")}
            size="small"
            sx={{
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              "&:hover": { bgcolor: "#f1f5f9" },
            }}
          >
            <ArrowBackRoundedIcon fontSize="small" sx={{ color: "#475569" }} />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          TRIP DISPATCH / #{id?.slice(-6).toUpperCase()}
        </Typography>
      </Box>

      {/* Header */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        mb={3.5}
      >
        <Box display="flex" alignItems="center" gap={1.75}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              background: "linear-gradient(135deg, #0284c7 0%, #0c4a6e 100%)",
              boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
            }}
          >
            <LuggageRoundedIcon sx={{ color: "#fff", fontSize: 26 }} />
          </Avatar>
          <Box>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.03em" }}>
                Trip Dispatch
              </Typography>
              <Chip
                label={trip.status.replace("_", " ")}
                sx={{
                  bgcolor: currentStatusConfig.bg,
                  color: currentStatusConfig.color,
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  borderRadius: "8px",
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Traveler: <strong>{trip.booking?.customer?.name || "Private Charter"}</strong> · Status: {trip.status.replace("_", " ")}
            </Typography>
          </Box>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
          <Select
            size="small"
            value={trip.status}
            onChange={(e) => updateStatus(e.target.value)}
            sx={{
              bgcolor: "#ffffff",
              borderRadius: 2,
              fontSize: "0.82rem",
              fontWeight: 700,
              minWidth: 150,
            }}
          >
            {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
              <MenuItem key={s} value={s} sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                {s.replace("_", " ")}
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="contained"
            startIcon={<WhatsAppIcon />}
            onClick={() => setWhatsAppOpen(true)}
            sx={{
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              boxShadow: "0 4px 14px rgba(34, 197, 94, 0.3)",
              fontWeight: 700,
              borderRadius: 2.5,
              textTransform: "none",
              px: 2.5,
            }}
          >
            Share on WhatsApp
          </Button>
        </Box>
      </Box>

      {assignError && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{assignError}</Alert>}

      {/* DISPATCH SAFETY COMPLIANCE WARNING BANNERS */}
      {(assignedVehicleIssues.length > 0 || assignedDriverIssues.length > 0) && (
        <Alert
          severity="warning"
          icon={<WarningAmberRoundedIcon fontSize="inherit" />}
          sx={{
            mb: 3,
            borderRadius: 3,
            border: "1px solid #fed7aa",
            bgcolor: "#fffaf0",
            "& .MuiAlert-icon": { color: "#ea580c" },
          }}
        >
          <AlertTitle sx={{ fontWeight: 800, color: "#9a3412", fontSize: "0.95rem" }}>
            Fleet Safety & Dispatch Compliance Warning
          </AlertTitle>
          <Stack spacing={0.75} mt={0.5}>
            {assignedVehicleIssues.length > 0 && (
              <Typography variant="body2" color="#7c2d12">
                • <strong>Assigned Vehicle ({trip.vehicle?.registrationNumber}):</strong> {assignedVehicleIssues.join(", ")}. Operating this vehicle on highway trips poses RTO penalty or insurance forfeiture risks.
              </Typography>
            )}
            {assignedDriverIssues.length > 0 && (
              <Typography variant="body2" color="#7c2d12">
                • <strong>Assigned Chauffeur ({trip.driver?.name}):</strong> {assignedDriverIssues.join(", ")}. Ensure driver license and police credentials are up to date.
              </Typography>
            )}
          </Stack>
        </Alert>
      )}

      {/* Driver & Vehicle Pairing Cards */}
      <Grid container spacing={2.5} mb={3.5}>
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${assignedDriverIssues.length > 0 ? "#fed7aa" : "#e2e8f0"}`,
              bgcolor: assignedDriverIssues.length > 0 ? "#fffdfb" : "#ffffff",
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Box display="flex" alignItems="center" gap={1.25}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: "#eff6ff", color: "#0284c7" }}>
                  <PersonRoundedIcon sx={{ fontSize: 20 }} />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                    Assigned Chauffeur
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Driver responsible for passenger pickup
                  </Typography>
                </Box>
              </Box>
              {trip.driver && (
                assignedDriverIssues.length > 0 ? (
                  <Chip
                    label="Compliance Alert"
                    size="small"
                    sx={{ bgcolor: "#fef3c7", color: "#b45309", fontWeight: 800, fontSize: "0.68rem" }}
                  />
                ) : (
                  <Chip
                    icon={<CheckCircleRoundedIcon style={{ fontSize: 13 }} />}
                    label="Ready"
                    size="small"
                    sx={{ bgcolor: "#ecfdf5", color: "#047857", fontWeight: 800, fontSize: "0.68rem" }}
                  />
                )
              )}
            </Box>

            <Select
              fullWidth
              size="small"
              displayEmpty
              value={trip.driverId ?? ""}
              onChange={(e) => assign("driverId", e.target.value)}
              sx={{ borderRadius: 2, bgcolor: "#f8fafc" }}
            >
              <MenuItem value="">
                <em>Unassigned Chauffeur</em>
              </MenuItem>
              {drivers.map((d) => {
                const issues = getDriverComplianceIssues(d);
                const hasIssues = issues.length > 0;
                return (
                  <MenuItem key={d.id} value={d.id}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <span>{d.name} {d.contact ? `(${d.contact})` : ""}</span>
                      {hasIssues && (
                        <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 700, ml: 1 }}>
                          ⚠️ {issues[0]}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>

            {trip.driver && (
              <Box mt={1.5} pt={1.5} borderTop="1px dashed #e2e8f0" display="flex" flexWrap="wrap" gap={1}>
                <Typography variant="caption" color="text.secondary">
                  DL: <strong>{trip.driver.licenseNumber || "N/A"}</strong>
                </Typography>
                {trip.driver.emergencyContact && (
                  <Typography variant="caption" color="text.secondary">
                    • ICE: {trip.driver.emergencyContact}
                  </Typography>
                )}
                {trip.driver.policeVerificationStatus && (
                  <Typography variant="caption" color={trip.driver.policeVerificationStatus === "VERIFIED" ? "#15803d" : "#b45309"} fontWeight={700}>
                    • Police: {trip.driver.policeVerificationStatus}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${assignedVehicleIssues.length > 0 ? "#fed7aa" : "#e2e8f0"}`,
              bgcolor: assignedVehicleIssues.length > 0 ? "#fffdfb" : "#ffffff",
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Box display="flex" alignItems="center" gap={1.25}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: "#f0fdf4", color: "#16a34a" }}>
                  <DirectionsCarRoundedIcon sx={{ fontSize: 20 }} />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                    Assigned Fleet Unit
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Vehicle dispatched for transit
                  </Typography>
                </Box>
              </Box>
              {trip.vehicle && (
                assignedVehicleIssues.length > 0 ? (
                  <Chip
                    label="Compliance Expired"
                    size="small"
                    sx={{ bgcolor: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: "0.68rem" }}
                  />
                ) : (
                  <Chip
                    icon={<ShieldRoundedIcon style={{ fontSize: 13 }} />}
                    label="Compliant"
                    size="small"
                    sx={{ bgcolor: "#ecfdf5", color: "#047857", fontWeight: 800, fontSize: "0.68rem" }}
                  />
                )
              )}
            </Box>

            <Select
              fullWidth
              size="small"
              displayEmpty
              value={trip.vehicleId ?? ""}
              onChange={(e) => assign("vehicleId", e.target.value)}
              sx={{ borderRadius: 2, bgcolor: "#f8fafc" }}
            >
              <MenuItem value="">
                <em>Unassigned Vehicle</em>
              </MenuItem>
              {vehicles.map((v) => {
                const issues = getVehicleComplianceIssues(v);
                const hasIssues = issues.length > 0;
                return (
                  <MenuItem key={v.id} value={v.id}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <span>{v.registrationNumber} ({v.vehicleType})</span>
                      {hasIssues && (
                        <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 700, ml: 1 }}>
                          ⚠️ {issues[0]}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>

            {trip.vehicle && (
              <Box mt={1.5} pt={1.5} borderTop="1px dashed #e2e8f0" display="flex" flexWrap="wrap" gap={1}>
                <Typography variant="caption" color="text.secondary">
                  Unit: <strong>{trip.vehicle.vehicleName || trip.vehicle.vehicleType}</strong>
                </Typography>
                {trip.vehicle.operationalStatus && (
                  <Typography variant="caption" color="text.secondary">
                    • Status: {trip.vehicle.operationalStatus}
                  </Typography>
                )}
                {trip.vehicle.currentOdometer && (
                  <Typography variant="caption" color="text.secondary">
                    • Odo: {Number(trip.vehicle.currentOdometer).toLocaleString()} KM
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Duty Slip Dispatcher & Odometer Lifecycle Section */}
      <Box mb={3.5}>
        <DutySlipDispatcherSection tripId={id!} trip={trip} onTripRefresh={load} />
      </Box>

      {/* Route & Itinerary Notes */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
        <Box display="flex" alignItems="center" gap={1.25} mb={2}>
          <LocationOnRoundedIcon sx={{ color: "#0284c7", fontSize: 22 }} />
          <Typography variant="h6" fontWeight={800} color="#0f172a">
            Route Schedule & Transit Brief
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Pickup Location / Terminal"
              value={notes.pickup}
              onChange={(e) => setNotes({ ...notes, pickup: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Dropoff Location / Hotel"
              value={notes.drop}
              onChange={(e) => setNotes({ ...notes, drop: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Special Driver & Guest Itinerary Notes"
              placeholder="e.g. Flight arrives at 14:30 Terminal 2. Guest requested baby seat and bottled water."
              value={notes.itineraryNotes}
              onChange={(e) => setNotes({ ...notes, itineraryNotes: e.target.value })}
            />
          </Grid>
        </Grid>
        <Box mt={2.5} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            disabled={savingNotes}
            onClick={saveNotes}
            sx={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
            }}
          >
            Save Trip Notes
          </Button>
        </Box>
      </Paper>

      {/* WhatsApp Modal for Driver Broadcast */}
      {trip && (
        <WhatsAppModal
          open={whatsAppOpen}
          onClose={() => setWhatsAppOpen(false)}
          initialPhone={trip.booking?.customer?.phone || ""}
          customerName={trip.booking?.customer?.name || ""}
          defaultCategory="CAB_DISPATCH"
        />
      )}
    </Box>
  );
}
