import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  CircularProgress,
  Container,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";

import {
  getPublicItinerary,
  acceptPublicItinerary,
  sendPublicItineraryFeedback,
} from "../../api/itineraries";
import { PublicItineraryView } from "../../types/itinerary";

export function PublicItineraryPage() {
  const { shareSlug } = useParams<{ shareSlug: string }>();

  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [travelerName, setTravelerName] = useState("");
  const [travelerPhone, setTravelerPhone] = useState("");
  const [travelerMessage, setTravelerMessage] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    data: itinerary,
    isLoading,
    isError,
    refetch,
  } = useQuery<PublicItineraryView>({
    queryKey: ["public-itinerary", shareSlug],
    queryFn: () => getPublicItinerary(shareSlug!),
    enabled: Boolean(shareSlug),
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptPublicItinerary(shareSlug!),
    onSuccess: (res) => {
      setAcceptDialogOpen(false);
      setToastMessage(res.message);
      refetch();
    },
    onError: () => {
      setToastMessage("Failed to accept itinerary. Please contact the agency directly.");
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: () =>
      sendPublicItineraryFeedback(shareSlug!, {
        travelerName,
        phone: travelerPhone,
        message: travelerMessage,
      }),
    onSuccess: (res) => {
      setFeedbackDialogOpen(false);
      setTravelerMessage("");
      setToastMessage(res.message);
    },
    onError: () => {
      setToastMessage("Failed to send customization request. Please try WhatsApp.");
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc" }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={48} sx={{ mb: 2, color: "#2563eb" }} />
          <Typography variant="body1" fontWeight={600} color="#64748b">
            Loading your customized travel proposal...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (isError || !itinerary) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc", p: 3 }}>
        <Card sx={{ maxWidth: 500, p: 4, textAlign: "center", borderRadius: 3, boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
          <Typography variant="h5" fontWeight={700} color="#0f172a" sx={{ mb: 1 }}>
            Proposal Not Found
          </Typography>
          <Typography variant="body2" color="#64748b">
            This travel itinerary link may have expired or is no longer available. Please contact your travel planner for an updated quote.
          </Typography>
        </Card>
      </Box>
    );
  }

  const primaryColor = itinerary.agency.primaryColor || "#2563eb";
  const selectedTier =
    itinerary.pricingTiers.find((t) => t.id === selectedTierId) ||
    itinerary.pricingTiers.find((t) => t.isRecommended) ||
    itinerary.pricingTiers[0];

  const waText = encodeURIComponent(
    `Hi ${itinerary.agency.name}, I am reviewing the itinerary "${itinerary.tripTitle}". I would like more information.`
  );
  const waUrl = `https://wa.me/${itinerary.agency.whatsappNumber.replace(/[^0-9]/g, "")}?text=${waText}`;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", pb: 14 }}>
      {/* Top White-Labeled Agency Bar */}
      <Box
        sx={{
          bgcolor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          py: 1.5,
          position: "sticky",
          top: 0,
          zIndex: 1000,
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {itinerary.agency.logoUrl ? (
                <img
                  src={itinerary.agency.logoUrl}
                  alt={itinerary.agency.name}
                  style={{ height: 40, maxHeight: 40, objectFit: "contain" }}
                />
              ) : (
                <Avatar sx={{ bgcolor: primaryColor, fontWeight: 800, width: 40, height: 40 }}>
                  {itinerary.agency.name.charAt(0).toUpperCase()}
                </Avatar>
              )}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#0f172a", lineHeight: 1.2 }}>
                  {itinerary.agency.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b" }}>
                  Verified Travel Partner
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {itinerary.agency.whatsappNumber && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<WhatsAppIcon sx={{ color: "#25D366" }} />}
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                    borderColor: "#25D366",
                    color: "#166534",
                    bgcolor: "#f0fdf4",
                    "&:hover": { bgcolor: "#dcfce7", borderColor: "#22c55e" },
                  }}
                >
                  WhatsApp Us
                </Button>
              )}

              {itinerary.agency.phone && (
                <Button
                  variant="text"
                  size="small"
                  startIcon={<PhoneRoundedIcon />}
                  href={`tel:${itinerary.agency.phone}`}
                  sx={{ textTransform: "none", fontWeight: 600, color: "#475569", display: { xs: "none", sm: "flex" } }}
                >
                  {itinerary.agency.phone}
                </Button>
              )}

              <Tooltip title="Print or Save PDF">
                <IconButton size="small" onClick={() => window.print()} sx={{ color: "#475569" }}>
                  <PrintRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero Destination Banner */}
      <Box
        sx={{
          position: "relative",
          bgcolor: "#0f172a",
          color: "#fff",
          py: { xs: 6, md: 8 },
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.88)), url(${
            itinerary.coverImageUrl ||
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80"
          })`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Container maxWidth="lg">
          {itinerary.status === "ACCEPTED" && (
            <Chip
              icon={<CheckCircleRoundedIcon />}
              label="ITINERARY CONFIRMED & ACCEPTED"
              color="success"
              sx={{ fontWeight: 800, mb: 2 }}
            />
          )}

          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: "1.8rem", md: "2.75rem" }, mb: 1, letterSpacing: "-0.5px" }}>
            {itinerary.tripTitle}
          </Typography>

          {itinerary.customerName && (
            <Typography variant="h6" sx={{ color: "#cbd5e1", fontWeight: 400, mb: 3 }}>
              Prepared especially for <strong>{itinerary.customerName}</strong>
            </Typography>
          )}

          {/* Quick Metrics Chips */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            <Chip
              icon={<CalendarMonthRoundedIcon style={{ color: "#fff" }} />}
              label={`${itinerary.totalDays} Days / ${itinerary.totalNights} Nights`}
              sx={{ bgcolor: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", color: "#fff", fontWeight: 600 }}
            />

            {itinerary.startDate && (
              <Chip
                label={`Dates: ${new Date(itinerary.startDate).toLocaleDateString()}${
                  itinerary.endDate ? ` - ${new Date(itinerary.endDate).toLocaleDateString()}` : ""
                }`}
                sx={{ bgcolor: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", color: "#fff", fontWeight: 600 }}
              />
            )}

            <Chip
              icon={<PeopleAltRoundedIcon style={{ color: "#fff" }} />}
              label={`${itinerary.adultsCount} Adults${itinerary.childrenCount ? `, ${itinerary.childrenCount} Children` : ""}`}
              sx={{ bgcolor: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", color: "#fff", fontWeight: 600 }}
            />
          </Stack>
        </Container>
      </Box>

      {/* Main Content Body */}
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Grid container spacing={4}>
          {/* Left Column: Day-by-Day Timeline */}
          <Grid item xs={12} lg={8}>
            <Typography variant="h5" fontWeight={800} sx={{ color: "#0f172a", mb: 2.5 }}>
              Tour Itinerary Schedule
            </Typography>

            <Stack spacing={2}>
              {itinerary.days.map((day, idx) => (
                <Accordion
                  key={day.id}
                  defaultExpanded={idx === 0}
                  sx={{
                    borderRadius: 2.5,
                    border: "1px solid #e2e8f0",
                    "&:before": { display: "none" },
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    overflow: "hidden",
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreRoundedIcon />}
                    sx={{
                      bgcolor: "#fff",
                      px: 2.5,
                      py: 1,
                      "&.Mui-expanded": { borderBottom: "1px solid #f1f5f9" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, width: "100%", flexWrap: "wrap" }}>
                      <Chip
                        label={`Day ${day.dayNumber}`}
                        sx={{
                          bgcolor: primaryColor,
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: "0.82rem",
                        }}
                      />

                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                          {day.title}
                        </Typography>
                        {day.stayCity && (
                          <Typography variant="caption" sx={{ color: "#64748b" }}>
                            Stay City: {day.stayCity}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails sx={{ p: 2.5, bgcolor: "#fafafa" }}>
                    {/* Meals & Transport Badges */}
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                      {day.meals && day.meals.length > 0 && (
                        <Chip
                          icon={<RestaurantRoundedIcon sx={{ fontSize: 16 }} />}
                          label={`Meals: ${day.meals.join(", ")}`}
                          size="small"
                          sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 600 }}
                        />
                      )}

                      {day.transferDetails && (
                        <Chip
                          icon={<DirectionsCarRoundedIcon sx={{ fontSize: 16 }} />}
                          label={day.transferDetails}
                          size="small"
                          sx={{ bgcolor: "#e0e7ff", color: "#3730a3", fontWeight: 600 }}
                        />
                      )}
                    </Box>

                    {/* Day Description */}
                    <Typography variant="body1" sx={{ color: "#334155", lineHeight: 1.7, mb: 2.5, whiteSpace: "pre-line" }}>
                      {day.description}
                    </Typography>

                    {/* Hotel Details Card (if enabled) */}
                    {day.hotelName && (
                      <Card sx={{ p: 2, bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, mb: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <HotelRoundedIcon sx={{ color: primaryColor }} />
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                                {day.hotelName}
                              </Typography>
                              {day.roomCategory && (
                                <Typography variant="caption" color="#64748b">
                                  Category: {day.roomCategory}
                                </Typography>
                              )}
                            </Box>
                          </Box>

                          {day.hotelRating && (
                            <Rating value={day.hotelRating} readOnly size="small" />
                          )}
                        </Box>
                      </Card>
                    )}

                    {/* Day Photo Gallery */}
                    {day.photos && day.photos.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: "uppercase", display: "block", mb: 1 }}>
                          Highlights Photo Gallery
                        </Typography>
                        <Grid container spacing={1.5}>
                          {day.photos.map((photoUrl, pIdx) => (
                            <Grid item xs={6} sm={4} key={pIdx}>
                              <Box
                                component="img"
                                src={photoUrl}
                                alt={`Day ${day.dayNumber} highlight`}
                                sx={{
                                  width: "100%",
                                  height: 120,
                                  objectFit: "cover",
                                  borderRadius: 2,
                                  border: "1px solid #e2e8f0",
                                  transition: "transform 0.2s",
                                  "&:hover": { transform: "scale(1.02)" },
                                }}
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>

            {/* Inclusions & Exclusions */}
            <Box sx={{ mt: 5 }}>
              <Typography variant="h5" fontWeight={800} sx={{ color: "#0f172a", mb: 2.5 }}>
                Package Inclusions & Exclusions
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid #bbf7d0", bgcolor: "#f0fdf4", height: "100%" }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#166534", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                      <CheckCircleRoundedIcon /> What's Included
                    </Typography>

                    <Stack spacing={1.5}>
                      {(itinerary.inclusions || []).map((inc, i) => (
                        <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                          <CheckCircleRoundedIcon sx={{ fontSize: 18, color: "#16a34a", mt: 0.2 }} />
                          <Typography variant="body2" color="#166534" fontWeight={500}>
                            {inc}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid #fecaca", bgcolor: "#fef2f2", height: "100%" }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#991b1b", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                      <CancelRoundedIcon /> What's Excluded
                    </Typography>

                    <Stack spacing={1.5}>
                      {(itinerary.exclusions || []).map((exc, i) => (
                        <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                          <CancelRoundedIcon sx={{ fontSize: 18, color: "#dc2626", mt: 0.2 }} />
                          <Typography variant="body2" color="#991b1b" fontWeight={500}>
                            {exc}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* Terms & Conditions */}
            {(itinerary.termsAndConditions || itinerary.cancellationPolicy) && (
              <Box sx={{ mt: 5 }}>
                <Typography variant="h5" fontWeight={800} sx={{ color: "#0f172a", mb: 2.5 }}>
                  Booking Terms & Cancellation
                </Typography>

                {itinerary.termsAndConditions && (
                  <Card sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid #e2e8f0", mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ mb: 1 }}>
                      General Terms & Conditions
                    </Typography>
                    <Typography variant="body2" color="#475569" sx={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
                      {itinerary.termsAndConditions}
                    </Typography>
                  </Card>
                )}

                {itinerary.cancellationPolicy && (
                  <Card sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ mb: 1 }}>
                      Cancellation Policy
                    </Typography>
                    <Typography variant="body2" color="#475569" sx={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
                      {itinerary.cancellationPolicy}
                    </Typography>
                  </Card>
                )}
              </Box>
            )}
          </Grid>

          {/* Right Column: Pricing Tiers & Agency Contact */}
          <Grid item xs={12} lg={4}>
            {/* Pricing Tiers Box */}
            {itinerary.showPricing && itinerary.pricingTiers.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={800} sx={{ color: "#0f172a", mb: 2 }}>
                  Package Pricing Options
                </Typography>

                <Stack spacing={2}>
                  {itinerary.pricingTiers.map((tier) => {
                    const isSelected = selectedTier?.id === tier.id;
                    return (
                      <Card
                        key={tier.id}
                        onClick={() => setSelectedTierId(tier.id)}
                        sx={{
                          p: 2.5,
                          borderRadius: 2.5,
                          cursor: "pointer",
                          border: isSelected ? `2px solid ${primaryColor}` : "1px solid #e2e8f0",
                          bgcolor: isSelected ? "#f8faff" : "#fff",
                          transition: "all 0.2s",
                          position: "relative",
                          "&:hover": { borderColor: primaryColor, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },
                        }}
                      >
                        {tier.isRecommended && (
                          <Chip
                            label="RECOMMENDED"
                            size="small"
                            sx={{
                              position: "absolute",
                              top: 10,
                              right: 12,
                              bgcolor: primaryColor,
                              color: "#fff",
                              fontWeight: 800,
                              fontSize: "0.65rem",
                            }}
                          />
                        )}

                        <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                          {tier.tierName}
                        </Typography>

                        <Box sx={{ my: 1.5 }}>
                          <Typography variant="h5" fontWeight={800} sx={{ color: primaryColor }}>
                            ₹{(tier.totalPrice / 100).toLocaleString("en-IN")}
                          </Typography>
                          <Typography variant="caption" color="#64748b">
                            Total for {itinerary.adultsCount} Adult{itinerary.adultsCount > 1 ? "s" : ""} (₹
                            {(tier.pricePerPerson / 100).toLocaleString("en-IN")} / person)
                          </Typography>
                        </Box>

                        {tier.hotelOverview && (
                          <Typography variant="caption" color="#475569" sx={{ display: "block", pt: 1, borderTop: "1px solid #f1f5f9" }}>
                            {tier.hotelOverview}
                          </Typography>
                        )}
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Travel Agency Card */}
            <Card sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid #e2e8f0", bgcolor: "#fff", mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ mb: 1.5 }}>
                Your Travel Specialist
              </Typography>

              <Typography variant="body1" fontWeight={700} color="#0f172a">
                {itinerary.agency.name}
              </Typography>

              {itinerary.agency.address && (
                <Typography variant="caption" color="#64748b" sx={{ display: "block", mb: 1.5 }}>
                  {itinerary.agency.address}
                </Typography>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Stack spacing={1}>
                {itinerary.agency.phone && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PhoneRoundedIcon sx={{ fontSize: 16, color: "#64748b" }} />
                    <Typography variant="body2" color="#334155">
                      {itinerary.agency.phone}
                    </Typography>
                  </Box>
                )}
                {itinerary.agency.email && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <EmailRoundedIcon sx={{ fontSize: 16, color: "#64748b" }} />
                    <Typography variant="body2" color="#334155">
                      {itinerary.agency.email}
                    </Typography>
                  </Box>
                )}
              </Stack>

              {itinerary.agency.whatsappNumber && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<WhatsAppIcon />}
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    mt: 2.5,
                    bgcolor: "#25D366",
                    color: "#fff",
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                    "&:hover": { bgcolor: "#1ebe57" },
                  }}
                >
                  Direct WhatsApp Chat
                </Button>
              )}
            </Card>

            {/* Agency Footer Disclaimer */}
            {itinerary.agency.footerNotes && (
              <Typography variant="caption" color="#94a3b8" sx={{ display: "block", textAlign: "center", px: 1 }}>
                {itinerary.agency.footerNotes}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Sticky Bottom Action Bar */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid #e2e8f0",
          py: 2,
          px: { xs: 2, md: 4 },
          zIndex: 1100,
          boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box>
              {selectedTier && itinerary.showPricing ? (
                <>
                  <Typography variant="caption" color="#64748b">
                    Selected Package: <strong>{selectedTier.tierName}</strong>
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: primaryColor }}>
                    ₹{(selectedTier.totalPrice / 100).toLocaleString("en-IN")}{" "}
                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 400 }}>total</span>
                  </Typography>
                </>
              ) : (
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                  {itinerary.tripTitle}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                startIcon={<EditNoteRoundedIcon />}
                onClick={() => setFeedbackDialogOpen(true)}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
              >
                Request Customization
              </Button>

              {itinerary.allowDirectAccept && itinerary.status !== "ACCEPTED" && (
                <Button
                  variant="contained"
                  startIcon={<CheckCircleRoundedIcon />}
                  onClick={() => setAcceptDialogOpen(true)}
                  sx={{
                    bgcolor: primaryColor,
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 3,
                    boxShadow: `0 4px 14px ${primaryColor}40`,
                    "&:hover": { opacity: 0.9, bgcolor: primaryColor },
                  }}
                >
                  Accept Proposal
                </Button>
              )}

              {itinerary.status === "ACCEPTED" && (
                <Chip icon={<CheckCircleRoundedIcon />} label="Proposal Accepted" color="success" sx={{ fontWeight: 800 }} />
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Accept Confirmation Dialog */}
      <Dialog open={acceptDialogOpen} onClose={() => setAcceptDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>Accept Travel Proposal</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#475569", mb: 2 }}>
            You are accepting the proposal for <strong>{itinerary.tripTitle}</strong>
            {selectedTier && ` under the ${selectedTier.tierName} package option`}.
          </DialogContentText>
          <Typography variant="body2" color="#64748b">
            Your travel specialist at <strong>{itinerary.agency.name}</strong> will be instantly notified to block your hotels and prepare your booking vouchers.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAcceptDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            sx={{ bgcolor: primaryColor, fontWeight: 700 }}
          >
            {acceptMutation.isPending ? "Confirming..." : "Yes, Accept Itinerary"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Customization Dialog */}
      <Dialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>Request Itinerary Changes</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#475569", mb: 2.5 }}>
            Need modifications to the day plans, hotels, or travel dates? Send your request directly to your travel planner.
          </DialogContentText>

          <TextField
            fullWidth
            label="Your Name *"
            value={travelerName}
            onChange={(e) => setTravelerName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Phone / WhatsApp Number (Optional)"
            value={travelerPhone}
            onChange={(e) => setTravelerPhone(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="What changes would you like? *"
            placeholder="e.g. Can we change the hotel on Day 2 to a 5-star property? Also please add an extra day in Srinagar."
            value={travelerMessage}
            onChange={(e) => setTravelerMessage(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFeedbackDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => feedbackMutation.mutate()}
            disabled={feedbackMutation.isPending || !travelerName || !travelerMessage}
            sx={{ bgcolor: primaryColor, fontWeight: 700 }}
          >
            {feedbackMutation.isPending ? "Sending..." : "Submit Request"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={!!toastMessage}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setToastMessage(null)} severity="success" sx={{ width: "100%" }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
