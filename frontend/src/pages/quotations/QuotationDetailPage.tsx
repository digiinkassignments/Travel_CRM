import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import { apiClient } from "../../api/client";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  DRAFT: { label: "Draft", bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
  SENT: { label: "Sent to Client", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  ACCEPTED: { label: "Accepted", bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  REJECTED: { label: "Declined", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  EXPIRED: { label: "Expired", bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
};

export function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [converting, setConverting] = useState(false);

  function load() {
    apiClient.get(`/quotations/${id}`).then(({ data }) => setQuotation(data.data));
  }

  useEffect(load, [id]);

  async function updateStatus(status: string) {
    try {
      setUpdating(true);
      await apiClient.patch(`/quotations/${id}/status`, { status });
      load();
    } finally {
      setUpdating(false);
    }
  }

  async function convertToBooking() {
    try {
      setConverting(true);
      const { data } = await apiClient.post(`/quotations/${id}/convert-to-booking`, {});
      navigate(`/app/bookings/${data.data.id}`);
    } finally {
      setConverting(false);
    }
  }

  if (!quotation) {
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
          Loading proposal details...
        </Typography>
      </Box>
    );
  }

  const items: Array<{ description: string; amountInPaise: number }> =
    quotation.itineraryJson || [];

  const statusMeta = STATUS_CONFIG[quotation.status] ?? {
    label: quotation.status,
    bg: "#f1f5f9",
    color: "#475569",
    border: "#e2e8f0",
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Print Styles */}
      <style>{`
        @media print {
          body { background-color: #ffffff !important; }
          .no-print { display: none !important; }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Top Header & Breadcrumb (No Print) */}
      <Box className="no-print" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <Tooltip title="Back to Quotations">
            <IconButton
              onClick={() => navigate("/app/quotations")}
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
            PROPOSALS / QUOTATION #{id?.slice(-6).toUpperCase()}
          </Typography>
        </Box>

        {/* Action Toolbar */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3.5,
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
            boxShadow: "0 4px 16px rgba(16, 24, 40, 0.03)",
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: "#eff6ff",
                color: "#2563eb",
                borderRadius: 2.5,
              }}
            >
              <ReceiptLongRoundedIcon fontSize="small" />
            </Avatar>
            <Box>
              <Box display="flex" alignItems="center" gap={1.25}>
                <Typography variant="h6" fontWeight={900} sx={{ color: "#0f172a" }}>
                  Quotation Version {quotation.version}
                </Typography>
                <Chip
                  size="small"
                  label={statusMeta.label}
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    bgcolor: statusMeta.bg,
                    color: statusMeta.color,
                    border: `1px solid ${statusMeta.border}`,
                    borderRadius: "6px",
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Created on {new Date(quotation.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Typography>
            </Box>
          </Box>

          {/* Context Action Buttons */}
          <Box display="flex" alignItems="center" gap={1.25} flexWrap="wrap">
            {quotation.status === "DRAFT" && (
              <Button
                variant="contained"
                disabled={updating}
                startIcon={<SendRoundedIcon fontSize="small" />}
                onClick={() => updateStatus("SENT")}
                sx={{
                  bgcolor: "#2563eb",
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": { bgcolor: "#1d4ed8" },
                }}
              >
                Mark Sent
              </Button>
            )}

            {quotation.status === "SENT" && (
              <>
                <Button
                  variant="contained"
                  disabled={updating}
                  startIcon={<CheckCircleRoundedIcon fontSize="small" />}
                  onClick={() => updateStatus("ACCEPTED")}
                  sx={{
                    bgcolor: "#16a34a",
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    "&:hover": { bgcolor: "#15803d" },
                  }}
                >
                  Accept
                </Button>
                <Button
                  variant="outlined"
                  disabled={updating}
                  startIcon={<CancelRoundedIcon fontSize="small" />}
                  onClick={() => updateStatus("REJECTED")}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#dc2626",
                    borderColor: "#fecaca",
                    "&:hover": { borderColor: "#dc2626", bgcolor: "#fef2f2" },
                  }}
                >
                  Decline
                </Button>
                <Button
                  variant="outlined"
                  disabled={updating}
                  startIcon={<HourglassEmptyRoundedIcon fontSize="small" />}
                  onClick={() => updateStatus("EXPIRED")}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#d97706",
                    borderColor: "#fde68a",
                    "&:hover": { borderColor: "#d97706", bgcolor: "#fffbeb" },
                  }}
                >
                  Expire
                </Button>
              </>
            )}

            {quotation.status === "ACCEPTED" && !quotation.booking && (
              <Button
                variant="contained"
                disabled={converting}
                startIcon={
                  converting ? (
                    <CircularProgress size={16} sx={{ color: "#fff" }} />
                  ) : (
                    <EventAvailableRoundedIcon fontSize="small" />
                  )
                }
                onClick={convertToBooking}
                sx={{
                  bgcolor: "#2563eb",
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                  "&:hover": { bgcolor: "#1d4ed8" },
                }}
              >
                {converting ? "Converting..." : "Convert to Booking"}
              </Button>
            )}

            {quotation.booking && (
              <Button
                variant="contained"
                startIcon={<EventAvailableRoundedIcon fontSize="small" />}
                onClick={() => navigate(`/app/bookings/${quotation.booking.id}`)}
                sx={{
                  bgcolor: "#16a34a",
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": { bgcolor: "#15803d" },
                }}
              >
                View Confirmed Booking
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<AddCircleOutlineRoundedIcon fontSize="small" />}
              onClick={() => navigate(`/app/quotations/${id}/new-version`)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                color: "#334155",
                borderColor: "#e2e8f0",
                bgcolor: "#ffffff",
                "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
              }}
            >
              New Version
            </Button>

            <Button
              variant="outlined"
              startIcon={<PrintRoundedIcon fontSize="small" />}
              onClick={() => window.print()}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                color: "#334155",
                borderColor: "#e2e8f0",
                bgcolor: "#ffffff",
                "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
              }}
            >
              Print
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Modern Invoice / Quotation Printable Document */}
      <Paper
        elevation={0}
        className="print-container"
        sx={{
          p: { xs: 3, md: 5 },
          maxWidth: 820,
          mx: "auto",
          borderRadius: 3.5,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Document Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
          <Box>
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{ color: "#0f172a", letterSpacing: "-0.03em" }}
            >
              PRICE ESTIMATE & ITINERARY
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              REF: QT-{id?.slice(-8).toUpperCase()} · VERSION {quotation.version}
            </Typography>
          </Box>

          <Box textAlign="right">
            <Typography variant="h6" fontWeight={800} color="#2563eb">
              DIGIINK TRAVEL CRM
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Corporate Travel Proposals
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3.5, borderColor: "#f1f5f9" }} />

        {/* Customer & Route Meta Cards */}
        <Box
          sx={{
            p: 2.5,
            mb: 3.5,
            borderRadius: 2.5,
            bgcolor: "#f8fafc",
            border: "1px solid #f1f5f9",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2.5,
          }}
        >
          <Box>
            <Typography variant="caption" fontWeight={800} color="#64748b" textTransform="uppercase" letterSpacing="0.05em">
              PREPARED FOR
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <PersonRoundedIcon sx={{ fontSize: 16, color: "#2563eb" }} />
              <Typography variant="body2" fontWeight={800} color="#0f172a">
                {quotation.customer?.name || "Valued Customer"}
              </Typography>
            </Box>
            {quotation.customer?.phone && (
              <Box display="flex" alignItems="center" gap={1} mt={0.25}>
                <PhoneRoundedIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {quotation.customer.phone}
                </Typography>
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="caption" fontWeight={800} color="#64748b" textTransform="uppercase" letterSpacing="0.05em">
              TRAVEL ITINERARY
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <RouteRoundedIcon sx={{ fontSize: 16, color: "#2563eb" }} />
              <Typography variant="body2" fontWeight={700} color="#334155">
                {[quotation.enquiry?.source, quotation.enquiry?.destination].filter(Boolean).join(" → ") || "Open Route"}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1} mt={0.25}>
              <CalendarTodayRoundedIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
              <Typography variant="caption" color="text.secondary">
                Date: {new Date(quotation.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Cost Breakdown Table */}
        <Table sx={{ mb: 3 }}>
          <TableHead sx={{ bgcolor: "#fafcff" }}>
            <TableRow sx={{ borderBottom: "2px solid #eef2f6" }}>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.75, px: 2, fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                ITEM DESCRIPTION
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 1.75, px: 2, fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                AMOUNT (INR)
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((item, i) => (
              <TableRow key={i} sx={{ borderBottom: "1px solid #f8fafc" }}>
                <TableCell sx={{ py: 1.75, px: 2 }}>
                  <Typography variant="body2" fontWeight={600} color="#1e293b">
                    {item.description}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 1.75, px: 2 }}>
                  <Typography variant="body2" fontWeight={700} color="#334155">
                    ₹{((item.amountInPaise || 0) / 100).toLocaleString("en-IN")}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}

            {/* Adjustments: Markup / Discount / Tax */}
            <TableRow sx={{ borderTop: "1px solid #eef2f6" }}>
              <TableCell sx={{ py: 1.25, px: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Service Fee / Markup
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                <Typography variant="body2" fontWeight={600} color="#475569">
                  ₹{((quotation.markupInPaise || 0) / 100).toLocaleString("en-IN")}
                </Typography>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ py: 1.25, px: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Applied Discount
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                <Typography variant="body2" fontWeight={600} color="#dc2626">
                  -₹{((quotation.discountInPaise || 0) / 100).toLocaleString("en-IN")}
                </Typography>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ py: 1.25, px: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Goods & Services Tax (GST)
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, px: 2 }}>
                <Typography variant="body2" fontWeight={600} color="#475569">
                  ₹{((quotation.taxInPaise || 0) / 100).toLocaleString("en-IN")}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Total Highlight */}
            <TableRow sx={{ bgcolor: "#fafcff", borderTop: "2px solid #e2e8f0" }}>
              <TableCell sx={{ py: 2, px: 2 }}>
                <Typography variant="subtitle1" fontWeight={900} color="#0f172a">
                  Final Net Payable
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ py: 2, px: 2 }}>
                <Typography variant="h6" fontWeight={900} color="#2563eb">
                  ₹{((quotation.totalInPaise || 0) / 100).toLocaleString("en-IN")}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Terms & Conditions */}
        {quotation.termsAndConditions && (
          <Box
            sx={{
              mt: 4,
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: "#f8fafc",
              border: "1px solid #f1f5f9",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={800}
              color="#64748b"
              textTransform="uppercase"
              letterSpacing="0.05em"
              display="block"
              mb={1}
            >
              TERMS & OPERATIONAL CONDITIONS
            </Typography>
            <Typography variant="body2" color="#475569" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {quotation.termsAndConditions}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}