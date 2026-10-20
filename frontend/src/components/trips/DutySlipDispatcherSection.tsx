import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import SpeedIcon from "@mui/icons-material/Speed";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ImageIcon from "@mui/icons-material/Image";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

import { DutySlip } from "../../types/dutySlip";
import {
  fetchTripDutySlip,
  generateTripDutySlip,
  dispatchDutySlip,
  updateTripDutySlip,
  syncDutySlipBilling,
} from "../../api/dutySlips";

interface DutySlipDispatcherSectionProps {
  tripId: string;
  trip: any;
  onTripRefresh?: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" }
> = {
  GENERATED: { label: "Draft Slip", color: "info" },
  DISPATCHED: { label: "Dispatched to Driver", color: "primary" },
  STARTED: { label: "Trip In Progress", color: "warning" },
  COMPLETED: { label: "Trip Completed", color: "success" },
  BILLED: { label: "Billed / Settled", color: "secondary" },
  CANCELLED: { label: "Cancelled", color: "error" },
};

export const DutySlipDispatcherSection: React.FC<DutySlipDispatcherSectionProps> = ({
  tripId,
  trip,
  onTripRefresh,
}) => {
  const [dutySlip, setDutySlip] = useState<DutySlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [photoModal, setPhotoModal] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: "",
    title: "",
  });

  async function loadSlip() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const slip = await fetchTripDutySlip(tripId);
      setDutySlip(slip);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setDutySlip(null);
      } else {
        setErrorMessage(err.response?.data?.message || "Failed to load duty slip");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tripId) {
      loadSlip();
    }
  }, [tripId]);

  async function handleGenerate() {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const slip = await generateTripDutySlip(tripId);
      setDutySlip(slip);
      setToastMessage("Duty slip generated successfully!");
      if (onTripRefresh) onTripRefresh();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to generate duty slip");
    } finally {
      setActionLoading(false);
    }
  }

  function getDriverMobileUrl(token: string) {
    return `${window.location.origin}/duty-slip/${token}`;
  }

  function handleCopyLink() {
    if (!dutySlip?.shareToken) return;
    const url = getDriverMobileUrl(dutySlip.shareToken);
    navigator.clipboard.writeText(url);
    setToastMessage("Driver Duty Slip link copied to clipboard!");
  }

  async function handleSendWhatsApp() {
    if (!dutySlip?.shareToken) return;
    setActionLoading(true);
    try {
      // Mark as DISPATCHED on backend if still GENERATED
      if (dutySlip.status === "GENERATED") {
        await dispatchDutySlip(tripId);
        setDutySlip({ ...dutySlip, status: "DISPATCHED" });
      }

      const driverPhone = trip.driver?.contact || trip.driver?.phone || dutySlip.driverPhone || "";
      const driverName = trip.driver?.name || dutySlip.driverName || "Driver";
      const customerName = trip.booking?.customer?.name || "Passenger";
      const customerPhone = trip.booking?.customer?.phone || "";
      const pickupLoc = trip.pickup || "Designated Location";
      const pickupTime = trip.startDate
        ? new Date(trip.startDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
        : "Scheduled Time";
      const vehicleInfo = trip.vehicle
        ? `${trip.vehicle.registrationNumber} (${trip.vehicle.vehicleType})`
        : "Assigned Cab";
      const driverLink = getDriverMobileUrl(dutySlip.shareToken);

      const messageText = `*DIGIINK CAB DISPATCH - DUTY SLIP #${dutySlip.slipNumber}*
Hello ${driverName},
You have been assigned a new cab duty:
*Trip No:* ${trip.tripNumber || dutySlip.slipNumber}
*Passenger:* ${customerName} (${customerPhone})
*Pickup:* ${pickupLoc}
*Pickup Time:* ${pickupTime}
*Cab Assigned:* ${vehicleInfo}

*DRIVER DUTY LINK:*
${driverLink}

_Please tap the link above on your phone to view passenger contact, open GPS navigation, and record your opening/closing odometer._`;

      const cleanPhone = driverPhone.replace(/[^0-9]/g, "");
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
        : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

      window.open(waUrl, "_blank");
      setToastMessage("Duty slip dispatched via WhatsApp!");
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to dispatch duty slip");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkStatus(newStatus: "BILLED" | "COMPLETED" | "CANCELLED") {
    setActionLoading(true);
    try {
      const updated = await updateTripDutySlip(tripId, { status: newStatus });
      setDutySlip(updated);
      setToastMessage(`Duty slip marked as ${newStatus}`);
      if (onTripRefresh) onTripRefresh();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSyncBilling() {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const result = await syncDutySlipBilling(tripId);
      setDutySlip(result.dutySlip);
      setToastMessage(
        `Expenses (₹${result.totalRecoverableInRupees}) and ${result.totalKm} KM logged to Booking invoice notes!`
      );
      if (onTripRefresh) onTripRefresh();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to sync billing to booking invoice");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 3, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress size={30} sx={{ mr: 2 }} />
        <Typography color="text.secondary">Loading Duty Slip status...</Typography>
      </Paper>
    );
  }

  // If no slip exists yet
  if (!dutySlip) {
    return (
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: "1px dashed #cbd5e1" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <SpeedIcon color="primary" fontSize="large" />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Driver Mobile Duty Slip & Dispatch
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate a live mobile duty slip with odometer tracking, on-trip expense recording, and digital customer signature.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerate}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={18} color="inherit" /> : <ReceiptLongIcon />}
            sx={{ px: 3, py: 1, textTransform: "none", fontWeight: "bold" }}
          >
            Generate Duty Slip
          </Button>
        </Box>
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage}
          </Alert>
        )}
      </Paper>
    );
  }

  const statusInfo = STATUS_CONFIG[dutySlip.status] || { label: dutySlip.status, color: "default" };
  const totalExpensesPaise =
    (dutySlip.tollChargesInPaise || 0) +
    (dutySlip.parkingChargesInPaise || 0) +
    (dutySlip.stateTaxInPaise || 0) +
    (dutySlip.fuelChargesInPaise || 0) +
    (dutySlip.driverAllowanceInPaise || 0) +
    (dutySlip.otherChargesInPaise || 0);

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: "1px solid #e2e8f0" }}>
      {/* Top Header Row */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <ReceiptLongIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                Duty Slip #{dutySlip.slipNumber}
              </Typography>
              <Chip
                label={statusInfo.label}
                color={statusInfo.color}
                size="small"
                sx={{ fontWeight: "bold" }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Created on {new Date(dutySlip.createdAt).toLocaleString()} | Assigned Cab:{" "}
              <strong>{dutySlip.vehicleNumber || "Unassigned"}</strong>
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<WhatsAppIcon />}
            onClick={handleSendWhatsApp}
            disabled={actionLoading}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            WhatsApp to Driver
          </Button>

          <Tooltip title="Copy Driver Link">
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyLink}
              sx={{ textTransform: "none" }}
            >
              Copy Link
            </Button>
          </Tooltip>

          <Tooltip title="Open Driver Mobile PWA">
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open(getDriverMobileUrl(dutySlip.shareToken), "_blank")}
              sx={{ textTransform: "none" }}
            >
              Driver View
            </Button>
          </Tooltip>

          <Button
            variant="outlined"
            size="small"
            color="secondary"
            startIcon={<PrintIcon />}
            onClick={() => setPrintModalOpen(true)}
            sx={{ textTransform: "none" }}
          >
            Print Duty Slip
          </Button>

          <Tooltip title="Sync with latest Trip details">
            <IconButton size="small" onClick={handleGenerate} disabled={actionLoading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Odometer & Duty Metrics Grid */}
      <Grid container spacing={2}>
        {/* Metric 1: Start Odometer */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
                Opening Odometer
              </Typography>
              {dutySlip.startOdoPhotoUrl && (
                <Tooltip title="View Opening Meter Photo Proof">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() =>
                      setPhotoModal({
                        open: true,
                        url: dutySlip.startOdoPhotoUrl!,
                        title: `Opening Meter Photo (${dutySlip.startOdometer} KM)`,
                      })
                    }
                    sx={{ p: 0.5, border: "1px solid #cbd5e1" }}
                  >
                    <PhotoCameraIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Typography variant="h5" fontWeight="bold" color="primary.main" sx={{ mt: 0.5 }}>
              {dutySlip.startOdometer !== null ? `${dutySlip.startOdometer} KM` : "Not Started"}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {dutySlip.startTime
                ? new Date(dutySlip.startTime).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                : "Awaiting driver start"}
            </Typography>
            {dutySlip.startOdoPhotoUrl && (
              <Button
                size="small"
                variant="text"
                startIcon={<PhotoCameraIcon sx={{ fontSize: 14 }} />}
                onClick={() =>
                  setPhotoModal({
                    open: true,
                    url: dutySlip.startOdoPhotoUrl!,
                    title: `Opening Meter Photo (${dutySlip.startOdometer} KM)`,
                  })
                }
                sx={{ mt: 0.5, p: 0, textTransform: "none", fontSize: "0.72rem" }}
              >
                View Meter Photo
              </Button>
            )}
          </Box>
        </Grid>

        {/* Metric 2: End Odometer */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
                Closing Odometer
              </Typography>
              {dutySlip.endOdoPhotoUrl && (
                <Tooltip title="View Closing Meter Photo Proof">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() =>
                      setPhotoModal({
                        open: true,
                        url: dutySlip.endOdoPhotoUrl!,
                        title: `Closing Meter Photo (${dutySlip.endOdometer} KM)`,
                      })
                    }
                    sx={{ p: 0.5, border: "1px solid #cbd5e1" }}
                  >
                    <PhotoCameraIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              color={dutySlip.endOdometer !== null ? "success.main" : "text.secondary"}
              sx={{ mt: 0.5 }}
            >
              {dutySlip.endOdometer !== null ? `${dutySlip.endOdometer} KM` : "In Progress"}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {dutySlip.endTime
                ? new Date(dutySlip.endTime).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                : "Active on duty"}
            </Typography>
            {dutySlip.endOdoPhotoUrl && (
              <Button
                size="small"
                variant="text"
                color="success"
                startIcon={<PhotoCameraIcon sx={{ fontSize: 14 }} />}
                onClick={() =>
                  setPhotoModal({
                    open: true,
                    url: dutySlip.endOdoPhotoUrl!,
                    title: `Closing Meter Photo (${dutySlip.endOdometer} KM)`,
                  })
                }
                sx={{ mt: 0.5, p: 0, textTransform: "none", fontSize: "0.72rem" }}
              >
                View Meter Photo
              </Button>
            )}
          </Box>
        </Grid>

        {/* Metric 3: Total Running KM */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
              Total Billable KM
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="text.primary" sx={{ mt: 0.5 }}>
              {dutySlip.totalKm !== null ? `${dutySlip.totalKm} KM` : "--"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {dutySlip.totalHours !== null ? `Duration: ${dutySlip.totalHours} hrs` : "Running..."}
            </Typography>
          </Box>
        </Grid>

        {/* Metric 4: On-Trip Expenses */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
              On-Trip Expenses
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="warning.dark" sx={{ mt: 0.5 }}>
              ₹{(totalExpensesPaise / 100).toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Toll: ₹{((dutySlip.tollChargesInPaise || 0) / 100).toFixed(0)} | Park: ₹
              {((dutySlip.parkingChargesInPaise || 0) / 100).toFixed(0)} | Fuel: ₹
              {((dutySlip.fuelChargesInPaise || 0) / 100).toFixed(0)}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Itemized Expenses & Customer Verification (if available) */}
      {((dutySlip.expenses && dutySlip.expenses.length > 0) || dutySlip.customerSignature) && (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Expenses Table */}
          {dutySlip.expenses && dutySlip.expenses.length > 0 && (
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                Driver Logged Expenses ({dutySlip.expenses.length})
              </Typography>
              <TableContainer sx={{ border: "1px solid #e2e8f0", borderRadius: 1 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Receipt</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Amount (₹)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dutySlip.expenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>
                          <Chip label={exp.expenseType} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{exp.notes || "-"}</TableCell>
                        <TableCell>
                          {exp.receiptUrl ? (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ImageIcon sx={{ fontSize: 13 }} />}
                              onClick={() =>
                                setPhotoModal({
                                  open: true,
                                  url: exp.receiptUrl!,
                                  title: `${exp.expenseType} Receipt (₹${(exp.amountInPaise / 100).toFixed(2)})`,
                                })
                              }
                              sx={{ textTransform: "none", fontSize: "0.72rem", py: "1px", px: 0.8 }}
                            >
                              Proof
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              None
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>
                          ₹{(exp.amountInPaise / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                      <TableCell colSpan={3} sx={{ fontWeight: "bold" }}>
                        Total Expenses
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", color: "warning.dark" }}>
                        ₹{(totalExpensesPaise / 100).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          )}

          {/* Customer Signature & Rating */}
          {dutySlip.customerSignature && (
            <Grid item xs={12} md={dutySlip.expenses && dutySlip.expenses.length > 0 ? 5 : 12}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                Passenger Digital Verification
              </Typography>
              <Box
                sx={{
                  p: 2,
                  border: "1px solid #e2e8f0",
                  borderRadius: 1.5,
                  bgcolor: "#f8fafc",
                  textAlign: "center",
                }}
              >
                {dutySlip.customerRating && (
                  <Box sx={{ mb: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
                    <Rating value={dutySlip.customerRating} readOnly size="small" />
                    <Typography variant="body2" fontWeight="bold">
                      ({dutySlip.customerRating} / 5)
                    </Typography>
                  </Box>
                )}
                {dutySlip.customerFeedback && (
                  <Typography variant="body2" sx={{ fontStyle: "italic", mb: 1.5, color: "text.secondary" }}>
                    "{dutySlip.customerFeedback}"
                  </Typography>
                )}
                <Box
                  component="img"
                  src={dutySlip.customerSignature}
                  alt="Customer Signature"
                  sx={{
                    maxHeight: 90,
                    maxWidth: "100%",
                    bgcolor: "#ffffff",
                    p: 1,
                    border: "1px dashed #cbd5e1",
                    borderRadius: 1,
                  }}
                />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                  Signed by Passenger on Driver Mobile
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* Quick Status Transition Bar */}
      <Box sx={{ mt: 2.5, display: "flex", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        {(dutySlip.status === "COMPLETED" || dutySlip.status === "BILLED" || totalExpensesPaise > 0) && (
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleSyncBilling}
            disabled={actionLoading}
            startIcon={<AccountBalanceWalletIcon />}
            sx={{ textTransform: "none", fontWeight: "bold" }}
          >
            Sync Expenses & Billing to Invoice
          </Button>
        )}
        {dutySlip.status === "COMPLETED" && (
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() => handleMarkStatus("BILLED")}
            disabled={actionLoading}
            startIcon={<CheckCircleOutlineIcon />}
            sx={{ textTransform: "none" }}
          >
            Mark as Billed / Settled
          </Button>
        )}
        {dutySlip.status !== "CANCELLED" && dutySlip.status !== "BILLED" && (
          <Button
            variant="text"
            color="error"
            size="small"
            onClick={() => handleMarkStatus("CANCELLED")}
            disabled={actionLoading}
            sx={{ textTransform: "none" }}
          >
            Cancel Duty Slip
          </Button>
        )}
      </Box>

      {/* PRINTABLE DUTY SLIP MODAL */}
      <Dialog
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Print Duty Slip #{dutySlip.slipNumber}</span>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ textTransform: "none" }}
          >
            Print Sheet
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Box
            id="printable-duty-slip"
            sx={{
              p: 3,
              fontFamily: "Roboto, Arial, sans-serif",
              color: "#1e293b",
              backgroundColor: "#fff",
            }}
          >
            {/* Printable Header */}
            <Box
              sx={{
                borderBottom: "2px solid #0f172a",
                pb: 2,
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="h5" fontWeight="900" textTransform="uppercase" letterSpacing={1}>
                  CAR RENTAL & CAB DUTY SLIP
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Digiink Travel CRM & Dispatch Services
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  SLIP #{dutySlip.slipNumber}
                </Typography>
                <Typography variant="body2">
                  Date: {new Date(dutySlip.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>

            {/* Trip Information Grid */}
            <TableContainer sx={{ mb: 2, border: "1px solid #cbd5e1" }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", width: "25%" }}>Passenger Name</TableCell>
                    <TableCell sx={{ width: "25%" }}>{trip.booking?.customer?.name || "Client"}</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold", width: "25%" }}>Contact Phone</TableCell>
                    <TableCell sx={{ width: "25%" }}>{trip.booking?.customer?.phone || "--"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Driver Name</TableCell>
                    <TableCell>{dutySlip.driverName || "Assigned Driver"}</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Driver Phone</TableCell>
                    <TableCell>{dutySlip.driverPhone || "--"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Vehicle Reg No</TableCell>
                    <TableCell>{dutySlip.vehicleNumber || "--"}</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Vehicle Model</TableCell>
                    <TableCell>{dutySlip.vehicleModel || "--"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Pickup Point</TableCell>
                    <TableCell>{trip.pickup || "--"}</TableCell>
                    <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: "bold" }}>Drop Point</TableCell>
                    <TableCell>{trip.drop || "--"}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Odometer & Timing Table */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, textTransform: "uppercase" }}>
              Odometer Readings & Timings
            </Typography>
            <TableContainer sx={{ mb: 2, border: "1px solid #cbd5e1" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Stage</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Date & Time</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      Odometer (KM)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Trip Start (Opening)</TableCell>
                    <TableCell>
                      {dutySlip.startTime ? new Date(dutySlip.startTime).toLocaleString() : "--"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      {dutySlip.startOdometer !== null ? `${dutySlip.startOdometer} KM` : "--"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Trip Complete (Closing)</TableCell>
                    <TableCell>
                      {dutySlip.endTime ? new Date(dutySlip.endTime).toLocaleString() : "--"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      {dutySlip.endOdometer !== null ? `${dutySlip.endOdometer} KM` : "--"}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>Total Billable</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Duration: {dutySlip.totalHours ? `${dutySlip.totalHours} hrs` : "--"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "1.05rem", color: "primary.main" }}>
                      {dutySlip.totalKm !== null ? `${dutySlip.totalKm} KM` : "--"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Expenses Breakdown */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, textTransform: "uppercase" }}>
              Toll, Parking & Additional Charges
            </Typography>
            <TableContainer sx={{ mb: 2, border: "1px solid #cbd5e1" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Toll Tax</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Parking</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>State Entry Tax</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Fuel</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      Total Expenses (₹)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>₹{((dutySlip.tollChargesInPaise || 0) / 100).toFixed(2)}</TableCell>
                    <TableCell>₹{((dutySlip.parkingChargesInPaise || 0) / 100).toFixed(2)}</TableCell>
                    <TableCell>₹{((dutySlip.stateTaxInPaise || 0) / 100).toFixed(2)}</TableCell>
                    <TableCell>₹{((dutySlip.fuelChargesInPaise || 0) / 100).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      ₹{(totalExpensesPaise / 100).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Signature & Verification Block */}
            <Box
              sx={{
                mt: 3,
                pt: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <Box sx={{ textAlign: "center", width: "40%" }}>
                <Box sx={{ height: 60, borderBottom: "1px solid #94a3b8", mb: 1 }} />
                <Typography variant="caption" fontWeight="bold">
                  DRIVER SIGNATURE
                </Typography>
              </Box>

              <Box sx={{ textAlign: "center", width: "40%" }}>
                <Box
                  sx={{
                    height: 60,
                    borderBottom: "1px solid #94a3b8",
                    mb: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {dutySlip.customerSignature ? (
                    <Box
                      component="img"
                      src={dutySlip.customerSignature}
                      alt="Customer Signature"
                      sx={{ maxHeight: 55, maxWidth: "100%" }}
                    />
                  ) : null}
                </Box>
                <Typography variant="caption" fontWeight="bold">
                  PASSENGER SIGNATURE & VERIFICATION
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintModalOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* PHOTO ZOOM / PROOF MODAL */}
      <Dialog
        open={photoModal.open}
        onClose={() => setPhotoModal({ open: false, url: "", title: "" })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {photoModal.title}
          </Typography>
          <Button
            size="small"
            onClick={() => setPhotoModal({ open: false, url: "", title: "" })}
            sx={{ minWidth: "auto", p: 0.5 }}
          >
            &times;
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ textAlign: "center", p: 2, bgcolor: "#0f172a" }}>
          {photoModal.url && (
            <Box
              component="img"
              src={photoModal.url}
              alt={photoModal.title}
              sx={{
                maxWidth: "100%",
                maxHeight: "65vh",
                objectFit: "contain",
                borderRadius: 1.5,
                boxShadow: 3,
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 2 }}>
          <Button
            startIcon={<OpenInNewIcon />}
            onClick={() => window.open(photoModal.url, "_blank")}
            sx={{ textTransform: "none" }}
          >
            Open in New Tab
          </Button>
          <Button
            variant="contained"
            onClick={() => setPhotoModal({ open: false, url: "", title: "" })}
            sx={{ textTransform: "none" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notification */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        message={toastMessage}
      />
    </Paper>
  );
};
