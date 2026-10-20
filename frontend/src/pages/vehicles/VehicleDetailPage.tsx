import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import AirlineSeatReclineNormalRoundedIcon from "@mui/icons-material/AirlineSeatReclineNormalRounded";
import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import AcUnitRoundedIcon from "@mui/icons-material/AcUnitRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import HealthAndSafetyRoundedIcon from "@mui/icons-material/HealthAndSafetyRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LocalGasStationRoundedIcon from "@mui/icons-material/LocalGasStationRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import { apiClient } from "../../api/client";
import {
  fetchVehicleMaintenanceLogs,
  addVehicleMaintenanceLog,
  deleteVehicleMaintenanceLog,
  uploadVehicleDocument,
  deleteVehicleDocument,
  MaintenanceLog,
} from "../../api/fleet";

function evalDays(date: string | null | undefined): { status: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "MISSING"; days: number | null } {
  if (!date) return { status: "MISSING", days: null };
  const target = new Date(date).getTime();
  const now = Date.now();
  const days = Math.ceil((target - now) / 86400000);
  if (days < 0) return { status: "EXPIRED", days };
  if (days <= 30) return { status: "EXPIRING_SOON", days };
  return { status: "VALID", days };
}

export function VehicleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Maintenance modal
  const [openMaintModal, setOpenMaintModal] = useState(false);
  const [maintSaving, setMaintSaving] = useState(false);
  const [maintForm, setMaintForm] = useState({
    serviceType: "OIL_CHANGE",
    serviceDate: new Date().toISOString().slice(0, 10),
    odometerAtService: 0,
    garageWorkshopName: "",
    garagePhone: "",
    costInRupees: 0,
    invoiceBillUrl: "",
    notes: "",
    nextServiceDueKm: 0,
    nextServiceDueDate: "",
    status: "COMPLETED" as const,
  });

  // Document upload modal
  const [openDocModal, setOpenDocModal] = useState(false);
  const [docSaving, setDocSaving] = useState(false);
  const [docForm, setDocForm] = useState({
    type: "INSURANCE",
    fileUrl: "",
    fileKey: "",
    expiryDate: "",
  });

  // Core Edit Form
  const [form, setForm] = useState({
    vehicleName: "",
    slug: "",
    pricePerKm: "0",
    sortOrder: "0",
    seats: "4",
    bags: "2",
    acType: "AC",
    pricingType: "PER_KM",
    fuelType: "DIESEL",
    description: "",
    vehicleImage: "",
    catalogStatus: "ACTIVE",
    featured: false,
    vehicleType: "",
    registrationNumber: "",
    capacity: "4",
    currentOdometer: "0",
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

  function load() {
    if (!id) return;
    apiClient
      .get(`/vehicles/${id}`)
      .then(({ data }) => {
        const v = data.data;
        setVehicle(v);
        setForm({
          vehicleName: v.vehicleName ?? v.vehicleType ?? "",
          slug: v.slug ?? "",
          pricePerKm: String(v.pricePerKm ?? 0),
          sortOrder: String(v.sortOrder ?? 0),
          seats: String(v.seats ?? v.capacity ?? 4),
          bags: String(v.bags ?? 2),
          acType: v.acType ?? "AC",
          pricingType: v.pricingType ?? "PER_KM",
          fuelType: v.fuelType ?? "DIESEL",
          description: v.description ?? "",
          vehicleImage: v.vehicleImage ?? "",
          catalogStatus: v.catalogStatus ?? "ACTIVE",
          featured: Boolean(v.featured),
          vehicleType: v.vehicleType ?? "",
          registrationNumber: v.registrationNumber ?? "",
          capacity: String(v.capacity ?? 4),
          currentOdometer: String(v.currentOdometer ?? 0),
          operationalStatus: v.operationalStatus ?? "AVAILABLE",
          chassisNumber: v.chassisNumber ?? "",
          engineNumber: v.engineNumber ?? "",
          fastagTagNumber: v.fastagTagNumber ?? "",
          rcExpiry: v.rcExpiry ? new Date(v.rcExpiry).toISOString().slice(0, 10) : "",
          insuranceExpiry: v.insuranceExpiry ? new Date(v.insuranceExpiry).toISOString().slice(0, 10) : "",
          permitExpiry: v.permitExpiry ? new Date(v.permitExpiry).toISOString().slice(0, 10) : "",
          fitnessExpiry: v.fitnessExpiry ? new Date(v.fitnessExpiry).toISOString().slice(0, 10) : "",
          pucExpiry: v.pucExpiry ? new Date(v.pucExpiry).toISOString().slice(0, 10) : "",
          taxExpiry: v.taxExpiry ? new Date(v.taxExpiry).toISOString().slice(0, 10) : "",
          assignedDriverId: v.assignedDriverId ?? "",
        });
      })
      .catch(() => setError("Could not load vehicle details."));

    fetchVehicleMaintenanceLogs(id)
      .then((logs) => setMaintenanceLogs(logs))
      .catch(() => setMaintenanceLogs([]));
  }

  useEffect(() => {
    load();
    apiClient
      .get("/drivers")
      .then(({ data }) => setDrivers(data.data ?? []))
      .catch(() => setDrivers([]));
  }, [id]);

  function updateField(field: string, value: any) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    if (!id) return;
    try {
      setSaving(true);
      setError("");
      await apiClient.patch(`/vehicles/${id}`, {
        ...form,
        pricePerKm: Number(form.pricePerKm),
        sortOrder: Number(form.sortOrder),
        seats: Number(form.seats),
        bags: Number(form.bags),
        capacity: Number(form.capacity),
        currentOdometer: Number(form.currentOdometer),
        assignedDriverId: form.assignedDriverId || null,
        rcExpiry: form.rcExpiry || null,
        insuranceExpiry: form.insuranceExpiry || null,
        permitExpiry: form.permitExpiry || null,
        fitnessExpiry: form.fitnessExpiry || null,
        pucExpiry: form.pucExpiry || null,
        taxExpiry: form.taxExpiry || null,
      });
      setEditing(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Could not update vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickStatusChange(newStatus: string) {
    if (!id) return;
    try {
      await apiClient.patch(`/vehicles/${id}`, { operationalStatus: newStatus });
      load();
    } catch (err) {
      console.error("Status update failed", err);
    }
  }

  async function handleQuickDateUpdate(field: string, val: string) {
    if (!id) return;
    try {
      await apiClient.patch(`/vehicles/${id}`, { [field]: val || null });
      load();
    } catch (err) {
      console.error("Date update failed", err);
    }
  }

  async function handleSaveMaintenance() {
    if (!id) return;
    try {
      setMaintSaving(true);
      await addVehicleMaintenanceLog(id, {
        serviceType: maintForm.serviceType,
        serviceDate: maintForm.serviceDate,
        odometerAtService: Number(maintForm.odometerAtService) || undefined,
        garageWorkshopName: maintForm.garageWorkshopName || undefined,
        garagePhone: maintForm.garagePhone || undefined,
        costInPaise: Math.round(Number(maintForm.costInRupees) * 100),
        invoiceBillUrl: maintForm.invoiceBillUrl || undefined,
        notes: maintForm.notes || undefined,
        nextServiceDueKm: Number(maintForm.nextServiceDueKm) || undefined,
        nextServiceDueDate: maintForm.nextServiceDueDate || undefined,
        status: maintForm.status,
      });
      setOpenMaintModal(false);
      load();
    } catch (err) {
      console.error("Failed to save maintenance", err);
    } finally {
      setMaintSaving(false);
    }
  }

  async function handleDeleteMaintenance(maintId: string) {
    if (!id || !confirm("Delete this maintenance record?")) return;
    try {
      await deleteVehicleMaintenanceLog(id, maintId);
      load();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  }

  async function handleSaveDocument() {
    if (!id) return;
    try {
      setDocSaving(true);
      await uploadVehicleDocument(id, {
        type: docForm.type,
        fileUrl: docForm.fileUrl,
        fileKey: docForm.fileKey || docForm.type,
        expiryDate: docForm.expiryDate || undefined,
      });
      setOpenDocModal(false);
      setDocForm({ type: "INSURANCE", fileUrl: "", fileKey: "", expiryDate: "" });
      load();
    } catch (err) {
      console.error("Failed to upload document", err);
    } finally {
      setDocSaving(false);
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!id || !confirm("Delete this document?")) return;
    try {
      await deleteVehicleDocument(id, docId);
      load();
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  }

  async function remove() {
    if (!id) return;
    if (confirm("Are you sure you want to permanently remove this vehicle from the fleet?")) {
      try {
        await apiClient.delete(`/vehicles/${id}`);
        navigate("/app/vehicles");
      } catch (err: any) {
        setError(err.response?.data?.message ?? "Could not delete vehicle.");
      }
    }
  }

  if (!vehicle) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="text.secondary">Loading vehicle records...</Typography>
      </Box>
    );
  }

  // Evaluate statutory health
  const statutoryDocs = [
    { label: "Fitness Certificate", key: "fitnessExpiry", date: vehicle.fitnessExpiry, icon: HealthAndSafetyRoundedIcon },
    { label: "Commercial Insurance", key: "insuranceExpiry", date: vehicle.insuranceExpiry, icon: HealthAndSafetyRoundedIcon },
    { label: "Tourist Permit (AITP)", key: "permitExpiry", date: vehicle.permitExpiry, icon: DescriptionRoundedIcon },
    { label: "PUC (Pollution/Emission)", key: "pucExpiry", date: vehicle.pucExpiry, icon: LocalGasStationRoundedIcon },
    { label: "Registration (RC)", key: "rcExpiry", date: vehicle.rcExpiry, icon: DescriptionRoundedIcon },
    { label: "Commercial Road Tax", key: "taxExpiry", date: vehicle.taxExpiry, icon: DescriptionRoundedIcon },
  ];

  const totalMaintCostPaise = maintenanceLogs.reduce((sum, log) => sum + (log.costInPaise || 0), 0);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Navigation & Action Bar */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate("/app/vehicles")}
            sx={{
              borderRadius: 2,
              borderColor: "#cbd5e1",
              color: "#475569",
              bgcolor: "#ffffff",
              fontWeight: 700,
              textTransform: "none",
            }}
          >
            Fleet
          </Button>

          <Box>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Chip
                label={vehicle.registrationNumber}
                sx={{
                  fontWeight: 900,
                  fontSize: "0.85rem",
                  bgcolor: "#0f172a",
                  color: "#ffffff",
                  letterSpacing: "0.05em",
                  borderRadius: "6px",
                  px: 0.5,
                }}
              />
              <Typography variant="h5" fontWeight={900} color="#0f172a">
                {vehicle.vehicleName || vehicle.vehicleType}
              </Typography>
            </Box>
            <Typography variant="caption" color="#64748b">
              Asset ID: {vehicle.id} • Registered under Digiink Fleet
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          {/* Quick Operational Status Switcher */}
          <TextField
            select
            size="small"
            value={vehicle.operationalStatus || "AVAILABLE"}
            onChange={(e) => handleQuickStatusChange(e.target.value)}
            sx={{
              minWidth: 160,
              bgcolor: "#ffffff",
              "& .MuiSelect-select": {
                fontWeight: 800,
                fontSize: "0.78rem",
                py: 0.8,
              },
            }}
          >
            <MenuItem value="AVAILABLE">🟢 Available in Yard</MenuItem>
            <MenuItem value="ON_TRIP">🔵 On Active Trip</MenuItem>
            <MenuItem value="MAINTENANCE">🟠 In Workshop / Repair</MenuItem>
            <MenuItem value="GROUNDED">🔴 Grounded / Non-Compliant</MenuItem>
          </TextField>

          <Button
            variant="outlined"
            startIcon={<EditRoundedIcon />}
            onClick={() => setEditing(!editing)}
            sx={{
              borderColor: "#cbd5e1",
              color: "#334155",
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: "#ffffff",
              textTransform: "none",
            }}
          >
            {editing ? "Cancel Editing" : "Edit Specifications"}
          </Button>

          <Button
            color="error"
            variant="outlined"
            startIcon={<DeleteOutlineRoundedIcon />}
            onClick={remove}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              textTransform: "none",
              bgcolor: "#ffffff",
            }}
          >
            Delete Asset
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Container with Tabs */}
      <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden", bgcolor: "#ffffff" }}>
        <Box sx={{ borderBottom: 1, borderColor: "#f1f5f9", px: 3, pt: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              "& .MuiTab-root": {
                fontWeight: 700,
                textTransform: "none",
                fontSize: "0.92rem",
                minHeight: 48,
              },
            }}
          >
            <Tab icon={<DirectionsCarRoundedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Specifications & Tariffs" />
            <Tab icon={<HealthAndSafetyRoundedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Statutory Compliance Vault" />
            <Tab
              icon={<BuildRoundedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Maintenance & Workshop (${maintenanceLogs.length})`}
            />
            <Tab
              icon={<SpeedRoundedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Trip History (${vehicle.trips?.length || 0})`}
            />
            <Tab
              icon={<DescriptionRoundedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Documents (${vehicle.documents?.length || 0})`}
            />
          </Tabs>
        </Box>

        {/* TAB 0: SPECIFICATIONS & TARIFFS */}
        {activeTab === 0 && (
          <Box p={3.5}>
            {editing ? (
              <Box>
                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" mb={2}>
                  Core Vehicle Specifications
                </Typography>
                <Grid container spacing={2.5} mb={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Vehicle Model / Category"
                      value={form.vehicleType}
                      onChange={(e) => updateField("vehicleType", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Customer Display Name"
                      value={form.vehicleName}
                      onChange={(e) => updateField("vehicleName", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      label="Fuel Type"
                      value={form.fuelType}
                      onChange={(e) => updateField("fuelType", e.target.value)}
                    >
                      <MenuItem value="DIESEL">Diesel</MenuItem>
                      <MenuItem value="PETROL">Petrol</MenuItem>
                      <MenuItem value="CNG">CNG</MenuItem>
                      <MenuItem value="ELECTRIC">Electric</MenuItem>
                      <MenuItem value="HYBRID">Hybrid</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Seating Capacity"
                      value={form.seats}
                      onChange={(e) => updateField("seats", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Luggage Capacity (Bags)"
                      value={form.bags}
                      onChange={(e) => updateField("bags", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Base Tariff Rate (₹/KM)"
                      value={form.pricePerKm}
                      onChange={(e) => updateField("pricePerKm", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Current Odometer (KM)"
                      value={form.currentOdometer}
                      onChange={(e) => updateField("currentOdometer", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      label="Climate Control"
                      value={form.acType}
                      onChange={(e) => updateField("acType", e.target.value)}
                    >
                      <MenuItem value="AC">Air Conditioned (AC)</MenuItem>
                      <MenuItem value="NON_AC">Non-AC</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Chassis Number"
                      value={form.chassisNumber}
                      onChange={(e) => updateField("chassisNumber", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Engine Number"
                      value={form.engineNumber}
                      onChange={(e) => updateField("engineNumber", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Fastag Tag Number"
                      value={form.fastagTagNumber}
                      onChange={(e) => updateField("fastagTagNumber", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Default Assigned Chauffeur"
                      value={form.assignedDriverId}
                      onChange={(e) => updateField("assignedDriverId", e.target.value)}
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
                      fullWidth
                      label="Catalog Slug (Public URL)"
                      value={form.slug}
                      onChange={(e) => updateField("slug", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Fleet Notes / Amenities"
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  startIcon={<SaveRoundedIcon />}
                  onClick={save}
                  disabled={saving}
                  sx={{
                    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: 2,
                    px: 3,
                  }}
                >
                  {saving ? "Saving Changes..." : "Save Specifications"}
                </Button>
              </Box>
            ) : (
              <Box>
                {vehicle.vehicleImage && (
                  <Box
                    component="img"
                    src={vehicle.vehicleImage}
                    alt={vehicle.vehicleName}
                    sx={{
                      width: "100%",
                      maxHeight: 280,
                      objectFit: "cover",
                      borderRadius: 2.5,
                      mb: 3,
                    }}
                  />
                )}

                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #f1f5f9" }}>
                      <Typography variant="caption" fontWeight={700} color="#64748b">
                        FUEL & DRIVETRAIN
                      </Typography>
                      <Typography variant="body1" fontWeight={800} color="#0f172a" mt={0.5}>
                        {vehicle.fuelType || "DIESEL"} • {vehicle.acType || "AC"}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #f1f5f9" }}>
                      <Typography variant="caption" fontWeight={700} color="#64748b">
                        CAPACITY
                      </Typography>
                      <Typography variant="body1" fontWeight={800} color="#0f172a" mt={0.5}>
                        {vehicle.seats || vehicle.capacity} Passengers • {vehicle.bags || 0} Bags
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #f1f5f9" }}>
                      <Typography variant="caption" fontWeight={700} color="#64748b">
                        CURRENT ODOMETER
                      </Typography>
                      <Typography variant="body1" fontWeight={800} color="#0284c7" mt={0.5}>
                        {(vehicle.currentOdometer || 0).toLocaleString()} KM
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #f1f5f9" }}>
                      <Typography variant="caption" fontWeight={700} color="#64748b">
                        BASE TARIFF RATE
                      </Typography>
                      <Typography variant="body1" fontWeight={800} color="#0f172a" mt={0.5}>
                        ₹{vehicle.pricePerKm || 0} / KM
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #f1f5f9" }}>
                      <Typography variant="caption" fontWeight={700} color="#64748b">
                        ASSIGNED CHAUFFEUR
                      </Typography>
                      <Typography variant="body1" fontWeight={800} color="#0f172a" mt={0.5}>
                        {vehicle.assignedDriver ? `${vehicle.assignedDriver.name} (${vehicle.assignedDriver.contact})` : "Unassigned"}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #f1f5f9" }}>
                      <Typography variant="caption" fontWeight={700} color="#64748b">
                        FASTAG TAG ID
                      </Typography>
                      <Typography variant="body1" fontWeight={800} color="#0f172a" mt={0.5}>
                        {vehicle.fastagTagNumber || "Not Registered"}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #f1f5f9" }}>
                      <Typography variant="caption" fontWeight={700} color="#64748b">
                        CHASSIS / ENGINE
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="#0f172a" mt={0.5}>
                        CH: {vehicle.chassisNumber || "—"} | ENG: {vehicle.engineNumber || "—"}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" mb={1}>
                  Fleet Notes & Vehicle Amenities
                </Typography>
                <Typography variant="body2" color="#64748b">
                  {vehicle.description || "No special fleet notes or amenities recorded for this asset."}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* TAB 1: STATUTORY COMPLIANCE VAULT */}
        {activeTab === 1 && (
          <Box p={3.5}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h6" fontWeight={800} color="#0f172a">
                  Statutory Paperwork & Renewal Manager
                </Typography>
                <Typography variant="body2" color="#64748b">
                  Mandatory commercial compliance for RTO, Tourist Permits, and Insurance
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<UploadFileRoundedIcon />}
                onClick={() => setOpenDocModal(true)}
                sx={{
                  bgcolor: "#0284c7",
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: "none",
                }}
              >
                Upload Document Copy
              </Button>
            </Box>

            <Grid container spacing={2.5}>
              {statutoryDocs.map((doc) => {
                const info = evalDays(doc.date);
                return (
                  <Grid item xs={12} sm={6} md={4} key={doc.key}>
                    <Card
                      elevation={0}
                      sx={{
                        border: "1px solid",
                        borderColor:
                          info.status === "EXPIRED"
                            ? "#fecaca"
                            : info.status === "EXPIRING_SOON"
                            ? "#fde68a"
                            : info.status === "VALID"
                            ? "#bbf7d0"
                            : "#e2e8f0",
                        bgcolor:
                          info.status === "EXPIRED"
                            ? "#fff5f5"
                            : info.status === "EXPIRING_SOON"
                            ? "#fffbeb"
                            : info.status === "VALID"
                            ? "#f0fdf4"
                            : "#f8fafc",
                        borderRadius: 3,
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                            {doc.label}
                          </Typography>
                          {info.status === "EXPIRED" ? (
                            <Chip size="small" label="EXPIRED" color="error" sx={{ fontWeight: 800, fontSize: "0.68rem" }} />
                          ) : info.status === "EXPIRING_SOON" ? (
                            <Chip size="small" label={`${info.days}D LEFT`} color="warning" sx={{ fontWeight: 800, fontSize: "0.68rem" }} />
                          ) : info.status === "VALID" ? (
                            <Chip size="small" label="VALID" color="success" sx={{ fontWeight: 800, fontSize: "0.68rem" }} />
                          ) : (
                            <Chip size="small" label="NOT SET" sx={{ fontWeight: 600, fontSize: "0.68rem" }} />
                          )}
                        </Box>

                        <Typography variant="body2" color="#64748b" mt={1}>
                          Expiry Date:{" "}
                          <strong style={{ color: "#0f172a" }}>
                            {doc.date ? new Date(doc.date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Not Set"}
                          </strong>
                        </Typography>

                        <Box mt={2}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Renew / Update Expiry"
                            InputLabelProps={{ shrink: true }}
                            defaultValue={doc.date ? new Date(doc.date).toISOString().slice(0, 10) : ""}
                            onBlur={(e) => handleQuickDateUpdate(doc.key, e.target.value)}
                            sx={{ bgcolor: "#ffffff" }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* TAB 2: MAINTENANCE & WORKSHOP LOGS */}
        {activeTab === 2 && (
          <Box p={3.5}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h6" fontWeight={800} color="#0f172a">
                  Maintenance & Preventive Service Log
                </Typography>
                <Typography variant="body2" color="#64748b">
                  Total Maintenance Spend:{" "}
                  <strong style={{ color: "#0284c7" }}>₹{(totalMaintCostPaise / 100).toLocaleString("en-IN")}</strong>
                  {vehicle.nextServiceDueKm && ` • Next Service Due at ${vehicle.nextServiceDueKm.toLocaleString()} KM`}
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => setOpenMaintModal(true)}
                sx={{
                  bgcolor: "#0284c7",
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: "none",
                }}
              >
                Log Service / Repair
              </Button>
            </Box>

            <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2.5, overflow: "hidden" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.5 }}>DATE</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>SERVICE TYPE</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>ODOMETER</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>WORKSHOP / GARAGE</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>COST (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>BILL / RECEIPT</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>
                      ACTION
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {maintenanceLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#64748b" }}>
                        No maintenance or service records logged yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    maintenanceLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {new Date(log.serviceDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={log.serviceType.replace("_", " ")}
                            sx={{ fontWeight: 800, fontSize: "0.72rem", bgcolor: "#f1f5f9" }}
                          />
                        </TableCell>
                        <TableCell>{log.odometerAtService ? `${log.odometerAtService.toLocaleString()} KM` : "—"}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="#0f172a">
                            {log.garageWorkshopName || "In-House Workshop"}
                          </Typography>
                          {log.garagePhone && (
                            <Typography variant="caption" color="#64748b">
                              {log.garagePhone}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: "#0f172a" }}>
                          ₹{(log.costInPaise / 100).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          {log.invoiceBillUrl ? (
                            <Button
                              size="small"
                              endIcon={<LaunchRoundedIcon sx={{ fontSize: 13 }} />}
                              href={log.invoiceBillUrl}
                              target="_blank"
                              sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.72rem" }}
                            >
                              View Bill
                            </Button>
                          ) : (
                            <Typography variant="caption" color="#94a3b8">
                              No Receipt
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => handleDeleteMaintenance(log.id)}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}

        {/* TAB 3: TRIP & DISPATCH HISTORY */}
        {activeTab === 3 && (
          <Box p={3.5}>
            <Typography variant="h6" fontWeight={800} color="#0f172a" mb={0.5}>
              Trip Dispatches & Odometer Log
            </Typography>
            <Typography variant="body2" color="#64748b" mb={3}>
              Operational history recorded via duty slips and bookings
            </Typography>

            <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2.5, overflow: "hidden" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.5 }}>DATE</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>ROUTE</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>CHAUFFEUR</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>CUSTOMER</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>DUTY SLIP</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>TOTAL KM</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>
                      STATUS
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vehicle.trips?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#64748b" }}>
                        No trips recorded for this vehicle yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicle.trips?.map((t: any) => (
                      <TableRow key={t.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/app/trips/${t.id}`)}>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {t.startDate ? new Date(t.startDate).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Unscheduled"}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="#0f172a">
                            {t.pickup || "Pickup"} → {t.drop || "Drop"}
                          </Typography>
                        </TableCell>
                        <TableCell>{t.driver?.name || "Unassigned"}</TableCell>
                        <TableCell>{t.booking?.customer?.name || "Client"}</TableCell>
                        <TableCell>
                          {t.dutySlip ? (
                            <Chip size="small" label={t.dutySlip.slipNumber} sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
                          ) : (
                            <Typography variant="caption" color="#94a3b8">
                              Pending
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{t.dutySlip?.totalKm ? `${t.dutySlip.totalKm} KM` : "—"}</TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            label={t.status}
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.68rem",
                              bgcolor: t.status === "COMPLETED" ? "#f0fdf4" : t.status === "IN_PROGRESS" ? "#eff6ff" : "#f8fafc",
                              color: t.status === "COMPLETED" ? "#166534" : t.status === "IN_PROGRESS" ? "#1d4ed8" : "#475569",
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

        {/* TAB 4: DOCUMENTS VAULT */}
        {activeTab === 4 && (
          <Box p={3.5}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h6" fontWeight={800} color="#0f172a">
                  Digital Certificate Vault
                </Typography>
                <Typography variant="body2" color="#64748b">
                  Attached PDFs, scan copies, and digital vehicle documents
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => setOpenDocModal(true)}
                sx={{
                  bgcolor: "#0284c7",
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: "none",
                }}
              >
                Attach Document
              </Button>
            </Box>

            <Grid container spacing={2}>
              {vehicle.documents?.length === 0 ? (
                <Grid item xs={12}>
                  <Box textAlign="center" py={5} bgcolor="#f8fafc" borderRadius={3} border="1px dashed #cbd5e1">
                    <DescriptionRoundedIcon sx={{ fontSize: 44, color: "#94a3b8", mb: 1 }} />
                    <Typography variant="body1" fontWeight={700} color="#64748b">
                      No documents attached yet.
                    </Typography>
                    <Typography variant="caption" color="#94a3b8">
                      Upload RC, Insurance Policy PDF, Fitness Certificate, or Tourist Permit
                    </Typography>
                  </Box>
                </Grid>
              ) : (
                vehicle.documents?.map((doc: any) => (
                  <Grid item xs={12} sm={6} md={4} key={doc.id}>
                    <Card elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "#ffffff" }}>
                      <CardContent sx={{ p: 2.5 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Box display="flex" alignItems="center" gap={1}>
                            <DescriptionRoundedIcon sx={{ color: "#0284c7" }} />
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                              {doc.type}
                            </Typography>
                          </Box>
                          <IconButton size="small" color="error" onClick={() => handleDeleteDocument(doc.id)}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        <Typography variant="caption" color="#64748b" display="block" mt={1}>
                          Uploaded: {new Date(doc.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </Typography>
                        {doc.expiryDate && (
                          <Typography variant="caption" color="#b45309" fontWeight={700} display="block">
                            Expires: {new Date(doc.expiryDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                          </Typography>
                        )}

                        <Box mt={2}>
                          <Button
                            fullWidth
                            size="small"
                            variant="outlined"
                            endIcon={<LaunchRoundedIcon sx={{ fontSize: 13 }} />}
                            href={doc.fileUrl}
                            target="_blank"
                            sx={{ fontWeight: 700, textTransform: "none", borderRadius: 1.5 }}
                          >
                            Open File
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* LOG MAINTENANCE MODAL */}
      <Dialog open={openMaintModal} onClose={() => setOpenMaintModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: "1px solid #f1f5f9", fontWeight: 800 }}>
          Log Maintenance & Workshop Service
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Service Type"
                value={maintForm.serviceType}
                onChange={(e) => setMaintForm({ ...maintForm, serviceType: e.target.value })}
              >
                <MenuItem value="SCHEDULED_SERVICE">Scheduled Periodic Service</MenuItem>
                <MenuItem value="OIL_CHANGE">Engine Oil & Filter Change</MenuItem>
                <MenuItem value="BRAKE_SERVICE">Brake Pads & Disc Service</MenuItem>
                <MenuItem value="TYRE_CHANGE">Tyre Replacement / Rotation</MenuItem>
                <MenuItem value="AC_REPAIR">AC Gas & Cooling Service</MenuItem>
                <MenuItem value="WHEEL_ALIGNMENT">Wheel Alignment & Balancing</MenuItem>
                <MenuItem value="ENGINE_WORK">Engine & Transmission Work</MenuItem>
                <MenuItem value="ACCIDENT_REPAIR">Accident / Bodywork Repair</MenuItem>
                <MenuItem value="OTHER">General Maintenance / Misc</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Service Date"
                InputLabelProps={{ shrink: true }}
                value={maintForm.serviceDate}
                onChange={(e) => setMaintForm({ ...maintForm, serviceDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Odometer at Service (KM)"
                value={maintForm.odometerAtService}
                onChange={(e) => setMaintForm({ ...maintForm, odometerAtService: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Total Cost / Bill Amount (₹)"
                value={maintForm.costInRupees}
                onChange={(e) => setMaintForm({ ...maintForm, costInRupees: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Workshop / Garage Name"
                placeholder="e.g. Bosch Car Care / Authorized Service"
                value={maintForm.garageWorkshopName}
                onChange={(e) => setMaintForm({ ...maintForm, garageWorkshopName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Garage Contact Phone"
                value={maintForm.garagePhone}
                onChange={(e) => setMaintForm({ ...maintForm, garagePhone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Next Service Due at (KM)"
                placeholder="e.g. 50000"
                value={maintForm.nextServiceDueKm}
                onChange={(e) => setMaintForm({ ...maintForm, nextServiceDueKm: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Next Service Due Date"
                InputLabelProps={{ shrink: true }}
                value={maintForm.nextServiceDueDate}
                onChange={(e) => setMaintForm({ ...maintForm, nextServiceDueDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Invoice Bill / Receipt Link or Cloud URL"
                placeholder="https://..."
                value={maintForm.invoiceBillUrl}
                onChange={(e) => setMaintForm({ ...maintForm, invoiceBillUrl: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Notes / Parts Replaced"
                value={maintForm.notes}
                onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: "1px solid #f1f5f9" }}>
          <Button onClick={() => setOpenMaintModal(false)} sx={{ fontWeight: 700, color: "#64748b" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveMaintenance}
            disabled={maintSaving}
            sx={{ bgcolor: "#0284c7", fontWeight: 700, textTransform: "none", borderRadius: 2 }}
          >
            {maintSaving ? "Saving..." : "Record Service"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* UPLOAD DOCUMENT MODAL */}
      <Dialog open={openDocModal} onClose={() => setOpenDocModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ borderBottom: "1px solid #f1f5f9", fontWeight: 800 }}>
          Upload Vehicle Document
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Document Category"
                value={docForm.type}
                onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
              >
                <MenuItem value="RC_BOOK">Registration Certificate (RC)</MenuItem>
                <MenuItem value="INSURANCE">Commercial Insurance Policy</MenuItem>
                <MenuItem value="TOURIST_PERMIT">All India Tourist Permit (AITP)</MenuItem>
                <MenuItem value="FITNESS_CERT">RTO Fitness Certificate</MenuItem>
                <MenuItem value="PUC_CERT">PUC / Emission Certificate</MenuItem>
                <MenuItem value="ROAD_TAX">Road / MV Tax Receipt</MenuItem>
                <MenuItem value="FASTAG">Fastag Statement / Receipt</MenuItem>
                <MenuItem value="OTHER">Other Fleet Document</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="File URL / Cloud Document Link"
                placeholder="https://..."
                value={docForm.fileUrl}
                onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Expiry Date (if applicable)"
                InputLabelProps={{ shrink: true }}
                value={docForm.expiryDate}
                onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: "1px solid #f1f5f9" }}>
          <Button onClick={() => setOpenDocModal(false)} sx={{ fontWeight: 700, color: "#64748b" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDocument}
            disabled={docSaving || !docForm.fileUrl}
            sx={{ bgcolor: "#0284c7", fontWeight: 700, textTransform: "none", borderRadius: 2 }}
          >
            {docSaving ? "Saving..." : "Save Document"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}