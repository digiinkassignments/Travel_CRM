import { useEffect, useState, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
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
  TablePagination,
  Avatar,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import ContactPhoneRoundedIcon from "@mui/icons-material/ContactPhoneRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import { apiClient } from "../../api/client";
import { ImportLeadsModal } from "./ImportLeadsModal";
import { LeadCaptureWidgetModal } from "./LeadCaptureWidgetModal";
import { WhatsAppModal } from "../../components/whatsapp/WhatsAppModal";

const STAGES = ["NEW", "CONTACTED", "QUOTED", "NEGOTIATION", "WON", "LOST"];

const STAGE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  NEW: { label: "New Lead", bg: "#eff6ff", color: "#1d4ed8" },
  CONTACTED: { label: "Contacted", bg: "#fefce8", color: "#854d0e" },
  QUOTED: { label: "Quoted", bg: "#f5f3ff", color: "#6d28d9" },
  NEGOTIATION: { label: "Negotiation", bg: "#fff7ed", color: "#9a3412" },
  WON: { label: "Won", bg: "#f0fdf4", color: "#15803d" },
  LOST: { label: "Lost", bg: "#fef2f2", color: "#b91c1c" },
};

export function EnquiriesListPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [leadWidgetOpen, setLeadWidgetOpen] = useState(false);
  const [importSuccessAlert, setImportSuccessAlert] = useState<string | null>(null);
  const [whatsAppTarget, setWhatsAppTarget] = useState<any | null>(null);
  const [useExisting, setUseExisting] = useState(true);

  const [form, setForm] = useState({
    customerId: "",
    newCustomerName: "",
    newCustomerPhone: "",
    newCustomerEmail: "",
    source: "",
    pickupLocation: "",
    destination: "",
    travelDate: "",
    vehicleService: "",
    notes: "",
    followUpDate: "",
    assignTo: "NONE" as "NONE" | "MANUAL" | "ROUND_ROBIN",
    assignedToId: "",
  });

  function load() {
    setLoading(true);
    apiClient
      .get("/enquiries", { params: statusFilter ? { status: statusFilter } : {} })
      .then(({ data }) => setEnquiries(data.data ?? []))
      .catch(() => setEnquiries([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  useEffect(() => {
    apiClient.get("/customers").then(({ data }) => setCustomers(data.data ?? []));
    apiClient.get("/users").then(({ data }) => setStaff(data.data ?? []));
  }, []);

  async function handleCreate() {
    try {
      setCreating(true);
      const payload: any = {
        source: form.source || undefined,
        pickupLocation: form.pickupLocation || undefined,
        destination: form.destination || undefined,
        travelDate: form.travelDate || undefined,
        vehicleService: form.vehicleService || undefined,
        notes: form.notes || undefined,
        followUpDate: form.followUpDate || undefined,
        assignTo: form.assignTo,
        assignedToId: form.assignTo === "MANUAL" ? form.assignedToId : undefined,
      };
      if (useExisting) {
        payload.customerId = form.customerId;
      } else {
        payload.newCustomer = { name: form.newCustomerName, phone: form.newCustomerPhone, email: form.newCustomerEmail || undefined };
      }
      await apiClient.post("/enquiries", payload);
      setOpen(false);
      setForm({
        customerId: "",
        newCustomerName: "",
        newCustomerPhone: "",
        newCustomerEmail: "",
        source: "",
        pickupLocation: "",
        destination: "",
        travelDate: "",
        vehicleService: "",
        notes: "",
        followUpDate: "",
        assignTo: "NONE",
        assignedToId: "",
      });
      load();
    } finally {
      setCreating(false);
    }
  }

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((e) => {
      const q = searchQuery.toLowerCase();
      const haystack = `${e.customer?.name ?? ""} ${e.customer?.phone ?? ""} ${e.source ?? ""} ${e.destination ?? ""} ${e.assignedTo?.name ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [enquiries, searchQuery]);

  const paginatedEnquiries = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredEnquiries.slice(start, start + rowsPerPage);
  }, [filteredEnquiries, page, rowsPerPage]);

  const stats = useMemo(() => {
    const total = enquiries.length;
    const newCount = enquiries.filter((e) => e.status === "NEW").length;
    const quotedCount = enquiries.filter((e) => e.status === "QUOTED").length;
    const wonCount = enquiries.filter((e) => e.status === "WON").length;
    return { total, newCount, quotedCount, wonCount };
  }, [enquiries]);

  function handleExportCsv() {
    if (filteredEnquiries.length === 0) return;

    const headers = [
      "Lead ID",
      "Customer Name",
      "Phone",
      "Email",
      "Pickup Location",
      "Drop Location",
      "Travel Date",
      "Vehicle / Service",
      "Source",
      "Stage",
      "Assigned Staff",
      "Created Date",
      "Follow-up Date",
      "Requirement / Notes",
    ];

    const rows = filteredEnquiries.map((e) => [
      `#LEAD-${e.id.slice(-6).toUpperCase()}`,
      e.customer?.name ?? "",
      e.customer?.phone ?? "",
      e.customer?.email ?? "",
      e.pickupLocation ?? e.source ?? "",
      e.destination ?? "",
      e.travelDate ? new Date(e.travelDate).toLocaleDateString("en-IN") : "",
      e.vehicleService ?? "",
      e.source ?? "Direct",
      e.status ?? "NEW",
      e.assignedTo?.name ?? "Unassigned",
      e.createdAt ? new Date(e.createdAt).toLocaleDateString("en-IN") : "",
      e.followUpDate ? new Date(e.followUpDate).toLocaleDateString("en-IN") : "",
      e.notes ?? "",
    ]);

    const escapeCell = (val: any) => {
      const s = String(val ?? "").replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvContent = [
      headers.map(escapeCell).join(","),
      ...rows.map((row) => row.map(escapeCell).join(",")),
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `leads_export_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setImportSuccessAlert(`Exported ${filteredEnquiries.length} leads to CSV`);
  }

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
              Leads
            </Typography>
            <Chip
              label={`${enquiries.length} Inquiries`}
              size="small"
              icon={<ContactPhoneRoundedIcon style={{ fontSize: 15 }} />}
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
            Manage incoming leads, travel details, assignment distribution, and sales progression.
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<FileDownloadRoundedIcon />}
            onClick={handleExportCsv}
            disabled={filteredEnquiries.length === 0}
            sx={{
              borderColor: "#cbd5e1",
              color: "#334155",
              borderRadius: 2.5,
              px: 2.25,
              py: 1,
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#ffffff",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              "&:hover": {
                borderColor: "#94a3b8",
                bgcolor: "#f8fafc",
                transform: "translateY(-1px)",
              },
            }}
          >
            Export CSV {filteredEnquiries.length !== enquiries.length ? `(${filteredEnquiries.length})` : ""}
          </Button>

          <Button
            variant="outlined"
            startIcon={<CloudUploadRoundedIcon />}
            onClick={() => setImportOpen(true)}
            sx={{
              borderColor: "#cbd5e1",
              color: "#334155",
              borderRadius: 2.5,
              px: 2.25,
              py: 1,
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#ffffff",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              "&:hover": {
                borderColor: "#94a3b8",
                bgcolor: "#f8fafc",
                transform: "translateY(-1px)",
              },
            }}
          >
            Import CSV
          </Button>

          <Button
            variant="outlined"
            startIcon={<LanguageRoundedIcon />}
            onClick={() => setLeadWidgetOpen(true)}
            sx={{
              borderColor: "#0284c7",
              color: "#0284c7",
              borderRadius: 2.5,
              px: 2.25,
              py: 1,
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "rgba(2, 132, 199, 0.04)",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              "&:hover": {
                borderColor: "#0369a1",
                bgcolor: "rgba(2, 132, 199, 0.1)",
                transform: "translateY(-1px)",
              },
            }}
          >
            Web Form
          </Button>

          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setOpen(true)}
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
            Add Lead
          </Button>
        </Box>
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
            <ContactPhoneRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Leads
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {stats.total}
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
          <Avatar sx={{ bgcolor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", borderRadius: 2.5, width: 44, height: 44 }}>
            <PersonRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              New Leads
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {stats.newCount}
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
          <Avatar sx={{ bgcolor: "rgba(147, 51, 234, 0.1)", color: "#9333ea", borderRadius: 2.5, width: 44, height: 44 }}>
            <RouteRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Quoted
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {stats.quotedCount}
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
            <BadgeRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Won Deals
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {stats.wonCount}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Search & Status Filter Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search customer, route, phone, staff..."
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
            flex: { xs: "1 1 100%", sm: "0 1 340px" },
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "#f8fafc",
            },
          }}
        />

        <Box display="flex" alignItems="center" gap={1.5} width={{ xs: "100%", sm: "auto" }}>
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterListRoundedIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: 160,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "#f8fafc",
              },
            }}
          >
            <MenuItem value="">All Stages</MenuItem>
            {STAGES.map((s) => (
              <MenuItem key={s} value={s}>
                {STAGE_CONFIG[s]?.label ?? s}
              </MenuItem>
            ))}
          </TextField>

          <Tooltip title="Refresh List">
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
        </Box>
      </Paper>

      {/* Main Table */}
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
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ bgcolor: "#fafcff" }}>
            <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                CUSTOMER
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                ROUTE DETAILS
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                SOURCE
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                ASSIGNED STAFF
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                STAGE
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                CREATED
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                ACTION
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedEnquiries.map((e) => {
              const stage = STAGE_CONFIG[e.status?.toUpperCase()] ?? {
                label: e.status ?? "—",
                bg: "#f1f5f9",
                color: "#475569",
              };

              return (
                <TableRow
                  key={e.id}
                  hover
                  sx={{
                    transition: "background-color 0.15s ease",
                    "&:hover": { bgcolor: "#fbfcfe !important" },
                    "&:last-child td": { border: 0 },
                  }}
                >
                  {/* Customer Info */}
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Box display="flex" alignItems="center" gap={1.75}>
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          bgcolor: "#eff6ff",
                          color: "#2563eb",
                          borderRadius: 2,
                        }}
                      >
                        <PersonRoundedIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={800} sx={{ color: "#0f172a" }}>
                          {e.customer?.name ?? "Anonymous"}
                        </Typography>
                        {e.customer?.phone && (
                          <Box display="flex" alignItems="center" gap={0.5} mt={0.25}>
                            <PhoneRoundedIcon sx={{ fontSize: 13, color: "#94a3b8" }} />
                            <Typography variant="caption" color="text.secondary">
                              {e.customer.phone}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Route */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <RouteRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                      <Typography variant="body2" fontWeight={600} color="#334155">
                        {[e.source, e.destination].filter(Boolean).join(" → ") || "Open Itinerary"}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Source */}
                  <TableCell sx={{ py: 2 }}>
                    <Chip
                      size="small"
                      label={e.source || "Direct"}
                      variant="outlined"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.72rem",
                        borderColor: "#e2e8f0",
                        color: "#475569",
                        borderRadius: 1.5,
                      }}
                    />
                  </TableCell>

                  {/* Assigned Agent */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <BadgeRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                      <Typography variant="body2" fontWeight={600} color={e.assignedTo ? "#1e293b" : "#94a3b8"}>
                        {e.assignedTo?.name ?? "Unassigned"}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Stage Chip */}
                  <TableCell sx={{ py: 2 }}>
                    <Chip
                      size="small"
                      label={stage.label}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        bgcolor: stage.bg,
                        color: stage.color,
                        borderRadius: "6px",
                      }}
                    />
                  </TableCell>

                  {/* Created Date */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={0.75} sx={{ color: "#64748b" }}>
                      <CalendarTodayRoundedIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                      <Typography variant="caption" fontWeight={600}>
                        {e.createdAt
                          ? new Date(e.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Action Link & One-Click WhatsApp */}
                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                      {e.customer?.phone && (
                        <Tooltip title={`Chat on WhatsApp with ${e.customer?.name || "lead"}`}>
                          <IconButton
                            size="small"
                            onClick={() => setWhatsAppTarget(e)}
                            sx={{
                              bgcolor: "rgba(37, 211, 102, 0.1)",
                              color: "#16a34a",
                              border: "1px solid rgba(37, 211, 102, 0.25)",
                              borderRadius: 2,
                              p: 0.75,
                              transition: "all 0.15s ease",
                              "&:hover": {
                                bgcolor: "#25d366",
                                color: "#ffffff",
                                transform: "scale(1.06)",
                                boxShadow: "0 2px 8px rgba(37, 211, 102, 0.35)",
                              },
                            }}
                          >
                            <WhatsAppIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Button
                        component={RouterLink}
                        to={`/app/enquiries/${e.id}`}
                        size="small"
                        endIcon={<ArrowForwardRoundedIcon fontSize="small" />}
                        sx={{
                          textTransform: "none",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          color: "#2563eb",
                          bgcolor: "#eff6ff",
                          borderRadius: 2,
                          px: 1.75,
                          py: 0.5,
                          "&:hover": { bgcolor: "#dbeafe" },
                        }}
                      >
                        View
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredEnquiries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 8, textAlign: "center" }}>
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "#eff6ff",
                        color: "#2563eb",
                        mb: 0.5,
                      }}
                    >
                      <ContactPhoneRoundedIcon fontSize="medium" />
                    </Avatar>
                    <Typography variant="body1" fontWeight={700} sx={{ color: "#0f172a" }}>
                      {searchQuery || statusFilter ? "No matching leads found" : "No leads added yet"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {searchQuery || statusFilter
                        ? "Try clearing filters to inspect all leads."
                        : "New inquiries created manually or via customer channels will display here."}
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
          count={filteredEnquiries.length}
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

      {/* Lead creation modal */}
      <Dialog
        open={open}
        onClose={() => !creating && setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#0f172a", pb: 1 }}>
          Add Lead
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "10px !important" }}>
          {/* Customer Selection Type */}
          <ToggleButtonGroup
            value={useExisting ? "existing" : "new"}
            exclusive
            onChange={(_, val) => val && setUseExisting(val === "existing")}
            fullWidth
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                borderColor: "#e2e8f0",
                "&.Mui-selected": {
                  bgcolor: "#eff6ff",
                  color: "#2563eb",
                  borderColor: "#bfdbfe",
                },
              },
            }}
          >
            <ToggleButton value="existing">Existing Customer</ToggleButton>
            <ToggleButton value="new">New Customer</ToggleButton>
          </ToggleButtonGroup>

          {useExisting ? (
            <TextField
              select
              size="small"
              label="Select Customer"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              fullWidth
            >
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} — {c.phone || "No phone"}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <>
              <TextField
                size="small"
                label="Customer Full Name"
                value={form.newCustomerName}
                onChange={(e) => setForm({ ...form, newCustomerName: e.target.value })}
                fullWidth
              />
              <TextField
                size="small"
                label="Phone Contact"
                value={form.newCustomerPhone}
                onChange={(e) => setForm({ ...form, newCustomerPhone: e.target.value })}
                fullWidth
              />
              <TextField
                size="small"
                type="email"
                label="Email"
                placeholder="Optional"
                value={form.newCustomerEmail}
                onChange={(e) => setForm({ ...form, newCustomerEmail: e.target.value })}
                fullWidth
              />
            </>
          )}

          {/* Trip details */}
          <Box display="flex" gap={2}>
            <TextField
              size="small"
              label="Pickup Location"
              placeholder="e.g. Jaipur"
              value={form.pickupLocation}
              onChange={(e) => setForm({ ...form, pickupLocation: e.target.value, source: e.target.value })}
              fullWidth
            />
            <TextField
              size="small"
              label="Drop Location"
              placeholder="e.g. Jhunjhunu"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              fullWidth
            />
          </Box>

          <Box display="flex" gap={2}>
            <TextField
              size="small"
              type="datetime-local"
              label="Journey Date & Time"
              value={form.travelDate}
              onChange={(e) => setForm({ ...form, travelDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              size="small"
              label="Vehicle / Service Type"
              placeholder="e.g. Tempo Traveller"
              value={form.vehicleService}
              onChange={(e) => setForm({ ...form, vehicleService: e.target.value })}
              fullWidth
            />
          </Box>

          <TextField
            multiline
            minRows={3}
            size="small"
            label="Requirement / Notes"
            placeholder="What did the customer ask for? Any notes for the team..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            fullWidth
          />

          {/* Assignment Settings */}
          <TextField
            select
            size="small"
            label="Staff Allocation Policy"
            value={form.assignTo}
            onChange={(e) => setForm({ ...form, assignTo: e.target.value as any })}
            fullWidth
          >
            <MenuItem value="NONE">Leave unassigned</MenuItem>
            <MenuItem value="MANUAL">Direct manual assignment</MenuItem>
            <MenuItem value="ROUND_ROBIN">Auto-assign (Round Robin)</MenuItem>
          </TextField>

          {form.assignTo === "MANUAL" && (
            <TextField
              select
              size="small"
              label="Select Staff Member"
              value={form.assignedToId}
              onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
              fullWidth
            >
              {staff.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            size="small"
            type="date"
            label="Follow-Up Date (optional)"
            value={form.followUpDate}
            onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpen(false)}
            disabled={creating}
            sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={
              creating ||
              (useExisting ? !form.customerId : !form.newCustomerName || !form.newCustomerPhone)
            }
            startIcon={creating ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : null}
            sx={{
              bgcolor: "#2563eb",
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              px: 2.5,
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            {creating ? "Creating..." : "Add Lead"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk CSV Import Modal */}
      <ImportLeadsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        staff={staff}
        onSuccess={(res) => {
          setImportSuccessAlert(`Successfully imported ${res.imported} leads!`);
          load();
          apiClient.get("/customers").then(({ data }) => setCustomers(data.data ?? []));
        }}
      />

      {/* Web Form Embed / Share Modal */}
      <LeadCaptureWidgetModal
        open={leadWidgetOpen}
        onClose={() => setLeadWidgetOpen(false)}
      />

      {/* One-Click WhatsApp Modal */}
      {whatsAppTarget && (
        <WhatsAppModal
          open={Boolean(whatsAppTarget)}
          onClose={() => setWhatsAppTarget(null)}
          initialPhone={whatsAppTarget.customer?.phone || ""}
          customerName={whatsAppTarget.customer?.name || ""}
          enquiryId={whatsAppTarget.id}
          defaultCategory="ENQUIRY_WELCOME"
          variables={{
            destination: whatsAppTarget.destination || "your destination",
            pickup_location: whatsAppTarget.pickupLocation || whatsAppTarget.source || "",
            travel_date: whatsAppTarget.travelDate
              ? new Date(whatsAppTarget.travelDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "",
            vehicle_service: whatsAppTarget.vehicleService || "",
            agent_name: whatsAppTarget.assignedTo?.name || "Travel Specialist",
          }}
          onSuccess={() => {
            setImportSuccessAlert("WhatsApp message logged to lead timeline!");
          }}
        />
      )}

      {/* Success Notification */}
      <Snackbar
        open={Boolean(importSuccessAlert)}
        autoHideDuration={5000}
        onClose={() => setImportSuccessAlert(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setImportSuccessAlert(null)}
          severity="success"
          sx={{ borderRadius: 2.5, fontWeight: 600, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
        >
          {importSuccessAlert}
        </Alert>
      </Snackbar>
    </Box>
  );
}