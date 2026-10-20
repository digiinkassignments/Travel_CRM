import { useEffect, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Divider,
  CircularProgress,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import ContactPhoneRoundedIcon from "@mui/icons-material/ContactPhoneRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { apiClient } from "../../api/client";
import { CustomFieldsForm } from "../../components/CustomFieldsForm";
import { EditCustomerDialog } from "../../components/customers/EditCustomerDialog";

const ENQUIRY_STAGE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  NEW: { label: "New Lead", bg: "#eff6ff", color: "#1d4ed8" },
  CONTACTED: { label: "Contacted", bg: "#fefce8", color: "#854d0e" },
  QUOTED: { label: "Quoted", bg: "#f5f3ff", color: "#6d28d9" },
  NEGOTIATION: { label: "Negotiation", bg: "#fff7ed", color: "#9a3412" },
  WON: { label: "Won", bg: "#f0fdf4", color: "#15803d" },
  LOST: { label: "Lost", bg: "#fef2f2", color: "#b91c1c" },
};

const BOOKING_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  CONFIRMED: { label: "Confirmed", bg: "#eff6ff", color: "#1d4ed8" },
  IN_PROGRESS: { label: "In Progress", bg: "#fffbeb", color: "#b45309" },
  COMPLETED: { label: "Completed", bg: "#ecfdf5", color: "#047857" },
  CANCELLED: { label: "Cancelled", bg: "#fef2f2", color: "#b91c1c" },
};

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get(`/customers/${id}`).then(({ data }) => setCustomer(data.data));
  }, [id]);

  function handleSaved(updated: any) {
    setCustomer((prev: any) => ({ ...prev, ...updated }));
    setSnackbar("Customer profile updated successfully!");
  }

  if (!customer) {
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
          Loading customer portfolio...
        </Typography>
      </Box>
    );
  }

  const enquiriesCount = customer.enquiries?.length || 0;
  const bookingsCount = customer.bookings?.length || 0;

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Breadcrumb Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
        <Tooltip title="Back to Customers">
          <IconButton
            onClick={() => navigate("/app/customers")}
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
          CUSTOMERS / #{id?.slice(-6).toUpperCase()}
        </Typography>
      </Box>

      {/* Customer Profile Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 3.5 },
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
          {/* Avatar & Contact Info */}
          <Box display="flex" alignItems="center" gap={2.5}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: "#eff6ff",
                color: "#2563eb",
                fontSize: "1.5rem",
                fontWeight: 900,
                borderRadius: 3,
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
              }}
            >
              {customer.name?.[0]?.toUpperCase() || <PersonRoundedIcon fontSize="large" />}
            </Avatar>

            <Box>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Typography variant="h5" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.02em" }}>
                  {customer.name}
                </Typography>
                <Chip
                  label="Registered Client"
                  size="small"
                  sx={{
                    bgcolor: "#f0fdf4",
                    color: "#16a34a",
                    fontWeight: 800,
                    fontSize: "0.7rem",
                    borderRadius: "6px",
                  }}
                />
              </Box>

              <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} mt={0.75}>
                {customer.phone && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <PhoneRoundedIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                    <Typography variant="body2" color="#334155" fontWeight={600}>
                      {customer.phone}
                    </Typography>
                  </Box>
                )}

                {customer.email && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <EmailRoundedIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                    <Typography variant="body2" color="#475569" fontWeight={500}>
                      {customer.email}
                    </Typography>
                  </Box>
                )}

                {customer.address && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <LocationOnRoundedIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                    <Typography variant="body2" color="#64748b">
                      {customer.address}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Quick Metrics Badges & Edit Action */}
          <Box display="flex" alignItems="center" flexWrap="wrap" gap={1.5}>
            <Button
              variant="outlined"
              startIcon={<EditRoundedIcon />}
              onClick={() => setEditOpen(true)}
              sx={{
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 800,
                fontSize: "0.85rem",
                borderColor: "#cbd5e1",
                color: "#0f172a",
                bgcolor: "#ffffff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                px: 2.2,
                py: 0.9,
                "&:hover": {
                  borderColor: "#0284c7",
                  bgcolor: "rgba(2, 132, 199, 0.05)",
                  color: "#0284c7",
                },
              }}
            >
              Edit Customer
            </Button>

            <Box
              sx={{
                px: 2,
                py: 1,
                bgcolor: "#f8fafc",
                borderRadius: 2.5,
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                ENQUIRIES
              </Typography>
              <Typography variant="h6" fontWeight={900} color="#0f172a">
                {enquiriesCount}
              </Typography>
            </Box>

            <Box
              sx={{
                px: 2,
                py: 1,
                bgcolor: "#f8fafc",
                borderRadius: 2.5,
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                BOOKINGS
              </Typography>
              <Typography variant="h6" fontWeight={900} color="#2563eb">
                {bookingsCount}
              </Typography>
            </Box>
          </Box>
        </Box>

        {customer.notes && (
          <>
            <Divider sx={{ my: 2.5, borderColor: "#f1f5f9" }} />
            <Box display="flex" alignItems="flex-start" gap={1}>
              <NotesRoundedIcon sx={{ fontSize: 18, color: "#94a3b8", mt: 0.25 }} />
              <Typography variant="body2" color="#475569" sx={{ lineHeight: 1.6 }}>
                <strong>Internal Note:</strong> {customer.notes}
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* Main Two-Column Activity Ledger */}
      <Grid container spacing={3.5} mb={3.5}>
        {/* Left Column: Customer Enquiries */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1.25}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: "#eff6ff", color: "#2563eb" }}>
                  <ContactPhoneRoundedIcon fontSize="small" />
                </Avatar>
                <Typography variant="h6" fontWeight={800} sx={{ color: "#0f172a" }}>
                  Enquiry History
                </Typography>
              </Box>
              <Chip
                label={`${enquiriesCount} Logged`}
                size="small"
                sx={{ fontWeight: 800, fontSize: "0.72rem", bgcolor: "#f1f5f9" }}
              />
            </Box>

            <Divider sx={{ mb: 2, borderColor: "#f1f5f9" }} />

            {!customer.enquiries || customer.enquiries.length === 0 ? (
              <Box py={5} textAlign="center">
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  No customer inquiries on record.
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={1.5}>
                {customer.enquiries.map((e: any) => {
                  const stageMeta = ENQUIRY_STAGE_CONFIG[e.status] ?? {
                    label: e.status ?? "Lead",
                    bg: "#f1f5f9",
                    color: "#475569",
                  };

                  return (
                    <Box
                      key={e.id}
                      component={RouterLink}
                      to={`/app/enquiries/${e.id}`}
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
                          transform: "translateX(2px)",
                        },
                      }}
                    >
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <RouteRoundedIcon sx={{ fontSize: 16, color: "#2563eb" }} />
                          <Typography variant="body2" fontWeight={800} color="#0f172a">
                            {e.destination || "General Inquiry"}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                          <CalendarTodayRoundedIcon sx={{ fontSize: 13, color: "#94a3b8" }} />
                          <Typography variant="caption" color="text.secondary">
                            Logged on {new Date(e.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </Typography>
                        </Box>
                      </Box>

                      <Box display="flex" alignItems="center" gap={1.25}>
                        <Chip
                          size="small"
                          label={stageMeta.label}
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.72rem",
                            bgcolor: stageMeta.bg,
                            color: stageMeta.color,
                            borderRadius: "6px",
                          }}
                        />
                        <ArrowForwardRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Customer Bookings */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1.25}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: "#ecfdf5", color: "#16a34a" }}>
                  <EventAvailableRoundedIcon fontSize="small" />
                </Avatar>
                <Typography variant="h6" fontWeight={800} sx={{ color: "#0f172a" }}>
                  Booking Portfolio
                </Typography>
              </Box>
              <Chip
                label={`${bookingsCount} Trips`}
                size="small"
                sx={{ fontWeight: 800, fontSize: "0.72rem", bgcolor: "#f1f5f9" }}
              />
            </Box>

            <Divider sx={{ mb: 2, borderColor: "#f1f5f9" }} />

            {!customer.bookings || customer.bookings.length === 0 ? (
              <Box py={5} textAlign="center">
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  No confirmed bookings yet.
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={1.5}>
                {customer.bookings.map((b: any) => {
                  const statusMeta = BOOKING_STATUS_CONFIG[b.status] ?? {
                    label: b.status?.replace("_", " ") ?? "Confirmed",
                    bg: "#eff6ff",
                    color: "#1d4ed8",
                  };

                  return (
                    <Box
                      key={b.id}
                      component={RouterLink}
                      to={`/app/bookings/${b.id}`}
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
                          transform: "translateX(2px)",
                        },
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                          Booking #{b.id?.slice(-6).toUpperCase()}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                          <CalendarTodayRoundedIcon sx={{ fontSize: 13, color: "#94a3b8" }} />
                          <Typography variant="caption" color="text.secondary">
                            Booked on {new Date(b.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </Typography>
                        </Box>
                      </Box>

                      <Box display="flex" alignItems="center" gap={1.25}>
                        <Chip
                          size="small"
                          label={statusMeta.label}
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.72rem",
                            bgcolor: statusMeta.bg,
                            color: statusMeta.color,
                            borderRadius: "6px",
                          }}
                        />
                        <ArrowForwardRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Dynamic Tenant Custom Attributes Form */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3.5,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          boxShadow: "0 4px 16px rgba(16, 24, 40, 0.03)",
        }}
      >
        <Box mb={2}>
          <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
            Custom Profile Attributes
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Configured custom tenant fields mapped to this customer identity
          </Typography>
        </Box>
        <Divider sx={{ mb: 2.5, borderColor: "#f1f5f9" }} />
        <CustomFieldsForm module="customers" recordId={id!} />
      </Paper>

      {/* Edit Customer Modal */}
      <EditCustomerDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        customer={customer}
        onSaved={handleSaved}
      />

      {/* Success Notification */}
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" onClose={() => setSnackbar(null)} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
}