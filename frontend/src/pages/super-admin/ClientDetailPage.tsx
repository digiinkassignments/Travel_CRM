import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Chip, Button, Grid, Table, TableHead, TableRow,
  TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Card, CardContent, Divider, Stack, ToggleButtonGroup, ToggleButton, Tooltip,
  CircularProgress, Snackbar, Alert, InputAdornment
} from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import { apiClient } from "../../api/client";

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

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [deletingClient, setDeletingClient] = useState(false);
  const [usage, setUsage] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [planId, setPlanId] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [payDialog, setPayDialog] = useState(false);
  const [payForm, setPayForm] = useState({
    amountInPaise: 0, date: new Date().toISOString().slice(0, 10), mode: "UPI",
    reference: "", note: "", newSubscriptionExpiry: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  });
  const [resetResult, setResetResult] = useState<{ userId: string; password: string } | null>(null);

  // Feature Flag Overrides State
  const [overrides, setOverrides] = useState<Record<string, boolean | null>>({});
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [resettingOverrides, setResettingOverrides] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [featureSearch, setFeatureSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "success",
  });

  function load() {
    apiClient.get(`/super-admin/clients/${id}`).then(({ data }) => {
      const clientData = data.data;
      setClient(clientData);
      // Initialize overrides from client.customEntitlements
      const existingOverrides = (clientData?.customEntitlements as Record<string, boolean>) || {};
      setOverrides({ ...existingOverrides });
    });
    apiClient.get(`/super-admin/clients/${id}/usage`).then(({ data }) => setUsage(data.data)).catch(() => {});
    apiClient.get(`/super-admin/clients/${id}/users`).then(({ data }) => setUsers(data.data)).catch(() => {});
    apiClient.get("/super-admin/plans").then(({ data }) => setPlans(data.data ?? [])).catch(() => {});
  }
  useEffect(load, [id]);

  async function confirmPayment() {
    await apiClient.post(`/super-admin/clients/${id}/confirm-payment`, payForm);
    setPayDialog(false);
    load();
  }

  async function action(path: string, body: Record<string, unknown> = {}) {
    await apiClient.post(`/super-admin/clients/${id}/${path}`, body);
    load();
  }

  async function forceReset(userId: string) {
    const { data } = await apiClient.post(`/super-admin/clients/${id}/users/${userId}/force-password-reset`);
    setResetResult({ userId, password: String(data.data.temporaryPassword ?? "") });
  }

  async function handleDeleteClient() {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${client.businessName}" (${client.clientCode})?\n\nWARNING: All database records, bookings, customers, staff users, itineraries, and settings for this client will be permanently wiped from the database.\n\nThis action CANNOT be undone.`
      )
    ) {
      return;
    }
    try {
      setDeletingClient(true);
      await apiClient.post(`/super-admin/clients/${id}/delete`);
      window.alert(`Client "${client.businessName}" and all associated database records have been completely purged.`);
      navigate("/super-admin/clients");
    } catch (err: any) {
      window.alert(err.response?.data?.message ?? "Could not delete client");
    } finally {
      setDeletingClient(false);
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (
      !window.confirm(
        `Permanently delete user "${userName}" from this client?\n\nTheir user account, credentials, and OTP sessions will be completely removed from the database.`
      )
    ) {
      return;
    }
    try {
      await apiClient.delete(`/super-admin/clients/${id}/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setToast({ open: true, message: `User "${userName}" permanently deleted.`, severity: "success" });
    } catch (err: any) {
      setToast({ open: true, message: err.response?.data?.message ?? "Could not delete user", severity: "error" });
    }
  }

  async function changePlan() {
    if (!planId || planId === client.planId) return;
    try {
      setSavingPlan(true);
      await apiClient.patch(`/super-admin/clients/${id}/plan`, { planId });
      setPlanId("");
      load();
    } finally {
      setSavingPlan(false);
    }
  }

  // Handle individual override switch
  function handleSetOverride(featureKey: string, value: string | null) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === "true") {
        next[featureKey] = true;
      } else if (value === "false") {
        next[featureKey] = false;
      } else {
        // null or undefined means inherit plan default
        delete next[featureKey];
      }
      return next;
    });
  }

  // Compare overrides with client's saved customEntitlements
  const hasUnsavedChanges = useMemo(() => {
    if (!client) return false;
    const saved = (client.customEntitlements as Record<string, boolean>) || {};
    const keys = Array.from(new Set([...Object.keys(saved), ...Object.keys(overrides)]));
    for (const k of keys) {
      const prevVal = saved[k];
      const curVal = overrides[k];
      if (curVal === undefined || curVal === null) {
        if (prevVal !== undefined) return true;
      } else if (curVal !== prevVal) {
        return true;
      }
    }
    return false;
  }, [client, overrides]);

  // Statistics on active overrides
  const overrideStats = useMemo(() => {
    let granted = 0;
    let revoked = 0;
    for (const val of Object.values(overrides)) {
      if (val === true) granted++;
      else if (val === false) revoked++;
    }
    return { granted, revoked, total: granted + revoked };
  }, [overrides]);

  async function saveOverrides() {
    try {
      setSavingOverrides(true);
      const res = await apiClient.patch(`/super-admin/clients/${id}/entitlements`, {
        entitlements: overrides,
      });
      setClient(res.data.data.client);
      setOverrides({ ...(res.data.data.client.customEntitlements || {}) });
      setToast({
        open: true,
        message: `Feature overrides successfully saved for ${client.businessName}!`,
        severity: "success",
      });
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.response?.data?.message || "Failed to save feature overrides",
        severity: "error",
      });
    } finally {
      setSavingOverrides(false);
    }
  }

  async function resetAllOverrides() {
    try {
      setResettingOverrides(true);
      const res = await apiClient.post(`/super-admin/clients/${id}/entitlements/reset`);
      setClient(res.data.data.client);
      setOverrides({});
      setResetConfirmOpen(false);
      setToast({
        open: true,
        message: `All feature overrides reset to ${client.plan?.name} defaults.`,
        severity: "info",
      });
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.response?.data?.message || "Failed to reset feature overrides",
        severity: "error",
      });
    } finally {
      setResettingOverrides(false);
    }
  }

  // Filtered list of features
  const filteredFeatures = useMemo(() => {
    return FEATURES_META.filter((f) => {
      const matchesCategory = selectedCategory === "ALL" || f.category === selectedCategory;
      const matchesQuery =
        !featureSearch ||
        f.label.toLowerCase().includes(featureSearch.toLowerCase()) ||
        f.key.toLowerCase().includes(featureSearch.toLowerCase()) ||
        f.description.toLowerCase().includes(featureSearch.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, featureSearch]);

  if (!client) return <Box p={4}>Loading…</Box>;

  return (
    <Box p={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4">{client.businessName}</Typography>
          <Typography color="text.secondary">{client.clientCode} · {client.email} · {client.plan?.name}</Typography>
        </Box>
        <Chip label={client.subscriptionStatus} color={client.subscriptionStatus === "ACTIVE" ? "success" : "warning"} />
      </Box>

      <Box display="flex" gap={1} mb={3} flexWrap="wrap">
        <Button variant="outlined" onClick={() => action("activate")}>Activate</Button>
        <Button variant="outlined" color="error" onClick={() => action("deactivate")}>Deactivate / Lock</Button>
        <Button variant="outlined" onClick={() => action("extend-grace", { days: 3 })}>Extend Grace +3 days</Button>
        <Button variant="contained" onClick={() => setPayDialog(true)}>Confirm Payment</Button>
        <Button
          variant="outlined"
          color="error"
          disabled={deletingClient}
          onClick={handleDeleteClient}
        >
          {deletingClient ? "Deleting Client..." : "Delete Client (Permanent)"}
        </Button>
      </Box>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>Usage</Typography>
            {usage ? (
              <>
                <Typography>Users: {usage.users.used} / {usage.users.limit ?? "Unlimited"}</Typography>
                <Typography>Enquiries this month: {usage.enquiriesThisMonth.used} / {usage.enquiriesThisMonth.limit ?? "Unlimited"}</Typography>
              </>
            ) : <Typography color="text.secondary">Not available</Typography>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>Subscription</Typography>
            <Typography gutterBottom>Current plan: <b>{client.plan?.name}</b></Typography>
            <Box display="flex" gap={1} alignItems="center" mb={2}>
              <TextField select size="small" label="Change Plan" value={planId || client.planId} onChange={(e) => setPlanId(e.target.value)} sx={{ minWidth: 220 }}>
                {plans.map((plan) => <MenuItem key={plan.id} value={plan.id}>{plan.name} · ₹{(plan.priceInPaise / 100).toLocaleString("en-IN")}</MenuItem>)}
              </TextField>
              <Button variant="outlined" onClick={changePlan} disabled={savingPlan || !planId || planId === client.planId}>{savingPlan ? "Saving..." : "Update Plan"}</Button>
            </Box>
            <Typography>Start: {new Date(client.subscriptionStart).toLocaleDateString()}</Typography>
            <Typography>Expiry: {new Date(client.subscriptionExpiry).toLocaleDateString()}</Typography>
            {client.graceEndsAt && <Typography>Grace ends: {new Date(client.graceEndsAt).toLocaleDateString()}</Typography>}
          </Paper>
        </Grid>
      </Grid>

      {/* ========================================================================= */}
      {/* Per-Client Feature Flag Overrides (Beta & VIP Customization) */}
      {/* ========================================================================= */}
      <Card sx={{ mb: 4, borderRadius: 2, border: "1px solid", borderColor: "divider", boxShadow: 2 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                <TuneRoundedIcon color="primary" sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight={700}>
                  Feature Flag Overrides (Beta & VIP Customization)
                </Typography>
                {overrideStats.total > 0 && (
                  <Chip
                    size="small"
                    label={`${overrideStats.total} Custom Override${overrideStats.total > 1 ? "s" : ""}`}
                    color="warning"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Tailor feature access specifically for <b>{client.businessName}</b> without changing their global plan definition.
                Grant Beta previews or VIP perks, or restrict modules on demand. Changes take effect on next client request.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              {overrideStats.total > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<RestartAltRoundedIcon />}
                  onClick={() => setResetConfirmOpen(true)}
                  disabled={savingOverrides || resettingOverrides}
                >
                  Reset to Plan
                </Button>
              )}
              <Button
                variant="contained"
                color={hasUnsavedChanges ? "warning" : "primary"}
                startIcon={savingOverrides ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
                onClick={saveOverrides}
                disabled={savingOverrides || resettingOverrides || !hasUnsavedChanges}
                sx={{ px: 2.5, fontWeight: 600 }}
              >
                {savingOverrides ? "Saving..." : hasUnsavedChanges ? "Save Overrides *" : "Saved"}
              </Button>
            </Stack>
          </Box>

          {/* Quick Stat Badges */}
          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mb={2.5}>
            <Chip
              size="small"
              variant="outlined"
              label={`Base Plan: ${client.plan?.name || "Standard"}`}
              sx={{ fontWeight: 600 }}
            />
            {overrideStats.granted > 0 && (
              <Chip
                size="small"
                icon={<StarRoundedIcon sx={{ fontSize: 16 }} />}
                label={`${overrideStats.granted} VIP Perks Granted`}
                color="success"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
            {overrideStats.revoked > 0 && (
              <Chip
                size="small"
                icon={<BlockRoundedIcon sx={{ fontSize: 16 }} />}
                label={`${overrideStats.revoked} Modules Revoked`}
                color="error"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
            {hasUnsavedChanges && (
              <Chip
                size="small"
                label="Unsaved Changes Pending"
                color="warning"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Filters & Search */}
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} mb={2}>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              {["ALL", "Core CRM", "Operations & Fleet", "Analytics & Controls", "Enterprise"].map((cat) => (
                <Chip
                  key={cat}
                  label={cat === "ALL" ? "All Features" : cat}
                  size="small"
                  clickable
                  color={selectedCategory === cat ? "primary" : "default"}
                  variant={selectedCategory === cat ? "filled" : "outlined"}
                  onClick={() => setSelectedCategory(cat)}
                  sx={{ fontWeight: 500 }}
                />
              ))}
            </Stack>

            <TextField
              size="small"
              placeholder="Search features..."
              value={featureSearch}
              onChange={(e) => setFeatureSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 220 }}
            />
          </Box>

          {/* Features Override Table */}
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ fontWeight: 700 }}>Feature / Module</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 150 }}>Plan Default</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 290 }}>Override Mode</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 170 }}>Effective Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFeatures.map((feat) => {
                const planDefault = !!client.plan?.entitlements?.[feat.key];
                const overrideVal = overrides[feat.key];
                const isOverridden = overrideVal !== undefined && overrideVal !== null;
                const effective = isOverridden ? overrideVal : planDefault;

                // Segmented control value: "null" (inherit), "true" (force enable), "false" (force disable)
                const currentSegment = isOverridden ? String(overrideVal) : "inherit";

                return (
                  <TableRow
                    key={feat.key}
                    hover
                    sx={{
                      bgcolor: isOverridden
                        ? overrideVal
                          ? "rgba(46, 125, 50, 0.04)"
                          : "rgba(211, 47, 47, 0.04)"
                        : "inherit",
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={600}>
                            {feat.label}
                          </Typography>
                          <Chip
                            label={feat.category}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.68rem", height: 18, color: "text.secondary" }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {feat.description}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      {planDefault ? (
                        <Chip
                          size="small"
                          icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
                          label="Included"
                          color="success"
                          variant="outlined"
                          sx={{ height: 22, fontSize: "0.72rem" }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          icon={<RemoveCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />}
                          label="Not in Plan"
                          variant="outlined"
                          sx={{ height: 22, fontSize: "0.72rem", color: "text.disabled" }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={currentSegment}
                        onChange={(_e, val) => {
                          if (!val) return;
                          if (val === "inherit") handleSetOverride(feat.key, null);
                          else handleSetOverride(feat.key, val);
                        }}
                        sx={{
                          height: 28,
                          "& .MuiToggleButton-root": {
                            py: 0.25,
                            px: 1,
                            fontSize: "0.72rem",
                            textTransform: "none",
                            fontWeight: 500,
                          },
                        }}
                      >
                        <ToggleButton value="inherit">
                          Inherit
                        </ToggleButton>
                        <ToggleButton
                          value="true"
                          sx={{
                            "&.Mui-selected": {
                              bgcolor: "success.main",
                              color: "#fff",
                              fontWeight: 700,
                              "&:hover": { bgcolor: "success.dark" },
                            },
                          }}
                        >
                          <Tooltip title="Force enable as VIP perk or Beta preview">
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <StarRoundedIcon sx={{ fontSize: 14 }} />
                              VIP Grant
                            </Box>
                          </Tooltip>
                        </ToggleButton>
                        <ToggleButton
                          value="false"
                          sx={{
                            "&.Mui-selected": {
                              bgcolor: "error.main",
                              color: "#fff",
                              fontWeight: 700,
                              "&:hover": { bgcolor: "error.dark" },
                            },
                          }}
                        >
                          <Tooltip title="Force disable access for this client">
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <BlockRoundedIcon sx={{ fontSize: 14 }} />
                              Revoke
                            </Box>
                          </Tooltip>
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </TableCell>

                    <TableCell>
                      {isOverridden ? (
                        overrideVal ? (
                          <Chip
                            size="small"
                            icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 14, color: "#1b5e20 !important" }} />}
                            label="VIP Active (Override)"
                            sx={{
                              bgcolor: "#e8f5e9",
                              color: "#1b5e20",
                              fontWeight: 700,
                              height: 24,
                              fontSize: "0.72rem",
                              border: "1px solid #a5d6a7",
                            }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            icon={<BlockRoundedIcon sx={{ fontSize: 14, color: "#b71c1c !important" }} />}
                            label="Revoked (Override)"
                            sx={{
                              bgcolor: "#ffebee",
                              color: "#b71c1c",
                              fontWeight: 700,
                              height: 24,
                              fontSize: "0.72rem",
                              border: "1px solid #ef9a9a",
                            }}
                          />
                        )
                      ) : effective ? (
                        <Chip
                          size="small"
                          label="Active (Plan)"
                          color="success"
                          sx={{ height: 22, fontSize: "0.72rem", fontWeight: 500 }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Disabled (Plan)"
                          variant="outlined"
                          sx={{ height: 22, fontSize: "0.72rem", color: "text.secondary" }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredFeatures.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    No features matched your search filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Staff */}
      <Typography variant="h6" gutterBottom>Staff</Typography>
      <Paper sx={{ mb: 3 }}>
        <Table>
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}{u.isClientAdmin && <Chip size="small" label="Admin" sx={{ ml: 1 }} />}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role?.name}</TableCell>
                <TableCell>{u.isActive ? "Active" : "Deactivated"}</TableCell>
                <TableCell align="right">
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    <Button size="small" variant="outlined" onClick={() => forceReset(u.id)}>
                      Force Password Reset
                    </Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteUser(u.id, u.name)}>
                      Delete
                    </Button>
                  </Box>
                  {resetResult && resetResult.userId === u.id && resetResult.password && (
                    <Typography variant="caption" display="block" color="success.main" sx={{ mt: 0.5 }}>
                      New temp password: {resetResult.password}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && <TableRow><TableCell colSpan={5}>No staff yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      {/* Payment History */}
      <Typography variant="h6" gutterBottom>Payment History</Typography>
      <Paper sx={{ mb: 3 }}>
        <Table>
          <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Amount</TableCell><TableCell>Mode</TableCell><TableCell>Reference</TableCell></TableRow></TableHead>
          <TableBody>
            {client.paymentLogs?.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                <TableCell>₹{(p.amountInPaise / 100).toLocaleString()}</TableCell>
                <TableCell>{p.mode}</TableCell>
                <TableCell>{p.reference ?? "—"}</TableCell>
              </TableRow>
            ))}
            {(!client.paymentLogs || client.paymentLogs.length === 0) && <TableRow><TableCell colSpan={4}>No payments recorded yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      {/* Manual Payment Dialog */}
      <Dialog open={payDialog} onClose={() => setPayDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Confirm Manual Payment</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Amount (₹)" type="number" onChange={(e) => setPayForm({ ...payForm, amountInPaise: Number(e.target.value) * 100 })} />
          <TextField label="Date" type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField select label="Mode" value={payForm.mode} onChange={(e) => setPayForm({ ...payForm, mode: e.target.value })}>
            {["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>
          <TextField label="Reference" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} />
          <TextField label="Note" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
          <TextField label="New Subscription Expiry" type="date" value={payForm.newSubscriptionExpiry} onChange={(e) => setPayForm({ ...payForm, newSubscriptionExpiry: e.target.value })} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmPayment}>Confirm & Reactivate</Button>
        </DialogActions>
      </Dialog>

      {/* Reset Overrides Confirmation Dialog */}
      <Dialog open={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>Reset Overrides to Plan Default?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will remove all custom feature flag grants and revokes for <b>{client.businessName}</b>.
            The agency will strictly inherit all feature entitlements defined by their <b>{client.plan?.name}</b> plan.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetConfirmOpen(false)} disabled={resettingOverrides}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={resetAllOverrides}
            disabled={resettingOverrides}
          >
            {resettingOverrides ? "Resetting..." : "Reset All Overrides"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", boxShadow: 3 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
