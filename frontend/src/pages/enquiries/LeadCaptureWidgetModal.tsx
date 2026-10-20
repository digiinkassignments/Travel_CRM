import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenInNewIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  Visibility as PreviewIcon,
  CheckCircle as CheckIcon,
  Language as GlobeIcon,
  AutoAwesome as SparklesIcon,
} from "@mui/icons-material";
import { apiClient } from "../../api/client";

interface LeadCaptureWidgetModalProps {
  open: boolean;
  onClose: () => void;
  clientCode?: string;
}

const PRESET_SOURCES = [
  "Website",
  "Landing Page",
  "Google Ads",
  "Facebook / Instagram",
  "WhatsApp Bio",
  "Partner Portal",
];

export function LeadCaptureWidgetModal({ open, onClose, clientCode: initialClientCode }: LeadCaptureWidgetModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [clientCode, setClientCode] = useState<string>(initialClientCode || "");
  const [agencyName, setAgencyName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sourceTag, setSourceTag] = useState("Website");
  const [copiedSnackbar, setCopiedSnackbar] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState("");

  useEffect(() => {
    if (open) {
      if (!initialClientCode) {
        setLoading(true);
        apiClient
          .get("/client/profile")
          .then(({ data }) => {
            if (data.data?.clientCode) {
              setClientCode(data.data.clientCode);
            }
            if (data.data?.companyProfile?.companyName || data.data?.businessName) {
              setAgencyName(data.data?.companyProfile?.companyName || data.data?.businessName);
            }
          })
          .catch((err) => console.error("Error fetching client profile", err))
          .finally(() => setLoading(false));
      } else {
        setClientCode(initialClientCode);
      }
    }
  }, [open, initialClientCode]);

  const origin = window.location.origin;
  const encodedSource = encodeURIComponent(sourceTag.trim() || "Website");
  const formUrl = clientCode ? `${origin}/lead-form/${clientCode}?source=${encodedSource}` : "";

  const iframeSnippet = `<iframe\n  src="${formUrl}"\n  width="100%"\n  height="820"\n  frameborder="0"\n  style="border: none; border-radius: 12px; width: 100%; max-width: 680px; display: block; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"\n  title="${agencyName || "Travel"} Inquiry Form"\n></iframe>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessage(`${label} copied to clipboard!`);
    setCopiedSnackbar(true);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            maxHeight: "92vh",
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            m: 0,
            p: 2.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "#0f172a",
            color: "#ffffff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <GlobeIcon sx={{ color: "#38bdf8", fontSize: 26 }} />
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                Website Lead Capture Form
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                Embed on your website or share directly to capture client inquiries 24/7
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff" } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: "#f8fafc" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress size={36} />
            </Box>
          ) : !clientCode ? (
            <Alert severity="warning" sx={{ my: 3 }}>
              Could not determine your agency client code. Please make sure your agency profile is configured.
            </Alert>
          ) : (
            <Box>
              {/* Top Banner / Agency Code */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: 2,
                  bgcolor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase" }}>
                    Agency Tenant Code
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}>
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                      {clientCode}
                    </Typography>
                    <Chip label="Active" size="small" color="success" sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }} />
                  </Box>
                </Box>

                {/* Campaign source configurator */}
                <Box sx={{ flexGrow: 1, maxWidth: { xs: "100%", sm: 400 } }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Lead Source / Campaign Tag:
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={sourceTag}
                      onChange={(e) => setSourceTag(e.target.value)}
                      placeholder="e.g. Website, Google Ads"
                      sx={{ bgcolor: "#ffffff" }}
                    />
                  </Box>
                </Box>
              </Paper>

              {/* Quick Preset Badges */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 3 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Source Presets:
                </Typography>
                {PRESET_SOURCES.map((preset) => (
                  <Chip
                    key={preset}
                    label={preset}
                    size="small"
                    clickable
                    variant={sourceTag === preset ? "filled" : "outlined"}
                    color={sourceTag === preset ? "primary" : "default"}
                    onClick={() => setSourceTag(preset)}
                    sx={{ fontSize: "0.75rem", borderRadius: 1.5 }}
                  />
                ))}
              </Box>

              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}>
                <Tabs
                  value={activeTab}
                  onChange={(_, val) => setActiveTab(val)}
                  textColor="primary"
                  indicatorColor="primary"
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab icon={<LinkIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Direct Shareable Link" />
                  <Tab icon={<CodeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Embed Code (HTML iFrame)" />
                  <Tab icon={<PreviewIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Live Form Preview" />
                </Tabs>
              </Box>

              {/* Tab 1: Direct Link */}
              {activeTab === 0 && (
                <Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      mb: 2.5,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} color="#1e293b" gutterBottom>
                      Public Inquiry Page URL
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Share this link directly on WhatsApp, social media bios, email signatures, or link it to your website’s “Book Now” buttons.
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1.5,
                        bgcolor: "#f1f5f9",
                        borderRadius: 2,
                        border: "1px dashed #cbd5e1",
                        overflow: "hidden",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          color: "#0f172a",
                          flexGrow: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formUrl}
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<CopyIcon />}
                        onClick={() => copyToClipboard(formUrl, "Form Link")}
                        sx={{ textTransform: "none", flexShrink: 0 }}
                      >
                        Copy Link
                      </Button>
                      <Tooltip title="Open in new tab">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => window.open(formUrl, "_blank")}
                          sx={{ bgcolor: "#ffffff", border: "1px solid #cbd5e1" }}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>

                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      display: "flex",
                      gap: 1.5,
                    }}
                  >
                    <SparklesIcon sx={{ color: "#2563eb", mt: 0.25 }} />
                    <Box>
                      <Typography variant="caption" fontWeight={700} color="#1e40af">
                        Pro Tip: Campaign Tracking
                      </Typography>
                      <Typography variant="body2" color="#1e3a8a" sx={{ fontSize: "0.825rem", mt: 0.25 }}>
                        Change the Lead Source tag above for each marketing channel (e.g. <code>Google_Ads</code>, <code>Insta_Bio</code>).
                        Every lead submitted through that link will automatically have its Lead Source set accordingly in your CRM!
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Tab 2: Embed Code */}
              {activeTab === 1 && (
                <Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      mb: 2.5,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                        HTML Embed Code (iFrame)
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CopyIcon />}
                        onClick={() => copyToClipboard(iframeSnippet, "iFrame code")}
                        sx={{ textTransform: "none" }}
                      >
                        Copy iFrame
                      </Button>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Paste this HTML code into any page on your website (WordPress, Wix, Webflow, Squarespace, or custom PHP/HTML):
                    </Typography>

                    <Box
                      component="pre"
                      sx={{
                        p: 2,
                        bgcolor: "#0f172a",
                        color: "#38bdf8",
                        borderRadius: 2,
                        fontFamily: "monospace",
                        fontSize: "0.85rem",
                        overflowX: "auto",
                        m: 0,
                      }}
                    >
                      {iframeSnippet}
                    </Box>
                  </Paper>

                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      Integration Steps:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.825rem", mt: 0.5 }}>
                      1. Open your website builder (e.g., WordPress Elementor, Wix, or Shopify).<br />
                      2. Add a <strong>Custom HTML / Embed</strong> block to your contact or inquiry page.<br />
                      3. Paste the code above and publish. You're now capturing leads straight into Digiink CRM!
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Tab 3: Live Preview */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    This is how the lead form renders for travelers visiting your page or iframe:
                  </Typography>
                  <Box
                    sx={{
                      border: "1px solid #cbd5e1",
                      borderRadius: 3,
                      overflow: "hidden",
                      bgcolor: "#ffffff",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                    }}
                  >
                    <iframe
                      src={formUrl}
                      title="Form Preview"
                      style={{
                        width: "100%",
                        height: "560px",
                        border: "none",
                        display: "block",
                      }}
                    />
                  </Box>
                </Box>
              )}

              {/* Bottom Feature Badges */}
              <Box
                sx={{
                  mt: 3,
                  pt: 2.5,
                  borderTop: "1px solid #e2e8f0",
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                  gap: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <CheckIcon sx={{ color: "#16a34a", fontSize: 18, mt: 0.25 }} />
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="#0f172a">
                      Instant Lead Creation
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Appears in your pipeline immediately with full customer contact info.
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <CheckIcon sx={{ color: "#16a34a", fontSize: 18, mt: 0.25 }} />
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="#0f172a">
                      Auto Staff Assignment
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Equally assigns new leads via Round-Robin to your active sales staff.
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <CheckIcon sx={{ color: "#16a34a", fontSize: 18, mt: 0.25 }} />
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="#0f172a">
                      WhatsApp Auto-Welcome
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Instantly sends a greeting to the customer's phone if WhatsApp is enabled.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={onClose} variant="outlined" sx={{ textTransform: "none", borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copiedSnackbar}
        autoHideDuration={3000}
        onClose={() => setCopiedSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setCopiedSnackbar(false)} severity="success" sx={{ width: "100%", borderRadius: 2 }}>
          {copiedMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
