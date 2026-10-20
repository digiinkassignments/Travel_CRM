import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Paper, Stepper, Step, StepLabel, Typography, TextField, Button,
  Grid, List, ListItem, ListItemText,
} from "@mui/material";
import { apiClient } from "../../api/client";

// Onboarding wizard (SRS section 13): Company Profile -> Business Info ->
// Branch Setup (Enterprise/multi_branch only) -> Finish.
export function OnboardingWizardPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [multiBranchEntitled, setMultiBranchEntitled] = useState(false);
  const [profile, setProfile] = useState({
    companyName: "", logoUrl: "", address: "", gstNumber: "", phone: "", email: "",
    businessType: "", currency: "INR",
  });
  const [branches, setBranches] = useState<Array<{ id: string; name: string; address?: string }>>([]);
  const [branchForm, setBranchForm] = useState({ name: "", address: "" });
  const [logoName, setLogoName] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    apiClient.get("/onboarding/status").then(({ data }) => {
      if (data.data.onboardingCompleted) {
        navigate("/app/dashboard", { replace: true });
        return;
      }
      setMultiBranchEntitled(data.data.multiBranchEntitled);
      setBranches(data.data.branches ?? []);
      if (data.data.companyProfile) {
        const { companyName, logoUrl, address, gstNumber, phone, email, businessType, currency } = data.data.companyProfile;
        setProfile({
          companyName: companyName ?? "", logoUrl: logoUrl ?? "", address: address ?? "",
          gstNumber: gstNumber ?? "", phone: phone ?? "", email: email ?? "",
          businessType: businessType ?? "", currency: currency ?? "INR",
        });
      }
    });
  }, [navigate]);

  const steps = multiBranchEntitled
    ? ["Company Profile", "Business Information", "Branch Setup", "Finish"]
    : ["Company Profile", "Business Information", "Finish"];

  async function saveProfile() {
    await apiClient.post("/onboarding/company-profile", profile);
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const { data } = await apiClient.post("/onboarding/company-logo", formData);
      setProfile((current) => ({ ...current, logoUrl: data.data.logoUrl }));
      setLogoName(file.name);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function addBranch() {
    const { data } = await apiClient.post("/onboarding/branches", branchForm);
    setBranches([...branches, data.data]);
    setBranchForm({ name: "", address: "" });
  }

  async function finish() {
    await apiClient.post("/onboarding/complete");
    navigate("/app/dashboard");
  }

  async function handleNext() {
    if (activeStep === 0 || activeStep === 1) await saveProfile();

    const isLastStep = activeStep === steps.length - 1;
    if (isLastStep) {
      await finish();
    } else {
      setActiveStep((s) => s + 1);
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh" bgcolor="grey.100" pt={6}>
      <Paper sx={{ p: 4, width: 560 }}>
        <Typography variant="h5" gutterBottom>Welcome — let's set up your account</Typography>
        <Stepper activeStep={activeStep} sx={{ my: 3 }}>
          {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {activeStep === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Company Name" value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} /></Grid>
            <Grid item xs={12}>
              <Button component="label" variant="outlined" disabled={uploadingLogo} sx={{ justifyContent: "flex-start", textTransform: "none", width: "100%" }}>
                {uploadingLogo ? "Uploading logo..." : logoName || (profile.logoUrl ? "Replace company logo" : "Upload company logo")}
                <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadLogo(file); }} />
              </Button>
              <Typography variant="caption" color="text.secondary">JPG, PNG or WEBP. Maximum 2MB.</Typography>
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="GST Number" value={profile.gstNumber} onChange={(e) => setProfile({ ...profile, gstNumber: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={6}><TextField fullWidth label="Business Type" placeholder="e.g. Tour Operator" value={profile.businessType} onChange={(e) => setProfile({ ...profile, businessType: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Currency" value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })} /></Grid>
          </Grid>
        )}

        {multiBranchEntitled && activeStep === 2 && (
          <Box>
            <List>
              {branches.map((b) => <ListItem key={b.id}><ListItemText primary={b.name} secondary={b.address} /></ListItem>)}
            </List>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField fullWidth label="Branch Name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Branch Address" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} /></Grid>
            </Grid>
            <Button sx={{ mt: 1 }} onClick={addBranch} disabled={!branchForm.name}>+ Add Branch</Button>
          </Box>
        )}

        {activeStep === steps.length - 1 && (
          <Typography>All set — click Finish to go to your dashboard.</Typography>
        )}

        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>Back</Button>
          <Button variant="contained" onClick={handleNext}>
            {activeStep === steps.length - 1 ? "Finish" : "Next"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
