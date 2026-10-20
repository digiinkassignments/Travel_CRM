import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import { whatsappApi } from "../../api/whatsapp";
import type { WhatsAppTemplate, WhatsAppCategory } from "../../types/whatsapp";

interface WhatsAppModalProps {
  open: boolean;
  onClose: () => void;
  initialPhone?: string;
  customerName?: string;
  enquiryId?: string;
  defaultCategory?: WhatsAppCategory;
  variables?: Record<string, any>;
  onSuccess?: () => void;
}

export function WhatsAppModal({
  open,
  onClose,
  initialPhone = "",
  customerName = "",
  enquiryId,
  defaultCategory = "ITINERARY_SHARE",
  variables = {},
  onSuccess,
}: WhatsAppModalProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [phone, setPhone] = useState(initialPhone);
  const [body, setBody] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  useEffect(() => {
    if (open) {
      setPhone(initialPhone);
      setAlertInfo(null);
      setLoadingTemplates(true);
      whatsappApi
        .getTemplates()
        .then((res) => {
          setTemplates(res);
          // Pick best matching template
          const match = res.find((t) => t.category === defaultCategory && t.isActive) || res[0];
          if (match) {
            setSelectedTemplateId(match.id);
            applyTemplate(match.body, variables);
          }
        })
        .catch((err) => {
          console.error("Failed to load templates", err);
        })
        .finally(() => setLoadingTemplates(false));
    }
  }, [open, initialPhone, defaultCategory]);

  function applyTemplate(rawText: string, currentVars: Record<string, any>) {
    let replaced = rawText;
    const allVars: Record<string, any> = {
      customer_name: customerName || "Traveler",
      ...currentVars,
    };
    replaced = replaced.replace(/\{\{?([a-zA-Z0-9_]+)\}?\}/g, (match, key) => {
      const val = allVars[key];
      return val !== undefined && val !== null ? String(val) : match;
    });
    setBody(replaced);
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      applyTemplate(tmpl.body, variables);
    }
  }

  async function handleSend(mode: "QUICK_LINK" | "META_CLOUD") {
    if (!phone.trim()) {
      setAlertInfo({ type: "error", msg: "Please enter a valid recipient phone number" });
      return;
    }
    if (!body.trim()) {
      setAlertInfo({ type: "error", msg: "Message body cannot be empty" });
      return;
    }

    setSending(true);
    setAlertInfo(null);

    try {
      const res = await whatsappApi.sendMessage({
        toNumber: phone,
        body,
        enquiryId,
        mode,
      });

      if (res.data.waUrl) {
        // Open WhatsApp Web or mobile app in a new tab
        window.open(res.data.waUrl, "_blank");
        setAlertInfo({ type: "success", msg: "Opened WhatsApp! Message logged to CRM history." });
      } else {
        setAlertInfo({ type: "success", msg: res.message || "Message dispatched via Cloud API!" });
      }

      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setAlertInfo({
        type: "error",
        msg: err?.response?.data?.message || "Failed to dispatch WhatsApp message.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#075e54",
          color: "#fff",
          py: 1.75,
          px: 3,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <WhatsAppIcon sx={{ color: "#25d366", fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
              Send on WhatsApp
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
              {customerName ? `Recipient: ${customerName}` : "Direct Traveler Communication"}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "#fff" } }}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {alertInfo && (
          <Alert severity={alertInfo.type} sx={{ mb: 2.5, borderRadius: 2 }}>
            {alertInfo.msg}
          </Alert>
        )}

        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1.1fr 1fr" }} gap={3}>
          {/* Left Column: Form & Template Controls */}
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Recipient WhatsApp Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210 (with or without +91)"
              fullWidth
              size="small"
              helperText="Enter 10-digit mobile or international format with country code"
            />

            <FormControl fullWidth size="small">
              <InputLabel id="template-select-label">Choose Travel Template</InputLabel>
              <Select
                labelId="template-select-label"
                label="Choose Travel Template"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                disabled={loadingTemplates}
              >
                {templates.map((tmpl) => (
                  <MenuItem key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({tmpl.category})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 0.5, display: "block" }}>
                Message Text (You can customize wording before sending):
              </Typography>
              <TextField
                value={body}
                onChange={(e) => setBody(e.target.value)}
                multiline
                rows={9}
                fullWidth
                size="small"
                sx={{
                  fontFamily: "monospace",
                  "& .MuiInputBase-input": { fontSize: "0.85rem", lineHeight: 1.5 },
                }}
              />
            </Box>
          </Box>

          {/* Right Column: Authentic WhatsApp Chat Bubble Preview */}
          <Box
            sx={{
              bgcolor: "#efeae2",
              borderRadius: 3,
              p: 2.5,
              border: "1px solid #e0d9cf",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.04)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top Bar of the Phone / Chat */}
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              mb={2}
              pb={1}
              borderBottom="1px solid rgba(0,0,0,0.08)"
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: "#25d366",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                }}
              >
                {customerName ? customerName[0]?.toUpperCase() : "T"}
              </Box>
              <Box minWidth={0}>
                <Typography variant="body2" fontWeight={800} noWrap color="#111827">
                  {customerName || "Traveler"}
                </Typography>
                <Typography variant="caption" color="#64748b" display="block" fontSize="0.68rem">
                  Online
                </Typography>
              </Box>
            </Box>

            {/* Speech Bubble */}
            <Box flex={1} display="flex" flexDirection="column" justifyContent="flex-start" alignItems="flex-end">
              <Box
                sx={{
                  bgcolor: "#d9fdd3",
                  color: "#111827",
                  borderRadius: "12px 0px 12px 12px",
                  p: 1.5,
                  maxWidth: "92%",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                  position: "relative",
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                  fontSize: "0.82rem",
                  lineHeight: 1.45,
                }}
              >
                {body || "No message content..."}
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="flex-end"
                  gap={0.5}
                  mt={0.5}
                  color="#667781"
                >
                  <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Typography>
                  <DoneAllRoundedIcon sx={{ fontSize: 13, color: "#53bdeb" }} />
                </Box>
              </Box>
            </Box>

            <Typography
              variant="caption"
              align="center"
              sx={{ mt: 2, color: "#78716c", fontSize: "0.7rem" }}
            >
              🔒 End-to-end encrypted preview
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
        <Button onClick={onClose} disabled={sending} sx={{ color: "#64748b", fontWeight: 700 }}>
          Cancel
        </Button>

        <Tooltip title="Send via background Meta Cloud API (requires verified Meta credentials)">
          <span>
            <Button
              variant="outlined"
              onClick={() => handleSend("META_CLOUD")}
              disabled={sending}
              startIcon={<SendRoundedIcon />}
              sx={{ fontWeight: 700 }}
            >
              Send via Cloud API
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Opens WhatsApp Web on desktop or the WhatsApp App on mobile with text pre-filled">
          <Button
            variant="contained"
            onClick={() => handleSend("QUICK_LINK")}
            disabled={sending}
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <OpenInNewRoundedIcon />}
            sx={{
              bgcolor: "#25d366",
              "&:hover": { bgcolor: "#1ebe5d" },
              fontWeight: 800,
              px: 3,
            }}
          >
            Open in WhatsApp
          </Button>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
