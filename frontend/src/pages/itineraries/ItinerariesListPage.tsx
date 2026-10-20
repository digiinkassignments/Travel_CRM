import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

import { listItineraries, deleteItinerary, duplicateItinerary } from "../../api/itineraries";
import { Itinerary } from "../../types/itinerary";
import { WhatsAppModal } from "../../components/whatsapp/WhatsAppModal";

const STATUS_COLORS: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
  DRAFT: "default",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "error",
  EXPIRED: "warning",
};

export function ItinerariesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [whatsAppModalItinerary, setWhatsAppModalItinerary] = useState<Itinerary | null>(null);

  const { data: itineraries, isLoading, isError } = useQuery<Itinerary[]>({
    queryKey: ["itineraries", statusFilter],
    queryFn: () => listItineraries({ status: statusFilter || undefined }),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateItinerary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItinerary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
      setDeleteId(null);
    },
  });

  const handleCopyLink = (slug: string) => {
    const fullUrl = `${window.location.origin}/view/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
  };

  const filtered = (itineraries || []).filter((itn) => {
    const query = search.toLowerCase();
    return (
      itn.tripTitle.toLowerCase().includes(query) ||
      itn.destination.toLowerCase().includes(query) ||
      (itn.customer?.name && itn.customer.name.toLowerCase().includes(query))
    );
  });

  const totalCount = (itineraries || []).length;
  const acceptedCount = (itineraries || []).filter((i) => i.status === "ACCEPTED").length;
  const sentCount = (itineraries || []).filter((i) => i.status === "SENT").length;
  const avgDays =
    totalCount > 0
      ? Math.round((itineraries || []).reduce((acc, i) => acc + (i.totalDays || 0), 0) / totalCount)
      : 0;

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 3.5,
        }}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #0284c7 0%, #0c4a6e 100%)",
                boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
              }}
            >
              <MapRoundedIcon sx={{ color: "#fff", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.03em" }}>
                Day-Wise Itineraries
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Craft branded, interactive travel itineraries and send live links directly to travelers.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5}>
          <Chip
            label={`${totalCount} Total Proposals`}
            size="small"
            sx={{
              bgcolor: "#e0f2fe",
              color: "#0369a1",
              fontWeight: 800,
              fontSize: "0.75rem",
              borderRadius: "8px",
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => navigate("/app/itineraries/new")}
            sx={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
              fontWeight: 700,
              borderRadius: 2.5,
              textTransform: "none",
              px: 2.5,
              py: 1,
            }}
          >
            Create Itinerary
          </Button>
        </Box>
      </Box>

      {/* Metric Cards Strip */}
      <Grid container spacing={2.5} mb={3.5}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Total Proposals
              </Typography>
              <Typography variant="h4" fontWeight={900} color="#0f172a">
                {totalCount}
              </Typography>
              <Typography variant="caption" color="#0284c7" fontWeight={600}>
                Trip plans designed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Accepted Deals
              </Typography>
              <Typography variant="h4" fontWeight={900} color="#10b981">
                {acceptedCount}
              </Typography>
              <Typography variant="caption" color="#10b981" fontWeight={600}>
                Ready for booking
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Sent to Client
              </Typography>
              <Typography variant="h4" fontWeight={900} color="#0284c7">
                {sentCount}
              </Typography>
              <Typography variant="caption" color="#0284c7" fontWeight={600}>
                Under client review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Avg. Duration
              </Typography>
              <Typography variant="h4" fontWeight={900} color="#f97316">
                {avgDays} Days
              </Typography>
              <Typography variant="caption" color="#f97316" fontWeight={600}>
                Standard tour length
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter & Search Bar */}
      <Card
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by trip title, destination, or traveler name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Filter by Status"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="SENT">Sent to Client</MenuItem>
              <MenuItem value="ACCEPTED">Accepted</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Card>

      {/* Loading & Error States */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load itineraries. Please refresh or contact support.
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <Card
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            border: "1px dashed #cbd5e1",
            bgcolor: "#fff",
          }}
        >
          <MapRoundedIcon sx={{ fontSize: 64, color: "#94a3b8", mb: 1.5 }} />
          <Typography variant="h6" fontWeight={600} color="#334155">
            No itineraries found
          </Typography>
          <Typography variant="body2" color="#64748b" sx={{ maxWidth: 460, mx: "auto", mt: 0.5, mb: 2.5 }}>
            {search || statusFilter
              ? "No itineraries match your filter criteria. Try clearing search filters."
              : "You haven't built any travel itineraries yet. Start creating your first customized trip proposal!"}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => navigate("/app/itineraries/new")}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            Build First Itinerary
          </Button>
        </Card>
      )}

      {/* Itinerary Cards Grid */}
      <Grid container spacing={3}>
        {filtered.map((itn) => (
          <Grid item xs={12} sm={6} lg={4} key={itn.id}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: 2.5,
                border: "1px solid #e2e8f0",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)",
                  borderColor: "#cbd5e1",
                  transform: "translateY(-2px)",
                },
              }}
            >
              {/* Card Cover Image */}
              <Box sx={{ position: "relative" }}>
                <CardMedia
                  component="img"
                  height="160"
                  image={
                    itn.coverImageUrl ||
                    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={itn.tripTitle}
                  sx={{ objectFit: "cover" }}
                />
                <Box sx={{ position: "absolute", top: 12, right: 12 }}>
                  <Chip
                    label={itn.status}
                    color={STATUS_COLORS[itn.status] || "default"}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: "0.72rem", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}
                  />
                </Box>
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 10,
                    left: 12,
                    bgcolor: "rgba(15, 23, 42, 0.85)",
                    backdropFilter: "blur(4px)",
                    color: "#fff",
                    px: 1.25,
                    py: 0.4,
                    borderRadius: 1.5,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  {itn.totalDays} Days / {itn.totalNights} Nights
                </Box>
              </Box>

              {/* Card Content */}
              <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: "#0f172a", fontSize: "1.05rem", mb: 0.5 }}>
                  {itn.tripTitle}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ color: "#2563eb", fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, mb: 1.5 }}
                >
                  <MapRoundedIcon fontSize="small" />
                  {itn.destination}
                </Typography>

                {itn.customer?.name && (
                  <Typography
                    variant="caption"
                    sx={{ color: "#64748b", display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}
                  >
                    <PersonRoundedIcon fontSize="inherit" />
                    Guest: <strong style={{ color: "#334155" }}>{itn.customer.name}</strong>
                  </Typography>
                )}

                {itn.startDate && (
                  <Typography
                    variant="caption"
                    sx={{ color: "#64748b", display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <CalendarMonthRoundedIcon fontSize="inherit" />
                    {new Date(itn.startDate).toLocaleDateString()}
                    {itn.endDate ? ` - ${new Date(itn.endDate).toLocaleDateString()}` : ""}
                  </Typography>
                )}

                <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                    {itn._count?.days || itn.days?.length || itn.totalDays} Day Activities
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                    {itn._count?.pricingTiers || itn.pricingTiers?.length || 0} Pricing Tiers
                  </Typography>
                </Box>
              </CardContent>

              {/* Card Actions */}
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditRoundedIcon />}
                  onClick={() => navigate(`/app/itineraries/${itn.id}/edit`)}
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 1.5, fontSize: "0.8rem" }}
                >
                  Edit Builder
                </Button>

                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Tooltip title="Send Itinerary on WhatsApp">
                    <IconButton
                      size="small"
                      onClick={() => setWhatsAppModalItinerary(itn)}
                      sx={{ color: "#25d366", "&:hover": { bgcolor: "rgba(37,211,102,0.12)" } }}
                    >
                      <WhatsAppIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Copy Shareable Traveler Link">
                    <IconButton size="small" onClick={() => handleCopyLink(itn.shareSlug)} sx={{ color: "#475569" }}>
                      <ShareRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="View Live Proposal Web Page">
                    <IconButton
                      size="small"
                      component="a"
                      href={`/view/${itn.shareSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: "#2563eb" }}
                    >
                      <OpenInNewRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Duplicate Itinerary">
                    <IconButton
                      size="small"
                      onClick={() => duplicateMutation.mutate(itn.id)}
                      disabled={duplicateMutation.isPending}
                      sx={{ color: "#475569" }}
                    >
                      <ContentCopyRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => setDeleteId(itn.id)}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Itinerary?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this itinerary proposal? This will remove all day-by-day plans, photos, and pricing tiers.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copied Link Toast */}
      <Snackbar
        open={!!copiedSlug}
        autoHideDuration={3000}
        onClose={() => setCopiedSlug(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setCopiedSlug(null)} severity="success" sx={{ width: "100%" }}>
          Public proposal link copied to clipboard!
        </Alert>
      </Snackbar>

      {/* WhatsApp Share Modal */}
      {whatsAppModalItinerary && (
        <WhatsAppModal
          open={!!whatsAppModalItinerary}
          onClose={() => setWhatsAppModalItinerary(null)}
          initialPhone={whatsAppModalItinerary.customer?.phone || ""}
          customerName={whatsAppModalItinerary.customer?.name || ""}
          enquiryId={whatsAppModalItinerary.enquiryId || undefined}
          defaultCategory="ITINERARY_SHARE"
          variables={{
            trip_title: whatsAppModalItinerary.tripTitle,
            destination: whatsAppModalItinerary.destination,
            duration: `${whatsAppModalItinerary.totalDays} Days / ${whatsAppModalItinerary.totalNights} Nights`,
            itinerary_link: `${window.location.origin}/view/${whatsAppModalItinerary.shareSlug}`,
          }}
        />
      )}
    </Box>
  );
}
