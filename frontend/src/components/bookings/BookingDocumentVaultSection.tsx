import React, { useState, useEffect, useRef } from "react";
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
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardMedia,
  CardContent,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PrintIcon from "@mui/icons-material/Print";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BadgeIcon from "@mui/icons-material/Badge";
import CloseIcon from "@mui/icons-material/Close";
import FolderSharedIcon from "@mui/icons-material/FolderShared";

import {
  BookingVaultData,
  BookingTraveler,
  BookingDocument,
  DocumentCategory,
  DOCUMENT_CATEGORY_LABELS,
} from "../../types/documentVault";
import {
  fetchBookingVault,
  addBookingTraveler,
  updateBookingTraveler,
  deleteBookingTraveler,
  uploadBookingDocument,
  verifyBookingDocument,
  deleteBookingDocument,
} from "../../api/documentVault";

interface BookingDocumentVaultSectionProps {
  bookingId: string;
  booking: any;
  onRefresh?: () => void;
}

export const BookingDocumentVaultSection: React.FC<BookingDocumentVaultSectionProps> = ({
  bookingId,
  booking,
  onRefresh,
}) => {
  const [vaultData, setVaultData] = useState<BookingVaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Traveler Modal
  const [travelerModalOpen, setTravelerModalOpen] = useState(false);
  const [editingTravelerId, setEditingTravelerId] = useState<string | null>(null);
  const [travelerForm, setTravelerForm] = useState({
    fullName: "",
    travelerType: "ADULT",
    gender: "MALE",
    dateOfBirth: "",
    nationality: "Indian",
    passportNumber: "",
    passportExpiry: "",
    idType: "AADHAAR",
    idNumber: "",
    foodPreference: "Veg",
    specialRequests: "",
    isLeadPassenger: false,
  });

  // Staff Upload Document Modal
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    category: "PASSPORT_FRONT" as DocumentCategory,
    travelerId: "",
    notes: "",
    fileBase64: "",
    fileName: "",
    fileType: "",
  });
  const staffFileInputRef = useRef<HTMLInputElement>(null);

  // Reject Document Dialog
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<BookingDocument | null>(null);

  // Printable Manifest Modal
  const [manifestPrintOpen, setManifestPrintOpen] = useState(false);

  async function loadVault() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchBookingVault(bookingId);
      setVaultData(data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to load document vault");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (bookingId) {
      loadVault();
    }
  }, [bookingId]);

  function getGuestUploadUrl(token: string) {
    return `${window.location.origin}/upload-docs/${token}`;
  }

  function handleCopyLink() {
    if (!vaultData?.booking.docShareToken) return;
    const url = getGuestUploadUrl(vaultData.booking.docShareToken);
    navigator.clipboard.writeText(url);
    setToastMessage("Guest upload link copied to clipboard!");
  }

  function handleWhatsAppRequest() {
    if (!vaultData?.booking.docShareToken) return;
    const customerPhone = booking.customer?.phone || "";
    const customerName = booking.customer?.name || "Traveler";
    const travelDate = booking.travelStart
      ? new Date(booking.travelStart).toLocaleDateString([], { dateStyle: "medium" })
      : "Upcoming";
    const uploadUrl = getGuestUploadUrl(vaultData.booking.docShareToken);

    const text = `*DIGIINK TRAVEL - ID PROOFS & TRAVEL DOCUMENT REQUEST*
Hello ${customerName},
To confirm hotel vouchers, airline tickets, and permits for your upcoming travel starting on *${travelDate}*, kindly upload your government ID proofs (Passport / Aadhaar) for all traveling guests.

*SECURE UPLOAD PORTAL LINK:*
${uploadUrl}

_You can easily snap photos directly from your mobile camera using the link above. All files are encrypted and confidential._`;

    const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(waUrl, "_blank");
    setToastMessage("WhatsApp request opened!");
  }

  // --- Traveler CRUD Handlers ---
  function openAddTraveler() {
    setEditingTravelerId(null);
    setTravelerForm({
      fullName: "",
      travelerType: "ADULT",
      gender: "MALE",
      dateOfBirth: "",
      nationality: "Indian",
      passportNumber: "",
      passportExpiry: "",
      idType: "AADHAAR",
      idNumber: "",
      foodPreference: "Veg",
      specialRequests: "",
      isLeadPassenger: (vaultData?.travelers.length || 0) === 0,
    });
    setTravelerModalOpen(true);
  }

  function openEditTraveler(t: BookingTraveler) {
    setEditingTravelerId(t.id);
    setTravelerForm({
      fullName: t.fullName,
      travelerType: t.travelerType,
      gender: t.gender,
      dateOfBirth: t.dateOfBirth ? t.dateOfBirth.split("T")[0] : "",
      nationality: t.nationality || "Indian",
      passportNumber: t.passportNumber || "",
      passportExpiry: t.passportExpiry ? t.passportExpiry.split("T")[0] : "",
      idType: t.idType || "AADHAAR",
      idNumber: t.idNumber || "",
      foodPreference: t.foodPreference || "",
      specialRequests: t.specialRequests || "",
      isLeadPassenger: t.isLeadPassenger,
    });
    setTravelerModalOpen(true);
  }

  async function handleSaveTraveler() {
    if (!travelerForm.fullName.trim()) return;
    setActionLoading(true);
    try {
      const payload = {
        fullName: travelerForm.fullName.trim(),
        travelerType: travelerForm.travelerType as any,
        gender: travelerForm.gender as any,
        dateOfBirth: travelerForm.dateOfBirth || undefined,
        nationality: travelerForm.nationality.trim(),
        passportNumber: travelerForm.passportNumber.trim() || undefined,
        passportExpiry: travelerForm.passportExpiry || undefined,
        idType: travelerForm.idType.trim() || undefined,
        idNumber: travelerForm.idNumber.trim() || undefined,
        foodPreference: travelerForm.foodPreference.trim() || undefined,
        specialRequests: travelerForm.specialRequests.trim() || undefined,
        isLeadPassenger: travelerForm.isLeadPassenger,
      };

      if (editingTravelerId) {
        await updateBookingTraveler(bookingId, editingTravelerId, payload);
        setToastMessage("Traveler updated successfully");
      } else {
        await addBookingTraveler(bookingId, payload);
        setToastMessage("Traveler added to manifest");
      }
      setTravelerModalOpen(false);
      loadVault();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to save traveler");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteTraveler(travelerId: string) {
    if (!window.confirm("Are you sure you want to remove this traveler from the manifest?")) return;
    setActionLoading(true);
    try {
      await deleteBookingTraveler(bookingId, travelerId);
      setToastMessage("Traveler removed");
      loadVault();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to delete traveler");
    } finally {
      setActionLoading(false);
    }
  }

  // --- Document Verification & Upload Handlers ---
  async function handleVerify(docId: string) {
    setActionLoading(true);
    try {
      await verifyBookingDocument(bookingId, docId, "VERIFIED");
      setToastMessage("Document verified & approved!");
      loadVault();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to verify document");
    } finally {
      setActionLoading(false);
    }
  }

  function openRejectModal(docId: string) {
    setRejectingDocId(docId);
    setRejectionReason("Blurry photo / details unreadable. Please re-upload a clear copy.");
    setRejectModalOpen(true);
  }

  async function handleConfirmReject() {
    if (!rejectingDocId) return;
    setActionLoading(true);
    try {
      await verifyBookingDocument(bookingId, rejectingDocId, "REJECTED", rejectionReason);
      setToastMessage("Document marked as rejected with feedback");
      setRejectModalOpen(false);
      loadVault();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to reject document");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    setActionLoading(true);
    try {
      await deleteBookingDocument(bookingId, docId);
      setToastMessage("Document deleted");
      loadVault();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to delete document");
    } finally {
      setActionLoading(false);
    }
  }

  // Staff File Picker
  function handleStaffFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadForm((prev) => ({
      ...prev,
      fileName: file.name,
      fileType: file.type,
      title: prev.title || file.name.split(".")[0],
    }));

    const reader = new FileReader();
    reader.onload = () => {
      setUploadForm((prev) => ({ ...prev, fileBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  async function handleStaffUploadSubmit() {
    if (!uploadForm.fileBase64) return;
    setActionLoading(true);
    try {
      await uploadBookingDocument(bookingId, {
        title: uploadForm.title || DOCUMENT_CATEGORY_LABELS[uploadForm.category],
        category: uploadForm.category,
        travelerId: uploadForm.travelerId || undefined,
        fileUrl: uploadForm.fileBase64,
        fileType: uploadForm.fileType,
        notes: uploadForm.notes,
      });

      setToastMessage("Document uploaded successfully");
      setUploadDocModalOpen(false);
      setUploadForm({
        title: "",
        category: "PASSPORT_FRONT",
        travelerId: "",
        notes: "",
        fileBase64: "",
        fileName: "",
        fileType: "",
      });
      loadVault();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to upload document");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 3, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress size={28} sx={{ mr: 2 }} />
        <Typography color="text.secondary">Loading Traveler Manifest & Document Vault...</Typography>
      </Paper>
    );
  }

  if (!vaultData) {
    return null;
  }

  const { travelers, documents } = vaultData;
  const verifiedCount = documents.filter((d) => d.verificationStatus === "VERIFIED").length;
  const pendingCount = documents.filter((d) => d.verificationStatus === "PENDING").length;
  const rejectedCount = documents.filter((d) => d.verificationStatus === "REJECTED").length;
  const expiryWarningsCount = travelers.filter(
    (t) => t.passportWarning === "EXPIRING_SOON" || t.passportWarning === "EXPIRED"
  ).length;

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
          <FolderSharedIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                Passenger Manifest & Document Vault
              </Typography>
              {expiryWarningsCount > 0 && (
                <Chip
                  label={`${expiryWarningsCount} Passport Expiry Alert!`}
                  color="error"
                  size="small"
                  icon={<WarningAmberIcon />}
                  sx={{ fontWeight: "bold" }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              ID proof collection, passport 6-month validity checks, and travel permits for hotel & airline ticketing.
            </Typography>
          </Box>
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<WhatsAppIcon />}
            onClick={handleWhatsAppRequest}
            disabled={actionLoading}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            WhatsApp Upload Request
          </Button>

          <Tooltip title="Copy guest mobile upload link">
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

          <Tooltip title="Open guest upload view">
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open(getGuestUploadUrl(vaultData.booking.docShareToken), "_blank")}
              sx={{ textTransform: "none" }}
            >
              Guest Portal
            </Button>
          </Tooltip>

          <Button
            variant="outlined"
            size="small"
            color="secondary"
            startIcon={<PrintIcon />}
            onClick={() => setManifestPrintOpen(true)}
            sx={{ textTransform: "none" }}
          >
            Print Manifest
          </Button>

          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<PersonAddIcon />}
            onClick={openAddTraveler}
            sx={{ textTransform: "none" }}
          >
            + Add Traveler
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<CloudUploadIcon />}
            onClick={() => setUploadDocModalOpen(true)}
            sx={{ textTransform: "none" }}
          >
            Upload Doc
          </Button>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* KPI Stats Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
              Total Travelers
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary.main" sx={{ mt: 0.5 }}>
              {travelers.length} Pax
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {travelers.filter((t) => t.travelerType === "ADULT").length} Adults |{" "}
              {travelers.filter((t) => t.travelerType === "CHILD").length} Children
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
              Verified Documents
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="success.main" sx={{ mt: 0.5 }}>
              {verifiedCount} Approved
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Uploaded: {documents.length}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
              Pending Review
            </Typography>
            <Typography variant="h5" fontWeight="bold" color={pendingCount > 0 ? "warning.dark" : "text.secondary"} sx={{ mt: 0.5 }}>
              {pendingCount} Awaiting
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {rejectedCount > 0 ? `${rejectedCount} Action Needed` : "All checked"}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
              Passport Compliance
            </Typography>
            <Typography
              variant="h5"
              fontWeight="bold"
              color={expiryWarningsCount > 0 ? "error.main" : "success.main"}
              sx={{ mt: 0.5 }}
            >
              {expiryWarningsCount > 0 ? `${expiryWarningsCount} Warnings` : "100% Valid"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Strict 6-month validity check
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* TRAVELER MANIFEST TABLE */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
        Passenger Manifest Roster
      </Typography>
      <TableContainer sx={{ border: "1px solid #e2e8f0", borderRadius: 1.5, mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "#f1f5f9" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Passenger Name</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Type & Gender</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>DOB / Age</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Passport & Expiry</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Govt ID (Aadhaar/PAN)</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Diet / Requests</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {travelers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
                  No travelers added to manifest yet. Click "+ Add Traveler" or share the WhatsApp upload link.
                </TableCell>
              </TableRow>
            ) : (
              travelers.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {t.fullName}
                      </Typography>
                      {t.isLeadPassenger && (
                        <Chip label="Lead" size="small" color="primary" sx={{ height: 20, fontSize: "0.65rem" }} />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Nationality: {t.nationality || "Indian"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">{t.travelerType}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.gender}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {t.dateOfBirth ? new Date(t.dateOfBirth).toLocaleDateString() : "--"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {t.passportNumber ? (
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {t.passportNumber}
                        </Typography>
                        {t.passportExpiry && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3 }}>
                            <Typography variant="caption">Exp: {t.passportExpiry.split("T")[0]}</Typography>
                            {t.passportWarning === "EXPIRING_SOON" && (
                              <Tooltip title="Passport expires within 6 months of travel date!">
                                <Chip label="< 6 Mos" size="small" color="warning" sx={{ height: 18, fontSize: "0.6rem" }} />
                              </Tooltip>
                            )}
                            {t.passportWarning === "EXPIRED" && (
                              <Tooltip title="Passport is already expired!">
                                <Chip label="EXPIRED" size="small" color="error" sx={{ height: 18, fontSize: "0.6rem" }} />
                              </Tooltip>
                            )}
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Not provided
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    {t.idNumber ? (
                      <Typography variant="body2">{t.idNumber}</Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        --
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">{t.foodPreference || "--"}</Typography>
                    {t.specialRequests && (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 140 }}>
                        {t.specialRequests}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditTraveler(t)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteTraveler(t.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DOCUMENT VAULT GALLERY */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
        Document Vault & Verification Desk ({documents.length})
      </Typography>

      {documents.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4, bgcolor: "#f8fafc", borderRadius: 2, border: "1px dashed #cbd5e1" }}>
          <BadgeIcon sx={{ fontSize: 44, color: "#94a3b8", mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No documents uploaded yet. Send the WhatsApp request link to the client or click "+ Upload Doc".
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card sx={{ border: "1px solid #e2e8f0", borderRadius: 2, boxShadow: "none" }}>
                {doc.fileType?.startsWith("image/") ? (
                  <CardMedia
                    component="img"
                    height="140"
                    image={doc.fileUrl}
                    alt={doc.title}
                    onClick={() => setPreviewDoc(doc)}
                    sx={{ cursor: "pointer", objectFit: "cover" }}
                  />
                ) : (
                  <Box
                    onClick={() => setPreviewDoc(doc)}
                    sx={{
                      height: 100,
                      bgcolor: "#f1f5f9",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                      gap: 0.5,
                    }}
                  >
                    <BadgeIcon color="primary" />
                    <Typography variant="caption" fontWeight="bold">
                      Click to View Document
                    </Typography>
                  </Box>
                )}

                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ maxWidth: "60%" }}>
                      {doc.title}
                    </Typography>

                    {doc.verificationStatus === "VERIFIED" && (
                      <Chip label="Verified" color="success" size="small" />
                    )}
                    {doc.verificationStatus === "PENDING" && (
                      <Chip label="Pending" color="warning" size="small" />
                    )}
                    {doc.verificationStatus === "REJECTED" && (
                      <Chip label="Rejected" color="error" size="small" />
                    )}
                  </Box>

                  <Typography variant="caption" display="block" color="text.secondary">
                    {DOCUMENT_CATEGORY_LABELS[doc.category] || doc.category}
                  </Typography>

                  {doc.traveler && (
                    <Typography variant="caption" display="block" color="primary.main" fontWeight="bold" sx={{ mt: 0.5 }}>
                      Passenger: {doc.traveler.fullName}
                    </Typography>
                  )}

                  {doc.rejectionReason && (
                    <Alert severity="error" sx={{ mt: 1, py: 0.5, fontSize: "0.75rem" }}>
                      {doc.rejectionReason}
                    </Alert>
                  )}

                  {/* Verification & Management Buttons */}
                  <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {doc.verificationStatus !== "VERIFIED" && (
                        <Tooltip title="Approve / Verify Document">
                          <IconButton size="small" color="success" onClick={() => handleVerify(doc.id)} disabled={actionLoading}>
                            <CheckCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {doc.verificationStatus !== "REJECTED" && (
                        <Tooltip title="Reject with Feedback Note">
                          <IconButton size="small" color="error" onClick={() => openRejectModal(doc.id)} disabled={actionLoading}>
                            <HighlightOffIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Button size="small" onClick={() => setPreviewDoc(doc)} sx={{ textTransform: "none", fontSize: "0.75rem" }}>
                        View
                      </Button>
                      <IconButton size="small" color="default" onClick={() => handleDeleteDocument(doc.id)} disabled={actionLoading}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* TRAVELER ADD / EDIT DIALOG */}
      <Dialog open={travelerModalOpen} onClose={() => setTravelerModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {editingTravelerId ? "Edit Passenger Details" : "Add Traveler to Manifest"}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Full Name (as in Passport / Govt ID)"
              fullWidth
              size="small"
              required
              value={travelerForm.fullName}
              onChange={(e) => setTravelerForm({ ...travelerForm, fullName: e.target.value })}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    label="Category"
                    value={travelerForm.travelerType}
                    onChange={(e) => setTravelerForm({ ...travelerForm, travelerType: e.target.value })}
                  >
                    <MenuItem value="ADULT">Adult (12+ yrs)</MenuItem>
                    <MenuItem value="CHILD">Child (2-11 yrs)</MenuItem>
                    <MenuItem value="INFANT">Infant (&lt;2 yrs)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Gender</InputLabel>
                  <Select
                    label="Gender"
                    value={travelerForm.gender}
                    onChange={(e) => setTravelerForm({ ...travelerForm, gender: e.target.value })}
                  >
                    <MenuItem value="MALE">Male</MenuItem>
                    <MenuItem value="FEMALE">Female</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Date of Birth"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={travelerForm.dateOfBirth}
                  onChange={(e) => setTravelerForm({ ...travelerForm, dateOfBirth: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Nationality"
                  fullWidth
                  size="small"
                  value={travelerForm.nationality}
                  onChange={(e) => setTravelerForm({ ...travelerForm, nationality: e.target.value })}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Passport Number"
                  fullWidth
                  size="small"
                  placeholder="e.g. Z1234567"
                  value={travelerForm.passportNumber}
                  onChange={(e) => setTravelerForm({ ...travelerForm, passportNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Passport Expiry Date"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={travelerForm.passportExpiry}
                  onChange={(e) => setTravelerForm({ ...travelerForm, passportExpiry: e.target.value })}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Govt ID Type"
                  fullWidth
                  size="small"
                  value={travelerForm.idType}
                  onChange={(e) => setTravelerForm({ ...travelerForm, idType: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="ID Number (Aadhaar/PAN)"
                  fullWidth
                  size="small"
                  value={travelerForm.idNumber}
                  onChange={(e) => setTravelerForm({ ...travelerForm, idNumber: e.target.value })}
                />
              </Grid>
            </Grid>

            <TextField
              label="Dietary / Meal Preference"
              fullWidth
              size="small"
              placeholder="e.g. Vegetarian, Jain, Halal, Gluten-free"
              value={travelerForm.foodPreference}
              onChange={(e) => setTravelerForm({ ...travelerForm, foodPreference: e.target.value })}
            />

            <TextField
              label="Special Assistance / Requests"
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="e.g. Wheelchair assistance at airport, high floor room"
              value={travelerForm.specialRequests}
              onChange={(e) => setTravelerForm({ ...travelerForm, specialRequests: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTravelerModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveTraveler}
            disabled={!travelerForm.fullName.trim() || actionLoading}
          >
            {actionLoading ? "Saving..." : "Save Passenger"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* STAFF UPLOAD DOCUMENT DIALOG */}
      <Dialog open={uploadDocModalOpen} onClose={() => setUploadDocModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>Upload Travel Document / Permit</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as any })}
              >
                {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, label]) => (
                  <MenuItem key={k} value={k}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Document Title"
              fullWidth
              size="small"
              placeholder="e.g. Dubai Tourist Visa - Mr. Sharma"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
            />

            <FormControl fullWidth size="small">
              <InputLabel>Link to Passenger (Optional)</InputLabel>
              <Select
                label="Link to Passenger (Optional)"
                value={uploadForm.travelerId}
                onChange={(e) => setUploadForm({ ...uploadForm, travelerId: e.target.value })}
              >
                <MenuItem value="">General Booking Document</MenuItem>
                {travelers.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.fullName} ({t.travelerType})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* File Upload Trigger */}
            <Box
              onClick={() => staffFileInputRef.current?.click()}
              sx={{
                border: "2px dashed #cbd5e1",
                borderRadius: 2,
                p: 2.5,
                textAlign: "center",
                cursor: "pointer",
                bgcolor: uploadForm.fileBase64 ? "#f8fafc" : "#ffffff",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
              <input
                type="file"
                ref={staffFileInputRef}
                accept="image/*,application/pdf"
                style={{ display: "none" }}
                onChange={handleStaffFileSelect}
              />
              <CloudUploadIcon color="primary" sx={{ fontSize: 36, mb: 0.5 }} />
              <Typography variant="body2" fontWeight="bold">
                {uploadForm.fileName ? uploadForm.fileName : "Click to select file / image"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supports JPG, PNG, WEBP, and PDF
              </Typography>
            </Box>

            <TextField
              label="Internal Notes"
              fullWidth
              size="small"
              value={uploadForm.notes}
              onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDocModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStaffUploadSubmit}
            disabled={!uploadForm.fileBase64 || actionLoading}
          >
            {actionLoading ? "Uploading..." : "Save Document"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* REJECT DOCUMENT DIALOG */}
      <Dialog open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "error.main" }}>Reject Document</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a clear reason so the traveler knows why this document was rejected and how to fix it.
          </Typography>
          <TextField
            label="Rejection Reason / Instruction"
            fullWidth
            multiline
            rows={3}
            size="small"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmReject} disabled={actionLoading}>
            Reject Document
          </Button>
        </DialogActions>
      </Dialog>

      {/* DOCUMENT PREVIEW MODAL */}
      <Dialog open={Boolean(previewDoc)} onClose={() => setPreviewDoc(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{previewDoc?.title || "Document Preview"}</span>
          <IconButton onClick={() => setPreviewDoc(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ textAlign: "center" }}>
          {previewDoc?.fileType?.startsWith("image/") || previewDoc?.fileUrl.startsWith("data:image/") ? (
            <Box
              component="img"
              src={previewDoc.fileUrl}
              alt="Document Preview"
              sx={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
            />
          ) : (
            <iframe
              src={previewDoc?.fileUrl || ""}
              title="Document View"
              style={{ width: "100%", height: "70vh", border: "none" }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* PRINTABLE PASSENGER MANIFEST MODAL */}
      <Dialog open={manifestPrintOpen} onClose={() => setManifestPrintOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Passenger Manifest Sheet</span>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
            Print Sheet
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Box id="printable-manifest" sx={{ p: 3, bgcolor: "#fff", color: "#0f172a" }}>
            <Box sx={{ borderBottom: "2px solid #0f172a", pb: 2, mb: 2, display: "flex", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  OFFICIAL PASSENGER MANIFEST
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Digiink Travel CRM & Tour Operations Desk
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Ref: {booking.id.slice(0, 10).toUpperCase()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Date: {new Date().toLocaleDateString()}
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Lead Passenger</Typography>
                <Typography variant="body2" fontWeight="bold">{booking.customer?.name || "Client"}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Travel Start Date</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {booking.travelStart ? new Date(booking.travelStart).toLocaleDateString() : "--"}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Total Passengers</Typography>
                <Typography variant="body2" fontWeight="bold">{travelers.length} Pax</Typography>
              </Grid>
            </Grid>

            <TableContainer sx={{ border: "1px solid #cbd5e1", mb: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>S.No</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Full Name (as per Passport)</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Gender</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>DOB</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Nationality</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Passport No</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Expiry</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Meal Pref</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {travelers.map((t, index) => (
                    <TableRow key={t.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        {t.fullName} {t.isLeadPassenger && "(Lead)"}
                      </TableCell>
                      <TableCell>{t.travelerType}</TableCell>
                      <TableCell>{t.gender}</TableCell>
                      <TableCell>{t.dateOfBirth ? t.dateOfBirth.split("T")[0] : "--"}</TableCell>
                      <TableCell>{t.nationality || "Indian"}</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>{t.passportNumber || t.idNumber || "--"}</TableCell>
                      <TableCell>{t.passportExpiry ? t.passportExpiry.split("T")[0] : "--"}</TableCell>
                      <TableCell>{t.foodPreference || "--"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 4, pt: 2, display: "flex", justifyContent: "space-between" }}>
              <Box sx={{ width: "40%", textAlign: "center" }}>
                <Box sx={{ height: 40, borderBottom: "1px solid #94a3b8", mb: 0.5 }} />
                <Typography variant="caption" fontWeight="bold">PREPARED BY (AGENCY)</Typography>
              </Box>
              <Box sx={{ width: "40%", textAlign: "center" }}>
                <Box sx={{ height: 40, borderBottom: "1px solid #94a3b8", mb: 0.5 }} />
                <Typography variant="caption" fontWeight="bold">CHECK-IN / PERMIT OFFICER</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManifestPrintOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Alert */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        message={toastMessage}
      />
    </Paper>
  );
};
