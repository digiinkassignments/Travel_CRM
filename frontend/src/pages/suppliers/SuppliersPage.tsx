import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Rating,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  Tooltip,
  CircularProgress,
  InputAdornment,
  Divider,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import DirectionsBusRoundedIcon from "@mui/icons-material/DirectionsBusRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import SportsScoreRoundedIcon from "@mui/icons-material/SportsScoreRounded";
import AssignmentIndRoundedIcon from "@mui/icons-material/AssignmentIndRounded";

import {
  fetchSuppliers,
  fetchSupplier,
  fetchPayablesSummary,
  createSupplier,
  updateSupplier,
  recordSupplierPayment,
} from "../../api/suppliers";
import { Supplier, SupplierType, PayablesSummary } from "../../types/supplier";

const SUPPLIER_TYPE_LABELS: Record<SupplierType, { label: string; color: "primary" | "secondary" | "info" | "success" | "warning" | "default"; icon: any }> = {
  HOTEL: { label: "Hotel / Resort", color: "primary", icon: HotelRoundedIcon },
  TRANSPORTER: { label: "Transporter / Cab", color: "warning", icon: DirectionsBusRoundedIcon },
  TOUR_GUIDE: { label: "Tour Guide", color: "info", icon: ExploreRoundedIcon },
  ACTIVITY_PROVIDER: { label: "Activity / Safari", color: "success", icon: SportsScoreRoundedIcon },
  VISA_AGENT: { label: "Visa / Forex", color: "secondary", icon: AssignmentIndRoundedIcon },
  OTHER: { label: "Other Vendor", color: "default", icon: StorefrontRoundedIcon },
};

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [summary, setSummary] = useState<PayablesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Form Dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: "",
    type: "HOTEL",
    contactPerson: "",
    phone: "",
    whatsapp: "",
    email: "",
    city: "",
    address: "",
    starRating: 3,
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Ledger Drawer / Dialog
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [activeSupplierLedger, setActiveSupplierLedger] = useState<any | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Payout Dialog
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutSupplier, setPayoutSupplier] = useState<Supplier | null>(null);
  const [payoutData, setPayoutData] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().slice(0, 10),
    mode: "UPI",
    reference: "",
    notes: "",
  });
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [sups, summ] = await Promise.all([
        fetchSuppliers({
          search: searchTerm || undefined,
          type: typeFilter !== "ALL" ? typeFilter : undefined,
        }),
        fetchPayablesSummary(),
      ]);
      setSuppliers(sups);
      setSummary(summ);
    } catch (err) {
      console.error("Failed to load suppliers data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [typeFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadData();
  }

  function handleOpenCreate() {
    setEditingSupplier(null);
    setFormData({
      name: "",
      type: "HOTEL",
      contactPerson: "",
      phone: "",
      whatsapp: "",
      email: "",
      city: "",
      address: "",
      starRating: 3,
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      upiId: "",
      notes: "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  function handleOpenEdit(sup: Supplier) {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      type: sup.type,
      contactPerson: sup.contactPerson || "",
      phone: sup.phone || "",
      whatsapp: sup.whatsapp || "",
      email: sup.email || "",
      city: sup.city || "",
      address: sup.address || "",
      starRating: sup.starRating || 3,
      bankName: sup.bankName || "",
      accountNumber: sup.accountNumber || "",
      ifscCode: sup.ifscCode || "",
      upiId: sup.upiId || "",
      notes: sup.notes || "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSaveSupplier() {
    if (!formData.name?.trim()) {
      setFormError("Supplier name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
      } else {
        await createSupplier(formData);
      }
      setFormOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenLedger(sup: Supplier) {
    setLoadingLedger(true);
    setLedgerOpen(true);
    try {
      const detailed = await fetchSupplier(sup.id);
      setActiveSupplierLedger(detailed);
    } catch (err) {
      console.error("Failed to load ledger", err);
    } finally {
      setLoadingLedger(false);
    }
  }

  function handleOpenPayout(sup: Supplier) {
    setPayoutSupplier(sup);
    const defaultAmount = sup.balanceDueInPaise && sup.balanceDueInPaise > 0
      ? Math.round(sup.balanceDueInPaise / 100)
      : 0;
    setPayoutData({
      amount: defaultAmount,
      paymentDate: new Date().toISOString().slice(0, 10),
      mode: sup.upiId ? "UPI" : "BANK_TRANSFER",
      reference: "",
      notes: "",
    });
    setPayoutError(null);
    setPayoutOpen(true);
  }

  async function handleSavePayout() {
    if (!payoutSupplier) return;
    if (payoutData.amount <= 0) {
      setPayoutError("Payout amount must be greater than ₹0.");
      return;
    }
    setSavingPayout(true);
    setPayoutError(null);
    try {
      await recordSupplierPayment({
        supplierId: payoutSupplier.id,
        amountInPaise: Math.round(payoutData.amount * 100),
        paymentDate: payoutData.paymentDate,
        mode: payoutData.mode,
        reference: payoutData.reference || undefined,
        notes: payoutData.notes || undefined,
      });
      setPayoutOpen(false);
      loadData();
      if (ledgerOpen && activeSupplierLedger?.id === payoutSupplier.id) {
        handleOpenLedger(payoutSupplier);
      }
    } catch (err: any) {
      setPayoutError(err.response?.data?.message || "Failed to record payout");
    } finally {
      setSavingPayout(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        mb={3.5}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.03em" }}>
              Suppliers & Costing
            </Typography>
            <Chip
              label="Vendors & Costing"
              size="small"
              icon={<StorefrontRoundedIcon style={{ fontSize: 14 }} />}
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
            Manage vendor directories, B2B purchasing costs, and track outstanding supplier payables.
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
          Add Supplier
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} mb={3.5}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <StorefrontRoundedIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase">
                Active Suppliers
              </Typography>
              <Typography variant="h5" fontWeight={700} color="#0f172a">
                {summary ? summary.supplierCount : suppliers.length}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: "#f0fdf4",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ReceiptLongRoundedIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase">
                Total B2B Billed
              </Typography>
              <Typography variant="h5" fontWeight={700} color="#0f172a">
                ₹{summary ? (summary.totalBilledInPaise / 100).toLocaleString() : "0"}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: "#f8fafc",
                color: "#0284c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircleRoundedIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase">
                Total Paid Out
              </Typography>
              <Typography variant="h5" fontWeight={700} color="#0f172a">
                ₹{summary ? (summary.totalPaidInPaise / 100).toLocaleString() : "0"}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid",
              borderColor: (summary?.totalPendingInPaise || 0) > 0 ? "#fecaca" : "#e2e8f0",
              bgcolor: (summary?.totalPendingInPaise || 0) > 0 ? "#fff1f2" : "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: (summary?.totalPendingInPaise || 0) > 0 ? "#fee2e2" : "#f1f5f9",
                color: (summary?.totalPendingInPaise || 0) > 0 ? "#dc2626" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PaymentsRoundedIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase">
                Pending Payables
              </Typography>
              <Typography
                variant="h5"
                fontWeight={700}
                color={(summary?.totalPendingInPaise || 0) > 0 ? "#b91c1c" : "#0f172a"}
              >
                ₹{summary ? (summary.totalPendingInPaise / 100).toLocaleString() : "0"}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters & Search */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
          justifyContent: "space-between",
        }}
      >
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{ display: "flex", alignItems: "center", minWidth: 280, flex: 1 }}
        >
          <TextField
            size="small"
            placeholder="Search suppliers by name, city, contact, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
            sx={{ bgcolor: "#f8fafc", borderRadius: 1.5 }}
          />
        </Box>

        {/* Category Chips */}
        <Box display="flex" gap={1} flexWrap="wrap">
          {["ALL", "HOTEL", "TRANSPORTER", "TOUR_GUIDE", "ACTIVITY_PROVIDER", "VISA_AGENT", "OTHER"].map((cat) => {
            const isSelected = typeFilter === cat;
            return (
              <Chip
                key={cat}
                label={cat === "ALL" ? "All Vendors" : SUPPLIER_TYPE_LABELS[cat as SupplierType]?.label || cat}
                onClick={() => setTypeFilter(cat)}
                variant={isSelected ? "filled" : "outlined"}
                color={isSelected ? "primary" : "default"}
                sx={{
                  fontWeight: isSelected ? 600 : 500,
                  cursor: "pointer",
                  borderRadius: 2,
                }}
              />
            );
          })}
        </Box>
      </Paper>

      {/* Suppliers Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <Box p={6} textAlign="center">
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary" mt={2}>
              Loading supplier directory...
            </Typography>
          </Box>
        ) : suppliers.length === 0 ? (
          <Box p={6} textAlign="center">
            <StorefrontRoundedIcon sx={{ fontSize: 48, color: "#94a3b8", mb: 1.5 }} />
            <Typography variant="h6" fontWeight={600} color="#334155">
              No suppliers found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {searchTerm ? "Try adjusting your search criteria" : "Get started by adding your first vendor / hotel partner."}
            </Typography>
            <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={handleOpenCreate}>
              Add Supplier
            </Button>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: "#475569" }}>Vendor Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#475569" }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#475569" }}>Contact & Location</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#475569" }}>Bank / UPI</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#475569" }} align="right">B2B Billed</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#475569" }} align="right">Paid Out</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#475569" }} align="right">Balance Due</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#475569" }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.map((sup) => {
                const typeConfig = SUPPLIER_TYPE_LABELS[sup.type] || SUPPLIER_TYPE_LABELS.OTHER;
                const TypeIcon = typeConfig.icon;
                const balanceDue = sup.balanceDueInPaise || 0;

                return (
                  <TableRow key={sup.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    {/* Name & Rating */}
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                          {sup.name}
                        </Typography>
                        {sup.starRating && (
                          <Rating value={sup.starRating} size="small" readOnly sx={{ fontSize: 14, mt: 0.25 }} />
                        )}
                        {!sup.isActive && (
                          <Chip label="Inactive" size="small" color="error" sx={{ height: 18, fontSize: 10, ml: 1 }} />
                        )}
                      </Box>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Chip
                        icon={<TypeIcon sx={{ fontSize: "16px !important" }} />}
                        label={typeConfig.label}
                        size="small"
                        color={typeConfig.color}
                        sx={{ fontWeight: 600, borderRadius: 1.5, fontSize: 11 }}
                      />
                    </TableCell>

                    {/* Contact & City */}
                    <TableCell>
                      <Box>
                        {sup.contactPerson && (
                          <Typography variant="body2" fontWeight={500} color="#1e293b">
                            {sup.contactPerson}
                          </Typography>
                        )}
                        <Box display="flex" alignItems="center" gap={1} mt={0.25}>
                          {sup.phone && (
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.3}>
                              <PhoneRoundedIcon sx={{ fontSize: 12 }} /> {sup.phone}
                            </Typography>
                          )}
                          {sup.city && (
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.3}>
                              <LocationOnRoundedIcon sx={{ fontSize: 12 }} /> {sup.city}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Bank / UPI */}
                    <TableCell>
                      {sup.upiId ? (
                        <Typography variant="caption" fontWeight={600} color="#16a34a" display="block">
                          UPI: {sup.upiId}
                        </Typography>
                      ) : sup.accountNumber ? (
                        <Typography variant="caption" color="text.secondary" display="block">
                          A/C: …{sup.accountNumber.slice(-4)} ({sup.bankName || "Bank"})
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary" fontStyle="italic">
                          Not recorded
                        </Typography>
                      )}
                    </TableCell>

                    {/* Financials */}
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color="#334155">
                        ₹{((sup.totalBilledInPaise || 0) / 100).toLocaleString()}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color="#059669">
                        ₹{((sup.totalPaidInPaise || 0) / 100).toLocaleString()}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={balanceDue > 0 ? "#dc2626" : "#475569"}
                      >
                        ₹{(balanceDue / 100).toLocaleString()}
                      </Typography>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center">
                      <Box display="flex" justifyContent="center" gap={0.5}>
                        {sup.whatsapp && (
                          <Tooltip title="Chat on WhatsApp">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                const clean = sup.whatsapp!.replace(/[^0-9]/g, "");
                                window.open(`https://wa.me/${clean}`, "_blank");
                              }}
                            >
                              <WhatsAppIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Payables Ledger & History">
                          <IconButton size="small" color="primary" onClick={() => handleOpenLedger(sup)}>
                            <ReceiptLongRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Record Payout">
                          <IconButton size="small" color="warning" onClick={() => handleOpenPayout(sup)}>
                            <PaymentsRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Edit Supplier">
                          <IconButton size="small" onClick={() => handleOpenEdit(sup)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Add / Edit Supplier Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : "Add New Supplier / Partner"}
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Supplier / Business Name *"
                fullWidth
                size="small"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Taj Lake Palace, Royal Rajasthan Cabs"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Vendor Category *"
                fullWidth
                size="small"
                value={formData.type || "HOTEL"}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as SupplierType })}
              >
                {Object.entries(SUPPLIER_TYPE_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Person"
                fullWidth
                size="small"
                value={formData.contactPerson || ""}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="e.g. Mr. Rajesh Sharma"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone Number"
                fullWidth
                size="small"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="WhatsApp Number"
                fullWidth
                size="small"
                value={formData.whatsapp || ""}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+91 98765 43210 (with country code)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email Address"
                fullWidth
                size="small"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="reservations@hotel.com"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Destination City / Region"
                fullWidth
                size="small"
                value={formData.city || ""}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Udaipur, Manali, Goa"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap={1.5} height="100%">
                <Typography variant="body2" color="text.secondary">
                  Star Rating:
                </Typography>
                <Rating
                  value={formData.starRating || 3}
                  onChange={(_, val) => setFormData({ ...formData, starRating: val || 3 })}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Full Address / Location"
                fullWidth
                size="small"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, landmarks..."
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  Banking & Settlement Details
                </Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Bank Name"
                fullWidth
                size="small"
                value={formData.bankName || ""}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="HDFC Bank / SBI"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Account Number"
                fullWidth
                size="small"
                value={formData.accountNumber || ""}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="50200012345678"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="IFSC Code"
                fullWidth
                size="small"
                value={formData.ifscCode || ""}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                placeholder="HDFC0001234"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="UPI ID"
                fullWidth
                size="small"
                value={formData.upiId || ""}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                placeholder="vendor@okhdfcbank"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Internal Notes / Terms"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Credit period, commission agreement, escalation contact..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setFormOpen(false)} color="inherit" disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSupplier}
            disabled={saving}
            sx={{ bgcolor: "#2563eb", fontWeight: 600, textTransform: "none", px: 3 }}
          >
            {saving ? "Saving..." : editingSupplier ? "Update Supplier" : "Create Supplier"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Supplier Ledger Drawer / Dialog */}
      <Dialog open={ledgerOpen} onClose={() => setLedgerOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Supplier Ledger: {activeSupplierLedger?.name}
        </DialogTitle>
        <DialogContent dividers>
          {loadingLedger || !activeSupplierLedger ? (
            <Box p={4} textAlign="center">
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Box>
              {/* Financial Balance Strip */}
              <Box
                display="flex"
                justifyContent="space-around"
                p={2}
                mb={3}
                sx={{ bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}
              >
                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary">Total Billed</Typography>
                  <Typography variant="h6" fontWeight={700}>₹{(activeSupplierLedger.totalBilledInPaise / 100).toLocaleString()}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary">Total Paid</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">₹{(activeSupplierLedger.totalPaidInPaise / 100).toLocaleString()}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary">Balance Due</Typography>
                  <Typography variant="h6" fontWeight={700} color={activeSupplierLedger.balanceDueInPaise > 0 ? "error.main" : "text.primary"}>
                    ₹{(activeSupplierLedger.balanceDueInPaise / 100).toLocaleString()}
                  </Typography>
                </Box>
              </Box>

              {/* B2B Purchase Invoices / Cost Items */}
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Booking Cost Items ({activeSupplierLedger.costItems?.length || 0})
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Booking Customer</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Total Cost</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeSupplierLedger.costItems?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No cost items linked to this supplier yet.</TableCell>
                    </TableRow>
                  ) : (
                    activeSupplierLedger.costItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{item.booking?.customer?.name || "—"}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">₹{(item.totalCostInPaise / 100).toLocaleString()}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.paymentStatus}
                            size="small"
                            color={item.paymentStatus === "PAID" ? "success" : item.paymentStatus === "PARTIALLY_PAID" ? "warning" : "error"}
                            sx={{ height: 20, fontSize: 10 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Payment History */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Payout Records ({activeSupplierLedger.payments?.length || 0})
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PaymentsRoundedIcon />}
                  onClick={() => handleOpenPayout(activeSupplierLedger)}
                >
                  Record New Payout
                </Button>
              </Box>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>Reference / UTR</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeSupplierLedger.payments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No payouts recorded yet.</TableCell>
                    </TableRow>
                  ) : (
                    activeSupplierLedger.payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#059669" }}>₹{(p.amountInPaise / 100).toLocaleString()}</TableCell>
                        <TableCell>{p.mode}</TableCell>
                        <TableCell>{p.reference || "—"}</TableCell>
                        <TableCell>{p.notes || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setLedgerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Record Payout Dialog */}
      <Dialog open={payoutOpen} onClose={() => setPayoutOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Record Supplier Payout
        </DialogTitle>
        <DialogContent dividers>
          {payoutError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {payoutError}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" mb={2}>
            Paying: <b>{payoutSupplier?.name}</b>
            {payoutSupplier?.upiId && <span> · UPI: {payoutSupplier.upiId}</span>}
          </Typography>

          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Payout Amount (₹) *"
              type="number"
              fullWidth
              size="small"
              value={payoutData.amount || ""}
              onChange={(e) => setPayoutData({ ...payoutData, amount: parseFloat(e.target.value) || 0 })}
            />

            <TextField
              label="Payment Date *"
              type="date"
              fullWidth
              size="small"
              value={payoutData.paymentDate}
              onChange={(e) => setPayoutData({ ...payoutData, paymentDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              select
              label="Payment Mode *"
              fullWidth
              size="small"
              value={payoutData.mode}
              onChange={(e) => setPayoutData({ ...payoutData, mode: e.target.value })}
            >
              <MenuItem value="UPI">UPI / GPay / PhonePe</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS / RTGS)</MenuItem>
              <MenuItem value="CASH">Cash Payout</MenuItem>
              <MenuItem value="CHEQUE">Cheque</MenuItem>
              <MenuItem value="CREDIT_CARD">Credit Card</MenuItem>
            </TextField>

            <TextField
              label="UTR / Transaction Reference"
              fullWidth
              size="small"
              placeholder="e.g. UTR 423981298412"
              value={payoutData.reference}
              onChange={(e) => setPayoutData({ ...payoutData, reference: e.target.value })}
            />

            <TextField
              label="Notes / Voucher Ref"
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="Notes for ledger..."
              value={payoutData.notes}
              onChange={(e) => setPayoutData({ ...payoutData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPayoutOpen(false)} disabled={savingPayout}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSavePayout}
            disabled={savingPayout}
            sx={{ fontWeight: 600, textTransform: "none", px: 2.5 }}
          >
            {savingPayout ? "Saving..." : "Confirm Payout"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
