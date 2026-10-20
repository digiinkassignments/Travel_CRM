import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  MenuItem,
  Grid,
  Chip,
  Fade,
  Divider,
} from "@mui/material";
import {
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationIcon,
  CalendarMonth as CalendarIcon,
  DirectionsCar as CarIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Chat as WhatsAppIcon,
} from "@mui/icons-material";

interface AgencyBranding {
  agencyName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  website: string | null;
  address: string | null;
}

const VEHICLE_OPTIONS = [
  "Sedan (Dzire / Etios)",
  "SUV (Ertiga / Carens)",
  "Premium SUV (Innova Crysta)",
  "Luxury SUV (Fortuner)",
  "Tempo Traveller (12-17 Seater)",
  "Mini Bus / Coach",
  "Any / Suggest Best",
];

const PASSENGER_OPTIONS = ["1 - 2", "3 - 4", "5 - 7", "8 - 12", "13+"];

export function PublicLeadCapturePage() {
  const { clientCode } = useParams<{ clientCode: string }>();
  const [searchParams] = useSearchParams();

  const [agency, setAgency] = useState<AgencyBranding | null>(null);
  const [loadingAgency, setLoadingAgency] = useState(true);
  const [agencyError, setAgencyError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    pickup: "",
    destination: "",
    travelDate: "",
    vehicleType: "",
    passengers: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const primaryColor = agency?.primaryColor || "#0284c7";

  useEffect(() => {
    if (!clientCode) {
      setAgencyError("No agency identifier specified.");
      setLoadingAgency(false);
      return;
    }

    fetch(`/api/public/lead-capture/${encodeURIComponent(clientCode)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Failed to load agency details.");
        }
        setAgency(json.data);
      })
      .catch((err) => {
        setAgencyError(err.message || "Agency not found or inactive.");
      })
      .finally(() => {
        setLoadingAgency(false);
      });
  }, [clientCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setSubmitError("Please provide your name and phone number.");
      return;
    }
    if (!formData.pickup.trim() || !formData.destination.trim()) {
      setSubmitError("Please provide both pickup location and destination.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const source = searchParams.get("source") || "Website Form";

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        pickup: formData.pickup.trim(),
        destination: formData.destination.trim(),
        travelDate: formData.travelDate || undefined,
        vehicleType: formData.vehicleType || undefined,
        passengers: formData.passengers ? parseInt(formData.passengers, 10) || undefined : undefined,
        notes: formData.notes.trim() || undefined,
        source,
      };

      const res = await fetch(`/api/public/lead-capture/${encodeURIComponent(clientCode!)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to submit your request. Please try again.");
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong while submitting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      pickup: "",
      destination: "",
      travelDate: "",
      vehicleType: "",
      passengers: "",
      notes: "",
    });
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  if (loadingAgency) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f8fafc",
        }}
      >
        <CircularProgress sx={{ color: primaryColor }} />
      </Box>
    );
  }

  if (agencyError || !agency) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          bgcolor: "#f8fafc",
        }}
      >
        <Card sx={{ maxWidth: 460, width: "100%", textAlign: "center", p: 4, borderRadius: 3, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
          <Typography variant="h6" fontWeight={700} color="error" gutterBottom>
            Lead Capture Unavailable
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {agencyError || "The requested agency inquiry form could not be found."}
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f1f5f9",
        py: { xs: 2, sm: 5 },
        px: { xs: 1.5, sm: 3 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <Fade in timeout={600}>
        <Card
          sx={{
            maxWidth: 680,
            width: "100%",
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 20px 35px -10px rgba(15, 23, 42, 0.12), 0 1px 3px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
          }}
        >
          {/* Header Banner */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
              color: "#ffffff",
              p: { xs: 3, sm: 4 },
              textAlign: "center",
              position: "relative",
            }}
          >
            {agency.logoUrl ? (
              <Box
                component="img"
                src={agency.logoUrl}
                alt={agency.agencyName}
                sx={{
                  maxHeight: 56,
                  maxWidth: 220,
                  objectFit: "contain",
                  mb: 1.5,
                  borderRadius: 1,
                  bgcolor: "rgba(255,255,255,0.9)",
                  p: 0.5,
                }}
              />
            ) : (
              <Chip
                label={agency.agencyName.toUpperCase()}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "#ffffff",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  mb: 1.5,
                }}
              />
            )}
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: "-0.02em" }}>
              Plan Your Journey with {agency.agencyName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.75, maxWidth: 500, mx: "auto" }}>
              Get quick quotes for cabs, outstation tours, airport transfers, or custom holiday packages.
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            {submitSuccess ? (
              <Fade in timeout={400}>
                <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
                  <CheckCircleIcon sx={{ fontSize: 64, color: "#16a34a", mb: 2 }} />
                  <Typography variant="h5" fontWeight={800} color="#0f172a" gutterBottom>
                    Thank You, {formData.name}!
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460, mx: "auto", mb: 3 }}>
                    We have received your travel inquiry from{" "}
                    <strong>{formData.pickup}</strong> to <strong>{formData.destination}</strong>.
                    Our tour coordinator will review your request and get back to you promptly with the best rates.
                  </Typography>

                  {(agency.contactPhone || agency.contactEmail) && (
                    <Box
                      sx={{
                        bgcolor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 3,
                        p: 2.5,
                        maxWidth: 420,
                        mx: "auto",
                        mb: 4,
                        textAlign: "left",
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase" }}>
                        Need Immediate Assistance?
                      </Typography>
                      {agency.contactPhone && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
                          <PhoneIcon sx={{ fontSize: 18, color: primaryColor }} />
                          <Typography variant="body2" fontWeight={600} color="#0f172a">
                            <a href={`tel:${agency.contactPhone}`} style={{ color: "inherit", textDecoration: "none" }}>
                              {agency.contactPhone}
                            </a>
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<WhatsAppIcon sx={{ fontSize: 16 }} />}
                            href={`https://wa.me/${agency.contactPhone.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(agency.agencyName)},%20I%20just%20submitted%20an%20inquiry%20for%20travel%20from%20${encodeURIComponent(formData.pickup)}%20to%20${encodeURIComponent(formData.destination)}.`}
                            target="_blank"
                            sx={{ ml: "auto", textTransform: "none", py: 0.25, px: 1, borderRadius: 2, fontSize: "0.75rem" }}
                          >
                            WhatsApp
                          </Button>
                        </Box>
                      )}
                      {agency.contactEmail && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
                          <EmailIcon sx={{ fontSize: 18, color: primaryColor }} />
                          <Typography variant="body2" color="#0f172a">
                            <a href={`mailto:${agency.contactEmail}`} style={{ color: "inherit", textDecoration: "none" }}>
                              {agency.contactEmail}
                            </a>
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  <Button
                    variant="text"
                    onClick={handleReset}
                    sx={{ color: primaryColor, textTransform: "none", fontWeight: 600 }}
                  >
                    Submit Another Inquiry
                  </Button>
                </Box>
              </Fade>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {submitError && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {submitError}
                  </Alert>
                )}

                <Grid container spacing={2.5}>
                  {/* Passenger Information */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={700} color="#334155" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                      <PersonIcon sx={{ fontSize: 18, color: primaryColor }} /> Your Contact Details
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      size="small"
                      label="Your Name"
                      name="name"
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      size="small"
                      label="Phone Number (with WhatsApp)"
                      name="phone"
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Email Address (Optional)"
                      name="email"
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </Grid>

                  {/* Trip Details */}
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" fontWeight={700} color="#334155" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                      <LocationIcon sx={{ fontSize: 18, color: primaryColor }} /> Trip Details
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      size="small"
                      label="Pickup City / Airport"
                      name="pickup"
                      placeholder="e.g. Delhi Airport / Connaught Place"
                      value={formData.pickup}
                      onChange={handleChange}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      size="small"
                      label="Destination / Drop"
                      name="destination"
                      placeholder="e.g. Agra / Jaipur / Manali"
                      value={formData.destination}
                      onChange={handleChange}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Travel Date"
                      name="travelDate"
                      InputLabelProps={{ shrink: true }}
                      value={formData.travelDate}
                      onChange={handleChange}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Number of Guests"
                      name="passengers"
                      value={formData.passengers}
                      onChange={handleChange}
                    >
                      <MenuItem value="">Any / Flexible</MenuItem>
                      {PASSENGER_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt} Passengers
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Preferred Vehicle / Service"
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleChange}
                    >
                      <MenuItem value="">Any Vehicle (Send Recommendations)</MenuItem>
                      {VEHICLE_OPTIONS.map((veh) => (
                        <MenuItem key={veh} value={veh}>
                          {veh}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={3}
                      label="Special Requests / Itinerary Notes"
                      name="notes"
                      placeholder="e.g. 3 Days 2 Nights tour, need luggage carrier, elderly passenger assistance, etc."
                      value={formData.notes}
                      onChange={handleChange}
                    />
                  </Grid>

                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={submitting}
                      startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                      sx={{
                        py: 1.4,
                        bgcolor: primaryColor,
                        "&:hover": { bgcolor: primaryColor, filter: "brightness(0.9)" },
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        borderRadius: 2.5,
                        textTransform: "none",
                        boxShadow: `0 8px 20px -4px ${primaryColor}66`,
                      }}
                    >
                      {submitting ? "Submitting Inquiry..." : "Get Instant Free Quote"}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            )}
          </CardContent>

          {/* Footer watermark */}
          <Box
            sx={{
              py: 1.5,
              px: 3,
              bgcolor: "#f8fafc",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              🔒 Safe & Confidential • No Spam Guarantee
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              Powered by Digiink Travel CRM
            </Typography>
          </Box>
        </Card>
      </Fade>
    </Box>
  );
}
