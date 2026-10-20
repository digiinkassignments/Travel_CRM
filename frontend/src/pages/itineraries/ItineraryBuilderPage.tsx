import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  MenuItem,
  Rating,
  Tabs,
  Tab,
  Stack,
  InputAdornment,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

import {
  getItinerary,
  createItinerary,
  updateItinerary,
  uploadItineraryPhoto,
  saveTemplateFromItinerary,
} from "../../api/itineraries";
import { apiClient } from "../../api/client";
import { Itinerary, ItineraryDay, ItineraryPricingTier } from "../../types/itinerary";
import { WhatsAppModal } from "../../components/whatsapp/WhatsAppModal";

const COMMON_INCLUSIONS_PRESETS = [
  "Daily Breakfast & Dinner",
  "All Sightseeing by Private AC Vehicle",
  "Airport / Railway Station Transfers",
  "All Toll Taxes, Parking & Driver Allowance",
  "1-Hour Sunset Shikara Ride",
  "Hotel Accommodation as per Selected Category",
  "24x7 On-Trip Assistance",
];

const COMMON_EXCLUSIONS_PRESETS = [
  "Airfare / Train Tickets",
  "Entry Tickets & Camera Fees to Monuments",
  "Personal Expenses, Laundry & Alcoholic Beverages",
  "Activities like Rafting, Paragliding & Gondola Passes",
  "Mandatory 5% GST",
  "Any items not specifically mentioned in Inclusions",
];

const DEFAULT_TERMS = `1. Check-in time is 14:00 hrs and check-out time is 11:00 hrs.
2. 50% advance deposit is required to confirm hotel and vehicle bookings.
3. Balance 50% must be cleared 7 days prior to travel date.
4. AC in vehicles will be switched off in hill stations and during vehicle halts.`;

const DEFAULT_CANCELLATION = `1. 30 days or more before departure: 10% cancellation charges.
2. 15 to 29 days before departure: 25% cancellation charges.
3. 7 to 14 days before departure: 50% cancellation charges.
4. Less than 7 days: 100% non-refundable.`;

export function ItineraryBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const enquiryIdParam = searchParams.get("enquiryId");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isEditing = Boolean(id);

  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [customInclusion, setCustomInclusion] = useState("");
  const [customExclusion, setCustomExclusion] = useState("");

  // Customers dropdown
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["customers-dropdown"],
    queryFn: async () => {
      const { data } = await apiClient.get("/customers");
      return data.data || [];
    },
  });

  // State
  const [tripTitle, setTripTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [enquiryId, setEnquiryId] = useState(enquiryIdParam || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalDays, setTotalDays] = useState(3);
  const [totalNights, setTotalNights] = useState(2);
  const [adultsCount, setAdultsCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [shareSlug, setShareSlug] = useState("");
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

  const [showPricing, setShowPricing] = useState(true);
  const [showHotels, setShowHotels] = useState(true);
  const [allowDirectAccept, setAllowDirectAccept] = useState(true);

  const [days, setDays] = useState<ItineraryDay[]>([
    {
      dayNumber: 1,
      title: "Arrival & Sightseeing",
      stayCity: "",
      description: "Warm reception upon arrival. Transfer to hotel and check-in. Evening at leisure.",
      meals: ["Dinner"],
      hotelName: "",
      roomCategory: "Deluxe Room",
      hotelRating: 4,
      transferDetails: "Private AC Vehicle Airport Pickup",
      photos: [],
    },
  ]);

  const [pricingTiers, setPricingTiers] = useState<ItineraryPricingTier[]>([
    {
      tierName: "Standard (3★)",
      pricePerPerson: 1800000, // ₹18,000 in Paise
      totalPrice: 3600000,    // ₹36,000 in Paise
      hotelOverview: "Comfortable 3-star boutique hotels with daily breakfast & dinner",
      isRecommended: false,
    },
    {
      tierName: "Deluxe (4★)",
      pricePerPerson: 2500000, // ₹25,000 in Paise
      totalPrice: 5000000,    // ₹50,000 in Paise
      hotelOverview: "Premium 4-star hotels with mountain/lake view rooms & dinner",
      isRecommended: true,
    },
  ]);

  const [inclusions, setInclusions] = useState<string[]>(COMMON_INCLUSIONS_PRESETS.slice(0, 4));
  const [exclusions, setExclusions] = useState<string[]>(COMMON_EXCLUSIONS_PRESETS.slice(0, 4));
  const [termsAndConditions, setTermsAndConditions] = useState(DEFAULT_TERMS);
  const [cancellationPolicy, setCancellationPolicy] = useState(DEFAULT_CANCELLATION);

  // If editing, load data
  const { data: existingItinerary, isLoading: isFetchingItinerary } = useQuery({
    queryKey: ["itinerary", id],
    queryFn: () => getItinerary(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingItinerary) {
      setTripTitle(existingItinerary.tripTitle);
      setDestination(existingItinerary.destination);
      setCustomerId(existingItinerary.customerId || "");
      setEnquiryId(existingItinerary.enquiryId || "");
      setStartDate(existingItinerary.startDate ? existingItinerary.startDate.split("T")[0] : "");
      setEndDate(existingItinerary.endDate ? existingItinerary.endDate.split("T")[0] : "");
      setTotalDays(existingItinerary.totalDays);
      setTotalNights(existingItinerary.totalNights);
      setAdultsCount(existingItinerary.adultsCount);
      setChildrenCount(existingItinerary.childrenCount);
      setCoverImageUrl(existingItinerary.coverImageUrl || "");
      setShareSlug(existingItinerary.shareSlug);
      setShowPricing(existingItinerary.showPricing);
      setShowHotels(existingItinerary.showHotels);
      setAllowDirectAccept(existingItinerary.allowDirectAccept);
      if (existingItinerary.days?.length) {
        setDays(existingItinerary.days);
      }
      if (existingItinerary.pricingTiers?.length) {
        setPricingTiers(existingItinerary.pricingTiers);
      }
      if (Array.isArray(existingItinerary.inclusions)) {
        setInclusions(existingItinerary.inclusions as string[]);
      }
      if (Array.isArray(existingItinerary.exclusions)) {
        setExclusions(existingItinerary.exclusions as string[]);
      }
      if (existingItinerary.termsAndConditions) {
        setTermsAndConditions(existingItinerary.termsAndConditions);
      }
      if (existingItinerary.cancellationPolicy) {
        setCancellationPolicy(existingItinerary.cancellationPolicy);
      }
    }
  }, [existingItinerary]);

  // If new itinerary from enquiry, pre-populate enquiry data
  useEffect(() => {
    if (!isEditing && enquiryIdParam) {
      apiClient.get(`/enquiries/${enquiryIdParam}`).then(({ data }) => {
        const enq = data.data;
        if (enq) {
          setEnquiryId(enq.id);
          if (enq.customerId) setCustomerId(enq.customerId);
          if (enq.destination) {
            setDestination(enq.destination);
            setTripTitle(`${enq.destination} Tour Proposal`);
          }
          if (enq.travelDate) {
            setStartDate(enq.travelDate.split("T")[0]);
          }
        }
      });
    }
  }, [isEditing, enquiryIdParam]);

  // Day Handlers
  const handleAddDay = () => {
    const nextDayNum = days.length + 1;
    setDays((prev) => [
      ...prev,
      {
        dayNumber: nextDayNum,
        title: `Day ${nextDayNum}: Sightseeing & Leisure`,
        stayCity: "",
        description: "Full day excursion to scenic highlights and local attractions.",
        meals: ["Breakfast"],
        hotelName: "",
        roomCategory: "Deluxe Room",
        hotelRating: 4,
        transferDetails: "Private AC Vehicle",
        photos: [],
      },
    ]);
    setTotalDays((prev) => Math.max(prev, nextDayNum));
    setTotalNights((prev) => Math.max(prev, nextDayNum - 1));
  };

  const handleDeleteDay = (index: number) => {
    if (days.length <= 1) return;
    const updated = days.filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 }));
    setDays(updated);
    setTotalDays(updated.length);
    setTotalNights(Math.max(0, updated.length - 1));
  };

  const handleMoveDay = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= days.length) return;
    const reordered = [...days];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setDays(reordered.map((d, i) => ({ ...d, dayNumber: i + 1 })));
  };

  const handleUpdateDay = (index: number, fields: Partial<ItineraryDay>) => {
    setDays((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...fields };
      return copy;
    });
  };

  const handleToggleMeal = (dayIndex: number, meal: string) => {
    const currentMeals = days[dayIndex].meals || [];
    const hasMeal = currentMeals.includes(meal);
    const newMeals = hasMeal ? currentMeals.filter((m) => m !== meal) : [...currentMeals, meal];
    handleUpdateDay(dayIndex, { meals: newMeals });
  };

  const handlePhotoUpload = async (dayIndex: number, file: File) => {
    try {
      const res = await uploadItineraryPhoto(file);
      const currentPhotos = days[dayIndex].photos || [];
      handleUpdateDay(dayIndex, { photos: [...currentPhotos, res.url] });
      setToast("Photo uploaded successfully!");
    } catch {
      setToast("Photo upload failed. Please try a JPG or PNG file under 5MB.");
    }
  };

  // Pricing Tier Handlers
  const handleAddTier = () => {
    setPricingTiers((prev) => [
      ...prev,
      {
        tierName: "Luxury (5★)",
        pricePerPerson: 3500000,
        totalPrice: 7000000,
        hotelOverview: "5-star luxury resorts & palace properties with gourmet dining",
        isRecommended: false,
      },
    ]);
  };

  const handleUpdateTier = (index: number, fields: Partial<ItineraryPricingTier>) => {
    setPricingTiers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...fields };
      return copy;
    });
  };

  const handleDeleteTier = (index: number) => {
    if (pricingTiers.length <= 1) return;
    setPricingTiers((prev) => prev.filter((_, i) => i !== index));
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tripTitle: tripTitle || `${destination} Travel Package`,
        destination,
        customerId: customerId || null,
        enquiryId: enquiryId || null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        totalDays,
        totalNights,
        adultsCount,
        childrenCount,
        coverImageUrl: coverImageUrl || null,
        inclusions,
        exclusions,
        termsAndConditions,
        cancellationPolicy,
        showPricing,
        showHotels,
        allowDirectAccept,
        days,
        pricingTiers,
      };

      if (isEditing) {
        return updateItinerary(id!, payload);
      } else {
        return createItinerary(payload);
      }
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
      setToast("Itinerary saved successfully!");
      setShareSlug(saved.shareSlug);
      if (!isEditing) {
        navigate(`/app/itineraries/${saved.id}/edit`, { replace: true });
      }
    },
    onError: (err: any) => {
      setToast(err.response?.data?.message || "Failed to save itinerary. Please check all required fields.");
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: () => saveTemplateFromItinerary(id!),
    onSuccess: () => {
      setToast("Saved as reusable Master Tour Template!");
    },
  });

  if (isFetchingItinerary) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Top Action Bar */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton onClick={() => navigate("/app/itineraries")} sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: "#0f172a" }}>
              {isEditing ? "Edit Travel Itinerary" : "Create New Itinerary"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              {tripTitle || "Build customized day-wise plans with multi-tier pricing"}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {shareSlug && (
            <>
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={() => setWhatsAppOpen(true)}
                sx={{
                  bgcolor: "#25d366",
                  "&:hover": { bgcolor: "#1ebe5d" },
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                }}
              >
                Share on WhatsApp
              </Button>

              <Button
                variant="outlined"
                color="primary"
                startIcon={<OpenInNewRoundedIcon />}
                component="a"
                href={`/view/${shareSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
              >
                Preview Client Link
              </Button>
            </>
          )}

          {isEditing && (
            <Button
              variant="outlined"
              startIcon={<BookmarkBorderRoundedIcon />}
              onClick={() => saveTemplateMutation.mutate()}
              disabled={saveTemplateMutation.isPending}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              Save as Template
            </Button>
          )}

          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            sx={{
              bgcolor: "#2563eb",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            {saveMutation.isPending ? "Saving..." : "Save Itinerary"}
          </Button>
        </Box>
      </Box>

      {/* Main Form Tabs */}
      <Card sx={{ mb: 3, borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
            <Tab label="1. Trip Overview" sx={{ fontWeight: 600, textTransform: "none" }} />
            <Tab label={`2. Day-by-Day Timeline (${days.length})`} sx={{ fontWeight: 600, textTransform: "none" }} />
            <Tab label={`3. Pricing Tiers (${pricingTiers.length})`} sx={{ fontWeight: 600, textTransform: "none" }} />
            <Tab label="4. Inclusions & Policies" sx={{ fontWeight: 600, textTransform: "none" }} />
          </Tabs>
        </Box>

        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          {/* TAB 0: TRIP OVERVIEW */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Trip / Package Title *"
                  placeholder="e.g. 5N/6D Magical Kashmir Honeymoon Special"
                  value={tripTitle}
                  onChange={(e) => setTripTitle(e.target.value)}
                  required
                  sx={{ mb: 2.5 }}
                />

                <Grid container spacing={2} sx={{ mb: 2.5 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Destination *"
                      placeholder="e.g. Kashmir, India or Bali, Indonesia"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Assign Customer / Traveler"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                    >
                      <MenuItem value="">-- Select Customer (Optional) --</MenuItem>
                      {customers.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name} ({c.phone})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>

                <Grid container spacing={2} sx={{ mb: 2.5 }}>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      type="date"
                      fullWidth
                      label="Start Date"
                      InputLabelProps={{ shrink: true }}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      type="date"
                      fullWidth
                      label="End Date"
                      InputLabelProps={{ shrink: true }}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Total Days"
                      value={totalDays}
                      onChange={(e) => setTotalDays(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Total Nights"
                      value={totalNights}
                      onChange={(e) => setTotalNights(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Adults Count"
                      value={adultsCount}
                      onChange={(e) => setAdultsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Children Count"
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Cover Image & Visibility Toggles */}
              <Grid item xs={12} md={4}>
                <Card sx={{ p: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#0f172a", mb: 1 }}>
                    Cover Image
                  </Typography>

                  <Box
                    sx={{
                      height: 140,
                      borderRadius: 1.5,
                      bgcolor: "#e2e8f0",
                      backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 1.5,
                      border: "1px dashed #cbd5e1",
                    }}
                  >
                    {!coverImageUrl && (
                      <Typography variant="caption" color="#64748b">
                        No cover image
                      </Typography>
                    )}
                  </Box>

                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Cover Image URL..."
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    sx={{ mb: 1 }}
                  />

                  <Button
                    variant="outlined"
                    size="small"
                    component="label"
                    startIcon={<PhotoCameraRoundedIcon />}
                    fullWidth
                    sx={{ textTransform: "none", mb: 2 }}
                  >
                    Upload Cover Photo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const res = await uploadItineraryPhoto(file);
                          setCoverImageUrl(res.url);
                        }
                      }}
                    />
                  </Button>

                  <Divider sx={{ my: 1.5 }} />

                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#0f172a", mb: 1 }}>
                    Client Link Visibility Settings
                  </Typography>

                  <FormControlLabel
                    control={<Switch checked={showPricing} onChange={(e) => setShowPricing(e.target.checked)} />}
                    label={<Typography variant="body2">Show Pricing Tiers to Client</Typography>}
                  />

                  <FormControlLabel
                    control={<Switch checked={showHotels} onChange={(e) => setShowHotels(e.target.checked)} />}
                    label={<Typography variant="body2">Show Hotel Names in Itinerary</Typography>}
                  />

                  <FormControlLabel
                    control={<Switch checked={allowDirectAccept} onChange={(e) => setAllowDirectAccept(e.target.checked)} />}
                    label={<Typography variant="body2">Allow Direct "Accept" Button</Typography>}
                  />
                </Card>
              </Grid>
            </Grid>
          )}

          {/* TAB 1: DAY-BY-DAY TIMELINE */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                  Timeline ({days.length} Days)
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={handleAddDay}
                  size="small"
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                >
                  Add Next Day
                </Button>
              </Box>

              <Stack spacing={2.5}>
                {days.map((day, idx) => (
                  <Card
                    key={idx}
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      border: "1px solid #e2e8f0",
                      bgcolor: "#fff",
                      position: "relative",
                      transition: "box-shadow 0.2s",
                      "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
                    }}
                  >
                    {/* Day Header Row */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Chip
                          label={`Day ${day.dayNumber}`}
                          color="primary"
                          sx={{ fontWeight: 800, fontSize: "0.85rem", height: 30 }}
                        />
                        <TextField
                          size="small"
                          placeholder="Day Title e.g. Srinagar Arrival & Shikara Ride"
                          value={day.title}
                          onChange={(e) => handleUpdateDay(idx, { title: e.target.value })}
                          sx={{ minWidth: { xs: 180, sm: 320 } }}
                        />
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          disabled={idx === 0}
                          onClick={() => handleMoveDay(idx, "up")}
                          title="Move Day Up"
                        >
                          <ArrowUpwardRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          disabled={idx === days.length - 1}
                          onClick={() => handleMoveDay(idx, "down")}
                          title="Move Day Down"
                        >
                          <ArrowDownwardRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={days.length <= 1}
                          onClick={() => handleDeleteDay(idx)}
                          title="Delete Day"
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Day Fields */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Stay City / Region"
                          placeholder="e.g. Srinagar or Gulmarg"
                          value={day.stayCity || ""}
                          onChange={(e) => handleUpdateDay(idx, { stayCity: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Hotel Name"
                          placeholder="e.g. Grand Mumtaz / Wangnoo Houseboat"
                          value={day.hotelName || ""}
                          onChange={(e) => handleUpdateDay(idx, { hotelName: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
                          <Typography variant="caption" fontWeight={600} color="#64748b">
                            Star:
                          </Typography>
                          <Rating
                            value={day.hotelRating || 3}
                            onChange={(_, val) => handleUpdateDay(idx, { hotelRating: val || 3 })}
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Room Category"
                          placeholder="e.g. Deluxe Lake View Room"
                          value={day.roomCategory || ""}
                          onChange={(e) => handleUpdateDay(idx, { roomCategory: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Cab / Transfer Details"
                          placeholder="e.g. Private AC Innova for local sightseeing"
                          value={day.transferDetails || ""}
                          onChange={(e) => handleUpdateDay(idx, { transferDetails: e.target.value })}
                        />
                      </Grid>
                    </Grid>

                    {/* Meal Plan Chips */}
                    <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="body2" fontWeight={600} color="#475569">
                        Meals on this day:
                      </Typography>
                      {["Breakfast", "Lunch", "Dinner"].map((meal) => {
                        const active = (day.meals || []).includes(meal);
                        return (
                          <Chip
                            key={meal}
                            label={meal}
                            clickable
                            color={active ? "primary" : "default"}
                            variant={active ? "filled" : "outlined"}
                            onClick={() => handleToggleMeal(idx, meal)}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        );
                      })}
                    </Box>

                    {/* Day Description */}
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      size="small"
                      label="Day Sightseeing & Activity Notes"
                      placeholder="Detailed schedule of monuments, activities, scenic spots, and guidelines for travelers..."
                      value={day.description}
                      onChange={(e) => handleUpdateDay(idx, { description: e.target.value })}
                      sx={{ mb: 2 }}
                    />

                    {/* Day Photos */}
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Typography variant="caption" fontWeight={700} color="#475569">
                          Day Photos (Shown in public traveler gallery)
                        </Typography>
                        <Button
                          variant="text"
                          size="small"
                          component="label"
                          startIcon={<PhotoCameraRoundedIcon />}
                          sx={{ textTransform: "none", fontSize: "0.75rem" }}
                        >
                          Add Photo
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(idx, file);
                            }}
                          />
                        </Button>
                      </Box>

                      {day.photos && day.photos.length > 0 && (
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {day.photos.map((photoUrl, pIdx) => (
                            <Box
                              key={pIdx}
                              sx={{
                                position: "relative",
                                width: 70,
                                height: 50,
                                borderRadius: 1.5,
                                overflow: "hidden",
                                border: "1px solid #cbd5e1",
                              }}
                            >
                              <img src={photoUrl} alt="Day preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const updated = day.photos?.filter((_, i) => i !== pIdx);
                                  handleUpdateDay(idx, { photos: updated });
                                }}
                                sx={{
                                  position: "absolute",
                                  top: 2,
                                  right: 2,
                                  bgcolor: "rgba(0,0,0,0.6)",
                                  color: "#fff",
                                  p: "2px",
                                  "&:hover": { bgcolor: "rgba(220,38,38,0.8)" },
                                }}
                              >
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 12 }} />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Card>
                ))}
              </Stack>

              <Box sx={{ mt: 3, textAlign: "center" }}>
                <Button
                  variant="outlined"
                  startIcon={<AddRoundedIcon />}
                  onClick={handleAddDay}
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                >
                  Add Another Day
                </Button>
              </Box>
            </Box>
          )}

          {/* TAB 2: PRICING TIERS */}
          {activeTab === 2 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                    Package Pricing Options ({pricingTiers.length} Tiers)
                  </Typography>
                  <Typography variant="body2" color="#64748b">
                    Give travelers flexible choices (e.g. Standard 3★ vs Deluxe 4★ vs Luxury 5★).
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={handleAddTier}
                  size="small"
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                >
                  Add Pricing Tier
                </Button>
              </Box>

              <Grid container spacing={3}>
                {pricingTiers.map((tier, idx) => (
                  <Grid item xs={12} md={6} lg={4} key={idx}>
                    <Card
                      sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        border: tier.isRecommended ? "2px solid #2563eb" : "1px solid #e2e8f0",
                        position: "relative",
                        bgcolor: tier.isRecommended ? "#f8faff" : "#fff",
                      }}
                    >
                      {tier.isRecommended && (
                        <Chip
                          label="RECOMMENDED"
                          color="primary"
                          size="small"
                          sx={{ position: "absolute", top: 12, right: 12, fontWeight: 800, fontSize: "0.68rem" }}
                        />
                      )}

                      <TextField
                        fullWidth
                        size="small"
                        label="Tier Name *"
                        value={tier.tierName}
                        onChange={(e) => handleUpdateTier(idx, { tierName: e.target.value })}
                        sx={{ mb: 2, mt: 1 }}
                      />

                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Price Per Person (₹)"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                        value={tier.pricePerPerson / 100}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          handleUpdateTier(idx, {
                            pricePerPerson: Math.round(val * 100),
                            totalPrice: Math.round(val * adultsCount * 100),
                          });
                        }}
                        sx={{ mb: 2 }}
                      />

                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Total Package Price (₹)"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                        value={tier.totalPrice / 100}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          handleUpdateTier(idx, { totalPrice: Math.round(val * 100) });
                        }}
                        sx={{ mb: 2 }}
                      />

                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        label="Hotel / Service Highlights"
                        placeholder="e.g. 4-star city center hotels with buffet breakfast"
                        value={tier.hotelOverview || ""}
                        onChange={(e) => handleUpdateTier(idx, { hotelOverview: e.target.value })}
                        sx={{ mb: 2 }}
                      />

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1, borderTop: "1px solid #f1f5f9" }}>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={tier.isRecommended}
                              onChange={(e) => {
                                // Toggle recommendation exclusively or independently
                                const checked = e.target.checked;
                                setPricingTiers((prev) =>
                                  prev.map((t, i) => ({ ...t, isRecommended: i === idx ? checked : false }))
                                );
                              }}
                            />
                          }
                          label={<Typography variant="caption" fontWeight={600}>Recommended</Typography>}
                        />

                        <IconButton
                          size="small"
                          color="error"
                          disabled={pricingTiers.length <= 1}
                          onClick={() => handleDeleteTier(idx)}
                          title="Delete Tier"
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* TAB 3: INCLUSIONS & POLICIES */}
          {activeTab === 3 && (
            <Grid container spacing={3}>
              {/* Inclusions */}
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#16a34a", mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckCircleRoundedIcon fontSize="small" />
                    Inclusions
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Add custom inclusion..."
                      value={customInclusion}
                      onChange={(e) => setCustomInclusion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customInclusion.trim()) {
                          e.preventDefault();
                          setInclusions((prev) => [...prev, customInclusion.trim()]);
                          setCustomInclusion("");
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        if (customInclusion.trim()) {
                          setInclusions((prev) => [...prev, customInclusion.trim()]);
                          setCustomInclusion("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </Box>

                  {/* Active Inclusions */}
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    {inclusions.map((item, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: 1,
                          bgcolor: "#f0fdf4",
                          borderRadius: 1.5,
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <Typography variant="body2" color="#166534">
                          ✓ {item}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setInclusions((prev) => prev.filter((_, i) => i !== idx))}
                          sx={{ p: 0.5 }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 16, color: "#dc2626" }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>

                  <Typography variant="caption" fontWeight={600} color="#64748b">
                    Quick Presets (Click to add):
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                    {COMMON_INCLUSIONS_PRESETS.map((preset) => (
                      <Chip
                        key={preset}
                        label={`+ ${preset}`}
                        size="small"
                        onClick={() => {
                          if (!inclusions.includes(preset)) setInclusions((prev) => [...prev, preset]);
                        }}
                        sx={{ fontSize: "0.72rem" }}
                      />
                    ))}
                  </Box>
                </Card>
              </Grid>

              {/* Exclusions */}
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#dc2626", mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <CancelRoundedIcon fontSize="small" />
                    Exclusions
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Add custom exclusion..."
                      value={customExclusion}
                      onChange={(e) => setCustomExclusion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customExclusion.trim()) {
                          e.preventDefault();
                          setExclusions((prev) => [...prev, customExclusion.trim()]);
                          setCustomExclusion("");
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      onClick={() => {
                        if (customExclusion.trim()) {
                          setExclusions((prev) => [...prev, customExclusion.trim()]);
                          setCustomExclusion("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </Box>

                  {/* Active Exclusions */}
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    {exclusions.map((item, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: 1,
                          bgcolor: "#fef2f2",
                          borderRadius: 1.5,
                          border: "1px solid #fecaca",
                        }}
                      >
                        <Typography variant="body2" color="#991b1b">
                          ✕ {item}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setExclusions((prev) => prev.filter((_, i) => i !== idx))}
                          sx={{ p: 0.5 }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 16, color: "#dc2626" }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>

                  <Typography variant="caption" fontWeight={600} color="#64748b">
                    Quick Presets (Click to add):
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                    {COMMON_EXCLUSIONS_PRESETS.map((preset) => (
                      <Chip
                        key={preset}
                        label={`+ ${preset}`}
                        size="small"
                        onClick={() => {
                          if (!exclusions.includes(preset)) setExclusions((prev) => [...prev, preset]);
                        }}
                        sx={{ fontSize: "0.72rem" }}
                      />
                    ))}
                  </Box>
                </Card>
              </Grid>

              {/* Terms & Conditions */}
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#0f172a", mb: 1 }}>
                    Terms & Conditions
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                  />
                </Card>
              </Grid>

              {/* Cancellation Policy */}
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#0f172a", mb: 1 }}>
                    Cancellation & Refund Policy
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={cancellationPolicy}
                    onChange={(e) => setCancellationPolicy(e.target.value)}
                  />
                </Card>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setToast(null)} severity="info" sx={{ width: "100%" }}>
          {toast}
        </Alert>
      </Snackbar>

      {/* WhatsApp Share Modal */}
      {shareSlug && (
        <WhatsAppModal
          open={whatsAppOpen}
          onClose={() => setWhatsAppOpen(false)}
          initialPhone={customers.find((c: any) => c.id === customerId)?.phone || ""}
          customerName={customers.find((c: any) => c.id === customerId)?.name || ""}
          enquiryId={enquiryId || undefined}
          defaultCategory="ITINERARY_SHARE"
          variables={{
            trip_title: tripTitle,
            destination,
            duration: `${totalDays} Days / ${totalNights} Nights`,
            itinerary_link: `${window.location.origin}/view/${shareSlug}`,
          }}
        />
      )}
    </Box>
  );
}
