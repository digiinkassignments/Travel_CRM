import { useEffect, useRef, useState } from "react";
import {
  Box, Typography, Paper, Avatar, Button, TextField, Alert, Grid, Divider, IconButton, CircularProgress,
  Chip,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { apiClient } from "../../api/client";

interface MeProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isClientAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: { name: string } | null;
  branch: { name: string } | null;
  businessName: string;
  clientCode: string;
  ownerName: string;
  phone: string;
  companyEmail: string;
  companyProfile: {
    companyName: string | null;
    logoUrl: string | null;
    address: string | null;
    gstNumber: string | null;
    phone: string | null;
    email: string | null;
    businessType: string | null;
    currency: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    whatsappNumber?: string | null;
    websiteUrl?: string | null;
    itineraryFooterNotes?: string | null;
  } | null;
  plan: {
    id: string;
    name: string;
    priceInPaise: number;
    entitlements: Record<string, boolean>;
    maxUsers: number | null;
    maxEnquiriesPerMonth: number | null;
    maxBranches: number | null;
  };
}

export function ProfilePage() {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  // Agency White-Label Branding State
  const [editingBranding, setEditingBranding] = useState(false);
  const [primaryColorDraft, setPrimaryColorDraft] = useState("#2563eb");
  const [secondaryColorDraft, setSecondaryColorDraft] = useState("#0f172a");
  const [whatsappDraft, setWhatsappDraft] = useState("");
  const [websiteDraft, setWebsiteDraft] = useState("");
  const [footerNotesDraft, setFooterNotesDraft] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false);
  const [companyLogoError, setCompanyLogoError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [plans, setPlans] = useState<MeProfile["plan"][]>([]);
  const [requestedPlanId, setRequestedPlanId] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  function loadMe() {
    setLoading(true);
    apiClient
      .get("/client/me")
      .then(({ data }) => {
        setMe(data.data);
        setNameDraft(data.data.name);
        setEmailDraft(data.data.email);
        if (data.data.companyProfile) {
          setPrimaryColorDraft(data.data.companyProfile.primaryColor || "#2563eb");
          setSecondaryColorDraft(data.data.companyProfile.secondaryColor || "#0f172a");
          setWhatsappDraft(data.data.companyProfile.whatsappNumber || data.data.phone || "");
          setWebsiteDraft(data.data.companyProfile.websiteUrl || "");
          setFooterNotesDraft(data.data.companyProfile.itineraryFooterNotes || "");
        }
      })
      .catch(() => {
        setNameError("Failed to load profile.");
      })
      .finally(() => setLoading(false));
  }

  async function handleSaveBranding() {
    try {
      setSavingBranding(true);
      setBrandingError(null);
      await apiClient.put("/client/company-profile", {
        primaryColor: primaryColorDraft,
        secondaryColor: secondaryColorDraft,
        whatsappNumber: whatsappDraft,
        websiteUrl: websiteDraft || undefined,
        itineraryFooterNotes: footerNotesDraft || undefined,
      });
      setBrandingSaved(true);
      setEditingBranding(false);
      loadMe();
    } catch (err: any) {
      setBrandingError(err.response?.data?.message || "Failed to update branding.");
    } finally {
      setSavingBranding(false);
    }
  }

  useEffect(() => {
    loadMe();
    apiClient.get("/client/plans").then(({ data }) => setPlans(data.data ?? [])).catch(() => setPlans([]));
  }, []);

  async function requestPlan(planId: string) {
    setPlanError(null);
    setRequestedPlanId(planId);
    try {
      await apiClient.post("/payment-renewal/notify", { planId });
    } catch (err: any) {
      setPlanError(err.response?.data?.message ?? "Could not send the plan request");
      setRequestedPlanId(null);
    }
  }

  async function handleSaveName() {
    setNameError(null);
    setNameSaved(false);
    setSavingName(true);
    try {
      const { data } = await apiClient.put("/client/me", { name: nameDraft.trim(), email: emailDraft.trim() });
      setMe((prev) => (prev ? { ...prev, ...data.data } : prev));
      setEditing(false);
      setNameSaved(true);
    } catch (err: any) {
      setNameError(err.response?.data?.message ?? "Could not update your name");
    } finally {
      setSavingName(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      // No explicit Content-Type here — axios/the browser needs to set
      // the multipart boundary itself when the body is a FormData; a
      // manually-set header without a boundary breaks multer's parsing.
      const { data } = await apiClient.post("/client/me/avatar", formData);
      setMe((prev) => (prev ? { ...prev, avatarUrl: data.data.avatarUrl } : prev));
    } catch (err: any) {
      setAvatarError(err.response?.data?.message ?? "Could not upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCompanyLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompanyLogoError(null);
    setUploadingCompanyLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      await apiClient.post("/onboarding/company-logo", formData);
      window.location.reload();
    } catch (err: any) {
      setCompanyLogoError(err.response?.data?.message ?? "Could not upload company logo");
    } finally {
      setUploadingCompanyLogo(false);
      if (companyLogoInputRef.current) companyLogoInputRef.current.value = "";
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await apiClient.post("/auth/change-password", { currentPassword, newPassword });
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.response?.data?.message ?? "Could not update password");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!me) {
    return (
      <Box p={4}>
        <Alert severity="error">Could not load your profile.</Alert>
      </Box>
    );
  }

  const initial = me.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Box sx={{ p: { xs: 3, md: 4 }, maxWidth: 860, mx: "auto" }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        My Profile
      </Typography>

      <Paper
        elevation={0}
        sx={{ p: 4, mb: 3, borderRadius: 3, border: "1px solid #eef0f3", boxShadow: "0 2px 8px rgba(16,24,40,0.04)" }}
      >
        <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
          <Box position="relative">
            <Avatar src={me.avatarUrl ?? undefined} sx={{ width: 96, height: 96, fontSize: 36, bgcolor: "#2f6fed" }}>
              {initial}
            </Avatar>
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              sx={{
                position: "absolute", bottom: -4, right: -4, bgcolor: "#2f6fed", color: "#fff",
                "&:hover": { bgcolor: "#2559c4" },
              }}
            >
              {uploading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <PhotoCameraRoundedIcon fontSize="small" />}
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              hidden
              onChange={handleAvatarChange}
            />
          </Box>

          <Box flexGrow={1} minWidth={200}>
            <Typography variant="h6" fontWeight={700}>
              {me.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {me.role?.name ?? "—"} {me.isClientAdmin ? "· Admin" : ""}
            </Typography>
              <Typography variant="body2" color="text.secondary">
                {me.companyProfile?.companyName ?? me.businessName}
            </Typography>
          </Box>
        </Box>

        {avatarError && <Alert severity="error" sx={{ mt: 2 }}>{avatarError}</Alert>}
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
          JPG, PNG or WEBP. Max 2MB.
        </Typography>
        {me.isClientAdmin && (
          <Box mt={2} pt={2} borderTop="1px solid #eef0f3">
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Company Logo</Typography>
            <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
              <Avatar src={me.companyProfile?.logoUrl ?? undefined} variant="rounded" sx={{ width: 48, height: 48, bgcolor: "#eff6ff", color: "#2563eb", fontWeight: 800 }}>
                {me.businessName.trim().charAt(0).toUpperCase() || "C"}
              </Avatar>
              <Button component="label" variant="outlined" size="small" disabled={uploadingCompanyLogo} sx={{ textTransform: "none" }}>
                {uploadingCompanyLogo ? "Uploading..." : me.companyProfile?.logoUrl ? "Replace Company Logo" : "Upload Company Logo"}
                <input ref={companyLogoInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCompanyLogoChange} />
              </Button>
            </Box>
            {companyLogoError && <Alert severity="error" sx={{ mt: 1 }}>{companyLogoError}</Alert>}
          </Box>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{ p: 4, mb: 3, borderRadius: 3, border: "1px solid #eef0f3", boxShadow: "0 2px 8px rgba(16,24,40,0.04)" }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>CRM Subscription</Typography>
            <Typography variant="body2" color="text.secondary">Your current plan and available upgrades.</Typography>
          </Box>
          <Chip icon={<WorkspacePremiumRoundedIcon />} label={`${me.plan.name} Plan`} color="primary" />
        </Box>
        <Box sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
            <Box>
              <Typography fontWeight={800}>{me.plan.name}</Typography>
              <Typography variant="body2" color="text.secondary">₹{(me.plan.priceInPaise / 100).toLocaleString("en-IN")} / subscription period</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">{me.plan.maxUsers ?? "Unlimited"} users · {me.plan.maxEnquiriesPerMonth ?? "Unlimited"} leads/month</Typography>
          </Box>
        </Box>
        {planError && <Alert severity="error" sx={{ mb: 2 }}>{planError}</Alert>}
        <Grid container spacing={2}>
          {plans.filter((plan) => plan.id !== me.plan.id).map((plan) => (
            <Grid item xs={12} sm={6} md={4} key={plan.id}>
              <Box sx={{ height: "100%", p: 2, border: "1px solid #e2e8f0", borderRadius: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
                <Typography fontWeight={800}>{plan.name}</Typography>
                <Typography variant="h6" fontWeight={900}>₹{(plan.priceInPaise / 100).toLocaleString("en-IN")}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>{plan.maxUsers ?? "Unlimited"} users · {plan.maxEnquiriesPerMonth ?? "Unlimited"} leads/month</Typography>
                <Button size="small" variant="outlined" onClick={() => requestPlan(plan.id)} disabled={requestedPlanId !== null}>
                  {requestedPlanId === plan.id ? "Request Sent" : "Request This Plan"}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
        {requestedPlanId && <Alert severity="success" sx={{ mt: 2 }}>Your plan request has been sent to the account team for approval.</Alert>}
      </Paper>

      <Paper
        elevation={0}
        sx={{ p: 4, mb: 3, borderRadius: 3, border: "1px solid #eef0f3", boxShadow: "0 2px 8px rgba(16,24,40,0.04)" }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Account Details
          </Typography>
          {!editing && (
            <Button startIcon={<EditRoundedIcon />} onClick={() => { setEditing(true); setNameSaved(false); }}>
              Edit
            </Button>
          )}
        </Box>

        {nameSaved && <Alert severity="success" sx={{ mb: 2 }}>Profile updated.</Alert>}
        {nameError && <Alert severity="error" sx={{ mb: 2 }}>{nameError}</Alert>}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Full Name</Typography>
            {editing ? (
              <TextField
                fullWidth
                size="small"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                sx={{ mt: 0.5 }}
              />
            ) : (
              <Typography variant="body1" fontWeight={500}>{me.name}</Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Email Address</Typography>
            {editing ? (
              <TextField
                fullWidth
                size="small"
                type="email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                sx={{ mt: 0.5 }}
              />
            ) : (
              <Typography variant="body1" fontWeight={500}>{me.email}</Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Role</Typography>
            <Typography variant="body1" fontWeight={500}>{me.role?.name ?? "—"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Branch</Typography>
            <Typography variant="body1" fontWeight={500}>{me.branch?.name ?? "—"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Business</Typography>
            <Typography variant="body1" fontWeight={500}>{me.businessName} ({me.clientCode})</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Business Phone</Typography>
            <Typography variant="body1" fontWeight={500}>{me.companyProfile?.phone ?? me.phone ?? "—"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Business Email</Typography>
            <Typography variant="body1" fontWeight={500}>{me.companyProfile?.email ?? me.companyEmail ?? "—"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Business Type</Typography>
            <Typography variant="body1" fontWeight={500}>{me.companyProfile?.businessType ?? "—"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">GST Number</Typography>
            <Typography variant="body1" fontWeight={500}>{me.companyProfile?.gstNumber ?? "—"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Currency</Typography>
            <Typography variant="body1" fontWeight={500}>{me.companyProfile?.currency ?? "INR"}</Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Business Address</Typography>
            <Typography variant="body1" fontWeight={500}>{me.companyProfile?.address ?? "—"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Member Since</Typography>
            <Typography variant="body1" fontWeight={500}>
              {new Date(me.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Last Login</Typography>
            <Typography variant="body1" fontWeight={500}>
              {me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString() : "—"}
            </Typography>
          </Grid>
        </Grid>

        {editing && (
          <Box display="flex" gap={1.5} mt={3}>
            <Button
              variant="contained"
              disabled={savingName || !nameDraft.trim()}
              onClick={handleSaveName}
              sx={{ bgcolor: "#2f6fed", "&:hover": { bgcolor: "#2559c4" } }}
            >
              {savingName ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              onClick={() => { setEditing(false); setNameDraft(me.name); setEmailDraft(me.email); setNameError(null); }}
              disabled={savingName}
            >
              Cancel
            </Button>
          </Box>
        )}
      </Paper>

      {/* Agency White-Label Branding Card */}
      <Paper
        elevation={0}
        sx={{ p: 4, mb: 3, borderRadius: 3, border: "1px solid #eef0f3", boxShadow: "0 2px 8px rgba(16,24,40,0.04)" }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Travel Agency White-Label Branding
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Customize how your public travel itineraries and proposals look when shared with travelers.
            </Typography>
          </Box>
          {!editingBranding && me.isClientAdmin && (
            <Button startIcon={<EditRoundedIcon />} onClick={() => { setEditingBranding(true); setBrandingSaved(false); }}>
              Edit Branding
            </Button>
          )}
        </Box>

        {brandingSaved && <Alert severity="success" sx={{ mb: 2 }}>Agency branding updated successfully.</Alert>}
        {brandingError && <Alert severity="error" sx={{ mb: 2 }}>{brandingError}</Alert>}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Primary Brand Color (Used for Buttons & Accents)</Typography>
            {editingBranding ? (
              <Box display="flex" alignItems="center" gap={1.5} mt={0.5}>
                <input
                  type="color"
                  value={primaryColorDraft}
                  onChange={(e) => setPrimaryColorDraft(e.target.value)}
                  style={{ width: 42, height: 42, border: "none", borderRadius: 8, cursor: "pointer" }}
                />
                <TextField
                  size="small"
                  value={primaryColorDraft}
                  onChange={(e) => setPrimaryColorDraft(e.target.value)}
                  sx={{ width: 140 }}
                />
              </Box>
            ) : (
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: me.companyProfile?.primaryColor || "#2563eb", border: "1px solid #cbd5e1" }} />
                <Typography variant="body1" fontWeight={600}>{me.companyProfile?.primaryColor || "#2563eb"}</Typography>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Agency WhatsApp Number (For Direct Traveler Chat)</Typography>
            {editingBranding ? (
              <TextField
                fullWidth
                size="small"
                placeholder="e.g. +91 9876543210"
                value={whatsappDraft}
                onChange={(e) => setWhatsappDraft(e.target.value)}
                sx={{ mt: 0.5 }}
              />
            ) : (
              <Typography variant="body1" fontWeight={500}>{me.companyProfile?.whatsappNumber || me.phone || "—"}</Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Agency Website URL</Typography>
            {editingBranding ? (
              <TextField
                fullWidth
                size="small"
                placeholder="https://youragency.com"
                value={websiteDraft}
                onChange={(e) => setWebsiteDraft(e.target.value)}
                sx={{ mt: 0.5 }}
              />
            ) : (
              <Typography variant="body1" fontWeight={500}>{me.companyProfile?.websiteUrl || "—"}</Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Itinerary Footer Disclaimer & Notes</Typography>
            {editingBranding ? (
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                placeholder="e.g. Registered with Ministry of Tourism. All rates are subject to hotel availability at the time of booking."
                value={footerNotesDraft}
                onChange={(e) => setFooterNotesDraft(e.target.value)}
                sx={{ mt: 0.5 }}
              />
            ) : (
              <Typography variant="body1" fontWeight={500}>{me.companyProfile?.itineraryFooterNotes || "—"}</Typography>
            )}
          </Grid>
        </Grid>

        {editingBranding && (
          <Box display="flex" gap={1.5} mt={3}>
            <Button
              variant="contained"
              disabled={savingBranding}
              onClick={handleSaveBranding}
              sx={{ bgcolor: "#2f6fed", "&:hover": { bgcolor: "#2559c4" } }}
            >
              {savingBranding ? "Saving..." : "Save Branding"}
            </Button>
            <Button
              onClick={() => {
                setEditingBranding(false);
                setBrandingError(null);
              }}
              disabled={savingBranding}
            >
              Cancel
            </Button>
          </Box>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{ p: 4, borderRadius: 3, border: "1px solid #eef0f3", boxShadow: "0 2px 8px rgba(16,24,40,0.04)" }}
      >
        <Typography variant="h6" fontWeight={700} mb={2}>
          Change Password
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {passwordSaved && <Alert severity="success" sx={{ mb: 2 }}>Password updated successfully.</Alert>}
        {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}

        <Box component="form" onSubmit={handleChangePassword} sx={{ maxWidth: 420 }}>
          <TextField
            fullWidth
            label="Current Password"
            type={showPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <LockOutlinedIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} />,
            }}
          />
          <TextField
            fullWidth
            label="New Password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            helperText="At least 8 characters"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <LockOutlinedIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} />,
            }}
          />
          <TextField
            fullWidth
            label="Confirm New Password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            sx={{ mb: 1 }}
            InputProps={{
              startAdornment: <LockOutlinedIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} />,
              endAdornment: (
                <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                  {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                </IconButton>
              ),
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={changingPassword}
            sx={{ mt: 2, bgcolor: "#2f6fed", "&:hover": { bgcolor: "#2559c4" } }}
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
