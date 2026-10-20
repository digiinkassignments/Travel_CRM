import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Tooltip,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import CloseIcon from "@mui/icons-material/Close";

import {
  PublicVaultData,
  BookingTraveler,
  DocumentCategory,
  DOCUMENT_CATEGORY_LABELS,
} from "../../types/documentVault";
import {
  fetchPublicVault,
  guestAddTraveler,
  guestUploadDocument,
} from "../../api/documentVault";

export const GuestDocumentUploadPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();

  const [vaultData, setVaultData] = useState<PublicVaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTravelerId, setSelectedTravelerId] = useState<string>("");

  // Upload Form State
  const [category, setCategory] = useState<DocumentCategory>("PASSPORT_FRONT");
  const [customTitle, setCustomTitle] = useState("");
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Add Traveler Modal
  const [addTravelerOpen, setAddTravelerOpen] = useState(false);
  const [newTraveler, setNewTraveler] = useState({
    fullName: "",
    travelerType: "ADULT",
    gender: "MALE",
    dateOfBirth: "",
    nationality: "Indian",
    passportNumber: "",
    idNumber: "",
  });
  const [addTravelerLoading, setAddTravelerLoading] = useState(false);

  // Image Preview Modal
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    if (!shareToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicVault(shareToken);
      setVaultData(data);
      if (data.travelers && data.travelers.length > 0) {
        setSelectedTravelerId((prev) => prev || data.travelers[0].id);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "This document upload link is invalid or has expired. Please contact your travel advisor."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [shareToken]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setUploadError("File size exceeds 15MB limit. Please upload a smaller photo.");
      return;
    }

    setFileName(file.name);
    setFileType(file.type);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.onerror = () => {
      setUploadError("Failed to read the selected file. Please try again.");
    };
    reader.readAsDataURL(file);
  }

  async function handleUploadSubmit() {
    if (!shareToken || !fileBase64) return;
    setUploadLoading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const docTitle = customTitle.trim() || DOCUMENT_CATEGORY_LABELS[category] || "Guest Document";
      await guestUploadDocument(shareToken, {
        title: docTitle,
        category,
        travelerId: selectedTravelerId || undefined,
        fileUrl: fileBase64,
        fileType,
        notes: `Uploaded via guest portal`,
      });

      setUploadSuccess("Document uploaded successfully! Our team will verify it.");
      setFileBase64(null);
      setFileName("");
      setCustomTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadData();
    } catch (err: any) {
      setUploadError(err.response?.data?.message || "Failed to upload document. Please try again.");
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleAddTravelerSubmit() {
    if (!shareToken || !newTraveler.fullName.trim()) return;
    setAddTravelerLoading(true);
    try {
      const created = await guestAddTraveler(shareToken, {
        fullName: newTraveler.fullName.trim(),
        travelerType: newTraveler.travelerType as any,
        gender: newTraveler.gender as any,
        dateOfBirth: newTraveler.dateOfBirth || undefined,
        nationality: newTraveler.nationality.trim(),
        passportNumber: newTraveler.passportNumber.trim() || undefined,
        idNumber: newTraveler.idNumber.trim() || undefined,
      });

      setAddTravelerOpen(false);
      setNewTraveler({
        fullName: "",
        travelerType: "ADULT",
        gender: "MALE",
        dateOfBirth: "",
        nationality: "Indian",
        passportNumber: "",
        idNumber: "",
      });
      await loadData();
      setSelectedTravelerId(created.id);
    } catch (err: any) {
      setUploadError(err.response?.data?.message || "Failed to add traveler.");
    } finally {
      setAddTravelerLoading(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", bgcolor: "#f8fafc" }}>
        <CircularProgress size={45} />
      </Box>
    );
  }

  if (error || !vaultData) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Upload Portal Unavailable
          </Typography>
          <Typography color="text.secondary" paragraph>
            {error || "We could not find this document upload request."}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please get in touch with your travel agency advisor for an updated upload link.
          </Typography>
        </Paper>
      </Container>
    );
  }

  const { company, booking, travelers, documents } = vaultData;
  const primaryColor = company.primaryColor || "#2563eb";

  // Filter documents for the selected traveler (or all if none selected)
  const currentDocs = selectedTravelerId
    ? documents.filter((d) => d.travelerId === selectedTravelerId)
    : documents;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f1f5f9", pb: 8 }}>
      {/* Top Agency Branding Bar */}
      <Box sx={{ bgcolor: "#ffffff", borderBottom: "1px solid #e2e8f0", py: 2 }}>
        <Container maxWidth="md">
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {company.logoUrl ? (
                <Box
                  component="img"
                  src={company.logoUrl}
                  alt={company.companyName || "Logo"}
                  sx={{ height: 44, maxWidth: 160, objectFit: "contain" }}
                />
              ) : (
                <FlightTakeoffIcon sx={{ fontSize: 32, color: primaryColor }} />
              )}
              <Box>
                <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ lineHeight: 1.2 }}>
                  {company.companyName || "Travel Agency"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Guest Document & Identification Vault
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              {company.phone && (
                <Button
                  size="small"
                  startIcon={<PhoneIcon />}
                  href={`tel:${company.phone}`}
                  sx={{ textTransform: "none", color: primaryColor }}
                >
                  {company.phone}
                </Button>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ mt: 3 }}>
        {/* Security & SSL Notice */}
        <Paper
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2,
            bgcolor: "#ffffff",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ bgcolor: "#e0f2fe", p: 1.5, borderRadius: "50%" }}>
            <LockOutlinedIcon sx={{ color: "#0284c7" }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
              256-Bit SSL Encrypted Document Upload
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your government ID documents (Passport, Visa, Aadhaar) are stored securely and only accessible to authorized travel operations managers for airline ticketing, hotel reservations, and inner line permits.
            </Typography>
          </Box>
        </Paper>

        {/* Trip Overview Card */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
                Guest Name
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {booking.customer?.name || "Valued Traveler"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
                Travel Departure
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                {booking.travelStart
                  ? new Date(booking.travelStart).toLocaleDateString([], { dateStyle: "long" })
                  : "As Scheduled"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="bold">
                Verified Documents
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {documents.filter((d) => d.verificationStatus === "VERIFIED").length} / {documents.length}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Traveler Selection Bar */}
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Select Traveler to Upload ID
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PersonAddIcon />}
            onClick={() => setAddTravelerOpen(true)}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            + Add Co-Traveler
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1, mb: 3 }}>
          {travelers.map((t) => {
            const isSelected = t.id === selectedTravelerId;
            const tDocCount = documents.filter((d) => d.travelerId === t.id).length;
            return (
              <Button
                key={t.id}
                variant={isSelected ? "contained" : "outlined"}
                onClick={() => setSelectedTravelerId(t.id)}
                sx={{
                  px: 2.5,
                  py: 1,
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: isSelected ? "bold" : "normal",
                  bgcolor: isSelected ? primaryColor : "#ffffff",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {t.fullName} ({t.travelerType}) • {tDocCount} {tDocCount === 1 ? "Doc" : "Docs"}
              </Button>
            );
          })}
        </Box>

        {/* Upload Form Card */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Upload Identity Proof
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please upload clear, legible photos or scanned PDFs of the traveler's ID.
          </Typography>

          {uploadSuccess && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setUploadSuccess(null)}>
              {uploadSuccess}
            </Alert>
          )}

          {uploadError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
              {uploadError}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="doc-cat-label">Document Type</InputLabel>
                <Select
                  labelId="doc-cat-label"
                  label="Document Type"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                >
                  {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([catKey, label]) => (
                    <MenuItem key={catKey} value={catKey}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Custom Label / Notes (Optional)"
                placeholder="e.g. Front Photo Page"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
            </Grid>

            {/* Drag / Select Area */}
            <Grid item xs={12}>
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: 2,
                  p: 3,
                  textAlign: "center",
                  bgcolor: fileBase64 ? "#f8fafc" : "#ffffff",
                  cursor: "pointer",
                  "&:hover": { borderColor: primaryColor, bgcolor: "#f8fafc" },
                  transition: "all 0.2s ease-in-out",
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />

                {fileBase64 ? (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                    {fileType.startsWith("image/") ? (
                      <Box
                        component="img"
                        src={fileBase64}
                        alt="Preview"
                        sx={{ maxHeight: 160, maxWidth: "100%", borderRadius: 1, mb: 1 }}
                      />
                    ) : (
                      <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
                    )}
                    <Typography variant="subtitle2" fontWeight="bold">
                      {fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Click to choose a different photo or file
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                    <CameraAltIcon sx={{ fontSize: 44, color: primaryColor }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Snap Photo or Select File
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Supports JPG, PNG, WEBP, and PDF up to 15MB
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleUploadSubmit}
                disabled={!fileBase64 || uploadLoading}
                startIcon={uploadLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                sx={{
                  bgcolor: primaryColor,
                  py: 1.4,
                  fontWeight: "bold",
                  textTransform: "none",
                  borderRadius: 2,
                }}
              >
                {uploadLoading ? "Uploading Document..." : "Submit for Verification"}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Uploaded Documents List */}
        <Paper sx={{ p: 3, borderRadius: 2, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Uploaded Documents ({currentDocs.length})
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Review status of submitted documents for this traveler.
          </Typography>

          {currentDocs.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4, bgcolor: "#f8fafc", borderRadius: 2 }}>
              <HourglassEmptyIcon sx={{ fontSize: 40, color: "#94a3b8", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No documents uploaded for this traveler yet.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {currentDocs.map((doc) => (
                <Grid item xs={12} sm={6} key={doc.id}>
                  <Card sx={{ border: "1px solid #e2e8f0", borderRadius: 2, boxShadow: "none" }}>
                    {doc.fileType?.startsWith("image/") ? (
                      <CardMedia
                        component="img"
                        height="120"
                        image={doc.fileUrl}
                        alt={doc.title}
                        onClick={() => setPreviewDocUrl(doc.fileUrl)}
                        sx={{ cursor: "pointer", objectFit: "cover" }}
                      />
                    ) : (
                      <Box
                        onClick={() => setPreviewDocUrl(doc.fileUrl)}
                        sx={{
                          height: 80,
                          bgcolor: "#f1f5f9",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Typography variant="caption" fontWeight="bold" color="primary.main">
                          Click to View PDF Document
                        </Typography>
                      </Box>
                    )}
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ maxWidth: "65%" }}>
                          {doc.title}
                        </Typography>
                        {doc.verificationStatus === "VERIFIED" && (
                          <Chip label="Verified" color="success" size="small" icon={<CheckCircleIcon />} />
                        )}
                        {doc.verificationStatus === "PENDING" && (
                          <Chip label="Under Review" color="warning" size="small" icon={<HourglassEmptyIcon />} />
                        )}
                        {doc.verificationStatus === "REJECTED" && (
                          <Chip label="Action Needed" color="error" size="small" icon={<ErrorOutlineIcon />} />
                        )}
                      </Box>

                      <Typography variant="caption" display="block" color="text.secondary">
                        {DOCUMENT_CATEGORY_LABELS[doc.category] || doc.category}
                      </Typography>

                      {doc.rejectionReason && (
                        <Alert severity="error" sx={{ mt: 1, py: 0.5, fontSize: "0.75rem" }}>
                          <strong>Reason:</strong> {doc.rejectionReason}
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </Container>

      {/* ADD CO-TRAVELER MODAL */}
      <Dialog open={addTravelerOpen} onClose={() => setAddTravelerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>Add Co-Traveler</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Full Name (as per Govt ID)"
              fullWidth
              size="small"
              required
              value={newTraveler.fullName}
              onChange={(e) => setNewTraveler({ ...newTraveler, fullName: e.target.value })}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    label="Type"
                    value={newTraveler.travelerType}
                    onChange={(e) => setNewTraveler({ ...newTraveler, travelerType: e.target.value })}
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
                    value={newTraveler.gender}
                    onChange={(e) => setNewTraveler({ ...newTraveler, gender: e.target.value })}
                  >
                    <MenuItem value="MALE">Male</MenuItem>
                    <MenuItem value="FEMALE">Female</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              label="Date of Birth"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={newTraveler.dateOfBirth}
              onChange={(e) => setNewTraveler({ ...newTraveler, dateOfBirth: e.target.value })}
            />

            <TextField
              label="Passport Number (Optional)"
              fullWidth
              size="small"
              value={newTraveler.passportNumber}
              onChange={(e) => setNewTraveler({ ...newTraveler, passportNumber: e.target.value })}
            />

            <TextField
              label="Aadhaar / National ID (Optional)"
              fullWidth
              size="small"
              value={newTraveler.idNumber}
              onChange={(e) => setNewTraveler({ ...newTraveler, idNumber: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddTravelerOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddTravelerSubmit}
            disabled={!newTraveler.fullName.trim() || addTravelerLoading}
            sx={{ bgcolor: primaryColor }}
          >
            {addTravelerLoading ? "Saving..." : "Add Traveler"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DOCUMENT PREVIEW MODAL */}
      <Dialog open={Boolean(previewDocUrl)} onClose={() => setPreviewDocUrl(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Document Preview</span>
          <IconButton onClick={() => setPreviewDocUrl(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ textAlign: "center" }}>
          {previewDocUrl && previewDocUrl.startsWith("data:image/") ? (
            <Box
              component="img"
              src={previewDocUrl}
              alt="Document"
              sx={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
            />
          ) : (
            <iframe
              src={previewDocUrl || ""}
              title="Document View"
              style={{ width: "100%", height: "70vh", border: "none" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
