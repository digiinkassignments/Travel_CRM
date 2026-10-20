import { useEffect, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Chip,
  MenuItem,
  TextField,
  Button,
  Grid,
  Link,
  Avatar,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import PhoneCallbackRoundedIcon from "@mui/icons-material/PhoneCallbackRounded";
import NoteAltRoundedIcon from "@mui/icons-material/NoteAltRounded";
import EventRepeatRoundedIcon from "@mui/icons-material/EventRepeatRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { apiClient } from "../../api/client";
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

const ACTIVITY_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; bg: string }
> = {
  CALL: { label: "Phone Call", icon: PhoneCallbackRoundedIcon, color: "#2563eb", bg: "#eff6ff" },
  NOTE: { label: "Internal Note", icon: NoteAltRoundedIcon, color: "#64748b", bg: "#f1f5f9" },
  FOLLOW_UP: { label: "Follow Up", icon: EventRepeatRoundedIcon, color: "#d97706", bg: "#fffbeb" },
};

export function EnquiryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [activityType, setActivityType] = useState("NOTE");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [bookingForm, setBookingForm] = useState({
    pickup: "", drop: "", travelStart: "", travelEnd: "", vehicleType: "", distance: "", duration: "",
    driverId: "", vehicleId: "", fare: "", bookingStatus: "CONFIRMED", paymentStatus: "UNPAID", notes: "",
  });

  function load() {
    apiClient.get(`/enquiries/${id}`).then(({ data }) => setEnquiry(data.data));
  }

  useEffect(load, [id]);

  useEffect(() => {
    apiClient.get("/users").then(({ data }) => setStaff(data.data ?? []));
    apiClient.get("/drivers").then(({ data }) => setDrivers(data.data ?? [])).catch(() => setDrivers([]));
    apiClient.get("/vehicles").then(({ data }) => setVehicles(data.data ?? [])).catch(() => setVehicles([]));
  }, []);

  function openBookingForm() {
    setBookingForm((current) => ({
      ...current,
      pickup: enquiry?.pickupLocation ?? enquiry?.source ?? "",
      drop: enquiry?.destination ?? "",
      travelStart: enquiry?.travelDate ? new Date(enquiry.travelDate).toISOString().slice(0, 16) : "",
      vehicleType: enquiry?.vehicleService ?? "",
      notes: enquiry?.notes ?? "",
    }));
    setBookingOpen(true);
  }

  async function convertToBooking() {
    if (!bookingForm.pickup.trim() || !bookingForm.drop.trim() || !bookingForm.fare) return;
    try {
      setBookingLoading(true);
      const { data } = await apiClient.post(`/enquiries/${id}/convert-to-booking`, {
        ...bookingForm,
        fareInPaise: Math.round(Number(bookingForm.fare) * 100),
        travelStart: bookingForm.travelStart || undefined,
        travelEnd: bookingForm.travelEnd || undefined,
        driverId: bookingForm.driverId || undefined,
        vehicleId: bookingForm.vehicleId || undefined,
      });
      navigate(`/app/bookings/${data.data.id}`);
    } catch (err: any) {
      window.alert(err.response?.data?.message ?? "Could not convert this lead to a booking.");
    } finally {
      setBookingLoading(false);
    }
  }

  async function updateStatus(status: string) {
    try {
      setUpdatingStage(true);
      await apiClient.patch(`/enquiries/${id}/status`, { status });
      load();
    } finally {
      setUpdatingStage(false);
    }
  }

  async function reassign(assignedToId: string) {
    try {
      setUpdatingAssignee(true);
      await apiClient.patch(`/enquiries/${id}/assign`, { assignedToId: assignedToId || null });
      load();
    } finally {
      setUpdatingAssignee(false);
    }
  }

  async function addFollowUp() {
    if (!note.trim() || submittingNote) return;
    try {
      setSubmittingNote(true);
      await apiClient.post(`/enquiries/${id}/follow-ups`, { activityType, description: note });
      setNote("");
      load();
    } finally {
      setSubmittingNote(false);
    }
  }

  async function deleteLead() {
    if (!window.confirm("Delete this lead permanently? This action cannot be undone.")) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/enquiries/${id}`);
      navigate("/app/enquiries", { replace: true });
    } catch (err: any) {
      window.alert(err.response?.data?.message ?? "Could not delete this lead.");
    } finally {
      setDeleting(false);
    }
  }

  if (!enquiry) {
    return (
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress size={32} sx={{ color: "#2563eb" }} />
        <Typography variant="body2" color="text.secondary">
          Loading enquiry record...
        </Typography>
      </Box>
    );
  }

  const currentStage = STAGE_CONFIG[enquiry.status?.toUpperCase()] ?? {
    label: enquiry.status ?? "Status",
    bg: "#f1f5f9",
    color: "#475569",
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Back Button & Top Meta Strip */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
        <Tooltip title="Back to Enquiries">
          <IconButton
            onClick={() => navigate("/app/enquiries")}
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
          ENQUIRY / #{id?.slice(-6).toUpperCase()}
        </Typography>
      </Box>

      {/* Main Profile Header Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3.5,
          borderRadius: 3.5,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          boxShadow: "0 4px 16px rgba(16, 24, 40, 0.03)",
        }}
      >
        <Box
          display="flex"
          flexDirection={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          gap={2.5}
        >
          {/* Customer Avatar & Basic Information */}
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 54,
                height: 54,
                bgcolor: "#eff6ff",
                color: "#2563eb",
                fontSize: "1.25rem",
                fontWeight: 800,
                borderRadius: 2.5,
              }}
            >
              {enquiry.customer?.name?.[0]?.toUpperCase() || <PersonRoundedIcon />}
            </Avatar>
            <Box>
              <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                <Typography variant="h5" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.02em" }}>
                  {enquiry.customer?.name || "Anonymous Contact"}
                </Typography>
                <Chip
                  size="small"
                  label={currentStage.label}
                  sx={{
                    bgcolor: currentStage.bg,
                    color: currentStage.color,
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    borderRadius: "6px",
                  }}
                />
              </Box>

              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mt={0.5}>
                {enquiry.customer?.phone && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <PhoneRoundedIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {enquiry.customer.phone}
                    </Typography>
                  </Box>
                )}
                {enquiry.customer?.email && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <EmailRoundedIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {enquiry.customer.email}
                    </Typography>
                  </Box>
                )}
                <Box display="flex" alignItems="center" gap={0.5}>
                  <RouteRoundedIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                  <Typography variant="body2" color="#334155" fontWeight={600}>
                    {[enquiry.source, enquiry.destination].filter(Boolean).join(" → ") || "No route set"}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box display="flex" gap={1.25} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<WhatsAppIcon />}
              onClick={() => setWhatsAppOpen(true)}
              sx={{
                bgcolor: "#25d366",
                "&:hover": { bgcolor: "#1ebe5d" },
                borderRadius: 2.5,
                px: 2,
                py: 1,
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "0 4px 14px rgba(37, 211, 102, 0.25)",
              }}
            >
              WhatsApp
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<MapRoundedIcon />}
              onClick={() => navigate(`/app/itineraries/new?enquiryId=${id}`)}
              sx={{
                borderRadius: 2.5,
                px: 2,
                py: 1,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Build Itinerary
            </Button>
            <Button
              variant="contained"
              startIcon={<EventAvailableRoundedIcon />}
              onClick={openBookingForm}
              sx={{
                bgcolor: "#2563eb",
                borderRadius: 2.5,
                px: 2.5,
                py: 1,
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                "&:hover": { bgcolor: "#1d4ed8" },
              }}
            >
              Convert to Booking
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={deleting ? <CircularProgress size={16} /> : <DeleteOutlineRoundedIcon />}
              onClick={deleteLead}
              disabled={deleting}
              sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
            >
              {deleting ? "Deleting..." : "Delete Lead"}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3.5}>
        {/* Left Side: Controls & Quotations */}
        <Grid item xs={12} lg={5}>
          {/* Controls Card: Stage & Assigned To */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3.5,
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" mb={2.5} letterSpacing="0.04em" textTransform="uppercase">
              Governance & Assignment
            </Typography>

            <Box display="flex" flexDirection="column" gap={2.5}>
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.75}>
                  PIPELINE STAGE
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={enquiry.status}
                  disabled={updatingStage}
                  onChange={(e) => updateStatus(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "#f8fafc",
                      fontWeight: 700,
                    },
                  }}
                >
                  {STAGES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {STAGE_CONFIG[s]?.label ?? s}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.75}>
                  ASSIGNED STAFF
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={enquiry.assignedToId ?? ""}
                  disabled={updatingAssignee}
                  onChange={(e) => reassign(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "#f8fafc",
                      fontWeight: 600,
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Unassigned</em>
                  </MenuItem>
                  {staff.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>
          </Paper>

          {/* Quotations List Card */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                  Quotations
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pricing proposals for this enquiry
                </Typography>
              </Box>
              <Chip
                size="small"
                label={`${enquiry.quotations?.length ?? 0} total`}
                sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#f1f5f9" }}
              />
            </Box>

            <Divider sx={{ borderColor: "#f1f5f9", mb: 2 }} />

            {(!enquiry.quotations || enquiry.quotations.length === 0) ? (
              <Box py={4} textAlign="center">
                <DescriptionRoundedIcon sx={{ fontSize: 32, color: "#cbd5e1", mb: 0.5 }} />
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  No quotations created yet
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={1.5}>
                {enquiry.quotations.map((q: any) => (
                  <Box
                    key={q.id}
                    component={RouterLink}
                    to={`/app/quotations/${q.id}`}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: "1px solid #f1f5f9",
                      bgcolor: "#f8fafc",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                      "&:hover": {
                        bgcolor: "#eff6ff",
                        borderColor: "#bfdbfe",
                      },
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: "#ffffff",
                          color: "#2563eb",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <DescriptionRoundedIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                          Version {q.version} · ₹{((q.totalInPaise || 0) / 100).toLocaleString("en-IN")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(q.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </Typography>
                      </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        size="small"
                        label={q.status}
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          bgcolor: q.status === "ACCEPTED" ? "#ecfdf5" : "#f1f5f9",
                          color: q.status === "ACCEPTED" ? "#047857" : "#475569",
                          borderRadius: "4px",
                        }}
                      />
                      <ArrowForwardRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Side: Follow-up Logger & Activity Timeline */}
        <Grid item xs={12} lg={7}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
            }}
          >
            <Typography variant="subtitle1" fontWeight={800} color="#0f172a" mb={0.5}>
              Activity & Communication Trail
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2.5}>
              Log calls, client discussions, and next step reminders
            </Typography>

            {/* Logger Input Box */}
            <Box
              sx={{
                p: 2,
                mb: 3.5,
                borderRadius: 2.5,
                bgcolor: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <Box display="flex" gap={1.5} mb={1.5}>
                <TextField
                  select
                  size="small"
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  sx={{
                    minWidth: 150,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "#ffffff",
                      fontWeight: 700,
                    },
                  }}
                >
                  <MenuItem value="NOTE">Internal Note</MenuItem>
                  <MenuItem value="CALL">Phone Call</MenuItem>
                  <MenuItem value="FOLLOW_UP">Follow Up</MenuItem>
                </TextField>

                <Button
                  variant="contained"
                  disabled={!note.trim() || submittingNote}
                  onClick={addFollowUp}
                  endIcon={
                    submittingNote ? (
                      <CircularProgress size={14} sx={{ color: "#fff" }} />
                    ) : (
                      <SendRoundedIcon fontSize="small" />
                    )
                  }
                  sx={{
                    ml: "auto",
                    bgcolor: "#2563eb",
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    px: 2.5,
                    "&:hover": { bgcolor: "#1d4ed8" },
                  }}
                >
                  Post Note
                </Button>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="Type note content or discussion summary..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: "#ffffff",
                  },
                }}
              />
            </Box>

            {/* Timeline Stream */}
            {(!enquiry.followUps || enquiry.followUps.length === 0) ? (
              <Box py={6} textAlign="center">
                <CheckCircleRoundedIcon sx={{ fontSize: 34, color: "#cbd5e1", mb: 0.75 }} />
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  No activities recorded yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Log your first call or internal note using the form above.
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {enquiry.followUps.map((f: any) => {
                  const act = ACTIVITY_CONFIG[f.activityType] ?? ACTIVITY_CONFIG.NOTE;
                  const Icon = act.icon;

                  return (
                    <Box
                      key={f.id}
                      display="flex"
                      alignItems="flex-start"
                      gap={2}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        bgcolor: "#f8fafc",
                        border: "1px solid #f1f5f9",
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: act.bg,
                          color: act.color,
                          borderRadius: 2,
                          mt: 0.25,
                        }}
                      >
                        <Icon fontSize="small" />
                      </Avatar>

                      <Box flexGrow={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography variant="caption" fontWeight={800} sx={{ color: act.color, letterSpacing: "0.04em" }}>
                            {act.label.toUpperCase()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(f.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            ·{" "}
                            {new Date(f.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Typography>
                        </Box>

                        {f.description && (
                          <Typography variant="body2" color="#1e293b" fontWeight={500} mb={0.5}>
                            {f.description}
                          </Typography>
                        )}

                        <Box display="flex" alignItems="center" gap={0.75}>
                          <BadgeRoundedIcon sx={{ fontSize: 13, color: "#94a3b8" }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {f.loggedBy?.name ?? "System Automation"}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={bookingOpen} onClose={() => !bookingLoading && setBookingOpen(false)} fullWidth maxWidth="md">
        <DialogTitle fontWeight={900}>Convert Lead to Booking</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "10px !important" }}>
          <Typography variant="caption" color="text.secondary">Customer: {enquiry.customer?.name} · {enquiry.customer?.phone}</Typography>
          <Box display="flex" gap={2}>
            <TextField fullWidth required label="Pickup Location" value={bookingForm.pickup} onChange={(e) => setBookingForm({ ...bookingForm, pickup: e.target.value })} />
            <TextField fullWidth required label="Drop Location" value={bookingForm.drop} onChange={(e) => setBookingForm({ ...bookingForm, drop: e.target.value })} />
          </Box>
          <Box display="flex" gap={2}>
            <TextField fullWidth type="datetime-local" label="Pickup Date & Time" value={bookingForm.travelStart} onChange={(e) => setBookingForm({ ...bookingForm, travelStart: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField fullWidth type="datetime-local" label="Return Date & Time" value={bookingForm.travelEnd} onChange={(e) => setBookingForm({ ...bookingForm, travelEnd: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Box>
          <Box display="flex" gap={2}>
            <TextField fullWidth label="Vehicle Type" placeholder="e.g. One Way Trip / Tempo Traveller" value={bookingForm.vehicleType} onChange={(e) => setBookingForm({ ...bookingForm, vehicleType: e.target.value })} />
            <TextField fullWidth label="Fare (₹)" type="number" required value={bookingForm.fare} onChange={(e) => setBookingForm({ ...bookingForm, fare: e.target.value })} />
          </Box>
          <Box display="flex" gap={2}>
            <TextField fullWidth label="Distance (km)" value={bookingForm.distance} onChange={(e) => setBookingForm({ ...bookingForm, distance: e.target.value })} />
            <TextField fullWidth label="Duration" placeholder="e.g. 5.5 Hours" value={bookingForm.duration} onChange={(e) => setBookingForm({ ...bookingForm, duration: e.target.value })} />
          </Box>
          <Box display="flex" gap={2}>
            <TextField select fullWidth label="Assign Driver" value={bookingForm.driverId} onChange={(e) => setBookingForm({ ...bookingForm, driverId: e.target.value })}><MenuItem value="">No driver</MenuItem>{drivers.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}</TextField>
            <TextField select fullWidth label="Assign Vehicle" value={bookingForm.vehicleId} onChange={(e) => setBookingForm({ ...bookingForm, vehicleId: e.target.value })}><MenuItem value="">No vehicle</MenuItem>{vehicles.map((v) => <MenuItem key={v.id} value={v.id}>{v.registrationNumber} ({v.vehicleType})</MenuItem>)}</TextField>
          </Box>
          <Box display="flex" gap={2}>
            <TextField select fullWidth label="Booking Status" value={bookingForm.bookingStatus} onChange={(e) => setBookingForm({ ...bookingForm, bookingStatus: e.target.value })}><MenuItem value="CONFIRMED">Confirmed</MenuItem><MenuItem value="IN_PROGRESS">In Progress</MenuItem><MenuItem value="COMPLETED">Completed</MenuItem></TextField>
            <TextField select fullWidth label="Payment Status" value={bookingForm.paymentStatus} onChange={(e) => setBookingForm({ ...bookingForm, paymentStatus: e.target.value })}><MenuItem value="UNPAID">Unpaid</MenuItem><MenuItem value="PARTIAL">Partial</MenuItem><MenuItem value="PAID">Paid</MenuItem></TextField>
          </Box>
          <TextField fullWidth multiline minRows={3} label="Notes" value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setBookingOpen(false)} disabled={bookingLoading}>Cancel</Button><Button variant="contained" onClick={convertToBooking} disabled={bookingLoading || !bookingForm.pickup.trim() || !bookingForm.drop.trim() || !bookingForm.fare} startIcon={bookingLoading ? <CircularProgress size={16} /> : <EventAvailableRoundedIcon />}>Confirm Booking</Button></DialogActions>
      </Dialog>

      {/* WhatsApp Modal */}
      {enquiry && (
        <WhatsAppModal
          open={whatsAppOpen}
          onClose={() => setWhatsAppOpen(false)}
          initialPhone={enquiry.customer?.phone || ""}
          customerName={enquiry.customer?.name || ""}
          enquiryId={id}
          defaultCategory="ENQUIRY_WELCOME"
          variables={{
            destination: enquiry.destination || "",
            trip_title: enquiry.destination || "your upcoming trip",
          }}
          onSuccess={load}
        />
      )}
    </Box>
  );
}