import { useEffect, useState } from "react";
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
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import DirectionsBusRoundedIcon from "@mui/icons-material/DirectionsBusRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import SportsScoreRoundedIcon from "@mui/icons-material/SportsScoreRounded";
import AssignmentIndRoundedIcon from "@mui/icons-material/AssignmentIndRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";

import {
  fetchBookingCosting,
  addBookingCostItem,
  updateBookingCostItem,
  deleteBookingCostItem,
  fetchSuppliers,
  recordSupplierPayment,
} from "../../api/suppliers";
import {
  CostingSummary,
  BookingCostItem,
  CostItemType,
  Supplier,
  SupplierPaymentStatus,
} from "../../types/supplier";

const ITEM_TYPE_CONFIG: Record<CostItemType, { label: string; icon: any; color: "primary" | "warning" | "info" | "success" | "secondary" | "default" }> = {
  HOTEL: { label: "Hotel", icon: HotelRoundedIcon, color: "primary" },
  TRANSPORT: { label: "Transport", icon: DirectionsBusRoundedIcon, color: "warning" },
  GUIDE: { label: "Guide", icon: ExploreRoundedIcon, color: "info" },
  ACTIVITY: { label: "Activity", icon: SportsScoreRoundedIcon, color: "success" },
  FLIGHT: { label: "Flight", icon: FlightTakeoffRoundedIcon, color: "primary" },
  VISA: { label: "Visa / Forex", icon: AssignmentIndRoundedIcon, color: "secondary" },
  MISC: { label: "Misc Cost", icon: MoreHorizRoundedIcon, color: "default" },
};

const PAYMENT_STATUS_COLORS: Record<SupplierPaymentStatus, "error" | "warning" | "success"> = {
  UNPAID: "error",
  PARTIALLY_PAID: "warning",
  PAID: "success",
};

export function BookingCostingSection({ bookingId }: { bookingId: string }) {
  const [costing, setCosting] = useState<CostingSummary | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Cost Item Modal
  const [openCostModal, setOpenCostModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BookingCostItem | null>(null);
  const [form, setForm] = useState({
    supplierId: "",
    itemType: "HOTEL" as CostItemType,
    description: "",
    quantity: 1,
    unitCost: 0,
    paymentStatus: "UNPAID" as SupplierPaymentStatus,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Payout Modal
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    supplierId: "",
    amount: 0,
    mode: "UPI",
    reference: "",
    notes: "",
  });
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [data, sups] = await Promise.all([
        fetchBookingCosting(bookingId),
        fetchSuppliers(),
      ]);
      setCosting(data);
      setSuppliers(sups);
    } catch (err) {
      console.error("Failed to load costing", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [bookingId]);

  function handleOpenAdd() {
    setEditingItem(null);
    setForm({
      supplierId: "",
      itemType: "HOTEL",
      description: "",
      quantity: 1,
      unitCost: 0,
      paymentStatus: "UNPAID",
      notes: "",
    });
    setError(null);
    setOpenCostModal(true);
  }

  function handleOpenEdit(item: BookingCostItem) {
    setEditingItem(item);
    setForm({
      supplierId: item.supplierId || "",
      itemType: item.itemType,
      description: item.description,
      quantity: item.quantity,
      unitCost: item.unitCostInPaise / 100,
      paymentStatus: item.paymentStatus,
      notes: item.notes || "",
    });
    setError(null);
    setOpenCostModal(true);
  }

  async function handleSaveCostItem() {
    if (!form.description.trim()) {
      setError("Description is required");
      return;
    }
    if (form.unitCost < 0) {
      setError("Cost must be 0 or greater");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        supplierId: form.supplierId || null,
        itemType: form.itemType,
        description: form.description,
        quantity: form.quantity,
        unitCostInPaise: Math.round(form.unitCost * 100),
        totalCostInPaise: Math.round(form.quantity * form.unitCost * 100),
        paymentStatus: form.paymentStatus,
        notes: form.notes || undefined,
      };

      if (editingItem) {
        await updateBookingCostItem(bookingId, editingItem.id, payload);
      } else {
        await addBookingCostItem(bookingId, payload);
      }

      setOpenCostModal(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save cost item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCostItem(itemId: string) {
    if (!window.confirm("Are you sure you want to remove this cost item?")) return;
    try {
      await deleteBookingCostItem(bookingId, itemId);
      load();
    } catch (err) {
      console.error("Failed to delete cost item", err);
    }
  }

  function handleOpenPayout(supplierId?: string | null) {
    setPayoutForm({
      supplierId: supplierId || (suppliers[0]?.id || ""),
      amount: costing?.pendingPayablesInPaise ? Math.round(costing.pendingPayablesInPaise / 100) : 0,
      mode: "UPI",
      reference: "",
      notes: `Payout for Booking #${bookingId.slice(-6)}`,
    });
    setPayoutError(null);
    setPayoutModal(true);
  }

  async function handleSavePayout() {
    if (!payoutForm.supplierId) {
      setPayoutError("Please select a supplier");
      return;
    }
    if (payoutForm.amount <= 0) {
      setPayoutError("Amount must be greater than ₹0");
      return;
    }

    setSavingPayout(true);
    setPayoutError(null);
    try {
      await recordSupplierPayment({
        supplierId: payoutForm.supplierId,
        bookingId,
        amountInPaise: Math.round(payoutForm.amount * 100),
        paymentDate: new Date().toISOString().slice(0, 10),
        mode: payoutForm.mode,
        reference: payoutForm.reference || undefined,
        notes: payoutForm.notes || undefined,
      });
      setPayoutModal(false);
      load();
    } catch (err: any) {
      setPayoutError(err.response?.data?.message || "Failed to record payout");
    } finally {
      setSavingPayout(false);
    }
  }

  if (loading && !costing) {
    return <Box py={2}>Loading costing engine...</Box>;
  }

  const sellingPrice = (costing?.sellingPriceInPaise || 0) / 100;
  const totalCost = (costing?.totalCostInPaise || 0) / 100;
  const grossProfit = (costing?.grossProfitInPaise || 0) / 100;
  const marginPct = costing?.profitMarginPct || 0;
  const pendingPayables = (costing?.pendingPayablesInPaise || 0) / 100;

  // Margin color classification
  const marginColor =
    marginPct >= 20 ? "#16a34a" : marginPct >= 10 ? "#2563eb" : marginPct >= 0 ? "#d97706" : "#dc2626";

  return (
    <Paper sx={{ p: 4, maxWidth: 850, mt: 3 }} className="no-print" elevation={0} style={{ border: "1px solid #e2e8f0", borderRadius: 16 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
        <Box>
          <Typography variant="h6" fontWeight={700} color="#0f172a">
            Net Costing & Profit Margins
          </Typography>
          <Typography variant="body2" color="text.secondary">
            B2B supplier purchase prices vs customer selling price.
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<PaymentsRoundedIcon />}
            onClick={() => handleOpenPayout()}
          >
            Record Payout
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenAdd}
            sx={{ bgcolor: "#2563eb", fontWeight: 600, textTransform: "none" }}
          >
            Add Cost Item
          </Button>
        </Box>
      </Box>

      {/* Real-time Profit Margin KPI Strip */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          bgcolor: "#f8fafc",
          border: "1px solid #e2e8f0",
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Customer Selling Price
            </Typography>
            <Typography variant="h6" fontWeight={700} color="#0f172a">
              ₹{sellingPrice.toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Total Supplier Net Cost
            </Typography>
            <Typography variant="h6" fontWeight={700} color="#dc2626">
              ₹{totalCost.toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Gross Profit (₹)
            </Typography>
            <Typography
              variant="h6"
              fontWeight={700}
              color={grossProfit >= 0 ? "#16a34a" : "#dc2626"}
            >
              ₹{grossProfit.toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Profit Margin
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" fontWeight={700} sx={{ color: marginColor }}>
                {marginPct}%
              </Typography>
              <Chip
                icon={<TrendingUpRoundedIcon sx={{ fontSize: "14px !important" }} />}
                label={marginPct >= 20 ? "Healthy" : marginPct >= 10 ? "Moderate" : "Low"}
                size="small"
                sx={{
                  bgcolor: `${marginColor}15`,
                  color: marginColor,
                  fontWeight: 700,
                  fontSize: 10,
                  height: 20,
                }}
              />
            </Box>
          </Grid>
        </Grid>

        {pendingPayables > 0 && (
          <Box mt={2} pt={1.5} borderTop="1px dashed #e2e8f0" display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="error.main" fontWeight={600}>
              Pending Vendor Payables for this booking: ₹{pendingPayables.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Paid Out: ₹{((costing?.totalPaidToSuppliersInPaise || 0) / 100).toLocaleString()}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Cost Items Table */}
      <Table size="small">
        <TableHead sx={{ bgcolor: "#f8fafc" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Item & Category</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Supplier / Vendor</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="right">Unit Cost</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="right">Total Cost</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="center">Pay Status</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!costing?.costItems || costing.costItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                No supplier cost items added yet. Click <b>"Add Cost Item"</b> to start calculating your profit margin.
              </TableCell>
            </TableRow>
          ) : (
            costing.costItems.map((item) => {
              const config = ITEM_TYPE_CONFIG[item.itemType] || ITEM_TYPE_CONFIG.MISC;
              const TypeIcon = config.icon;
              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        icon={<TypeIcon sx={{ fontSize: "14px !important" }} />}
                        label={config.label}
                        size="small"
                        color={config.color}
                        sx={{ height: 22, fontSize: 11, borderRadius: 1.5 }}
                      />
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="#1e293b">
                          {item.description}
                        </Typography>
                        {item.notes && (
                          <Typography variant="caption" color="text.secondary">
                            {item.notes}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    {item.supplier ? (
                      <Typography variant="body2" fontWeight={500}>
                        {item.supplier.name}
                        {item.supplier.city && (
                          <span style={{ color: "#64748b", fontSize: 11 }}> ({item.supplier.city})</span>
                        )}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontStyle="italic">
                        Direct / No vendor linked
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">₹{(item.unitCostInPaise / 100).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#0f172a" }}>
                    ₹{(item.totalCostInPaise / 100).toLocaleString()}
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={item.paymentStatus}
                      size="small"
                      color={PAYMENT_STATUS_COLORS[item.paymentStatus]}
                      sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={0.5}>
                      <Tooltip title="Edit Cost">
                        <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove Cost">
                        <IconButton size="small" color="error" onClick={() => handleDeleteCostItem(item.id)}>
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

      {/* Supplier Payouts Log for this Booking */}
      {costing?.supplierPayments && costing.supplierPayments.length > 0 && (
        <Box mt={3} pt={2} borderTop="1px solid #e2e8f0">
          <Typography variant="subtitle2" fontWeight={700} color="#475569" mb={1}>
            Recorded Supplier Payouts ({costing.supplierPayments.length})
          </Typography>
          <Table size="small">
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Reference / UTR</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {costing.supplierPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                  <TableCell>{p.supplier?.name || "—"}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#16a34a" }}>
                    ₹{(p.amountInPaise / 100).toLocaleString()}
                  </TableCell>
                  <TableCell>{p.mode}</TableCell>
                  <TableCell>{p.reference || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Add / Edit Cost Item Dialog */}
      <Dialog open={openCostModal} onClose={() => setOpenCostModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingItem ? "Edit Purchase Cost Item" : "Add Supplier Purchase Cost"}
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Item Category *"
                fullWidth
                size="small"
                value={form.itemType}
                onChange={(e) => setForm({ ...form, itemType: e.target.value as CostItemType })}
              >
                {Object.entries(ITEM_TYPE_CONFIG).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Select Supplier / Vendor"
                fullWidth
                size="small"
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                helperText="Link to track supplier payables ledger"
              >
                <MenuItem value="">
                  <em>None / Direct Expense</em>
                </MenuItem>
                {suppliers.map((sup) => (
                  <MenuItem key={sup.id} value={sup.id}>
                    {sup.name} ({sup.type}) {sup.city ? `· ${sup.city}` : ""}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Cost Description *"
                fullWidth
                size="small"
                placeholder="e.g. 3 Nights Superior Deluxe Room, Innova Crysta for 4 days"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Quantity *"
                type="number"
                fullWidth
                size="small"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Unit Cost (₹) *"
                type="number"
                fullWidth
                size="small"
                value={form.unitCost || ""}
                onChange={(e) => setForm({ ...form, unitCost: parseFloat(e.target.value) || 0 })}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Total Cost (₹)"
                fullWidth
                size="small"
                disabled
                value={`₹${(form.quantity * form.unitCost).toLocaleString()}`}
                sx={{ bgcolor: "#f8fafc" }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Payment Status to Vendor"
                fullWidth
                size="small"
                value={form.paymentStatus}
                onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as SupplierPaymentStatus })}
              >
                <MenuItem value="UNPAID">UNPAID (Pending)</MenuItem>
                <MenuItem value="PARTIALLY_PAID">PARTIALLY PAID</MenuItem>
                <MenuItem value="PAID">PAID (Settled)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Internal Notes"
                fullWidth
                size="small"
                placeholder="Voucher ref, confirmation code..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setOpenCostModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCostItem}
            disabled={saving}
            sx={{ bgcolor: "#2563eb", fontWeight: 600, textTransform: "none", px: 3 }}
          >
            {saving ? "Saving..." : editingItem ? "Update Cost" : "Add Cost Item"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Payout Modal */}
      <Dialog open={payoutModal} onClose={() => setPayoutModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Record Supplier Payout</DialogTitle>
        <DialogContent dividers>
          {payoutError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {payoutError}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              select
              label="Supplier / Vendor *"
              fullWidth
              size="small"
              value={payoutForm.supplierId}
              onChange={(e) => setPayoutForm({ ...payoutForm, supplierId: e.target.value })}
            >
              {suppliers.map((sup) => (
                <MenuItem key={sup.id} value={sup.id}>
                  {sup.name} {sup.upiId ? `· UPI: ${sup.upiId}` : ""}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Payout Amount (₹) *"
              type="number"
              fullWidth
              size="small"
              value={payoutForm.amount || ""}
              onChange={(e) => setPayoutForm({ ...payoutForm, amount: parseFloat(e.target.value) || 0 })}
            />

            <TextField
              select
              label="Payment Mode *"
              fullWidth
              size="small"
              value={payoutForm.mode}
              onChange={(e) => setPayoutForm({ ...payoutForm, mode: e.target.value })}
            >
              <MenuItem value="UPI">UPI / GPay / PhonePe</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</MenuItem>
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="CHEQUE">Cheque</MenuItem>
              <MenuItem value="CREDIT_CARD">Credit Card</MenuItem>
            </TextField>

            <TextField
              label="Transaction / UTR Reference"
              fullWidth
              size="small"
              placeholder="e.g. UTR 4239812498"
              value={payoutForm.reference}
              onChange={(e) => setPayoutForm({ ...payoutForm, reference: e.target.value })}
            />

            <TextField
              label="Notes"
              fullWidth
              size="small"
              value={payoutForm.notes}
              onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setPayoutModal(false)} disabled={savingPayout}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSavePayout}
            disabled={savingPayout}
            sx={{ fontWeight: 600, textTransform: "none" }}
          >
            {savingPayout ? "Saving..." : "Record Payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
