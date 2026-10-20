import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { whatsappApi } from "../../api/whatsapp";
import type {
  WhatsAppConfig,
  WhatsAppTemplate,
  WhatsAppMessage,
  WhatsAppCategory,
} from "../../types/whatsapp";

const VARIABLE_TAGS = [
  { tag: "{customer_name}", label: "Customer Name" },
  { tag: "{destination}", label: "Destination" },
  { tag: "{duration}", label: "Duration" },
  { tag: "{itinerary_link}", label: "Itinerary Web Link" },
  { tag: "{company_name}", label: "Company Name" },
  { tag: "{agent_name}", label: "Agent Name" },
  { tag: "{driver_name}", label: "Driver Name" },
  { tag: "{driver_phone}", label: "Driver Phone" },
  { tag: "{vehicle_number}", label: "Vehicle Number" },
  { tag: "{vehicle_model}", label: "Vehicle Model" },
  { tag: "{pickup_time}", label: "Pickup Time" },
  { tag: "{pickup_location}", label: "Pickup Location" },
  { tag: "{booking_id}", label: "Booking ID" },
  { tag: "{balance_due}", label: "Balance Due" },
];

export function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<WhatsAppConfig>({
    provider: "QUICK_LINK",
    phoneNumberId: "",
    businessAccountId: "",
    webhookVerifyToken: "",
    autoWelcomeEnabled: false,
    autoItineraryShare: false,
    autoCabDispatch: false,
    isActive: false,
    hasAccessToken: false,
  });
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Quick Dispatch Form State
  const [dispatchPhone, setDispatchPhone] = useState("");
  const [dispatchName, setDispatchName] = useState("");
  const [dispatchTemplateId, setDispatchTemplateId] = useState("");
  const [dispatchBody, setDispatchBody] = useState("");
  const [dispatchSending, setDispatchSending] = useState(false);

  // Template Modal State
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "CUSTOM" as WhatsAppCategory,
    body: "",
    isActive: true,
  });

  // Config Form State
  const [configForm, setConfigForm] = useState({
    provider: "QUICK_LINK" as "QUICK_LINK" | "META_CLOUD",
    phoneNumberId: "",
    businessAccountId: "",
    accessToken: "",
    webhookVerifyToken: "",
    autoWelcomeEnabled: false,
    autoItineraryShare: false,
    autoCabDispatch: false,
    isActive: false,
  });

  function loadAll() {
    setLoading(true);
    Promise.all([
      whatsappApi.getConfig().catch(() => null),
      whatsappApi.getTemplates().catch(() => []),
      whatsappApi.getMessages().catch(() => ({ messages: [], total: 0 })),
    ]).then(([conf, tmpls, msgs]) => {
      if (conf) {
        setConfig(conf);
        setConfigForm({
          provider: conf.provider === "META_CLOUD" ? "META_CLOUD" : "QUICK_LINK",
          phoneNumberId: conf.phoneNumberId ?? "",
          businessAccountId: conf.businessAccountId ?? "",
          accessToken: "",
          webhookVerifyToken: conf.webhookVerifyToken ?? "",
          autoWelcomeEnabled: conf.autoWelcomeEnabled ?? false,
          autoItineraryShare: conf.autoItineraryShare ?? false,
          autoCabDispatch: conf.autoCabDispatch ?? false,
          isActive: conf.isActive ?? false,
        });
      }
      if (tmpls && tmpls.length > 0) {
        setTemplates(tmpls);
        if (!dispatchTemplateId) {
          setDispatchTemplateId(tmpls[0].id);
          setDispatchBody(tmpls[0].body);
        }
      }
      if (msgs && msgs.messages) {
        setMessages(msgs.messages);
      }
      setLoading(false);
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  function handleSelectDispatchTemplate(tId: string) {
    setDispatchTemplateId(tId);
    const tmpl = templates.find((t) => t.id === tId);
    if (tmpl) {
      let text = tmpl.body;
      if (dispatchName) {
        text = text.replace(/\{\{?customer_name\}?\}/g, dispatchName);
      }
      setDispatchBody(text);
    }
  }

  async function handleQuickDispatch(mode: "QUICK_LINK" | "META_CLOUD") {
    if (!dispatchPhone.trim()) {
      setAlert({ type: "error", msg: "Please enter a valid recipient phone number" });
      return;
    }
    if (!dispatchBody.trim()) {
      setAlert({ type: "error", msg: "Message body cannot be empty" });
      return;
    }

    setDispatchSending(true);
    setAlert(null);

    try {
      const res = await whatsappApi.sendMessage({
        toNumber: dispatchPhone,
        body: dispatchBody,
        mode,
      });

      if (res.data.waUrl) {
        window.open(res.data.waUrl, "_blank");
        setAlert({ type: "success", msg: "Launched WhatsApp! Message saved to audit log." });
      } else {
        setAlert({ type: "success", msg: "Message dispatched via Meta Cloud API!" });
      }

      whatsappApi.getMessages().then((m) => setMessages(m.messages));
    } catch (err: any) {
      setAlert({
        type: "error",
        msg: err?.response?.data?.message || "Failed to dispatch WhatsApp message.",
      });
    } finally {
      setDispatchSending(false);
    }
  }

  function handleOpenCreateTemplate() {
    setEditingTemplate(null);
    setTemplateForm({ name: "", category: "CUSTOM", body: "", isActive: true });
    setTemplateModalOpen(true);
  }

  function handleOpenEditTemplate(tmpl: WhatsAppTemplate) {
    setEditingTemplate(tmpl);
    setTemplateForm({
      name: tmpl.name,
      category: tmpl.category,
      body: tmpl.body,
      isActive: tmpl.isActive,
    });
    setTemplateModalOpen(true);
  }

  async function handleSaveTemplate() {
    if (!templateForm.name.trim() || !templateForm.body.trim()) {
      setAlert({ type: "error", msg: "Please provide a template name and message body." });
      return;
    }

    try {
      if (editingTemplate) {
        await whatsappApi.updateTemplate(editingTemplate.id, templateForm);
        setAlert({ type: "success", msg: "Template updated successfully!" });
      } else {
        await whatsappApi.createTemplate(templateForm);
        setAlert({ type: "success", msg: "Template created successfully!" });
      }
      setTemplateModalOpen(false);
      const updated = await whatsappApi.getTemplates();
      setTemplates(updated);
    } catch (err: any) {
      setAlert({ type: "error", msg: err?.response?.data?.message || "Failed to save template." });
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await whatsappApi.deleteTemplate(id);
      setAlert({ type: "success", msg: "Template deleted." });
      const updated = await whatsappApi.getTemplates();
      setTemplates(updated);
    } catch (err: any) {
      setAlert({ type: "error", msg: "Failed to delete template." });
    }
  }

  async function handleResetDefaultTemplates() {
    if (!window.confirm("Reset all templates to default travel agency templates? Any custom templates will be replaced.")) {
      return;
    }
    try {
      const defs = await whatsappApi.resetDefaultTemplates();
      setTemplates(defs);
      setAlert({ type: "success", msg: "Reset templates to default travel templates." });
    } catch (err) {
      setAlert({ type: "error", msg: "Failed to reset templates." });
    }
  }

  async function handleSaveConfig() {
    try {
      await whatsappApi.updateConfig(configForm);
      setAlert({ type: "success", msg: "WhatsApp settings updated successfully!" });
      loadAll();
    } catch (err: any) {
      setAlert({ type: "error", msg: err?.response?.data?.message || "Failed to save settings." });
    }
  }

  function insertVariableTag(tag: string) {
    setTemplateForm((prev) => ({
      ...prev,
      body: prev.body + " " + tag,
    }));
  }

  if (loading) {
    return (
      <Box p={4} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

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
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(37, 211, 102, 0.35)",
            }}
          >
            <WhatsAppIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.03em" }}>
              WhatsApp Suite
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.25}>
              1-Click Itinerary Share, Automated Lead Welcome & Chauffeur Duty Slip Dispatch
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            icon={<CheckCircleRoundedIcon style={{ fontSize: 16 }} />}
            label={config.provider === "META_CLOUD" ? "Meta Cloud API Active" : "wa.me Instant Dispatch Mode"}
            sx={{
              fontWeight: 800,
              fontSize: "0.75rem",
              bgcolor: config.provider === "META_CLOUD" ? "rgba(2, 132, 199, 0.1)" : "rgba(16, 185, 129, 0.1)",
              color: config.provider === "META_CLOUD" ? "#0284c7" : "#10b981",
              border: `1px solid ${config.provider === "META_CLOUD" ? "rgba(2, 132, 199, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
              borderRadius: "8px",
              py: 2,
              px: 1,
            }}
          />
        </Box>
      </Box>

      {alert && (
        <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 3, borderRadius: 2 }}>
          {alert.msg}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab icon={<SendRoundedIcon />} iconPosition="start" label="Quick Dispatch Hub" sx={{ fontWeight: 700 }} />
          <Tab icon={<LibraryBooksRoundedIcon />} iconPosition="start" label="Travel Templates" sx={{ fontWeight: 700 }} />
          <Tab icon={<HistoryRoundedIcon />} iconPosition="start" label="Message Audit Log" sx={{ fontWeight: 700 }} />
          <Tab icon={<SettingsRoundedIcon />} iconPosition="start" label="Integration & Settings" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Paper>

      {/* TAB 0: Quick Dispatch Hub */}
      {activeTab === 0 && (
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1.1fr 1fr" }} gap={3}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Direct Message Sender
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select a traveler template, verify the text, and launch WhatsApp directly or send via Cloud API.
            </Typography>

            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2}>
                <TextField
                  label="Customer Name (Optional)"
                  value={dispatchName}
                  onChange={(e) => {
                    setDispatchName(e.target.value);
                    if (dispatchTemplateId) handleSelectDispatchTemplate(dispatchTemplateId);
                  }}
                  size="small"
                  placeholder="e.g. Rahul Sharma"
                />
                <TextField
                  label="Phone Number"
                  value={dispatchPhone}
                  onChange={(e) => setDispatchPhone(e.target.value)}
                  size="small"
                  required
                  placeholder="e.g. 9876543210"
                  helperText="Digits only with or without country code (+91)"
                />
              </Box>

              <FormControl fullWidth size="small">
                <InputLabel>Choose Travel Template</InputLabel>
                <Select
                  label="Choose Travel Template"
                  value={dispatchTemplateId}
                  onChange={(e) => handleSelectDispatchTemplate(e.target.value)}
                >
                  {templates.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Message Content"
                value={dispatchBody}
                onChange={(e) => setDispatchBody(e.target.value)}
                multiline
                rows={8}
                fullWidth
                size="small"
                helperText="You can customize this message directly before clicking send"
              />

              <Box display="flex" gap={2} mt={1}>
                <Button
                  variant="contained"
                  onClick={() => handleQuickDispatch("QUICK_LINK")}
                  disabled={dispatchSending}
                  startIcon={<OpenInNewRoundedIcon />}
                  sx={{
                    bgcolor: "#25d366",
                    "&:hover": { bgcolor: "#1ebe5d" },
                    fontWeight: 800,
                    px: 3,
                    py: 1.2,
                  }}
                >
                  Open in WhatsApp
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => handleQuickDispatch("META_CLOUD")}
                  disabled={dispatchSending}
                  startIcon={<SendRoundedIcon />}
                  sx={{ fontWeight: 700, px: 2.5 }}
                >
                  Send via Cloud API
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* WhatsApp Chat Preview */}
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: "#efeae2",
              border: "1px solid #e0d9cf",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Box display="flex" alignItems="center" gap={1.5} pb={1.5} borderBottom="1px solid rgba(0,0,0,0.08)">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    bgcolor: "#25d366",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                  }}
                >
                  {dispatchName ? dispatchName[0].toUpperCase() : "T"}
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                    {dispatchName || "Traveler Preview"}
                  </Typography>
                  <Typography variant="caption" color="#64748b">
                    {dispatchPhone || "+91 98765 43210"}
                  </Typography>
                </Box>
              </Box>

              <Box mt={3} display="flex" justifyContent="flex-end">
                <Box
                  sx={{
                    bgcolor: "#d9fdd3",
                    color: "#111827",
                    borderRadius: "14px 0px 14px 14px",
                    p: 2,
                    maxWidth: "92%",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                    fontSize: "0.85rem",
                    lineHeight: 1.45,
                  }}
                >
                  {dispatchBody || "Select a template on the left to see the message preview here..."}
                  <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5} mt={0.75} color="#667781">
                    <Typography variant="caption" sx={{ fontSize: "0.68rem" }}>
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                    <DoneAllRoundedIcon sx={{ fontSize: 14, color: "#53bdeb" }} />
                  </Box>
                </Box>
              </Box>
            </Box>

            <Typography variant="caption" align="center" sx={{ mt: 3, color: "#78716c" }}>
              Live WhatsApp message rendering with bold, emoji & clickable link support
            </Typography>
          </Paper>
        </Box>
      )}

      {/* TAB 1: Travel Templates */}
      {activeTab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
            <Typography variant="h6" fontWeight={800}>
              Travel Agency Message Templates ({templates.length})
            </Typography>

            <Box display="flex" gap={1.5}>
              <Button
                variant="outlined"
                startIcon={<RestartAltRoundedIcon />}
                onClick={handleResetDefaultTemplates}
                size="small"
                sx={{ fontWeight: 700 }}
              >
                Reset to Defaults
              </Button>
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={handleOpenCreateTemplate}
                size="small"
                sx={{ fontWeight: 800 }}
              >
                + New Template
              </Button>
            </Box>
          </Box>

          <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3}>
            {templates.map((tmpl) => (
              <Card key={tmpl.id} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "none" }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                      {tmpl.name}
                    </Typography>
                    <Chip size="small" label={tmpl.category} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                  </Box>

                  <Box
                    sx={{
                      bgcolor: "#f8fafc",
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid #e2e8f0",
                      maxHeight: 180,
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                      fontSize: "0.82rem",
                      fontFamily: "monospace",
                      color: "#334155",
                    }}
                  >
                    {tmpl.body}
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {tmpl.isDefault ? "Pre-configured System Template" : "Custom Agency Template"}
                  </Typography>

                  <Box>
                    <IconButton size="small" onClick={() => handleOpenEditTemplate(tmpl)} color="primary">
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      color="error"
                      disabled={templates.length <= 1}
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* TAB 2: Message Audit Log */}
      {activeTab === 2 && (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box p={2.5} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={800}>
              Message Delivery History
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Showing latest {messages.length} messages
            </Typography>
          </Box>
          <Divider />
          <Table>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Direction</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Channel / Sender</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Recipient</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {messages.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell sx={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                    {new Date(m.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={m.direction}
                      color={m.direction === "OUTBOUND" ? "primary" : "secondary"}
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.82rem" }}>{m.fromNumber}</TableCell>
                  <TableCell sx={{ fontSize: "0.82rem", fontWeight: 700 }}>{m.toNumber}</TableCell>
                  <TableCell sx={{ fontSize: "0.82rem", maxWidth: 300 }}>
                    <Typography variant="body2" noWrap title={m.body}>
                      {m.body}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={m.status}
                      color={m.status === "SENT" || m.status === "DELIVERED" ? "success" : m.status === "FAILED" ? "error" : "default"}
                      sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {messages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#64748b" }}>
                    No messages logged yet. Send an itinerary or enquiry message to see records here.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* TAB 3: Integration & Settings */}
      {activeTab === 3 && (
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1.1fr 1fr" }} gap={3}>
          {/* Settings Form */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              WhatsApp Dispatch Mode
            </Typography>

            <Box display="flex" flexDirection="column" gap={2.5} mt={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Primary Dispatch Mode</InputLabel>
                <Select
                  label="Primary Dispatch Mode"
                  value={configForm.provider}
                  onChange={(e) => setConfigForm({ ...configForm, provider: e.target.value as any })}
                >
                  <MenuItem value="QUICK_LINK">
                    Quick Click-to-Chat (wa.me / WhatsApp Web) — Free & Instant (Recommended)
                  </MenuItem>
                  <MenuItem value="META_CLOUD">
                    Meta Cloud API (Automated Background Messaging)
                  </MenuItem>
                </Select>
              </FormControl>

              <Divider />

              <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                Automated Triggers (Meta Cloud API only)
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.autoWelcomeEnabled}
                    onChange={(e) => setConfigForm({ ...configForm, autoWelcomeEnabled: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      Auto-send welcome message on new lead capture
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Instantly sends Lead Acknowledgment template when a new enquiry is logged
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.autoCabDispatch}
                    onChange={(e) => setConfigForm({ ...configForm, autoCabDispatch: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      Driver Assignment Alerts
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Prompt or trigger cab duty slip details when assigning a fleet vehicle
                    </Typography>
                  </Box>
                }
              />

              <Divider />

              <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                Meta Cloud API Credentials (Optional)
              </Typography>

              <TextField
                label="Phone Number ID"
                value={configForm.phoneNumberId}
                onChange={(e) => setConfigForm({ ...configForm, phoneNumberId: e.target.value })}
                size="small"
                fullWidth
                placeholder="e.g. 1029384756..."
              />

              <TextField
                label="WhatsApp Business Account ID"
                value={configForm.businessAccountId}
                onChange={(e) => setConfigForm({ ...configForm, businessAccountId: e.target.value })}
                size="small"
                fullWidth
              />

              <TextField
                label="Permanent Access Token"
                type="password"
                value={configForm.accessToken}
                onChange={(e) => setConfigForm({ ...configForm, accessToken: e.target.value })}
                size="small"
                fullWidth
                placeholder={config.hasAccessToken ? "•••••••• (Token saved securely)" : "Paste Meta System User Token"}
              />

              <TextField
                label="Webhook Verify Token"
                value={configForm.webhookVerifyToken}
                onChange={(e) => setConfigForm({ ...configForm, webhookVerifyToken: e.target.value })}
                size="small"
                fullWidth
                placeholder="e.g. my_agency_verify_token_123"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.isActive}
                    onChange={(e) => setConfigForm({ ...configForm, isActive: e.target.checked })}
                  />
                }
                label="Enable Meta Cloud API as Active Provider"
              />

              <Button variant="contained" onClick={handleSaveConfig} sx={{ mt: 1, py: 1.2, fontWeight: 800 }}>
                Save WhatsApp Settings
              </Button>
            </Box>
          </Paper>

          {/* Guide Card */}
          <Box display="flex" flexDirection="column" gap={2}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom color="#0f172a">
                💡 How Travel Agencies Use This Suite
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>1. Quick Link Mode (Default):</strong> Travel agents can share day-wise web itineraries,
                quotations, and driver duty slips with a single click. It opens WhatsApp Web or mobile with the message
                already formatted and customized, requiring zero API setup or recurring costs.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>2. Meta Cloud API Mode:</strong> For larger agencies who want background automation. When active,
                inbound inquiries automatically receive instant acknowledgment messages 24/7.
              </Typography>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: "#ecfdf5", border: "1px solid #a7f3d0" }}>
              <Typography variant="subtitle2" fontWeight={800} color="#065f46" gutterBottom>
                Webhook Endpoint for Inbound Messages
              </Typography>
              <Typography variant="caption" color="#047857" display="block" mb={1.5}>
                Configure this URL in your Meta App Dashboard under WhatsApp &gt; Configuration &gt; Callback URL:
              </Typography>
              <Box
                sx={{
                  bgcolor: "#fff",
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid #6ee7b7",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{`${window.location.origin}/api/whatsapp-webhook/${config.clientId || "client_id"}`}</span>
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/whatsapp-webhook/${config.clientId}`);
                    setAlert({ type: "info", msg: "Webhook URL copied to clipboard!" });
                  }}
                >
                  <ContentCopyRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Paper>
          </Box>
        </Box>
      )}

      {/* Create / Edit Template Dialog */}
      <Dialog open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingTemplate ? "Edit Travel Template" : "New Travel Message Template"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Template Name"
            value={templateForm.name}
            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
            size="small"
            fullWidth
            placeholder="e.g. Kashmir Luxury Tour Proposal"
          />

          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              value={templateForm.category}
              onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
            >
              <MenuItem value="ITINERARY_SHARE">Itinerary Share</MenuItem>
              <MenuItem value="ENQUIRY_WELCOME">Enquiry Welcome</MenuItem>
              <MenuItem value="CAB_DISPATCH">Chauffeur & Cab Dispatch</MenuItem>
              <MenuItem value="BOOKING_CONFIRMATION">Booking Confirmation</MenuItem>
              <MenuItem value="PAYMENT_REMINDER">Payment Reminder</MenuItem>
              <MenuItem value="CUSTOM">Custom Travel Note</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
              Click to insert dynamic variable tag into message:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
              {VARIABLE_TAGS.map((v) => (
                <Chip
                  key={v.tag}
                  label={v.label}
                  size="small"
                  onClick={() => insertVariableTag(v.tag)}
                  sx={{ cursor: "pointer", fontSize: "0.72rem" }}
                />
              ))}
            </Box>

            <TextField
              label="Message Body"
              value={templateForm.body}
              onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
              multiline
              rows={8}
              fullWidth
              size="small"
              helperText="Use WhatsApp markdown (*bold*, _italics_) and placeholders"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTemplate} sx={{ fontWeight: 800 }}>
            Save Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
