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
  Chip,
  Switch,
  InputAdornment,
  Avatar,
  TablePagination,
  IconButton,
  Tooltip,
  CircularProgress,
  MenuItem,
  Grid,
  Divider,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import AssignmentIndRoundedIcon from "@mui/icons-material/AssignmentIndRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LocalHospitalRoundedIcon from "@mui/icons-material/LocalHospitalRounded";
import ContactEmergencyRoundedIcon from "@mui/icons-material/ContactEmergencyRounded";
import { apiClient } from "../../api/client";

interface DriverFormData {
  name: string;
  contact: string;
  emergencyContact: string;
  bloodGroup: string;
  licenseNumber: string;
  licenseExpiry: string;
  badgeNumber: string;
  badgeExpiry: string;
  policeVerificationStatus: "VERIFIED" | "PENDING" | "EXPIRED" | "NOT_DONE";
  policeVerificationDate: string;
  medicalFitnessExpiry: string;
}

const initialForm: DriverFormData = {
  name: "",
  contact: "",
  emergencyContact: "",
  bloodGroup: "",
  licenseNumber: "",
  licenseExpiry: "",
  badgeNumber: "",
  badgeExpiry: "",
  policeVerificationStatus: "PENDING",
  policeVerificationDate: "",
  medicalFitnessExpiry: "",
};

function getExpiryMeta(dateStr?: string | null) {
  if (!dateStr) return { label: "Not Recorded", color: "#64748b", bg: "#f1f5f9", status: "MISSING" };
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  const days = Math.ceil((target - now) / 86400000);

  if (days < 0) {
    return {
      label: `Expired (${Math.abs(days)}d ago)`,
      color: "#b91c1c",
      bg: "#fee2e2",
      border: "#fca5a5",
      status: "EXPIRED",
    };
  }
  if (days <= 30) {
    return {
      label: `Expiring in ${days}d`,
      color: "#c2410c",
      bg: "#ffedd5",
      border: "#fdba74",
      status: "EXPIRING_SOON",
    };
  }
  return {
    label: new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    color: "#047857",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    status: "VALID",
  };
}

export function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [form, setForm] = useState<DriverFormData>(initialForm);

  function load() {
    setLoading(true);
    apiClient
      .get("/drivers")
      .then(({ data }) => setDrivers(data.data ?? []))
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleOpenCreate() {
    setEditingDriver(null);
    setForm(initialForm);
    setOpen(true);
  }

  function handleOpenEdit(driver: any) {
    setEditingDriver(driver);
    setForm({
      name: driver.name || "",
      contact: driver.contact || "",
      emergencyContact: driver.emergencyContact || "",
      bloodGroup: driver.bloodGroup || "",
      licenseNumber: driver.licenseNumber || "",
      licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.slice(0, 10) : "",
      badgeNumber: driver.badgeNumber || "",
      badgeExpiry: driver.badgeExpiry ? driver.badgeExpiry.slice(0, 10) : "",
      policeVerificationStatus: driver.policeVerificationStatus || "PENDING",
      policeVerificationDate: driver.policeVerificationDate ? driver.policeVerificationDate.slice(0, 10) : "",
      medicalFitnessExpiry: driver.medicalFitnessExpiry ? driver.medicalFitnessExpiry.slice(0, 10) : "",
    });
    setOpen(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload: any = {
        name: form.name.trim(),
        contact: form.contact.trim(),
        emergencyContact: form.emergencyContact.trim() || null,
        bloodGroup: form.bloodGroup.trim() || null,
        licenseNumber: form.licenseNumber.trim(),
        licenseExpiry: form.licenseExpiry ? new Date(form.licenseExpiry).toISOString() : null,
        badgeNumber: form.badgeNumber.trim() || null,
        badgeExpiry: form.badgeExpiry ? new Date(form.badgeExpiry).toISOString() : null,
        policeVerificationStatus: form.policeVerificationStatus,
        policeVerificationDate: form.policeVerificationDate ? new Date(form.policeVerificationDate).toISOString() : null,
        medicalFitnessExpiry: form.medicalFitnessExpiry ? new Date(form.medicalFitnessExpiry).toISOString() : null,
      };

      if (editingDriver) {
        await apiClient.patch(`/drivers/${editingDriver.id}`, payload);
      } else {
        await apiClient.post("/drivers", payload);
      }

      setOpen(false);
      setEditingDriver(null);
      setForm(initialForm);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailable(driver: any) {
    try {
      setTogglingId(driver.id);
      await apiClient.patch(`/drivers/${driver.id}`, { isAvailable: !driver.isAvailable });
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, isAvailable: !d.isAvailable } : d))
      );
    } finally {
      setTogglingId(null);
    }
  }

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const q = searchQuery.toLowerCase();
      const name = d.name?.toLowerCase() ?? "";
      const license = d.licenseNumber?.toLowerCase() ?? "";
      const contact = d.contact?.toLowerCase() ?? "";
      const badge = d.badgeNumber?.toLowerCase() ?? "";
      const vehicles = d.vehicles?.map((v: any) => v.registrationNumber).join(" ").toLowerCase() ?? "";
      return name.includes(q) || license.includes(q) || contact.includes(q) || badge.includes(q) || vehicles.includes(q);
    });
  }, [drivers, searchQuery]);

  const paginatedDrivers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredDrivers.slice(start, start + rowsPerPage);
  }, [filteredDrivers, page, rowsPerPage]);

  const availableCount = drivers.filter((d) => d.isAvailable).length;
  const verifiedCount = drivers.filter((d) => d.policeVerificationStatus === "VERIFIED").length;
  const licenseAttentionCount = drivers.filter((d) => {
    const meta = getExpiryMeta(d.licenseExpiry);
    return meta.status === "EXPIRED" || meta.status === "EXPIRING_SOON";
  }).length;
  const assignedCount = drivers.filter((d) => d.vehicles && d.vehicles.length > 0).length;

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Header */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        mb={3}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.03em" }}>
              Driver Personnel & Chauffeur Readiness
            </Typography>
            <Chip
              label={`${availableCount}/${drivers.length} Available`}
              size="small"
              icon={<AssignmentIndRoundedIcon style={{ fontSize: 14 }} />}
              sx={{
                bgcolor: "rgba(2, 132, 199, 0.1)",
                color: "#0284c7",
                fontWeight: 800,
                fontSize: "0.72rem",
                borderRadius: "6px",
                border: "1px solid rgba(2, 132, 199, 0.2)",
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Manage chauffeurs, commercial DL expiry, tourist badges, police verification, and dispatch safety.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={handleOpenCreate}
          sx={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            borderRadius: 2.5,
            px: 2.75,
            py: 1,
            textTransform: "none",
            fontWeight: 800,
            boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #0369a1 0%, #075985 100%)",
              transform: "translateY(-1px)",
            },
          }}
        >
          Add Chauffeur
        </Button>
      </Box>

      {/* KPI Stats Strip */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
        gap={2}
        mb={3}
      >
        <Paper
          sx={{
            p: 2.25,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(2, 132, 199, 0.1)", color: "#0284c7", borderRadius: 2.5, width: 44, height: 44 }}>
            <BadgeRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Chauffeurs
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {drivers.length}
            </Typography>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2.25,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: 2.5, width: 44, height: 44 }}>
            <AssignmentIndRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Standby Available
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {availableCount}
            </Typography>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2.25,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(22, 163, 74, 0.1)", color: "#16a34a", borderRadius: 2.5, width: 44, height: 44 }}>
            <VerifiedUserRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Police Verified
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#16a34a">
              {verifiedCount}
            </Typography>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2.25,
            border: `1px solid ${licenseAttentionCount > 0 ? "#fecaca" : "#e2e8f0"}`,
            borderRadius: 3,
            bgcolor: licenseAttentionCount > 0 ? "#fff5f5" : "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Avatar
            sx={{
              bgcolor: licenseAttentionCount > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(147, 51, 234, 0.1)",
              color: licenseAttentionCount > 0 ? "#dc2626" : "#9333ea",
              borderRadius: 2.5,
              width: 44,
              height: 44,
            }}
          >
            <WarningAmberRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color={licenseAttentionCount > 0 ? "#b91c1c" : "text.secondary"} fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              License Attention
            </Typography>
            <Typography variant="h5" fontWeight={900} color={licenseAttentionCount > 0 ? "#dc2626" : "#0f172a"}>
              {licenseAttentionCount}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Search & Tool Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search by chauffeur name, DL number, mobile, badge, vehicle plate..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" sx={{ color: "#94a3b8" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: { xs: "1 1 100%", sm: "0 1 420px" },
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "#f8fafc",
            },
          }}
        />

        <Tooltip title="Refresh Drivers">
          <span>
            <IconButton
              onClick={load}
              disabled={loading}
              sx={{
                bgcolor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 2,
                "&:hover": { bgcolor: "#f1f5f9" },
              }}
            >
              <RefreshRoundedIcon fontSize="small" sx={{ color: "#475569" }} />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>

      {/* Main Drivers Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3.5,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          bgcolor: "#ffffff",
          boxShadow: "0 4px 16px rgba(16, 24, 40, 0.03)",
        }}
      >
        <Table sx={{ minWidth: 900 }}>
          <TableHead sx={{ bgcolor: "#fafcff" }}>
            <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                CHAUFFEUR PROFILE
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                COMMERCIAL DL & EXPIRY
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                POLICE VERIFICATION
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                CONTACT / EMERGENCY
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                MAPPED FLEET
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                DISPATCH / ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedDrivers.map((d) => {
              const isToggling = togglingId === d.id;
              const dlMeta = getExpiryMeta(d.licenseExpiry);
              const isPoliceVerified = d.policeVerificationStatus === "VERIFIED";

              return (
                <TableRow
                  key={d.id}
                  hover
                  sx={{
                    transition: "background-color 0.15s ease",
                    "&:hover": { bgcolor: "#fbfcfe !important" },
                    "&:last-child td": { border: 0 },
                  }}
                >
                  {/* Name and Avatar */}
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Box display="flex" alignItems="center" gap={1.75}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: "#eff6ff",
                          color: "#0284c7",
                          fontSize: "0.9rem",
                          fontWeight: 800,
                          borderRadius: 2.5,
                        }}
                      >
                        {d.name?.[0]?.toUpperCase() || <BadgeRoundedIcon fontSize="small" />}
                      </Avatar>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={800} sx={{ color: "#0f172a" }}>
                            {d.name}
                          </Typography>
                          {d.bloodGroup && (
                            <Chip
                              label={d.bloodGroup}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                bgcolor: "#fee2e2",
                                color: "#b91c1c",
                                borderRadius: "4px",
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Chauffeur #{d.id?.slice(-6).toUpperCase() ?? "REC"}
                          {d.badgeNumber && ` • Badge: ${d.badgeNumber}`}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* DL & Expiry */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                      <Box display="flex" alignItems="center" gap={0.75}>
                        <CreditCardRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                        <Typography
                          variant="body2"
                          fontFamily="monospace"
                          fontWeight={700}
                          sx={{
                            bgcolor: "#f1f5f9",
                            px: 1,
                            py: 0.2,
                            borderRadius: 1.5,
                            color: "#1e293b",
                            fontSize: "0.78rem",
                          }}
                        >
                          {d.licenseNumber || "N/A"}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={`DL: ${dlMeta.label}`}
                        sx={{
                          height: 20,
                          width: "fit-content",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          bgcolor: dlMeta.bg,
                          color: dlMeta.color,
                          border: dlMeta.border ? `1px solid ${dlMeta.border}` : "none",
                        }}
                      />
                    </Box>
                  </TableCell>

                  {/* Police Verification */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                      <Chip
                        icon={isPoliceVerified ? <VerifiedUserRoundedIcon style={{ fontSize: 14 }} /> : <WarningAmberRoundedIcon style={{ fontSize: 14 }} />}
                        size="small"
                        label={
                          d.policeVerificationStatus === "VERIFIED"
                            ? "Verified by Police"
                            : d.policeVerificationStatus === "EXPIRED"
                            ? "Verification Expired"
                            : "Verification Pending"
                        }
                        sx={{
                          height: 22,
                          width: "fit-content",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          bgcolor: isPoliceVerified ? "#ecfdf5" : d.policeVerificationStatus === "EXPIRED" ? "#fee2e2" : "#fef3c7",
                          color: isPoliceVerified ? "#047857" : d.policeVerificationStatus === "EXPIRED" ? "#b91c1c" : "#b45309",
                          border: `1px solid ${isPoliceVerified ? "#a7f3d0" : d.policeVerificationStatus === "EXPIRED" ? "#fca5a5" : "#fde68a"}`,
                        }}
                      />
                      {d.medicalFitnessExpiry && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <LocalHospitalRoundedIcon sx={{ fontSize: 12, color: "#0284c7" }} />
                          Med: {new Date(d.medicalFitnessExpiry).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>

                  {/* Contact & Emergency */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" flexDirection="column" gap={0.25}>
                      <Box display="flex" alignItems="center" gap={0.75}>
                        <PhoneRoundedIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                        <Typography variant="body2" fontWeight={600} color="#334155">
                          {d.contact || "—"}
                        </Typography>
                      </Box>
                      {d.emergencyContact && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <ContactEmergencyRoundedIcon sx={{ fontSize: 13, color: "#dc2626" }} />
                          <Typography variant="caption" color="text.secondary">
                            ICE: {d.emergencyContact}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>

                  {/* Assigned Vehicles */}
                  <TableCell sx={{ py: 2 }}>
                    {d.vehicles && d.vehicles.length > 0 ? (
                      <Box display="flex" flexWrap="wrap" gap={0.75}>
                        {d.vehicles.map((v: any) => (
                          <Chip
                            key={v.id || v.registrationNumber}
                            size="small"
                            icon={<DirectionsCarRoundedIcon style={{ fontSize: 13 }} />}
                            label={v.registrationNumber}
                            sx={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              bgcolor: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              color: "#334155",
                              borderRadius: 1.5,
                            }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        No vehicle mapped
                      </Typography>
                    )}
                  </TableCell>

                  {/* Availability Switch & Actions */}
                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
                    <Box display="inline-flex" alignItems="center" gap={1.25}>
                      {isToggling ? (
                        <CircularProgress size={18} sx={{ color: "#0284c7" }} />
                      ) : (
                        <Switch
                          size="small"
                          checked={Boolean(d.isAvailable)}
                          onChange={() => toggleAvailable(d)}
                          sx={{
                            "& .MuiSwitch-switchBase.Mui-checked": {
                              color: "#16a34a",
                            },
                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                              backgroundColor: "#16a34a",
                              opacity: 1,
                            },
                            "& .MuiSwitch-track": {
                              borderRadius: 12,
                              backgroundColor: "#cbd5e1",
                              opacity: 0.7,
                            },
                          }}
                        />
                      )}
                      <Chip
                        size="small"
                        label={d.isAvailable ? "Ready" : "Off Duty"}
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          borderRadius: "6px",
                          bgcolor: d.isAvailable ? "#ecfdf5" : "#f1f5f9",
                          color: d.isAvailable ? "#047857" : "#64748b",
                          border: `1px solid ${d.isAvailable ? "#a7f3d0" : "#e2e8f0"}`,
                          minWidth: 68,
                        }}
                      />
                      <Tooltip title="Edit Driver & Compliance Records">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(d)}
                          sx={{
                            bgcolor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            "&:hover": { bgcolor: "#f1f5f9", color: "#0284c7" },
                          }}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredDrivers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 8, textAlign: "center" }}>
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "#eff6ff",
                        color: "#0284c7",
                        mb: 0.5,
                      }}
                    >
                      <AssignmentIndRoundedIcon fontSize="medium" />
                    </Avatar>
                    <Typography variant="body1" fontWeight={700} sx={{ color: "#0f172a" }}>
                      {searchQuery ? "No matching chauffeur records found" : "No chauffeurs registered yet"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {searchQuery
                        ? "Check your query for spelling or clear search filters."
                        : "Start adding drivers to track commercial licenses, police verifications, and allocate to trip dispatches."}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredDrivers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{ borderTop: "1px solid #f1f5f9" }}
        />
      </Paper>

      {/* Add / Edit Driver Modal */}
      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#0f172a", pb: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ bgcolor: "rgba(2, 132, 199, 0.1)", color: "#0284c7", width: 36, height: 36, borderRadius: 2 }}>
            <BadgeRoundedIcon fontSize="small" />
          </Avatar>
          {editingDriver ? "Edit Chauffeur & Compliance Records" : "Register New Chauffeur"}
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "14px !important" }}>
          <Typography variant="caption" fontWeight={700} color="#0284c7" sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
            1. Personal & Contact Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                label="Full Name"
                placeholder="e.g. Ramesh Kumar Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                label="Primary Mobile Contact"
                placeholder="e.g. +91 9876543210"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                required
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                label="Emergency Contact (ICE)"
                placeholder="e.g. Brother: +91 9811223344"
                value={form.emergencyContact}
                onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                select
                label="Blood Group"
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              >
                <MenuItem value="">Not Specified</MenuItem>
                {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                  <MenuItem key={bg} value={bg}>
                    {bg}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Divider sx={{ my: 0.5 }} />

          <Typography variant="caption" fontWeight={700} color="#0284c7" sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
            2. Statutory License & Commercial Badge
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                label="Driving License (DL) Number"
                placeholder="e.g. DL-0420110012345"
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                required
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                  "& input": { textTransform: "uppercase", fontFamily: "monospace" },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                type="date"
                label="DL Expiry Date"
                InputLabelProps={{ shrink: true }}
                value={form.licenseExpiry}
                onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                label="RTO Commercial Badge No."
                placeholder="e.g. BDG-DL-8874"
                value={form.badgeNumber}
                onChange={(e) => setForm({ ...form, badgeNumber: e.target.value })}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                  "& input": { textTransform: "uppercase" },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                type="date"
                label="Badge Expiry Date"
                InputLabelProps={{ shrink: true }}
                value={form.badgeExpiry}
                onChange={(e) => setForm({ ...form, badgeExpiry: e.target.value })}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 0.5 }} />

          <Typography variant="caption" fontWeight={700} color="#0284c7" sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
            3. Police Verification & Medical Fitness
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                select
                label="Police Verification Status"
                value={form.policeVerificationStatus}
                onChange={(e) => setForm({ ...form, policeVerificationStatus: e.target.value as any })}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              >
                <MenuItem value="VERIFIED">VERIFIED (Clear Police Record)</MenuItem>
                <MenuItem value="PENDING">PENDING (Verification In Progress)</MenuItem>
                <MenuItem value="EXPIRED">EXPIRED (Needs Periodic Renewal)</MenuItem>
                <MenuItem value="NOT_DONE">NOT DONE</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                type="date"
                label="Police Verification Date"
                InputLabelProps={{ shrink: true }}
                value={form.policeVerificationDate}
                onChange={(e) => setForm({ ...form, policeVerificationDate: e.target.value })}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                type="date"
                label="Medical Fitness Certificate Expiry"
                InputLabelProps={{ shrink: true }}
                value={form.medicalFitnessExpiry}
                onChange={(e) => setForm({ ...form, medicalFitnessExpiry: e.target.value })}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: "1px solid #f1f5f9" }}>
          <Button
            onClick={() => setOpen(false)}
            disabled={saving}
            sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.licenseNumber.trim() || !form.contact.trim()}
            startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : null}
            sx={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              "&:hover": { background: "linear-gradient(135deg, #0369a1 0%, #075985 100%)" },
            }}
          >
            {saving ? "Saving..." : editingDriver ? "Update Chauffeur" : "Add Chauffeur"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}