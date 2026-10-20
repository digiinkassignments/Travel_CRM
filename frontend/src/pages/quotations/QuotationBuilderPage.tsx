import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Grid,
  Divider,
  InputAdornment,
  Tooltip,
  CircularProgress,
  Chip,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { apiClient } from "../../api/client";

interface ItineraryItem {
  description: string;
  amountInPaise: number;
}

export function QuotationBuilderPage() {
  const { id: existingQuotationId } = useParams();
  const [searchParams] = useSearchParams();
  const enquiryId = searchParams.get("enquiryId");
  const navigate = useNavigate();

  const [items, setItems] = useState<ItineraryItem[]>([
    { description: "", amountInPaise: 0 },
  ]);
  const [markup, setMarkup] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [terms, setTerms] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (existingQuotationId) {
      setFetching(true);
      apiClient
        .get(`/quotations/${existingQuotationId}`)
        .then(({ data }) => {
          const q = data.data;
          setItems(q.itineraryJson?.length ? q.itineraryJson : [{ description: "", amountInPaise: 0 }]);
          setMarkup((q.markupInPaise || 0) / 100);
          setDiscount((q.discountInPaise || 0) / 100);
          setTax((q.taxInPaise || 0) / 100);
          setTerms(q.termsAndConditions ?? "");
        })
        .finally(() => setFetching(false));
    }
  }, [existingQuotationId]);

  const itemsTotalInPaise = items.reduce((sum, i) => sum + (Number(i.amountInPaise) || 0), 0);
  const grandTotalInPaise =
    itemsTotalInPaise + Math.round(markup * 100) - Math.round(discount * 100) + Math.round(tax * 100);

  function updateItem(index: number, field: keyof ItineraryItem, value: string) {
    const next = [...items];
    next[index] = {
      ...next[index],
      [field]: field === "amountInPaise" ? Math.round((Number(value) || 0) * 100) : value,
    };
    setItems(next);
  }

  function addItem() {
    setItems([...items, { description: "", amountInPaise: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length === 1) {
      setItems([{ description: "", amountInPaise: 0 }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload = {
        itinerary: items.filter((i) => i.description.trim()),
        markupInPaise: Math.round(markup * 100),
        discountInPaise: Math.round(discount * 100),
        taxInPaise: Math.round(tax * 100),
        termsAndConditions: terms,
      };

      if (existingQuotationId) {
        const { data } = await apiClient.post(
          `/quotations/${existingQuotationId}/new-version`,
          payload
        );
        navigate(`/app/quotations/${data.data.id}`);
      } else {
        const { data } = await apiClient.post("/quotations", { ...payload, enquiryId });
        navigate(`/app/quotations/${data.data.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const isFormValid = items.some((i) => i.description.trim().length > 0);

  if (fetching) {
    return (
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress size={32} sx={{ color: "#2563eb" }} />
        <Typography variant="body2" color="text.secondary">
          Loading proposal template...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Navigation & Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
        <Tooltip title="Cancel & Return">
          <IconButton
            onClick={() => navigate(-1)}
            size="small"
            sx={{
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              "&:hover": { bgcolor: "#f1f5f9" },
            }}
          >
            <ArrowBackRoundedIcon fontSize="small" sx={{ color: "#475569" }} />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          QUOTATIONS / {existingQuotationId ? "VERSION INCREMENT" : "NEW ESTIMATE"}
        </Typography>
      </Box>

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
              {existingQuotationId ? "Create New Version" : "Quotation Builder"}
            </Typography>
            <Chip
              label={existingQuotationId ? "Iteration" : "Draft Studio"}
              size="small"
              icon={<ReceiptLongRoundedIcon style={{ fontSize: 14 }} />}
              sx={{
                bgcolor: "#eff6ff",
                color: "#2563eb",
                fontWeight: 800,
                fontSize: "0.72rem",
                borderRadius: "6px",
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Configure detailed itinerary legs, price adjustments, taxes, and service agreements.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!isFormValid || saving}
          startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <CheckCircleRoundedIcon />}
          sx={{
            bgcolor: "#2563eb",
            borderRadius: 2.5,
            px: 3,
            py: 1.1,
            textTransform: "none",
            fontWeight: 700,
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
            "&:hover": { bgcolor: "#1d4ed8" },
          }}
        >
          {saving ? "Publishing..." : "Save Proposal"}
        </Button>
      </Box>

      <Grid container spacing={3.5}>
        {/* Left Column: Line Items & Terms */}
        <Grid item xs={12} lg={8}>
          {/* Itinerary Items Card */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3.5,
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              boxShadow: "0 4px 16px rgba(16, 24, 40, 0.03)",
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                  Itinerary Line Items
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Specify travel sectors, fleet hire, accommodation, or tour inclusions
                </Typography>
              </Box>

              <Button
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={addItem}
                sx={{
                  bgcolor: "#eff6ff",
                  color: "#2563eb",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: 2,
                  px: 1.75,
                  "&:hover": { bgcolor: "#dbeafe" },
                }}
              >
                Add Item
              </Button>
            </Box>

            <Divider sx={{ mb: 2, borderColor: "#f1f5f9" }} />

            <Table>
              <TableHead sx={{ bgcolor: "#fafcff" }}>
                <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.5, px: 1.5, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                    DESCRIPTION
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.5, width: 180, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                    AMOUNT
                  </TableCell>
                  <TableCell sx={{ width: 48, py: 1.5 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={i} sx={{ "&:last-child td": { border: 0 } }}>
                    <TableCell sx={{ py: 1.25, px: 1.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="e.g. Airport Transfer / Innova Crysta 3-Day Package"
                        value={item.description}
                        onChange={(e) => updateItem(i, "description", e.target.value)}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "#f8fafc",
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        placeholder="0.00"
                        value={item.amountInPaise ? item.amountInPaise / 100 : ""}
                        onChange={(e) => updateItem(i, "amountInPaise", e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Typography variant="body2" color="text.secondary" fontWeight={700}>
                                ₹
                              </Typography>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "#f8fafc",
                          },
                          "& input": { fontWeight: 700 },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 1 }}>
                      <Tooltip title="Remove line item">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => removeItem(i)}
                            disabled={items.length === 1 && !item.description && !item.amountInPaise}
                            sx={{
                              color: "#94a3b8",
                              "&:hover": { color: "#ef4444", bgcolor: "#fef2f2" },
                            }}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {/* Terms & Conditions Card */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              boxShadow: "0 4px 16px rgba(16, 24, 40, 0.03)",
            }}
          >
            <Box display="flex" alignItems="center" gap={1.25} mb={2}>
              <DescriptionRoundedIcon sx={{ fontSize: 20, color: "#2563eb" }} />
              <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                Terms & Conditions
              </Typography>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Outline cancellation windows, driver allowance rules, toll/parking policies, and advance payment milestones..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2.5,
                  bgcolor: "#f8fafc",
                  fontSize: "0.875rem",
                  lineHeight: 1.6,
                },
              }}
            />
          </Paper>
        </Grid>

        {/* Right Column: Pricing Engine & Summary */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              position: "sticky",
              top: 24,
              boxShadow: "0 4px 16px rgba(16, 24, 40, 0.03)",
            }}
          >
            <Box display="flex" alignItems="center" gap={1.25} mb={2.5}>
              <CalculateRoundedIcon sx={{ fontSize: 22, color: "#2563eb" }} />
              <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                Price Computation
              </Typography>
            </Box>

            {/* Adjustments Form */}
            <Box display="flex" flexDirection="column" gap={2} mb={3}>
              <TextField
                fullWidth
                size="small"
                label="Service Markup"
                type="number"
                value={markup || ""}
                placeholder="0"
                onChange={(e) => setMarkup(Math.max(0, Number(e.target.value)))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography variant="body2" color="text.secondary" fontWeight={700}>
                        ₹
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" },
                  "& input": { fontWeight: 600 },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Commercial Discount"
                type="number"
                value={discount || ""}
                placeholder="0"
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography variant="body2" color="#dc2626" fontWeight={700}>
                        -₹
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" },
                  "& input": { fontWeight: 600, color: "#dc2626" },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Applicable Taxes (GST)"
                type="number"
                value={tax || ""}
                placeholder="0"
                onChange={(e) => setTax(Math.max(0, Number(e.target.value)))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography variant="body2" color="text.secondary" fontWeight={700}>
                        ₹
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" },
                  "& input": { fontWeight: 600 },
                }}
              />
            </Box>

            <Divider sx={{ my: 2.5, borderColor: "#f1f5f9" }} />

            {/* Financial Ledger Receipt */}
            <Box display="flex" flexDirection="column" gap={1.5}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Base Itinerary Total
                </Typography>
                <Typography variant="body2" fontWeight={700} color="#334155">
                  ₹{(itemsTotalInPaise / 100).toLocaleString("en-IN")}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Markup Adjustment
                </Typography>
                <Typography variant="body2" fontWeight={600} color="#475569">
                  +₹{Number(markup || 0).toLocaleString("en-IN")}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Applied Concession
                </Typography>
                <Typography variant="body2" fontWeight={600} color="#dc2626">
                  -₹{Number(discount || 0).toLocaleString("en-IN")}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Goods & Services Tax
                </Typography>
                <Typography variant="body2" fontWeight={600} color="#475569">
                  +₹{Number(tax || 0).toLocaleString("en-IN")}
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: "#f0f7ff",
                  border: "1px solid #dbeafe",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="caption" fontWeight={800} color="#2563eb" letterSpacing="0.04em">
                    ESTIMATED NET
                  </Typography>
                  <Typography variant="h5" fontWeight={900} color="#0f172a">
                    ₹{((grandTotalInPaise || 0) / 100).toLocaleString("en-IN")}
                  </Typography>
                </Box>
                <Chip
                  label="Draft Total"
                  size="small"
                  sx={{
                    bgcolor: "#ffffff",
                    color: "#2563eb",
                    fontWeight: 800,
                    fontSize: "0.7rem",
                    border: "1px solid #bfdbfe",
                  }}
                />
              </Box>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleSave}
              disabled={!isFormValid || saving}
              startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : null}
              sx={{
                mt: 3,
                bgcolor: "#2563eb",
                borderRadius: 2.5,
                py: 1.25,
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                "&:hover": { bgcolor: "#1d4ed8" },
              }}
            >
              {saving ? "Saving..." : "Save Proposal Draft"}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}