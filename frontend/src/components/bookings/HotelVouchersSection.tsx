import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  Alert,
  Tooltip,
  Divider,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import {
  fetchBookingVouchers,
  createHotelVoucher,
  fetchVoucher,
  updateVoucherStatus,
  deleteVoucher,
  fetchSuppliers,
} from "../../api/suppliers";
import { HotelVoucher, MealPlan, VoucherStatus, Supplier } from "../../types/supplier";

const MEAL_PLAN_LABELS: Record<MealPlan, { short: string; title: string; desc: string }> = {
  EP: { short: "EP", title: "European Plan", desc: "Room Only" },
  CP: { short: "CP", title: "Continental Plan", desc: "Bed & Breakfast" },
  MAP: { short: "MAP", title: "Modified American Plan", desc: "Breakfast + Dinner" },
  AP: { short: "AP", title: "American Plan", desc: "All Meals (B + L + D)" },
};

const VOUCHER_STATUS_COLORS: Record<VoucherStatus, "info" | "success" | "error"> = {
  ISSUED: "info",
  CONFIRMED: "success",
  CANCELLED: "error",
};

export function HotelVouchersSection({
  bookingId,
  customerName,
  travelStart,
  travelEnd,
}: {
  bookingId: string;
  customerName?: string;
  travelStart?: string | null;
  travelEnd?: string | null;
}) {
  const [vouchers, setVouchers] = useState<HotelVoucher[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate Voucher Dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    supplierId: "",
    hotelName: "",
    city: "",
    checkInDate: travelStart ? new Date(travelStart).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    checkOutDate: travelEnd ? new Date(travelEnd).toISOString().slice(0, 10) : new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    roomCategory: "Deluxe Room",
    numberOfRooms: 1,
    mealPlan: "CP" as MealPlan,
    guestNames: customerName || "",
    specialRequests: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // View / Print Voucher Modal
  const [selectedVoucher, setSelectedVoucher] = useState<HotelVoucher | null>(null);
  const [openPreview, setOpenPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [vchs, sups] = await Promise.all([
        fetchBookingVouchers(bookingId),
        fetchSuppliers({ type: "HOTEL" }),
      ]);
      setVouchers(vchs);
      setSuppliers(sups);
    } catch (err) {
      console.error("Failed to load vouchers", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [bookingId]);

  function handleOpenCreate() {
    setForm({
      supplierId: "",
      hotelName: "",
      city: "",
      checkInDate: travelStart ? new Date(travelStart).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      checkOutDate: travelEnd ? new Date(travelEnd).toISOString().slice(0, 10) : new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
      roomCategory: "Deluxe Room",
      numberOfRooms: 1,
      mealPlan: "CP",
      guestNames: customerName || "",
      specialRequests: "Non-smoking room, Double bed, Early check-in subject to availability.",
    });
    setCreateError(null);
    setOpenCreate(true);
  }

  function handleSupplierSelect(supplierId: string) {
    const found = suppliers.find((s) => s.id === supplierId);
    if (found) {
      setForm((prev) => ({
        ...prev,
        supplierId: found.id,
        hotelName: found.name,
        city: found.city || prev.city,
      }));
    } else {
      setForm((prev) => ({ ...prev, supplierId: "" }));
    }
  }

  async function handleCreateVoucher() {
    if (!form.hotelName.trim()) {
      setCreateError("Hotel name is required.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const guests = form.guestNames
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

      await createHotelVoucher(bookingId, {
        supplierId: form.supplierId || null,
        hotelName: form.hotelName,
        city: form.city || undefined,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        roomCategory: form.roomCategory,
        numberOfRooms: form.numberOfRooms,
        mealPlan: form.mealPlan,
        guestNames: guests,
        specialRequests: form.specialRequests || undefined,
      });

      setOpenCreate(false);
      load();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to generate voucher");
    } finally {
      setCreating(false);
    }
  }

  async function handleViewVoucher(voucherId: string) {
    setLoadingPreview(true);
    setOpenPreview(true);
    try {
      const full = await fetchVoucher(voucherId);
      setSelectedVoucher(full);
    } catch (err) {
      console.error("Failed to load full voucher", err);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleUpdateStatus(status: VoucherStatus) {
    if (!selectedVoucher) return;
    try {
      const updated = await updateVoucherStatus(selectedVoucher.id, status);
      setSelectedVoucher((prev) => (prev ? { ...prev, status: updated.status } : null));
      load();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }

  async function handleDeleteVoucher(id: string) {
    if (!window.confirm("Are you sure you want to delete this confirmation voucher?")) return;
    try {
      await deleteVoucher(id);
      load();
    } catch (err) {
      console.error("Failed to delete voucher", err);
    }
  }

  function handlePrint() {
    window.print();
  }

  const nights =
    form.checkInDate && form.checkOutDate
      ? Math.max(
          1,
          Math.round(
            (new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 1;

  return (
    <Paper
      sx={{ p: 4, maxWidth: 850, mt: 3 }}
      className="no-print"
      elevation={0}
      style={{ border: "1px solid #e2e8f0", borderRadius: 16 }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
        <Box>
          <Typography variant="h6" fontWeight={700} color="#0f172a">
            Hotel Confirmation Vouchers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate printable, branded vouchers with meal plans and guest details for your guests.
          </Typography>
        </Box>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={handleOpenCreate}
          sx={{ bgcolor: "#2563eb", fontWeight: 600, textTransform: "none" }}
        >
          Generate Hotel Voucher
        </Button>
      </Box>

      {/* Vouchers Table */}
      <Table size="small">
        <TableHead sx={{ bgcolor: "#f8fafc" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Voucher No</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Hotel Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Check-in — Check-out</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Rooms & Meal Plan</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vouchers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                No hotel vouchers generated for this booking yet.
              </TableCell>
            </TableRow>
          ) : (
            vouchers.map((vch) => {
              const mealInfo = MEAL_PLAN_LABELS[vch.mealPlan] || MEAL_PLAN_LABELS.CP;
              return (
                <TableRow key={vch.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="#2563eb">
                      {vch.voucherNumber}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Issued {new Date(vch.issuedAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="#0f172a">
                      {vch.hotelName}
                    </Typography>
                    {vch.city && (
                      <Typography variant="caption" color="text.secondary">
                        {vch.city}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {new Date(vch.checkInDate).toLocaleDateString()} — {new Date(vch.checkOutDate).toLocaleDateString()}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={500}>
                        {vch.numberOfRooms}x {vch.roomCategory}
                      </Typography>
                      <Chip
                        label={`${mealInfo.short} (${mealInfo.desc})`}
                        size="small"
                        sx={{ height: 20, fontSize: 10, bgcolor: "#eff6ff", color: "#1d4ed8", fontWeight: 700 }}
                      />
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={vch.status}
                      size="small"
                      color={VOUCHER_STATUS_COLORS[vch.status]}
                      sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={0.5}>
                      <Tooltip title="View / Print Branded Voucher">
                        <IconButton size="small" color="primary" onClick={() => handleViewVoucher(vch.id)}>
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Voucher">
                        <IconButton size="small" color="error" onClick={() => handleDeleteVoucher(vch.id)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Generate Voucher Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Generate Hotel Confirmation Voucher</DialogTitle>
        <DialogContent dividers>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Select Hotel Partner"
                fullWidth
                size="small"
                value={form.supplierId}
                onChange={(e) => handleSupplierSelect(e.target.value)}
                helperText="Select to autofill hotel name and city"
              >
                <MenuItem value="">
                  <em>Manual Hotel Entry</em>
                </MenuItem>
                {suppliers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} {s.city ? `(${s.city})` : ""}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Hotel / Resort Name *"
                fullWidth
                size="small"
                value={form.hotelName}
                onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
                placeholder="e.g. Radisson Blu Hotel"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Destination City"
                fullWidth
                size="small"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. Udaipur, Goa, Manali"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Meal Plan *"
                fullWidth
                size="small"
                value={form.mealPlan}
                onChange={(e) => setForm({ ...form, mealPlan: e.target.value as MealPlan })}
              >
                {Object.entries(MEAL_PLAN_LABELS).map(([key, val]) => (
                  <MenuItem key={key} value={key}>
                    <b>{val.short}</b>: {val.title} ({val.desc})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={5}>
              <TextField
                label="Check-in Date *"
                type="date"
                fullWidth
                size="small"
                value={form.checkInDate}
                onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={5}>
              <TextField
                label="Check-out Date *"
                type="date"
                fullWidth
                size="small"
                value={form.checkOutDate}
                onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={2}>
              <TextField
                label="Nights"
                fullWidth
                size="small"
                disabled
                value={`${nights}N`}
                sx={{ bgcolor: "#f8fafc" }}
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                label="Room Category"
                fullWidth
                size="small"
                value={form.roomCategory}
                onChange={(e) => setForm({ ...form, roomCategory: e.target.value })}
                placeholder="Deluxe Lake View, Premium Suite"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Number of Rooms"
                type="number"
                fullWidth
                size="small"
                value={form.numberOfRooms}
                onChange={(e) => setForm({ ...form, numberOfRooms: parseInt(e.target.value) || 1 })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Guest Names (Comma-separated)"
                fullWidth
                size="small"
                value={form.guestNames}
                onChange={(e) => setForm({ ...form, guestNames: e.target.value })}
                placeholder="Mr. Rahul Verma, Mrs. Priya Verma"
                helperText="Will be printed on the confirmation voucher for hotel front desk"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Special Requests / Inclusions"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={form.specialRequests}
                onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                placeholder="Non-smoking room, extra bed, early check-in requested..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setOpenCreate(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateVoucher}
            disabled={creating}
            sx={{ bgcolor: "#2563eb", fontWeight: 600, textTransform: "none", px: 3 }}
          >
            {creating ? "Generating..." : "Generate Voucher"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Printable Branded Voucher Preview Modal */}
      <Dialog open={openPreview} onClose={() => setOpenPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="no-print">
          <Typography variant="h6" fontWeight={700}>
            Hotel Confirmation Voucher: {selectedVoucher?.voucherNumber}
          </Typography>
          <Box display="flex" gap={1} alignItems="center">
            {selectedVoucher && (
              <Box display="flex" gap={0.5}>
                <Button
                  size="small"
                  variant={selectedVoucher.status === "CONFIRMED" ? "contained" : "outlined"}
                  color="success"
                  onClick={() => handleUpdateStatus("CONFIRMED")}
                >
                  Confirm
                </Button>
                <Button
                  size="small"
                  variant={selectedVoucher.status === "CANCELLED" ? "contained" : "outlined"}
                  color="error"
                  onClick={() => handleUpdateStatus("CANCELLED")}
                >
                  Cancel
                </Button>
              </Box>
            )}
            <Button
              variant="contained"
              startIcon={<PrintRoundedIcon />}
              onClick={handlePrint}
              sx={{ bgcolor: "#0f172a", textTransform: "none", fontWeight: 600 }}
            >
              Print Voucher
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {selectedVoucher && (
            <Box
              ref={printAreaRef}
              sx={{
                p: 5,
                bgcolor: "#ffffff",
                fontFamily: "'Inter', sans-serif",
                color: "#1e293b",
              }}
            >
              {/* Printable Header */}
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" pb={3} borderBottom="2px solid #2563eb">
                <Box>
                  {selectedVoucher.client?.companyProfile?.logoUrl ? (
                    <img
                      src={selectedVoucher.client.companyProfile.logoUrl}
                      alt="Logo"
                      style={{ maxHeight: 54, marginBottom: 8 }}
                    />
                  ) : (
                    <Typography variant="h5" fontWeight={800} color="#2563eb">
                      {selectedVoucher.client?.companyProfile?.companyName || selectedVoucher.client?.businessName || "DIGIINK TRAVEL"}
                    </Typography>
                  )}
                  <Typography variant="body2" color="#64748b">
                    {selectedVoucher.client?.companyProfile?.address || "Travel Agency Office"}
                  </Typography>
                  <Typography variant="caption" color="#64748b" display="block">
                    Phone: {selectedVoucher.client?.companyProfile?.phone || "+91-9876543210"} · Email: {selectedVoucher.client?.companyProfile?.email || "reservations@travelcrm.com"}
                  </Typography>
                  {selectedVoucher.client?.companyProfile?.gstNumber && (
                    <Typography variant="caption" color="#64748b" display="block">
                      GSTIN: {selectedVoucher.client.companyProfile.gstNumber}
                    </Typography>
                  )}
                </Box>

                <Box textAlign="right">
                  <Chip
                    label="HOTEL CONFIRMATION VOUCHER"
                    sx={{
                      bgcolor: "#2563eb",
                      color: "#fff",
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      borderRadius: 1,
                      mb: 1,
                    }}
                  />
                  <Typography variant="h6" fontWeight={800} color="#0f172a">
                    {selectedVoucher.voucherNumber}
                  </Typography>
                  <Typography variant="caption" color="#64748b" display="block">
                    Issue Date: {new Date(selectedVoucher.issuedAt).toLocaleDateString()}
                  </Typography>
                  <Chip
                    label={selectedVoucher.status}
                    size="small"
                    color={VOUCHER_STATUS_COLORS[selectedVoucher.status]}
                    sx={{ fontWeight: 700, mt: 0.5, height: 20, fontSize: 10 }}
                  />
                </Box>
              </Box>

              {/* Guest & Hotel Summary Bar */}
              <Grid container spacing={3} my={2.5}>
                <Grid item xs={6}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                    <Typography variant="caption" color="#64748b" fontWeight={700} textTransform="uppercase">
                      Guest Details
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a" mt={0.5}>
                      {Array.isArray(selectedVoucher.guestNames) && selectedVoucher.guestNames.length > 0
                        ? selectedVoucher.guestNames.join(", ")
                        : selectedVoucher.booking?.customer?.name || "Valued Guest"}
                    </Typography>
                    <Typography variant="body2" color="#64748b">
                      Phone: {selectedVoucher.booking?.customer?.phone || "—"}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                    <Typography variant="caption" color="#64748b" fontWeight={700} textTransform="uppercase">
                      Hotel Property
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a" mt={0.5}>
                      {selectedVoucher.hotelName}
                    </Typography>
                    <Typography variant="body2" color="#64748b">
                      {selectedVoucher.city ? `Destination: ${selectedVoucher.city}` : "Verified Partner Hotel"}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Stay & Room Details Table */}
              <Table
                sx={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  mb: 3,
                  "& th": { bgcolor: "#f1f5f9", fontWeight: 700, color: "#334155" },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Check-in</TableCell>
                    <TableCell>Check-out</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Rooms & Category</TableCell>
                    <TableCell>Meal Plan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {new Date(selectedVoucher.checkInDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {new Date(selectedVoucher.checkOutDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {Math.max(
                        1,
                        Math.round(
                          (new Date(selectedVoucher.checkOutDate).getTime() -
                            new Date(selectedVoucher.checkInDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )}{" "}
                      Nights
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {selectedVoucher.numberOfRooms} Room(s) · {selectedVoucher.roomCategory}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Chip
                          label={selectedVoucher.mealPlan}
                          size="small"
                          sx={{ bgcolor: "#2563eb", color: "#fff", fontWeight: 800 }}
                        />
                        <Typography variant="body2" fontWeight={600}>
                          {MEAL_PLAN_LABELS[selectedVoucher.mealPlan]?.title || selectedVoucher.mealPlan}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Special Requests */}
              {selectedVoucher.specialRequests && (
                <Box mb={3} p={2} sx={{ bgcolor: "#fefce8", border: "1px solid #fef08a", borderRadius: 2 }}>
                  <Typography variant="caption" color="#854d0e" fontWeight={700} textTransform="uppercase">
                    Special Inclusions & Instructions:
                  </Typography>
                  <Typography variant="body2" color="#713f12" mt={0.5}>
                    {selectedVoucher.specialRequests}
                  </Typography>
                </Box>
              )}

              {/* Important Check-in Notes */}
              <Box mb={4} p={2} sx={{ bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                <Typography variant="caption" color="#475569" fontWeight={700} textTransform="uppercase">
                  Important Check-in Guidelines:
                </Typography>
                <Typography variant="caption" color="#64748b" display="block" mt={0.5}>
                  1. Standard hotel check-in time is usually 12:00 PM / 2:00 PM and check-out is 10:00 AM / 11:00 AM.
                </Typography>
                <Typography variant="caption" color="#64748b" display="block">
                  2. All adult guests must present a valid government-approved photo ID card at the time of check-in (PAN card is not accepted).
                </Typography>
                <Typography variant="caption" color="#64748b" display="block">
                  3. Any incidentals, mini-bar, laundry, or extra room service items are to be settled directly at the hotel desk upon check-out.
                </Typography>
              </Box>

              {/* Footer / Signatory */}
              <Box display="flex" justifyContent="space-between" alignItems="flex-end" pt={2} borderTop="1px solid #e2e8f0">
                <Box>
                  <Typography variant="caption" color="#94a3b8">
                    Generated via Digiink Travel CRM · For assistance contact reservations desk
                  </Typography>
                </Box>
                <Box textAlign="center" width={180}>
                  <Box height={40} borderBottom="1px solid #cbd5e1" mb={0.5} />
                  <Typography variant="caption" fontWeight={700} color="#475569">
                    Authorized Signatory
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }} className="no-print">
          <Button onClick={() => setOpenPreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
