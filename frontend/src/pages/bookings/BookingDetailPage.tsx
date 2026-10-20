import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Chip, Button, Select, MenuItem, Divider,
  TextField, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Avatar, IconButton, Tooltip
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import CurrencyRupeeRoundedIcon from "@mui/icons-material/CurrencyRupeeRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import { apiClient } from "../../api/client";
import { BookingCostingSection } from "../../components/bookings/BookingCostingSection";
import { HotelVouchersSection } from "../../components/bookings/HotelVouchersSection";
import { BookingDocumentVaultSection } from "../../components/bookings/BookingDocumentVaultSection";

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  CONFIRMED: { bg: "#eff6ff", color: "#1d4ed8" },
  IN_PROGRESS: { bg: "#fff7ed", color: "#c2410c" },
  COMPLETED: { bg: "#f0fdf4", color: "#15803d" },
  CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
};

export function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);

  function load() {
    apiClient.get(`/bookings/${id}`).then(({ data }) => setBooking(data.data));
  }
  useEffect(load, [id]);

  async function updateStatus(status: string) {
    await apiClient.patch(`/bookings/${id}/status`, { status });
    load();
  }

  if (!booking) {
    return (
      <Box sx={{ p: 4, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="body1" color="text.secondary" fontWeight={600}>
          Loading booking details...
        </Typography>
      </Box>
    );
  }

  const currentStatusConfig = STATUS_CONFIG[booking.status] || { bg: "#f1f5f9", color: "#475569" };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      {/* Top Meta Bar */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2.5} className="no-print">
        <Tooltip title="Back to Bookings">
          <IconButton
            onClick={() => navigate("/app/bookings")}
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
          BOOKING / #{id?.slice(-6).toUpperCase()}
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
        className="no-print"
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
            <ConfirmationNumberRoundedIcon sx={{ color: "#fff", fontSize: 26 }} />
          </Avatar>
          <Box>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.03em" }}>
                Booking Overview
              </Typography>
              <Chip
                label={booking.status.replace("_", " ")}
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
              Customer: <strong>{booking.customer?.name}</strong> · Quotation v{booking.quotation?.version || "1"}
            </Typography>
          </Box>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
          <Select
            size="small"
            value={booking.status}
            onChange={(e) => updateStatus(e.target.value)}
            sx={{
              bgcolor: "#ffffff",
              borderRadius: 2,
              fontSize: "0.82rem",
              fontWeight: 700,
              minWidth: 150,
            }}
          >
            {["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
              <MenuItem key={s} value={s} sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                {s.replace("_", " ")}
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="outlined"
            startIcon={<PrintRoundedIcon />}
            onClick={() => window.print()}
            sx={{
              bgcolor: "#ffffff",
              borderColor: "#e2e8f0",
              color: "#334155",
              fontWeight: 700,
              borderRadius: 2,
              textTransform: "none",
            }}
          >
            Print Voucher
          </Button>

          <Button
            variant="outlined"
            startIcon={<EditRoundedIcon />}
            onClick={() => navigate(`/app/bookings/${id}/edit`)}
            sx={{
              bgcolor: "#ffffff",
              borderColor: "#e2e8f0",
              color: "#334155",
              fontWeight: 700,
              borderRadius: 2,
              textTransform: "none",
            }}
          >
            Edit Booking
          </Button>

          {booking.trip && (
            <Button
              variant="contained"
              startIcon={<LuggageRoundedIcon />}
              onClick={() => navigate(`/app/trips/${booking.trip.id}`)}
              sx={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
              }}
            >
              Manage Trip
            </Button>
          )}
        </Box>
      </Box>

      {/* Booking Voucher Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          maxWidth: 780,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          mb: 3,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={800} color="#0f172a">
            Official Travel Voucher
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Created on {new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </Typography>
        </Box>
        <Divider sx={{ my: 1.5, borderColor: "#f1f5f9" }} />

        <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2} my={2}>
          <Box display="flex" alignItems="center" gap={1.25}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: "#eff6ff", color: "#0284c7" }}>
              <PersonRoundedIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                Primary Passenger
              </Typography>
              <Typography variant="body2" fontWeight={800} color="#0f172a">
                {booking.customer?.name} ({booking.customer?.phone || "No phone"})
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1.25}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: "#f0fdf4", color: "#16a34a" }}>
              <CalendarTodayRoundedIcon sx={{ fontSize: 18 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                Travel Schedule
              </Typography>
              <Typography variant="body2" fontWeight={800} color="#0f172a">
                {booking.travelStart ? new Date(booking.travelStart).toLocaleDateString() : "TBD"} —{" "}
                {booking.travelEnd ? new Date(booking.travelEnd).toLocaleDateString() : "TBD"}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1.25}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: "#fef3c7", color: "#d97706" }}>
              <CurrencyRupeeRoundedIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                Total Booked Fare
              </Typography>
              <Typography variant="body1" fontWeight={900} color="#0284c7">
                ₹{((booking.amountInPaise || 0) / 100).toLocaleString("en-IN")}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1.25}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: "#ede9fe", color: "#7c3aed" }}>
              <DirectionsCarRoundedIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                Fleet & Chauffeur
              </Typography>
              <Typography variant="body2" fontWeight={800} color="#0f172a">
                {booking.vehicle?.registrationNumber || "No Vehicle"} · {booking.driver?.name || "No Driver"}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <BookingCostingSection bookingId={id!} />
      <HotelVouchersSection
        bookingId={id!}
        customerName={booking.customer?.name}
        travelStart={booking.travelStart}
        travelEnd={booking.travelEnd}
      />
      <BookingDocumentVaultSection
        bookingId={id!}
        booking={booking}
        onRefresh={load}
      />
      <PaymentsSection bookingId={id!} totalInPaise={booking.amountInPaise} />
      <InvoiceSection bookingId={id!} />
    </Box>
  );
}

function PaymentsSection({ bookingId, totalInPaise }: { bookingId: string; totalInPaise: number }) {
  const [summary, setSummary] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: 0, mode: "UPI", paymentDate: new Date().toISOString().slice(0, 10), reference: "", notes: "" });
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiClient.get(`/payments/booking/${bookingId}/summary`).then(({ data }) => {
      setSummary(data.data);
      setDueDate(data.data.dueDate ? new Date(data.data.dueDate).toISOString().slice(0, 10) : "");
    });
    apiClient.get("/payments", { params: { bookingId } }).then(({ data }) => setPayments(data.data));
  }
  useEffect(load, [bookingId]);

  async function handleAddPayment() {
    setError(null);
    try {
      await apiClient.post("/payments", {
        bookingId, amountInPaise: Math.round(form.amount * 100), mode: form.mode,
        paymentDate: form.paymentDate, reference: form.reference, notes: form.notes,
      });
      setOpen(false);
      setForm({ amount: 0, mode: "UPI", paymentDate: new Date().toISOString().slice(0, 10), reference: "", notes: "" });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Could not record payment");
    }
  }

  async function saveDueDate() {
    await apiClient.patch(`/bookings/${bookingId}`, { paymentDueDate: dueDate || undefined });
    load();
  }

  const STATUS_COLOR: Record<string, "success" | "warning" | "error"> = { PAID: "success", PARTIALLY_PAID: "warning", UNPAID: "error" };

  return (
    <Paper sx={{ p: 4, maxWidth: 700, mt: 3 }} className="no-print">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Payments</Typography>
        {summary && <Chip label={summary.paymentStatus.replace("_", " ")} color={STATUS_COLOR[summary.paymentStatus]} />}
      </Box>

      {summary && (
        <Box display="flex" gap={4} mb={2}>
          <Typography>Total: ₹{(summary.totalInPaise / 100).toLocaleString()}</Typography>
          <Typography color="success.main">Paid: ₹{(summary.paidInPaise / 100).toLocaleString()}</Typography>
          <Typography color="error.main">Pending: ₹{(summary.pendingInPaise / 100).toLocaleString()}</Typography>
        </Box>
      )}

      <Box display="flex" gap={2} alignItems="center" mb={2}>
        <TextField size="small" label="Payment Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button size="small" onClick={saveDueDate}>Save Due Date</Button>
      </Box>

      <Table size="small" sx={{ mb: 2 }}>
        <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Amount</TableCell><TableCell>Mode</TableCell><TableCell>Reference</TableCell></TableRow></TableHead>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
              <TableCell>₹{(p.amountInPaise / 100).toLocaleString()}</TableCell>
              <TableCell>{p.mode.replace("_", " ")}</TableCell>
              <TableCell>{p.reference ?? "—"}</TableCell>
            </TableRow>
          ))}
          {payments.length === 0 && <TableRow><TableCell colSpan={4}>No payments recorded yet.</TableCell></TableRow>}
        </TableBody>
      </Table>

      {summary?.pendingInPaise > 0 && <Button variant="contained" size="small" onClick={() => setOpen(true)}>+ Record Payment</Button>}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Amount (₹)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          <TextField select label="Mode" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            {["CASH", "UPI", "BANK_TRANSFER"].map((m) => <MenuItem key={m} value={m}>{m.replace("_", " ")}</MenuItem>)}
          </TextField>
          <TextField label="Payment Date" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <TextField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddPayment} disabled={!form.amount}>Record</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function InvoiceSection({ bookingId }: { bookingId: string }) {
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [hsnSac, setHsnSac] = useState("");
  const [gstRate, setGstRate] = useState(5);

  useEffect(() => {
    apiClient.get("/invoices", { params: { bookingId } }).then(({ data }) => {
      setInvoice(data.data[0] ?? null);
      setLoaded(true);
    });
  }, [bookingId]);

  async function generate() {
    const { data } = await apiClient.post("/invoices", { bookingId, hsnSac: hsnSac || undefined, gstRatePercent: gstRate });
    navigate(`/app/invoices/${data.data.id}`);
  }

  if (!loaded) return null;

  return (
    <Paper sx={{ p: 4, maxWidth: 700, mt: 3 }} className="no-print">
      <Typography variant="h6" gutterBottom>Invoice</Typography>
      {invoice ? (
        <Button variant="outlined" onClick={() => navigate(`/app/invoices/${invoice.id}`)}>View Invoice</Button>
      ) : (
        <Box display="flex" gap={2} alignItems="center">
          <TextField size="small" label="HSN/SAC (optional)" value={hsnSac} onChange={(e) => setHsnSac(e.target.value)} />
          <TextField size="small" label="GST %" type="number" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} sx={{ width: 100 }} />
          <Button variant="contained" onClick={generate}>Generate Invoice</Button>
        </Box>
      )}
    </Paper>
  );
}
