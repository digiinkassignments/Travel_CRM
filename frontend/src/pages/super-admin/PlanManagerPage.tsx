import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  TextField,
  Chip,
  InputAdornment,
  Snackbar,
  Alert,
  Tooltip,
  IconButton,
  CircularProgress,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import AllInclusiveRoundedIcon from "@mui/icons-material/AllInclusiveRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { apiClient } from "../../api/client";

interface Plan {
  id: string;
  name: string;
  priceInPaise: number;
  entitlements: Record<string, boolean>;
  maxUsers: number | null;
  maxEnquiriesPerMonth: number | null;
}

interface FeatureMeta {
  key: string;
  label: string;
  category: "Core CRM" | "Operations & Fleet" | "Analytics & Controls" | "Enterprise";
  description: string;
}

const FEATURES_META: FeatureMeta[] = [
  { key: "enquiry_crm", label: "Enquiry CRM", category: "Core CRM", description: "Lead intake, lifecycle tracking & follow-ups" },
  { key: "quotation", label: "Quotation Engine", category: "Core CRM", description: "Dynamic price estimation and quote PDFs" },
  { key: "bookings", label: "Bookings Management", category: "Core CRM", description: "Confirmed trip logs, dispatch and ticketing" },
  { key: "payments", label: "Payments & Invoicing", category: "Core CRM", description: "Payment gateway integration & ledger tracking" },
  { key: "drivers", label: "Driver Management", category: "Operations & Fleet", description: "Roster assignments, KYC and payouts" },
  { key: "vehicles", label: "Vehicle Fleet Hub", category: "Operations & Fleet", description: "RC, insurance alerts and maintenance logs" },
  { key: "multi_branch", label: "Multi-Branch Operations", category: "Operations & Fleet", description: "Cross-city depots and regional teams" },
  { key: "basic_reports", label: "Standard Reports", category: "Analytics & Controls", description: "Monthly revenue & volume exports" },
  { key: "advanced_reports", label: "Deep Analytics & BI", category: "Analytics & Controls", description: "Customer retention, margin & cohort charts" },
  { key: "workflow_automation", label: "Automations & Triggers", category: "Analytics & Controls", description: "Auto-assignment, email and webhook alerts" },
  { key: "enhanced_controls", label: "Granular Role ACL", category: "Analytics & Controls", description: "Field-level masking & department privileges" },
  { key: "integrations", label: "Third-Party Integrations", category: "Enterprise", description: "WhatsApp Business, Fastag & GPS Telematics" },
  { key: "custom_modules", label: "Custom Dedicated Modules", category: "Enterprise", description: "Bespoke extensions tailored to the client" },
];

export function PlanManagerPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function load() {
    setLoading(true);
    apiClient
      .get("/super-admin/plans")
      .then(({ data }) => setPlans(data.data ?? []))
      .catch(() => setToast({ message: "Failed to load plans", type: "error" }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleFeature(plan: Plan, feature: string) {
    const nextState = !plan.entitlements?.[feature];
    const key = `${plan.id}-${feature}`;
    setSavingKey(key);

    const entitlements = { ...(plan.entitlements || {}), [feature]: nextState };
    try {
      await apiClient.patch(`/super-admin/plans/${plan.id}`, { entitlements });
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, entitlements } : p))
      );
      setToast({
        message: `${feature.replace(/_/g, " ")} ${nextState ? "enabled" : "disabled"} for ${plan.name}`,
        type: "success",
      });
    } catch {
      setToast({ message: "Could not update entitlement", type: "error" });
    } finally {
      setSavingKey(null);
    }
  }

  async function updateLimit(plan: Plan, field: "maxUsers" | "maxEnquiriesPerMonth", value: string) {
    const numeric = value.trim() === "" ? null : Number(value);
    if (value.trim() !== "" && isNaN(Number(value))) return;

    const key = `${plan.id}-${field}`;
    setSavingKey(key);

    try {
      await apiClient.patch(`/super-admin/plans/${plan.id}`, { [field]: numeric });
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, [field]: numeric } : p))
      );
      setToast({ message: `Updated quota for ${plan.name}`, type: "success" });
    } catch {
      setToast({ message: "Could not update plan limits", type: "error" });
    } finally {
      setSavingKey(null);
    }
  }

  const filteredFeatures = useMemo(() => {
    return FEATURES_META.filter(
      (f) =>
        f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const categories = useMemo(() => {
    return Array.from(new Set(filteredFeatures.map((f) => f.category)));
  }, [filteredFeatures]);

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Banner */}
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
            <Typography variant="h4" fontWeight={800} sx={{ color: "#0f172a", letterSpacing: "-0.02em" }}>
              Plan Manager
            </Typography>
            <Chip
              label="Live Sync"
              size="small"
              icon={<BoltRoundedIcon style={{ fontSize: 16 }} />}
              sx={{
                bgcolor: "#ecfdf5",
                color: "#059669",
                fontWeight: 700,
                fontSize: "0.72rem",
                borderRadius: "6px",
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Configure entitlements, quotas, and service limits. Changes reflect instantly on tenant requests.
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5} width={{ xs: "100%", sm: "auto" }}>
          <TextField
            size="small"
            placeholder="Search feature module..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: "100%", sm: 260 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "#ffffff",
              },
            }}
          />
          <Tooltip title="Refresh Plans">
            <span>
              <IconButton
                onClick={load}
                disabled={loading}
                sx={{
                  bgcolor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  "&:hover": { bgcolor: "#f1f5f9" },
                }}
              >
                <RefreshRoundedIcon fontSize="small" sx={{ color: "#475569" }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Matrix Board */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          bgcolor: "#ffffff",
        }}
      >
        <Box sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 720 }}>
            {/* Table Head: Plan Column Headers */}
            <TableHead>
              <TableRow sx={{ bgcolor: "#ffffff", borderBottom: "2px solid #e2e8f0" }}>
                <TableCell sx={{ minWidth: 320, py: 3, px: 3 }}>
                  <Typography variant="caption" fontWeight={800} color="#64748b" letterSpacing="0.08em">
                    FEATURE ENTITLEMENTS
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontSize="0.78rem" mt={0.5}>
                    Toggle service capability per subscription tier
                  </Typography>
                </TableCell>

                {plans.map((p, idx) => {
                  const isTopTier = idx === plans.length - 1 && plans.length > 1;
                  return (
                    <TableCell
                      key={p.id}
                      align="center"
                      sx={{
                        minWidth: 170,
                        py: 2.5,
                        px: 2,
                        bgcolor: isTopTier ? "rgba(37, 99, 235, 0.03)" : "transparent",
                        borderLeft: "1px solid #f1f5f9",
                      }}
                    >
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#0f172a" }}>
                            {p.name}
                          </Typography>
                          {isTopTier && (
                            <Chip
                              label="PRO"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                bgcolor: "#2563eb",
                                color: "#fff",
                                borderRadius: 1,
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="h6" fontWeight={800} sx={{ color: "#2563eb", lineHeight: 1.1 }}>
                          ₹{((p.priceInPaise || 0) / 100).toLocaleString("en-IN")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          per month
                        </Typography>
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            {/* Table Body: Grouped Categories */}
            <TableBody>
              {categories.map((category) => {
                const categoryFeatures = filteredFeatures.filter((f) => f.category === category);
                return (
                  <Box component="tbody" key={category} sx={{ display: "contents" }}>
                    {/* Category Divider Header */}
                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                      <TableCell
                        colSpan={plans.length + 1}
                        sx={{
                          py: 1.25,
                          px: 3,
                          borderTop: "1px solid #e2e8f0",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <TuneRoundedIcon sx={{ fontSize: 16, color: "#64748b" }} />
                          <Typography
                            variant="caption"
                            fontWeight={800}
                            sx={{ color: "#334155", letterSpacing: "0.05em", textTransform: "uppercase" }}
                          >
                            {category}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Feature Toggles */}
                    {categoryFeatures.map((feat) => (
                      <TableRow
                        key={feat.key}
                        hover
                        sx={{
                          transition: "background-color 0.15s ease",
                          "&:last-child td": { borderBottom: "1px solid #f1f5f9" },
                        }}
                      >
                        <TableCell sx={{ py: 1.75, px: 3 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: "#1e293b" }}>
                            {feat.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {feat.description}
                          </Typography>
                        </TableCell>

                        {plans.map((p, idx) => {
                          const isEnabled = !!p.entitlements?.[feat.key];
                          const isSaving = savingKey === `${p.id}-${feat.key}`;
                          const isTopTier = idx === plans.length - 1 && plans.length > 1;

                          return (
                            <TableCell
                              key={p.id}
                              align="center"
                              sx={{
                                borderLeft: "1px solid #f1f5f9",
                                bgcolor: isTopTier ? "rgba(37, 99, 235, 0.015)" : "transparent",
                                py: 1.5,
                              }}
                            >
                              <Box display="flex" justifyContent="center" alignItems="center">
                                {isSaving ? (
                                  <CircularProgress size={20} sx={{ color: "#2563eb" }} />
                                ) : (
                                  <Switch
                                    checked={isEnabled}
                                    onChange={() => toggleFeature(p, feat.key)}
                                    color="primary"
                                    sx={{
                                      "& .MuiSwitch-switchBase.Mui-checked": {
                                        color: "#2563eb",
                                      },
                                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                        backgroundColor: "#2563eb",
                                      },
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </Box>
                );
              })}

              {/* Resource Allocations Category */}
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                <TableCell
                  colSpan={plans.length + 1}
                  sx={{
                    py: 1.25,
                    px: 3,
                    borderTop: "1px solid #e2e8f0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <AllInclusiveRoundedIcon sx={{ fontSize: 16, color: "#64748b" }} />
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      sx={{ color: "#334155", letterSpacing: "0.05em", textTransform: "uppercase" }}
                    >
                      RESOURCE QUOTAS & SYSTEM LIMITS
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>

              {/* Limit 1: Max Users */}
              <TableRow hover>
                <TableCell sx={{ py: 2.25, px: 3 }}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: "#1e293b" }}>
                    Max User Seats
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total staff and admin accounts permissible per tenant. Leave blank for unlimited.
                  </Typography>
                </TableCell>

                {plans.map((p, idx) => {
                  const isTopTier = idx === plans.length - 1 && plans.length > 1;
                  const isSaving = savingKey === `${p.id}-maxUsers`;

                  return (
                    <TableCell
                      key={p.id}
                      align="center"
                      sx={{
                        borderLeft: "1px solid #f1f5f9",
                        bgcolor: isTopTier ? "rgba(37, 99, 235, 0.015)" : "transparent",
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                        <TextField
                          size="small"
                          defaultValue={p.maxUsers ?? ""}
                          placeholder="∞"
                          disabled={isSaving}
                          onBlur={(e) => updateLimit(p, "maxUsers", e.target.value)}
                          sx={{
                            width: 100,
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                              fontSize: "0.875rem",
                              fontWeight: 700,
                              bgcolor: "#ffffff",
                              textAlign: "center",
                            },
                            "& input": { textAlign: "center" },
                          }}
                        />
                        {isSaving && <CircularProgress size={16} />}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Limit 2: Max Enquiries */}
              <TableRow hover>
                <TableCell sx={{ py: 2.25, px: 3 }}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: "#1e293b" }}>
                    Max Monthly Inquiries
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Threshold limit for lead intake per billing cycle. Leave blank for unlimited.
                  </Typography>
                </TableCell>

                {plans.map((p, idx) => {
                  const isTopTier = idx === plans.length - 1 && plans.length > 1;
                  const isSaving = savingKey === `${p.id}-maxEnquiriesPerMonth`;

                  return (
                    <TableCell
                      key={p.id}
                      align="center"
                      sx={{
                        borderLeft: "1px solid #f1f5f9",
                        bgcolor: isTopTier ? "rgba(37, 99, 235, 0.015)" : "transparent",
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                        <TextField
                          size="small"
                          defaultValue={p.maxEnquiriesPerMonth ?? ""}
                          placeholder="∞"
                          disabled={isSaving}
                          onBlur={(e) => updateLimit(p, "maxEnquiriesPerMonth", e.target.value)}
                          sx={{
                            width: 100,
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                              fontSize: "0.875rem",
                              fontWeight: 700,
                              bgcolor: "#ffffff",
                              textAlign: "center",
                            },
                            "& input": { textAlign: "center" },
                          }}
                        />
                        {isSaving && <CircularProgress size={16} />}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Action Toast Feedback */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast?.type ?? "success"}
          icon={<CheckCircleRoundedIcon fontSize="inherit" />}
          sx={{
            borderRadius: 2,
            fontWeight: 600,
            bgcolor: toast?.type === "error" ? "#fef2f2" : "#0f172a",
            color: toast?.type === "error" ? "#991b1b" : "#ffffff",
            "& .MuiAlert-icon": {
              color: toast?.type === "error" ? "#dc2626" : "#22c55e",
            },
          }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}