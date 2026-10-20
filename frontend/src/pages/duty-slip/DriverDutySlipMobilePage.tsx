import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  Rating,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Divider,
  IconButton,
  Avatar,
  Stack,
  Card,
  CardMedia,
} from "@mui/material";
import CallRoundedIcon from "@mui/icons-material/CallRounded";
import NavigationRoundedIcon from "@mui/icons-material/NavigationRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import {
  fetchPublicDutySlip,
  startDutyTrip,
  addDutyExpense,
  completeDutyTrip,
  uploadDutyAttachment,
  confirmDriverArrival,
} from "../../api/dutySlips";
import { DutySlip } from "../../types/dutySlip";

export function DriverDutySlipMobilePage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [dutySlip, setDutySlip] = useState<DutySlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [arrivedSuccess, setArrivedSuccess] = useState(false);
  const [arriving, setArriving] = useState(false);

  // Start Duty state
  const [startKm, setStartKm] = useState<number | "">("");
  const [startPhotoUrl, setStartPhotoUrl] = useState<string>("");
  const [uploadingStartPhoto, setUploadingStartPhoto] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Expense modal state
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseType, setExpenseType] = useState("TOLL");
  const [expenseAmount, setExpenseAmount] = useState<number | "">("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expenseReceiptUrl, setExpenseReceiptUrl] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

  // End Duty state
  const [endKm, setEndKm] = useState<number | "">("");
  const [endPhotoUrl, setEndPhotoUrl] = useState<string>("");
  const [uploadingEndPhoto, setUploadingEndPhoto] = useState(false);
  const [customerRating, setCustomerRating] = useState<number>(5);
  const [customerFeedback, setCustomerFeedback] = useState("");
  const [completing, setCompleting] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  // Hidden file inputs
  const startCameraInputRef = useRef<HTMLInputElement | null>(null);
  const endCameraInputRef = useRef<HTMLInputElement | null>(null);
  const receiptCameraInputRef = useRef<HTMLInputElement | null>(null);

  // HTML5 Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const isDrawing = useRef(false);

  async function load() {
    if (!shareToken) return;
    setLoading(true);
    try {
      const data = await fetchPublicDutySlip(shareToken);
      setDutySlip(data);
      if (data.startOdometer) {
        setStartKm(data.startOdometer);
      }
      if (data.startOdoPhotoUrl) {
        setStartPhotoUrl(data.startOdoPhotoUrl);
      }
      if (data.endOdometer) {
        setEndKm(data.endOdometer);
      }
      if (data.endOdoPhotoUrl) {
        setEndPhotoUrl(data.endOdoPhotoUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Duty slip not found or invalid link");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [shareToken]);

  // Handle Arrival at pickup
  async function handleConfirmArrival() {
    if (!shareToken) return;
    setArriving(true);
    try {
      const updated = await confirmDriverArrival(shareToken);
      setDutySlip(updated);
      setArrivedSuccess(true);
    } catch (err) {
      console.error("Arrival update failed", err);
    } finally {
      setArriving(false);
    }
  }

  // Handle Photo Capture
  function handleFileSelected(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end" | "receipt"
  ) {
    const file = e.target.files?.[0];
    if (!file || !shareToken) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (type === "start") setUploadingStartPhoto(true);
      if (type === "end") setUploadingEndPhoto(true);
      if (type === "receipt") setUploadingReceipt(true);

      try {
        const uploadedUrl = await uploadDutyAttachment(shareToken, dataUrl, file.name);
        if (type === "start") setStartPhotoUrl(uploadedUrl);
        if (type === "end") setEndPhotoUrl(uploadedUrl);
        if (type === "receipt") setExpenseReceiptUrl(uploadedUrl);
      } catch (err) {
        console.error("Failed to upload photo", err);
        // Fallback to dataUrl
        if (type === "start") setStartPhotoUrl(dataUrl);
        if (type === "end") setEndPhotoUrl(dataUrl);
        if (type === "receipt") setExpenseReceiptUrl(dataUrl);
      } finally {
        if (type === "start") setUploadingStartPhoto(false);
        if (type === "end") setUploadingEndPhoto(false);
        if (type === "receipt") setUploadingReceipt(false);
      }
    };
    reader.readAsDataURL(file);
  }

  // Canvas Touch Drawing
  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    isDrawing.current = true;
    draw(e);
  }

  function stopDrawing() {
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.beginPath();
    }
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasSignature(true);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    setHasSignature(false);
  }

  async function handleStartTrip() {
    if (!startKm || Number(startKm) <= 0) {
      setStartError("Please enter a valid Opening Odometer reading (KM)");
      return;
    }

    setStarting(true);
    setStartError(null);
    try {
      const updated = await startDutyTrip(shareToken!, {
        startOdometer: Number(startKm),
        startOdoPhotoUrl: startPhotoUrl || undefined,
      });
      setDutySlip(updated);
    } catch (err: any) {
      setStartError(err.response?.data?.message || "Failed to start duty");
    } finally {
      setStarting(false);
    }
  }

  async function handleAddExpense() {
    if (!expenseAmount || Number(expenseAmount) <= 0) return;
    setSavingExpense(true);
    try {
      const result = await addDutyExpense(shareToken!, {
        expenseType,
        amountInPaise: Math.round(Number(expenseAmount) * 100),
        notes: expenseNotes || undefined,
        receiptUrl: expenseReceiptUrl || undefined,
      });
      setDutySlip(result.dutySlip);
      setExpenseOpen(false);
      setExpenseAmount("");
      setExpenseNotes("");
      setExpenseReceiptUrl("");
    } catch (err) {
      console.error("Failed to add expense", err);
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleCompleteTrip() {
    if (!endKm || Number(endKm) <= 0) {
      setEndError("Please enter Closing Odometer reading (KM)");
      return;
    }
    const currentStart = dutySlip?.startOdometer || 0;
    if (Number(endKm) < currentStart) {
      setEndError(`Closing KM (${endKm}) cannot be less than Opening KM (${currentStart})`);
      return;
    }

    let signatureBase64: string | undefined = undefined;
    if (canvasRef.current && hasSignature) {
      signatureBase64 = canvasRef.current.toDataURL("image/png");
    }

    setCompleting(true);
    setEndError(null);
    try {
      const updated = await completeDutyTrip(shareToken!, {
        endOdometer: Number(endKm),
        endOdoPhotoUrl: endPhotoUrl || undefined,
        customerSignature: signatureBase64,
        customerRating,
        customerFeedback: customerFeedback || undefined,
      });
      setDutySlip(updated);
    } catch (err: any) {
      setEndError(err.response?.data?.message || "Failed to complete duty");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <Box p={4} textAlign="center" minHeight="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center" bgcolor="#f8fafc">
        <CircularProgress size={48} sx={{ color: "#0284c7" }} />
        <Typography variant="body1" color="text.secondary" mt={2} fontWeight={700}>
          Loading Chauffeur Duty Companion...
        </Typography>
      </Box>
    );
  }

  if (error || !dutySlip) {
    return (
      <Box p={3} maxWidth={500} mx="auto" mt={8}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          {error || "Duty slip could not be found. Please check your WhatsApp link or call dispatch."}
        </Alert>
      </Box>
    );
  }

  const isCompleted = dutySlip.status === "COMPLETED" || dutySlip.status === "BILLED";
  const isStarted = dutySlip.status === "STARTED" || isCompleted;

  const totalRunKm =
    dutySlip.totalKm !== null && dutySlip.totalKm !== undefined
      ? dutySlip.totalKm
      : endKm && dutySlip.startOdometer && Number(endKm) >= dutySlip.startOdometer
      ? Number(endKm) - dutySlip.startOdometer
      : null;

  const agencyPhone = dutySlip.client?.companyProfile?.phone || "";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f1f5f9", pb: 8 }}>
      {/* Hidden File Inputs for Cameras */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={startCameraInputRef}
        style={{ display: "none" }}
        onChange={(e) => handleFileSelected(e, "start")}
      />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={endCameraInputRef}
        style={{ display: "none" }}
        onChange={(e) => handleFileSelected(e, "end")}
      />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={receiptCameraInputRef}
        style={{ display: "none" }}
        onChange={(e) => handleFileSelected(e, "receipt")}
      />

      {/* Top Header Bar */}
      <Box
        sx={{
          bgcolor: "#0f172a",
          color: "#fff",
          px: 2.5,
          py: 2,
          borderBottom: "3px solid #0284c7",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="caption" color="#94a3b8" textTransform="uppercase" letterSpacing={1} fontWeight={700}>
            DIGITAL CHAUFFEUR COMPANION
          </Typography>
          <Typography variant="h6" fontWeight={900} color="#fff" lineHeight={1.2}>
            {dutySlip.client?.companyProfile?.companyName || dutySlip.client?.businessName || "DIGIINK FLEET"}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {agencyPhone && (
            <IconButton
              component="a"
              href={`tel:${agencyPhone}`}
              size="small"
              sx={{ bgcolor: "#1e293b", color: "#38bdf8", border: "1px solid #334155" }}
              title="Call Dispatch Helpline"
            >
              <SupportAgentRoundedIcon fontSize="small" />
            </IconButton>
          )}
          <Chip
            label={dutySlip.slipNumber}
            sx={{
              bgcolor: "#0284c7",
              color: "#fff",
              fontWeight: 800,
              borderRadius: "6px",
              fontSize: 12,
            }}
          />
        </Box>
      </Box>

      {/* Main Container */}
      <Box maxWidth={540} mx="auto" px={2} pt={2}>
        {/* Live Trip Status Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 3,
            border: "1px solid",
            borderColor: isCompleted ? "#86efac" : isStarted ? "#7dd3fc" : "#fde68a",
            bgcolor: isCompleted ? "#f0fdf4" : isStarted ? "#f0f9ff" : "#fffbeb",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          {isCompleted ? (
            <CheckCircleRoundedIcon sx={{ color: "#16a34a", fontSize: 32 }} />
          ) : isStarted ? (
            <PlayArrowRoundedIcon sx={{ color: "#0284c7", fontSize: 32 }} />
          ) : (
            <SpeedRoundedIcon sx={{ color: "#d97706", fontSize: 32 }} />
          )}
          <Box flex={1}>
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
              {isCompleted
                ? "Trip Completed & Verified"
                : isStarted
                ? "Duty In Progress — Safe Driving"
                : "Duty Dispatched — Enter Opening KM"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isCompleted && dutySlip.endTime
                ? `Finished at ${new Date(dutySlip.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • ${dutySlip.totalKm} KM`
                : isStarted && dutySlip.startTime
                ? `Started at ${new Date(dutySlip.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Opening: ${dutySlip.startOdometer} KM`
                : "Report at passenger pickup location"}
            </Typography>
          </Box>
        </Paper>

        {/* Passenger & GPS Navigation Card */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="caption" color="#64748b" fontWeight={700} textTransform="uppercase">
                Passenger Details
              </Typography>
              <Typography variant="h6" fontWeight={800} color="#0f172a" mt={0.25}>
                {dutySlip.passengerName || "Private Guest"}
              </Typography>
            </Box>
            {dutySlip.reportingTime && (
              <Chip
                label={`Report: ${dutySlip.reportingTime}`}
                size="small"
                sx={{ bgcolor: "#eff6ff", color: "#0284c7", fontWeight: 700, fontSize: "0.72rem" }}
              />
            )}
          </Box>

          {dutySlip.passengerPhone && (
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<CallRoundedIcon />}
              href={`tel:${dutySlip.passengerPhone}`}
              sx={{
                mt: 1.75,
                mb: 1.5,
                bgcolor: "#16a34a",
                "&:hover": { bgcolor: "#15803d" },
                fontWeight: 800,
                fontSize: "0.95rem",
                py: 1.25,
                borderRadius: 2.5,
                textTransform: "none",
                boxShadow: "0 4px 12px rgba(22,163,74,0.3)",
              }}
            >
              Call Passenger ({dutySlip.passengerPhone})
            </Button>
          )}

          {/* Arrived at Pickup Button */}
          {!isStarted && (
            <Button
              variant="outlined"
              fullWidth
              onClick={handleConfirmArrival}
              disabled={arriving || arrivedSuccess}
              startIcon={arrivedSuccess ? <DoneAllRoundedIcon /> : <LocationOnRoundedIcon />}
              sx={{
                mb: 1.5,
                borderColor: arrivedSuccess ? "#16a34a" : "#0284c7",
                color: arrivedSuccess ? "#16a34a" : "#0284c7",
                bgcolor: arrivedSuccess ? "#f0fdf4" : "#f0f9ff",
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
              }}
            >
              {arrivedSuccess ? "Arrival Confirmed to Office ✓" : arriving ? "Confirming..." : "I Have Arrived at Pickup Location"}
            </Button>
          )}

          <Divider sx={{ my: 1.75 }} />

          {/* Pickup Point Navigation */}
          <Box mb={2}>
            <Typography variant="caption" color="#64748b" fontWeight={700} textTransform="uppercase">
              📍 Pickup Point:
            </Typography>
            <Typography variant="body2" fontWeight={700} color="#1e293b" mb={1}>
              {dutySlip.pickupAddress || "Designated pickup location"}
            </Typography>
            {dutySlip.pickupAddress && (
              <Button
                variant="outlined"
                fullWidth
                startIcon={<NavigationRoundedIcon />}
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dutySlip.pickupAddress)}`}
                target="_blank"
                sx={{
                  color: "#0284c7",
                  borderColor: "#bae6fd",
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: "none",
                  py: 0.9,
                  bgcolor: "#f0f9ff",
                }}
              >
                Open Pickup in Google Maps GPS
              </Button>
            )}
          </Box>

          {/* Drop Point Navigation */}
          {dutySlip.dropAddress && (
            <Box>
              <Typography variant="caption" color="#64748b" fontWeight={700} textTransform="uppercase">
                🏁 Drop Point:
              </Typography>
              <Typography variant="body2" fontWeight={700} color="#1e293b" mb={1}>
                {dutySlip.dropAddress}
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<NavigationRoundedIcon />}
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dutySlip.dropAddress)}`}
                target="_blank"
                sx={{
                  color: "#334155",
                  borderColor: "#cbd5e1",
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: "none",
                  py: 0.9,
                }}
              >
                Open Drop in Google Maps GPS
              </Button>
            </Box>
          )}
        </Paper>

        {/* Assigned Vehicle & Driver Info Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box display="flex" alignItems="center" gap={1.25}>
            <Avatar sx={{ bgcolor: "rgba(2, 132, 199, 0.1)", color: "#0284c7", width: 38, height: 38, borderRadius: 2 }}>
              <DirectionsCarRoundedIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                {dutySlip.vehicleNumber || "Cab Assigned"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dutySlip.vehicleModel || "Commercial Fleet"}
              </Typography>
            </Box>
          </Box>
          <Box textAlign="right">
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
              {dutySlip.driverName || "Chauffeur on Duty"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {dutySlip.driverPhone || ""}
            </Typography>
          </Box>
        </Paper>

        {/* STEP 1: START DUTY */}
        {!isStarted && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 2,
              borderRadius: 3,
              border: "2px solid #0284c7",
              bgcolor: "#ffffff",
            }}
          >
            <Typography variant="h6" fontWeight={800} color="#0f172a" mb={0.5}>
              Step 1: Start Duty
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Enter vehicle opening dashboard odometer reading before starting the ride:
            </Typography>

            {startError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {startError}
              </Alert>
            )}

            <TextField
              label="Opening Odometer (KM) *"
              type="number"
              fullWidth
              size="medium"
              placeholder="e.g. 45210"
              value={startKm}
              onChange={(e) => setStartKm(e.target.value === "" ? "" : Number(e.target.value))}
              inputProps={{ style: { fontSize: 24, fontWeight: 800, textAlign: "center", letterSpacing: 2 } }}
              sx={{ mb: 2 }}
            />

            {/* Photo Capture for Start Odometer */}
            <Box mb={2}>
              {startPhotoUrl ? (
                <Box position="relative" mb={1}>
                  <Card sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                    <CardMedia component="img" height="140" image={startPhotoUrl} alt="Opening Odometer Proof" />
                  </Card>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    onClick={() => setStartPhotoUrl("")}
                    sx={{ mt: 0.5, textTransform: "none", fontSize: "0.75rem" }}
                  >
                    Retake Odometer Photo
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={uploadingStartPhoto ? <CircularProgress size={16} /> : <CameraAltRoundedIcon />}
                  onClick={() => startCameraInputRef.current?.click()}
                  disabled={uploadingStartPhoto}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    borderColor: "#cbd5e1",
                    color: "#475569",
                    py: 1,
                  }}
                >
                  {uploadingStartPhoto ? "Uploading Photo..." : "📷 Snap Opening Odometer Photo"}
                </Button>
              )}
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={starting ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <PlayArrowRoundedIcon />}
              onClick={handleStartTrip}
              disabled={starting || !startKm}
              sx={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                fontWeight: 800,
                fontSize: "1rem",
                py: 1.4,
                borderRadius: 2.5,
                textTransform: "none",
                boxShadow: "0 4px 14px rgba(2,132,199,0.35)",
              }}
            >
              {starting ? "Starting..." : "Start Trip Now"}
            </Button>
          </Paper>
        )}

        {/* STEP 2: ON-TRIP TOLLS & EXPENSES */}
        {isStarted && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 2,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                  Toll, Parking & Expenses
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Logged: ₹{((dutySlip.totalExpensesInPaise || 0) / 100).toLocaleString()}
                </Typography>
              </Box>
              {!isCompleted && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => setExpenseOpen(true)}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    borderColor: "#0284c7",
                    color: "#0284c7",
                  }}
                >
                  Add Toll / Expense
                </Button>
              )}
            </Box>

            {dutySlip.expenses && dutySlip.expenses.length > 0 ? (
              <Stack spacing={1}>
                {dutySlip.expenses.map((exp) => (
                  <Box
                    key={exp.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={1.25}
                    sx={{ bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}
                  >
                    <Box display="flex" alignItems="center" gap={1.25}>
                      <ReceiptLongRoundedIcon sx={{ color: "#0284c7", fontSize: 20 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="#0f172a">
                          {exp.expenseType.replace("_", " ")}
                        </Typography>
                        {exp.notes && (
                          <Typography variant="caption" color="text.secondary">
                            {exp.notes}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="body2" fontWeight={800} color="#16a34a">
                        +₹{(exp.amountInPaise / 100).toLocaleString()}
                      </Typography>
                      {exp.receiptUrl && (
                        <Typography
                          variant="caption"
                          component="a"
                          href={exp.receiptUrl}
                          target="_blank"
                          sx={{ color: "#0284c7", textDecoration: "underline", display: "block", fontSize: "0.68rem" }}
                        >
                          View Receipt
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary" fontStyle="italic">
                No on-trip expenses logged yet. Add tolls or parking slips above.
              </Typography>
            )}
          </Paper>
        )}

        {/* STEP 3: END DUTY & TOUCH SIGNATURE */}
        {isStarted && !isCompleted && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 2,
              borderRadius: 3,
              border: "2px solid #16a34a",
              bgcolor: "#ffffff",
            }}
          >
            <Typography variant="h6" fontWeight={800} color="#0f172a" mb={0.5}>
              Step 2: Complete Duty & Customer Sign
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Enter vehicle closing odometer (KM) and hand phone to passenger to sign:
            </Typography>

            {endError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {endError}
              </Alert>
            )}

            <TextField
              label="Closing Odometer (KM) *"
              type="number"
              fullWidth
              size="medium"
              placeholder={`e.g. ${(dutySlip.startOdometer || 0) + 60}`}
              value={endKm}
              onChange={(e) => setEndKm(e.target.value === "" ? "" : Number(e.target.value))}
              inputProps={{ style: { fontSize: 24, fontWeight: 800, textAlign: "center", letterSpacing: 2 } }}
              sx={{ mb: 2 }}
            />

            {/* Live Distance calculation */}
            {totalRunKm !== null && totalRunKm >= 0 && (
              <Box p={1.5} mb={2} sx={{ bgcolor: "#ecfdf5", borderRadius: 2, textAlign: "center", border: "1px solid #a7f3d0" }}>
                <Typography variant="subtitle2" fontWeight={800} color="#15803d">
                  Total Journey Distance: {totalRunKm} KM
                </Typography>
              </Box>
            )}

            {/* Photo Capture for End Odometer */}
            <Box mb={2}>
              {endPhotoUrl ? (
                <Box position="relative" mb={1}>
                  <Card sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                    <CardMedia component="img" height="140" image={endPhotoUrl} alt="Closing Odometer Proof" />
                  </Card>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    onClick={() => setEndPhotoUrl("")}
                    sx={{ mt: 0.5, textTransform: "none", fontSize: "0.75rem" }}
                  >
                    Retake Odometer Photo
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={uploadingEndPhoto ? <CircularProgress size={16} /> : <CameraAltRoundedIcon />}
                  onClick={() => endCameraInputRef.current?.click()}
                  disabled={uploadingEndPhoto}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    borderColor: "#cbd5e1",
                    color: "#475569",
                    py: 1,
                  }}
                >
                  {uploadingEndPhoto ? "Uploading Photo..." : "📷 Snap Closing Odometer Photo"}
                </Button>
              )}
            </Box>

            {/* Passenger Signature Canvas */}
            <Box mb={2.5}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
                <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                  Passenger Touch Signature
                </Typography>
                {hasSignature && (
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<ClearRoundedIcon />}
                    onClick={clearSignature}
                    sx={{ fontSize: 11, textTransform: "none" }}
                  >
                    Clear Sign
                  </Button>
                )}
              </Box>
              <Box
                sx={{
                  border: "2px dashed #94a3b8",
                  borderRadius: 2.5,
                  bgcolor: "#f8fafc",
                  touchAction: "none",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                  style={{ display: "block", cursor: "crosshair" }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={0.5}>
                Passenger: Please sign above with your finger to verify duty completion.
              </Typography>
            </Box>

            {/* Passenger Rating */}
            <Box mb={2} textAlign="center">
              <Typography variant="subtitle2" fontWeight={700} color="#1e293b" mb={0.5}>
                Passenger Experience Rating
              </Typography>
              <Rating
                size="large"
                value={customerRating}
                onChange={(_, val) => setCustomerRating(val || 5)}
              />
            </Box>

            <TextField
              label="Passenger Comments (Optional)"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={customerFeedback}
              onChange={(e) => setCustomerFeedback(e.target.value)}
              placeholder="e.g. Excellent chauffeur, polite driving and on time."
              sx={{ mb: 2.5 }}
            />

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={completing ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <StopRoundedIcon />}
              onClick={handleCompleteTrip}
              disabled={completing || !endKm}
              sx={{
                background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                fontWeight: 800,
                fontSize: "1rem",
                py: 1.4,
                borderRadius: 2.5,
                textTransform: "none",
                boxShadow: "0 4px 14px rgba(22,163,74,0.35)",
              }}
            >
              {completing ? "Completing..." : "Complete & Submit Duty Slip"}
            </Button>
          </Paper>
        )}

        {/* TRIP SUMMARY (When Completed) */}
        {isCompleted && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3,
              border: "1px solid #bbf7d0",
              bgcolor: "#ffffff",
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={800} color="#15803d">
                ✅ Duty Summary Voucher
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PrintRoundedIcon />}
                onClick={() => window.print()}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
              >
                Print Voucher
              </Button>
            </Box>
            <Divider sx={{ my: 1.5 }} />

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">Opening Odometer:</Typography>
              <Typography variant="body2" fontWeight={700}>{dutySlip.startOdometer} KM</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">Closing Odometer:</Typography>
              <Typography variant="body2" fontWeight={700}>{dutySlip.endOdometer} KM</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">Total Distance Run:</Typography>
              <Typography variant="body2" fontWeight={800} color="#0284c7">{dutySlip.totalKm} KM</Typography>
            </Box>
            {dutySlip.totalHours && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Total Duration:</Typography>
                <Typography variant="body2" fontWeight={700}>{dutySlip.totalHours} Hours</Typography>
              </Box>
            )}
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">Total Tolls & Expenses:</Typography>
              <Typography variant="body2" fontWeight={700} color="#16a34a">
                ₹{((dutySlip.totalExpensesInPaise || 0) / 100).toLocaleString()}
              </Typography>
            </Box>

            {/* Signature thumbnail */}
            {dutySlip.customerSignature && (
              <Box mt={2} pt={2} borderTop="1px solid #e2e8f0" textAlign="center">
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5} fontWeight={700}>
                  Verified Passenger Signature:
                </Typography>
                <img
                  src={dutySlip.customerSignature}
                  alt="Passenger Signature"
                  style={{ maxHeight: 60, maxWidth: "100%", border: "1px solid #e2e8f0", borderRadius: 6 }}
                />
              </Box>
            )}

            {dutySlip.customerRating && (
              <Box mt={1.5} textAlign="center">
                <Rating value={dutySlip.customerRating} readOnly size="small" />
                {dutySlip.customerFeedback && (
                  <Typography variant="caption" display="block" color="text.secondary" fontStyle="italic">
                    "{dutySlip.customerFeedback}"
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        )}
      </Box>

      {/* Add On-Trip Expense Dialog */}
      <Dialog open={expenseOpen} onClose={() => setExpenseOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Log On-Trip Expense</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              select
              label="Expense Type *"
              fullWidth
              size="small"
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
            >
              <MenuItem value="TOLL">Toll Tax Plaza</MenuItem>
              <MenuItem value="PARKING">Parking Fee</MenuItem>
              <MenuItem value="STATE_TAX">State / Border Tax</MenuItem>
              <MenuItem value="FUEL">Fuel / Petrol / Diesel / CNG</MenuItem>
              <MenuItem value="DRIVER_ALLOWANCE">Driver Night Allowance</MenuItem>
              <MenuItem value="MISC">Other Miscellaneous</MenuItem>
            </TextField>

            <TextField
              label="Amount (₹) *"
              type="number"
              fullWidth
              size="small"
              placeholder="e.g. 150"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value === "" ? "" : Number(e.target.value))}
            />

            <TextField
              label="Remarks / Plaza Name"
              fullWidth
              size="small"
              placeholder="e.g. Yamuna Expressway Toll Plaza"
              value={expenseNotes}
              onChange={(e) => setExpenseNotes(e.target.value)}
            />

            {/* Snap Receipt Photo */}
            <Box>
              {expenseReceiptUrl ? (
                <Box position="relative">
                  <Card sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0", maxHeight: 100 }}>
                    <CardMedia component="img" height="100" image={expenseReceiptUrl} alt="Receipt Photo" />
                  </Card>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setExpenseReceiptUrl("")}
                    sx={{ mt: 0.5, textTransform: "none", fontSize: "0.72rem" }}
                  >
                    Remove Receipt
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  startIcon={uploadingReceipt ? <CircularProgress size={14} /> : <CameraAltRoundedIcon />}
                  onClick={() => receiptCameraInputRef.current?.click()}
                  disabled={uploadingReceipt}
                  sx={{ borderRadius: 2, textTransform: "none", py: 0.8 }}
                >
                  {uploadingReceipt ? "Uploading..." : "📷 Attach Receipt Photo"}
                </Button>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setExpenseOpen(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddExpense}
            disabled={savingExpense || !expenseAmount}
            sx={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              fontWeight: 700,
              textTransform: "none",
            }}
          >
            {savingExpense ? "Saving..." : "Save Expense"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
