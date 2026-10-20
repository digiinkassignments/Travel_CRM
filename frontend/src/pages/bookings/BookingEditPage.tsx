import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { apiClient } from "../../api/client";

type FormState = {
  customerName: string; customerPhone: string; customerEmail: string; pickup: string; drop: string;
  travelStart: string; travelEnd: string; vehicleType: string; distance: string; duration: string;
  driverId: string; vehicleId: string; fare: string; status: string; paymentStatus: string; notes: string;
};

const emptyForm: FormState = {
  customerName: "", customerPhone: "", customerEmail: "", pickup: "", drop: "", travelStart: "", travelEnd: "",
  vehicleType: "", distance: "", duration: "", driverId: "", vehicleId: "", fare: "", status: "CONFIRMED", paymentStatus: "UNPAID", notes: "",
};

function dateTimeValue(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

export function BookingEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiClient.get(`/bookings/${id}`),
      apiClient.get("/drivers").catch(() => ({ data: { data: [] } })),
      apiClient.get("/vehicles").catch(() => ({ data: { data: [] } })),
    ]).then(([bookingResponse, driversResponse, vehiclesResponse]) => {
      const booking = bookingResponse.data.data;
      const trip = booking.trip ?? {};
      const itinerary = Array.isArray(booking.quotation?.itineraryJson) ? booking.quotation.itineraryJson[0] ?? {} : {};
      const notes = trip.itineraryNotes ?? "";
      const paidInPaise = (booking.payments ?? []).reduce((sum: number, payment: any) => sum + payment.amountInPaise, 0);
      const paymentStatus = paidInPaise <= 0 ? "UNPAID" : paidInPaise >= booking.amountInPaise ? "PAID" : "PARTIAL";
      setForm({
        customerName: booking.customer?.name ?? "", customerPhone: booking.customer?.phone ?? "", customerEmail: booking.customer?.email ?? "",
        pickup: trip.pickup ?? itinerary.pickup ?? "", drop: trip.drop ?? itinerary.drop ?? "",
        travelStart: dateTimeValue(booking.travelStart ?? trip.startDate), travelEnd: dateTimeValue(booking.travelEnd ?? trip.endDate),
        vehicleType: itinerary.vehicleType ?? "", distance: itinerary.distance ?? "", duration: itinerary.duration ?? "",
        driverId: booking.driverId ?? trip.driverId ?? "", vehicleId: booking.vehicleId ?? trip.vehicleId ?? "",
        fare: String((booking.amountInPaise ?? 0) / 100), status: booking.status, paymentStatus, notes,
      });
      setDrivers(driversResponse.data.data ?? []);
      setVehicles(vehiclesResponse.data.data ?? []);
    }).catch(() => setError("Could not load this booking."))
      .finally(() => setLoading(false));
  }, [id]);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    setError("");
    try {
      setSaving(true);
      await apiClient.patch(`/bookings/${id}`, {
        customerName: form.customerName, customerPhone: form.customerPhone, customerEmail: form.customerEmail,
        pickup: form.pickup, drop: form.drop, travelStart: form.travelStart || undefined, travelEnd: form.travelEnd || undefined,
        vehicleType: form.vehicleType, distance: form.distance, duration: form.duration,
        driverId: form.driverId || null, vehicleId: form.vehicleId || null, fareInPaise: Math.round(Number(form.fare) * 100),
        status: form.status, paymentStatus: form.paymentStatus, notes: form.notes,
      });
      navigate(`/app/bookings/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Could not update booking.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Box p={4}>Loading booking...</Box>;

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(`/app/bookings/${id}`)} sx={{ mb: 2 }}>Back to Booking</Button>
      <Typography variant="h4" fontWeight={800} mb={3}>Edit Booking</Typography>
      <Paper sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 900 }}>
        {error && <Typography color="error" mb={2}>{error}</Typography>}
        <Typography variant="overline" color="text.secondary">Customer Details</Typography>
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2} mb={3}>
          <TextField label="Customer Name" required value={form.customerName} onChange={(e) => update("customerName", e.target.value)} />
          <TextField label="Customer Phone" required value={form.customerPhone} onChange={(e) => update("customerPhone", e.target.value)} />
          <TextField label="Customer Email" type="email" value={form.customerEmail} onChange={(e) => update("customerEmail", e.target.value)} />
        </Box>
        <Typography variant="overline" color="text.secondary">Trip Details</Typography>
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2} mb={3}>
          <TextField label="Pickup Location" required value={form.pickup} onChange={(e) => update("pickup", e.target.value)} />
          <TextField label="Drop Location" required value={form.drop} onChange={(e) => update("drop", e.target.value)} />
          <TextField label="Pickup Date & Time" type="datetime-local" value={form.travelStart} onChange={(e) => update("travelStart", e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Return Date & Time" type="datetime-local" value={form.travelEnd} onChange={(e) => update("travelEnd", e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Vehicle Type" value={form.vehicleType} onChange={(e) => update("vehicleType", e.target.value)} />
          <TextField label="Distance (km)" value={form.distance} onChange={(e) => update("distance", e.target.value)} />
          <TextField label="Duration" value={form.duration} onChange={(e) => update("duration", e.target.value)} />
        </Box>
        <Typography variant="overline" color="text.secondary">Driver & Vehicle Assignment</Typography>
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2} mb={3}>
          <TextField select label="Driver" value={form.driverId} onChange={(e) => update("driverId", e.target.value)}><MenuItem value="">No driver</MenuItem>{drivers.map((driver) => <MenuItem key={driver.id} value={driver.id}>{driver.name}</MenuItem>)}</TextField>
          <TextField select label="Vehicle" value={form.vehicleId} onChange={(e) => update("vehicleId", e.target.value)}><MenuItem value="">No vehicle</MenuItem>{vehicles.map((vehicle) => <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.registrationNumber} ({vehicle.vehicleType})</MenuItem>)}</TextField>
        </Box>
        <Typography variant="overline" color="text.secondary">Fare & Status</Typography>
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2} mb={3}>
          <TextField label="Fare (₹)" type="number" required value={form.fare} onChange={(e) => update("fare", e.target.value)} />
          <TextField select label="Booking Status" value={form.status} onChange={(e) => update("status", e.target.value)}>{["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((status) => <MenuItem key={status} value={status}>{status.replace("_", " ")}</MenuItem>)}</TextField>
          <TextField select label="Payment Status" value={form.paymentStatus} onChange={(e) => update("paymentStatus", e.target.value)}>{["UNPAID", "PARTIAL", "PAID"].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField>
        </Box>
        <TextField fullWidth multiline minRows={4} label="Notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} sx={{ mb: 3 }} />
        <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={save} disabled={saving || !form.customerName || !form.customerPhone || !form.pickup || !form.drop || !form.fare}>{saving ? "Saving..." : "Save Booking"}</Button>
      </Paper>
    </Box>
  );
}