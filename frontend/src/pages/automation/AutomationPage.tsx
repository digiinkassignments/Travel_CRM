import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Tooltip,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
} from "@mui/material";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { apiClient } from "../../api/client";
import {
  getAutomationOptions,
  getAutomationRules,
  seedAutomationRecipes,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  testAutomationRule,
  getAutomationLogs,
  AutomationOptionsResponse,
} from "../../api/automation";
import { AutomationRule, AutomationLog, WorkflowPlaceholder } from "../../types/automation";

export function AutomationPage() {
  const [tab, setTab] = useState(0);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [options, setOptions] = useState<AutomationOptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter logs state
  const [logSearch, setLogSearch] = useState("");
  const [logChannelFilter, setLogChannelFilter] = useState("ALL");
  const [logStatusFilter, setLogStatusFilter] = useState("ALL");

  // Rule creation & edit modal state
  const [openModal, setOpenModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"SETTINGS" | "WHATSAPP" | "EMAIL" | "PREVIEW">("SETTINGS");
  const [activeFocusField, setActiveFocusField] = useState<"whatsapp" | "emailSubject" | "emailBody">("whatsapp");

  const [form, setForm] = useState({
    name: "",
    triggerType: "NEW_LEAD_CREATED",
    triggerValue: 2,
    actionType: "WHATSAPP_AND_EMAIL_CUSTOMER",
    recipient: "CLIENT_ADMIN",
    userId: "",
    toUserId: "",
    messageTemplate: "",
    emailSubject: "",
    emailBody: "",
    isActive: true,
  });

  // Test execution dialog state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingRule, setTestingRule] = useState<AutomationRule | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [opts, ruleList, logList, userList] = await Promise.all([
        getAutomationOptions().catch(() => null),
        getAutomationRules().catch(() => []),
        getAutomationLogs().catch(() => []),
        apiClient.get("/users").then((r) => r.data.data ?? []).catch(() => []),
      ]);

      if (opts) setOptions(opts);
      setRules(ruleList);
      setLogs(logList);
      setStaff(userList);
    } catch (err) {
      console.error("Failed to load automation data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (logChannelFilter !== "ALL" && l.channel !== logChannelFilter) return false;
      if (logStatusFilter !== "ALL" && l.status !== logStatusFilter) return false;
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const matchRecipient = l.recipient?.toLowerCase().includes(q);
        const matchMsg = l.message?.toLowerCase().includes(q);
        const matchRule = l.rule?.name?.toLowerCase().includes(q);
        const matchTarget = l.targetId?.toLowerCase().includes(q);
        if (!matchRecipient && !matchMsg && !matchRule && !matchTarget) return false;
      }
      return true;
    });
  }, [logs, logChannelFilter, logStatusFilter, logSearch]);

  const activeCount = useMemo(() => rules.filter((r) => r.isActive).length, [rules]);

  const selectedTriggerOption = useMemo(() => {
    return options?.triggerTypes.find((t) => t.type === form.triggerType);
  }, [options, form.triggerType]);

  const selectedActionOption = useMemo(() => {
    return options?.actionTypes.find((a) => a.type === form.actionType);
  }, [options, form.actionType]);

  const isRealTimeTrigger = selectedTriggerOption?.isRealTime ?? false;
  const isTimeThresholdTrigger = [
    "ENQUIRY_NO_CONTACT_WITHIN_HOURS",
    "QUOTATION_NOT_FOLLOWED_UP",
    "VEHICLE_DOCUMENT_EXPIRING",
    "PRE_DEPARTURE_REMINDER",
    "POST_TRIP_FEEDBACK",
    "PAYMENT_DUE_REMINDER",
  ].includes(form.triggerType);

  const timeUnit = form.triggerType === "ENQUIRY_NO_CONTACT_WITHIN_HOURS" ? "Hours" : "Days";

  const hasWhatsAppTab =
    form.actionType === "WHATSAPP_CUSTOMER" ||
    form.actionType === "WHATSAPP_AND_EMAIL_CUSTOMER" ||
    form.actionType === "WHATSAPP_STAFF";

  const hasEmailTab =
    form.actionType === "EMAIL_CUSTOMER" ||
    form.actionType === "WHATSAPP_AND_EMAIL_CUSTOMER" ||
    form.actionType === "EMAIL_STAFF";

  // 1-Click Install Recipes
  async function handleSeedRecipes() {
    setSeedingLoading(true);
    try {
      const updated = await seedAutomationRecipes();
      setRules(updated);
      setToastMessage("6 Travel Agency Automation Recipes installed and enabled!");
      setTimeout(() => setToastMessage(null), 5000);
      loadData();
    } catch (err: any) {
      alert("Failed to install recipes: " + (err.response?.data?.message || err.message));
    } finally {
      setSeedingLoading(false);
    }
  }

  // Toggle Rule Active
  async function toggleActive(rule: AutomationRule) {
    try {
      await updateAutomationRule(rule.id, { isActive: !rule.isActive });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)));
    } catch (err: any) {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    }
  }

  // Delete Rule
  async function removeRule(id: string) {
    if (!window.confirm("Are you sure you want to delete this automation rule?")) return;
    try {
      await deleteAutomationRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert("Failed to delete rule: " + (err.response?.data?.message || err.message));
    }
  }

  // Open Create Modal
  function openCreateModal() {
    setEditingRuleId(null);
    setForm({
      name: "",
      triggerType: "NEW_LEAD_CREATED",
      triggerValue: 2,
      actionType: "WHATSAPP_AND_EMAIL_CUSTOMER",
      recipient: "CLIENT_ADMIN",
      userId: "",
      toUserId: "",
      messageTemplate: `Namaste {customer_name}! 🙏\n\nThank you for reaching out to *{company_name}*. We have received your inquiry for *{destination}*.\n\nOur travel specialist will share your customized holiday proposal shortly.\n\nHelpline: *{company_phone}*`,
      emailSubject: `Thank you for contacting {company_name} - Your {destination} inquiry`,
      emailBody: `<p>Dear <strong>{customer_name}</strong>,</p>\n<p>Thank you for contacting <strong>{company_name}</strong> regarding your journey to <strong>{destination}</strong>!</p>\n<p>Our travel specialist is crafting a tailored holiday proposal with the best hotels and sightseeing.</p>`,
      isActive: true,
    });
    setModalTab("SETTINGS");
    setOpenModal(true);
  }

  // Open Edit Modal
  function openEditModal(rule: AutomationRule) {
    setEditingRuleId(rule.id);
    const triggerVal =
      rule.triggerConfig.hours ??
      rule.triggerConfig.days ??
      2;

    setForm({
      name: rule.name,
      triggerType: rule.triggerType,
      triggerValue: Number(triggerVal),
      actionType: rule.actionType,
      recipient: rule.actionConfig.recipient || "CLIENT_ADMIN",
      userId: rule.actionConfig.userId || "",
      toUserId: rule.actionConfig.toUserId || "",
      messageTemplate: rule.actionConfig.messageTemplate || "",
      emailSubject: rule.actionConfig.emailSubject || "",
      emailBody: rule.actionConfig.emailBody || "",
      isActive: rule.isActive,
    });
    setModalTab("SETTINGS");
    setOpenModal(true);
  }

  // Insert Variable Chip
  function insertPlaceholder(tag: string) {
    if (activeFocusField === "whatsapp") {
      setForm((prev) => ({ ...prev, messageTemplate: prev.messageTemplate + tag }));
    } else if (activeFocusField === "emailSubject") {
      setForm((prev) => ({ ...prev, emailSubject: prev.emailSubject + tag }));
    } else if (activeFocusField === "emailBody") {
      setForm((prev) => ({ ...prev, emailBody: prev.emailBody + tag }));
    }
  }

  // Save Rule (Create or Update)
  async function handleSaveRule() {
    if (!form.name.trim()) {
      alert("Please provide a name for this automation rule");
      return;
    }

    const triggerConfig: Record<string, any> = {};
    if (form.triggerType === "ENQUIRY_NO_CONTACT_WITHIN_HOURS") {
      triggerConfig.hours = form.triggerValue;
    } else if (
      [
        "QUOTATION_NOT_FOLLOWED_UP",
        "VEHICLE_DOCUMENT_EXPIRING",
        "PRE_DEPARTURE_REMINDER",
        "POST_TRIP_FEEDBACK",
        "PAYMENT_DUE_REMINDER",
      ].includes(form.triggerType)
    ) {
      triggerConfig.days = form.triggerValue;
    }

    const actionConfig: Record<string, any> = {
      messageTemplate: form.messageTemplate,
      emailSubject: form.emailSubject,
      emailBody: form.emailBody,
    };

    if (form.actionType === "EMAIL_STAFF") {
      actionConfig.recipient = form.recipient;
      if (form.recipient === "SPECIFIC_USER") actionConfig.userId = form.userId;
    }
    if (form.actionType === "REASSIGN_ENQUIRY") {
      actionConfig.toUserId = form.toUserId;
    }

    try {
      if (editingRuleId) {
        await updateAutomationRule(editingRuleId, {
          name: form.name,
          triggerType: form.triggerType,
          triggerConfig,
          actionType: form.actionType,
          actionConfig,
          isActive: form.isActive,
        });
        setToastMessage(`Rule "${form.name}" updated successfully!`);
      } else {
        await createAutomationRule({
          name: form.name,
          triggerType: form.triggerType,
          triggerConfig,
          actionType: form.actionType,
          actionConfig,
          isActive: form.isActive,
        });
        setToastMessage(`Rule "${form.name}" created successfully!`);
      }
      setTimeout(() => setToastMessage(null), 4000);
      setOpenModal(false);
      loadData();
    } catch (err: any) {
      alert("Failed to save rule: " + (err.response?.data?.message || err.message));
    }
  }

  // Open Test Dialog
  function openTestDialog(rule: AutomationRule) {
    setTestingRule(rule);
    setTestPhone("");
    setTestEmail("");
    setTestResult(null);
    setTestModalOpen(true);
  }

  // Run Rule Test
  async function handleRunTest() {
    if (!testingRule) return;
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await testAutomationRule(testingRule.id, {
        testPhone: testPhone.trim() || undefined,
        testEmail: testEmail.trim() || undefined,
      });
      setTestResult(
        `✓ Dispatched successfully! Target: ${res.targetType} #${res.targetId.slice(-6).toUpperCase()}. Execution logged in Audit Logs.`
      );
      loadData();
    } catch (err: any) {
      setTestResult(`✕ Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setTestRunning(false);
    }
  }

  // Simulated live preview interpolation
  const sampleData: Record<string, string> = {
    customer_name: "Rahul Sharma",
    customer_phone: "+91 9876543210",
    customer_email: "rahul.sharma@example.com",
    destination: "Goa 4N/5D Beach Retreat",
    booking_number: "BK-2026-0042",
    lead_id: "ENQ-1049",
    amount: "45,000",
    amount_paid: "15,000",
    balance_due: "30,000",
    departure_date: "18-Oct-2026",
    return_date: "23-Oct-2026",
    due_date: "10-Oct-2026",
    pickup_location: "Terminal 3, IGI Airport, New Delhi",
    driver_name: "Suresh Kumar",
    driver_phone: "+91 9811122233",
    vehicle_model: "Toyota Innova Crysta",
    vehicle_number: "DL 1Z AB 1234",
    payment_amount: "15,000",
    payment_mode: "UPI Transfer",
    agent_name: "Pooja Verma",
    company_name: "Digiink Travel Club",
    company_phone: "+91 80000 12345",
    company_email: "support@digiinktravel.com",
    review_link: "https://g.page/r/sample-travel/review",
    itinerary_link: "https://crm.digiink.in/itinerary/goa-beach-retreat",
  };

  function previewInterpolate(text: string) {
    if (!text) return "";
    return text.replace(/\{\{?([a-zA-Z0-9_]+)\}?\}/g, (match, key) => {
      return sampleData[key] || match;
    });
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <Alert
          severity="success"
          icon={<CheckRoundedIcon fontSize="inherit" />}
          sx={{
            mb: 3,
            borderRadius: 3,
            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.2)",
            fontWeight: 700,
          }}
          onClose={() => setToastMessage(null)}
        >
          {toastMessage}
        </Alert>
      )}

      {/* Top Header */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        mb={3}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.03em" }}>
              Workflow Automation Engine
            </Typography>
            <Chip
              label={`${activeCount}/${rules.length} Active Rules`}
              size="small"
              icon={<BoltRoundedIcon style={{ fontSize: 14 }} />}
              sx={{
                bgcolor: "rgba(2, 132, 199, 0.1)",
                color: "#0284c7",
                fontWeight: 800,
                fontSize: "0.75rem",
                borderRadius: "8px",
                border: "1px solid rgba(2, 132, 199, 0.2)",
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Zero-touch real-time WhatsApp & branded HTML email dispatches, traveler lifecycle journeys & RTO compliance.
          </Typography>
        </Box>

        <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={seedingLoading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRoundedIcon />}
            onClick={handleSeedRecipes}
            disabled={seedingLoading}
            sx={{
              borderColor: "#8b5cf6",
              color: "#7c3aed",
              fontWeight: 800,
              textTransform: "none",
              borderRadius: 2.5,
              px: 2.5,
              bgcolor: "rgba(139, 92, 246, 0.04)",
              "&:hover": {
                borderColor: "#7c3aed",
                bgcolor: "rgba(139, 92, 246, 0.1)",
              },
            }}
          >
            Install Essential Recipes (6)
          </Button>

          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreateModal}
            sx={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              borderRadius: 2.5,
              px: 2.75,
              py: 1,
              textTransform: "none",
              fontWeight: 800,
              boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
              "&:hover": {
                background: "linear-gradient(135deg, #0369a1 0%, #075985 100%)",
                transform: "translateY(-1px)",
              },
            }}
          >
            Create Custom Rule
          </Button>
        </Box>
      </Box>

      {/* KPI Stats Strip */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
        gap={2.5}
        mb={3.5}
      >
        <Paper
          sx={{
            p: 2.5,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(2, 132, 199, 0.1)", color: "#0284c7", borderRadius: 2.5, width: 48, height: 48 }}>
            <BoltRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Configured Rules
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {rules.length} Rules
            </Typography>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2.5,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: 2.5, width: 48, height: 48 }}>
            <CheckCircleRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Auto-Triggers
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {activeCount} Active
            </Typography>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2.5,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(34, 197, 94, 0.1)", color: "#16a34a", borderRadius: 2.5, width: 48, height: 48 }}>
            <WhatsAppIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              WhatsApp Dispatches
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {logs.filter((l) => l.channel === "WHATSAPP").length} Sent
            </Typography>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2.5,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(99, 102, 241, 0.1)", color: "#6366f1", borderRadius: 2.5, width: 48, height: 48 }}>
            <EmailRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Branded HTML Emails
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {logs.filter((l) => l.channel === "EMAIL").length} Sent
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Main Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ px: 2, borderBottom: "1px solid #e2e8f0" }}
        >
          <Tab
            icon={<BoltRoundedIcon fontSize="small" />}
            iconPosition="start"
            label={`Workflow Rules (${rules.length})`}
            sx={{ fontWeight: 800, textTransform: "none", py: 1.75 }}
          />
          <Tab
            icon={<AutoAwesomeRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Travel Recipes Hub (6 Pre-built)"
            sx={{ fontWeight: 800, textTransform: "none", py: 1.75 }}
          />
          <Tab
            icon={<HistoryRoundedIcon fontSize="small" />}
            iconPosition="start"
            label={`Execution Audit Logs (${logs.length})`}
            sx={{ fontWeight: 800, textTransform: "none", py: 1.75 }}
          />
        </Tabs>
      </Paper>

      {/* TAB 0: Automation Rules Table */}
      {tab === 0 && (
        <Paper sx={{ borderRadius: 3, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <Table>
            <TableHead sx={{ bgcolor: "#fafcff" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: "#64748b", fontSize: "0.78rem" }}>RULE NAME</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#64748b", fontSize: "0.78rem" }}>EVENT TRIGGER</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#64748b", fontSize: "0.78rem" }}>CHANNELS & ACTION</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#64748b", fontSize: "0.78rem" }}>STATUS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", fontSize: "0.78rem" }}>TEST & ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((r) => {
                const trgOpt = options?.triggerTypes.find((t) => t.type === r.triggerType);
                const actOpt = options?.actionTypes.find((a) => a.type === r.actionType);

                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 800, color: "#0f172a" }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                          {r.name}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        <Box display="flex" alignItems="center" gap={0.75}>
                          <Chip
                            size="small"
                            label={trgOpt?.label || r.triggerType}
                            sx={{
                              bgcolor: trgOpt?.isRealTime ? "rgba(2, 132, 199, 0.08)" : "rgba(139, 92, 246, 0.08)",
                              color: trgOpt?.isRealTime ? "#0284c7" : "#7c3aed",
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              borderRadius: "6px",
                            }}
                          />
                          {trgOpt?.isRealTime ? (
                            <Chip
                              size="small"
                              label="Instant"
                              sx={{
                                bgcolor: "rgba(16, 185, 129, 0.1)",
                                color: "#10b981",
                                fontWeight: 800,
                                fontSize: "0.68rem",
                                height: 20,
                              }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              label="15m Sweep"
                              sx={{
                                bgcolor: "rgba(245, 158, 11, 0.1)",
                                color: "#d97706",
                                fontWeight: 800,
                                fontSize: "0.68rem",
                                height: 20,
                              }}
                            />
                          )}
                        </Box>
                        {r.triggerConfig && Object.keys(r.triggerConfig).length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                            Threshold: {JSON.stringify(r.triggerConfig).replace(/["{}]/g, " ")}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {actOpt?.channel === "WHATSAPP" && (
                          <Chip
                            size="small"
                            icon={<WhatsAppIcon style={{ fontSize: 13, color: "#16a34a" }} />}
                            label="WhatsApp"
                            sx={{ bgcolor: "rgba(22, 163, 74, 0.1)", color: "#15803d", fontWeight: 700, fontSize: "0.72rem" }}
                          />
                        )}
                        {actOpt?.channel === "EMAIL" && (
                          <Chip
                            size="small"
                            icon={<EmailRoundedIcon style={{ fontSize: 13, color: "#0284c7" }} />}
                            label="HTML Email"
                            sx={{ bgcolor: "rgba(2, 132, 199, 0.1)", color: "#0369a1", fontWeight: 700, fontSize: "0.72rem" }}
                          />
                        )}
                        {actOpt?.channel === "BOTH" && (
                          <Chip
                            size="small"
                            icon={<SendRoundedIcon style={{ fontSize: 13, color: "#7c3aed" }} />}
                            label="WhatsApp + Email"
                            sx={{ bgcolor: "rgba(124, 58, 237, 0.1)", color: "#6d28d9", fontWeight: 800, fontSize: "0.72rem" }}
                          />
                        )}
                        {actOpt?.channel === "INTERNAL" && (
                          <Chip
                            size="small"
                            label="CRM Activity"
                            sx={{ bgcolor: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: "0.72rem" }}
                          />
                        )}
                        <Typography variant="body2" sx={{ color: "#334155", fontSize: "0.8rem", fontWeight: 600 }}>
                          {actOpt?.label || r.actionType}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Switch
                          checked={r.isActive}
                          onChange={() => toggleActive(r)}
                          color="primary"
                          size="small"
                        />
                        <Typography variant="caption" fontWeight={700} color={r.isActive ? "#16a34a" : "#94a3b8"}>
                          {r.isActive ? "ACTIVE" : "PAUSED"}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="right">
                      <Box display="flex" justifyContent="flex-end" alignItems="center" gap={0.5}>
                        <Tooltip title="Test Fire Rule (Dry Run / Send)">
                          <Button
                            size="small"
                            startIcon={<PlayArrowRoundedIcon />}
                            onClick={() => openTestDialog(r)}
                            sx={{
                              color: "#0284c7",
                              bgcolor: "rgba(2, 132, 199, 0.08)",
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              borderRadius: 2,
                              px: 1.5,
                              py: 0.25,
                              "&:hover": { bgcolor: "rgba(2, 132, 199, 0.16)" },
                            }}
                          >
                            Test
                          </Button>
                        </Tooltip>

                        <Tooltip title="Edit Rule & Templates">
                          <IconButton
                            size="small"
                            onClick={() => openEditModal(r)}
                            sx={{
                              color: "#64748b",
                              borderRadius: 2,
                              "&:hover": { bgcolor: "#f1f5f9", color: "#0f172a" },
                            }}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete Rule">
                          <IconButton
                            size="small"
                            onClick={() => removeRule(r.id)}
                            sx={{
                              color: "#ef4444",
                              borderRadius: 2,
                              "&:hover": { bgcolor: "rgba(239, 68, 68, 0.1)" },
                            }}
                          >
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}

              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 8, textAlign: "center" }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
                      <Avatar sx={{ bgcolor: "rgba(2, 132, 199, 0.1)", color: "#0284c7", width: 56, height: 56, mb: 1 }}>
                        <BoltRoundedIcon fontSize="large" />
                      </Avatar>
                      <Typography variant="h6" fontWeight={800} color="#0f172a">
                        No automation rules configured yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" maxWidth={480}>
                        Supercharge your travel operations by clicking below to install the 6 pre-built essential workflows in 1 click.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AutoAwesomeRoundedIcon />}
                        onClick={handleSeedRecipes}
                        sx={{
                          mt: 1.5,
                          bgcolor: "#7c3aed",
                          fontWeight: 800,
                          borderRadius: 2.5,
                          px: 3,
                          py: 1,
                          textTransform: "none",
                          "&:hover": { bgcolor: "#6d28d9" },
                        }}
                      >
                        Install 6 Essential Travel Recipes
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* TAB 1: Travel Recipes Hub */}
      {tab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#0f172a">
                Curated Travel Agency Automation Recipes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Turn on proven, zero-touch traveler communication flows tailored specifically for tour and cab operators.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AutoAwesomeRoundedIcon />}
              onClick={handleSeedRecipes}
              disabled={seedingLoading}
              sx={{
                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                fontWeight: 800,
                borderRadius: 2.5,
                textTransform: "none",
                px: 2.75,
              }}
            >
              {seedingLoading ? "Installing..." : "Install / Refresh All Recipes"}
            </Button>
          </Box>

          <Box
            display="grid"
            gridTemplateColumns={{ xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}
            gap={2.5}
          >
            {(options?.defaultRecipes || []).map((rec: any, idx: number) => {
              const installed = rules.some((r) => r.name === rec.name);
              return (
                <Paper
                  key={idx}
                  sx={{
                    p: 3,
                    borderRadius: 3.5,
                    border: installed ? "1.5px solid #10b981" : "1px solid #e2e8f0",
                    bgcolor: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                    },
                  }}
                >
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Chip
                        size="small"
                        label={rec.triggerType.replace(/_/g, " ")}
                        sx={{
                          bgcolor: "rgba(2, 132, 199, 0.08)",
                          color: "#0284c7",
                          fontWeight: 800,
                          fontSize: "0.68rem",
                          borderRadius: "6px",
                        }}
                      />
                      {installed ? (
                        <Chip
                          size="small"
                          icon={<CheckRoundedIcon style={{ fontSize: 13 }} />}
                          label="Installed"
                          color="success"
                          sx={{ fontWeight: 800, fontSize: "0.7rem", height: 22 }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Available"
                          sx={{ bgcolor: "#f1f5f9", color: "#64748b", fontWeight: 700, fontSize: "0.7rem", height: 22 }}
                        />
                      )}
                    </Box>

                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a" mb={1}>
                      {rec.name}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem", mb: 2 }}>
                      {rec.actionType === "WHATSAPP_AND_EMAIL_CUSTOMER" && "Sends both instant WhatsApp message and branded HTML travel email to customer with personalized variables."}
                      {rec.actionType === "WHATSAPP_CUSTOMER" && "Dispatches instant automated WhatsApp message directly to customer."}
                      {rec.actionType === "EMAIL_CUSTOMER" && "Sends branded HTML email proposal/briefing to customer inbox."}
                    </Typography>
                  </Box>

                  <Box pt={2} borderTop="1px solid #f1f5f9">
                    <Box display="flex" gap={1} mb={2}>
                      <Chip
                        size="small"
                        icon={<WhatsAppIcon style={{ fontSize: 13, color: "#16a34a" }} />}
                        label="WhatsApp"
                        sx={{ bgcolor: "rgba(22, 163, 74, 0.08)", color: "#15803d", fontWeight: 700, fontSize: "0.7rem" }}
                      />
                      <Chip
                        size="small"
                        icon={<EmailRoundedIcon style={{ fontSize: 13, color: "#0284c7" }} />}
                        label="HTML Email"
                        sx={{ bgcolor: "rgba(2, 132, 199, 0.08)", color: "#0369a1", fontWeight: 700, fontSize: "0.7rem" }}
                      />
                    </Box>

                    <Button
                      fullWidth
                      variant={installed ? "outlined" : "contained"}
                      color={installed ? "inherit" : "primary"}
                      onClick={handleSeedRecipes}
                      startIcon={installed ? <CheckRoundedIcon /> : <AddRoundedIcon />}
                      sx={{
                        textTransform: "none",
                        fontWeight: 800,
                        borderRadius: 2,
                        py: 0.8,
                      }}
                    >
                      {installed ? "Installed & Active" : "1-Click Enable Recipe"}
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}

      {/* TAB 2: Execution Logs Explorer */}
      {tab === 2 && (
        <Box>
          {/* Filter Bar */}
          <Paper
            sx={{
              p: 2,
              mb: 2.5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 2,
              justifyContent: "space-between",
            }}
          >
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" flexGrow={1}>
              <TextField
                size="small"
                placeholder="Search recipient, message, or ID..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 260 }}
              />

              <TextField
                select
                size="small"
                label="Channel"
                value={logChannelFilter}
                onChange={(e) => setLogChannelFilter(e.target.value)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="ALL">All Channels</MenuItem>
                <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
                <MenuItem value="EMAIL">HTML Email</MenuItem>
                <MenuItem value="INTERNAL">CRM Activity</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="Status"
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="SENT">Sent</MenuItem>
                <MenuItem value="SIMULATED">Simulated</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
              </TextField>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadData}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
            >
              Refresh Logs
            </Button>
          </Paper>

          {/* Logs Table */}
          <Paper sx={{ borderRadius: 3, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <Table>
              <TableHead sx={{ bgcolor: "#fafcff" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", fontSize: "0.78rem" }}>TIME</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", fontSize: "0.78rem" }}>TRIGGERED RULE</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", fontSize: "0.78rem" }}>CHANNEL</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", fontSize: "0.78rem" }}>STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", fontSize: "0.78rem" }}>RECIPIENT & TARGET</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", fontSize: "0.78rem" }}>DISPATCH NOTE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell sx={{ fontSize: "0.8rem", color: "#64748b", whiteSpace: "nowrap" }}>
                      {new Date(l.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 800, color: "#0f172a" }}>
                      {l.rule?.name || "Manual / System Sweep"}
                    </TableCell>

                    <TableCell>
                      {l.channel === "WHATSAPP" && (
                        <Chip
                          size="small"
                          icon={<WhatsAppIcon style={{ fontSize: 13, color: "#16a34a" }} />}
                          label="WhatsApp"
                          sx={{ bgcolor: "rgba(22, 163, 74, 0.1)", color: "#15803d", fontWeight: 700, fontSize: "0.72rem" }}
                        />
                      )}
                      {l.channel === "EMAIL" && (
                        <Chip
                          size="small"
                          icon={<EmailRoundedIcon style={{ fontSize: 13, color: "#0284c7" }} />}
                          label="Email"
                          sx={{ bgcolor: "rgba(2, 132, 199, 0.1)", color: "#0369a1", fontWeight: 700, fontSize: "0.72rem" }}
                        />
                      )}
                      {l.channel === "INTERNAL" && (
                        <Chip
                          size="small"
                          label="Activity Note"
                          sx={{ bgcolor: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: "0.72rem" }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      {l.status === "SENT" && (
                        <Chip
                          size="small"
                          label="Sent"
                          color="success"
                          sx={{ fontWeight: 800, fontSize: "0.7rem", height: 22 }}
                        />
                      )}
                      {l.status === "SIMULATED" && (
                        <Chip
                          size="small"
                          label="Simulated"
                          sx={{ bgcolor: "rgba(245, 158, 11, 0.12)", color: "#d97706", fontWeight: 800, fontSize: "0.7rem", height: 22 }}
                        />
                      )}
                      {l.status === "FAILED" && (
                        <Chip
                          size="small"
                          label="Failed"
                          color="error"
                          sx={{ fontWeight: 800, fontSize: "0.7rem", height: 22 }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Box display="flex" flexDirection="column" gap={0.25}>
                        <Typography variant="body2" fontWeight={700} color="#0f172a">
                          {l.recipient || "N/A"}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${l.targetType} #${l.targetId?.slice(-6).toUpperCase()}`}
                          sx={{ width: "fit-content", bgcolor: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "0.68rem" }}
                        />
                      </Box>
                    </TableCell>

                    <TableCell sx={{ color: "#334155", fontSize: "0.82rem", maxWidth: 280 }}>
                      {l.message}
                    </TableCell>
                  </TableRow>
                ))}

                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 6, textAlign: "center" }}>
                      <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                        <Avatar sx={{ bgcolor: "rgba(147, 51, 234, 0.1)", color: "#9333ea", width: 48, height: 48, mb: 1 }}>
                          <HistoryRoundedIcon />
                        </Avatar>
                        <Typography variant="body1" fontWeight={700} color="#0f172a">
                          No matching execution logs found
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Execution logs are generated whenever real-time triggers fire or 15-minute scheduled sweeps execute.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* RULE BUILDER & TEMPLATE MODAL */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900, color: "#0f172a", pb: 1 }}>
          {editingRuleId ? "Edit Workflow Automation Rule" : "Create Workflow Automation Rule"}
        </DialogTitle>

        {/* Modal Navigation Tabs */}
        <Box sx={{ px: 3, borderBottom: "1px solid #e2e8f0" }}>
          <Tabs
            value={modalTab}
            onChange={(_, v) => setModalTab(v)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab value="SETTINGS" label="1. Trigger & Action" sx={{ fontWeight: 800, textTransform: "none" }} />
            {hasWhatsAppTab && (
              <Tab
                value="WHATSAPP"
                icon={<WhatsAppIcon style={{ fontSize: 16, color: "#16a34a" }} />}
                iconPosition="start"
                label="2. WhatsApp Template"
                sx={{ fontWeight: 800, textTransform: "none" }}
              />
            )}
            {hasEmailTab && (
              <Tab
                value="EMAIL"
                icon={<EmailRoundedIcon style={{ fontSize: 16, color: "#0284c7" }} />}
                iconPosition="start"
                label="3. Branded HTML Email"
                sx={{ fontWeight: 800, textTransform: "none" }}
              />
            )}
            <Tab value="PREVIEW" label="4. Live Preview" sx={{ fontWeight: 800, textTransform: "none" }} />
          </Tabs>
        </Box>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, py: 3 }}>
          {/* TAB 1: Trigger & Action Settings */}
          {modalTab === "SETTINGS" && (
            <Box display="flex" flexDirection="column" gap={2.5}>
              <TextField
                label="Rule Name"
                placeholder="e.g. Instant Welcome on New Lead"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
              />

              <TextField
                select
                label="Monitored CRM Event / Trigger"
                value={form.triggerType}
                onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                fullWidth
              >
                {(options?.triggerTypes || []).map((t) => (
                  <MenuItem key={t.type} value={t.type}>
                    <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                      <Typography variant="body2" fontWeight={700}>
                        {t.label}
                      </Typography>
                      <Chip
                        size="small"
                        label={t.isRealTime ? "Real-time" : "Scheduled"}
                        sx={{
                          height: 20,
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          bgcolor: t.isRealTime ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                          color: t.isRealTime ? "#10b981" : "#d97706",
                        }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              {isTimeThresholdTrigger && (
                <TextField
                  label={`Threshold Limit (${timeUnit})`}
                  type="number"
                  value={form.triggerValue}
                  onChange={(e) => setForm({ ...form, triggerValue: Number(e.target.value) })}
                  helperText={`Number of ${timeUnit.toLowerCase()} to evaluate for this condition`}
                  fullWidth
                />
              )}

              <TextField
                select
                label="Dispatched Action"
                value={form.actionType}
                onChange={(e) => setForm({ ...form, actionType: e.target.value })}
                fullWidth
              >
                {(options?.actionTypes || []).map((a) => (
                  <MenuItem key={a.type} value={a.type}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {a.channel === "WHATSAPP" && <WhatsAppIcon style={{ fontSize: 16, color: "#16a34a" }} />}
                      {a.channel === "EMAIL" && <EmailRoundedIcon style={{ fontSize: 16, color: "#0284c7" }} />}
                      {a.channel === "BOTH" && <SendRoundedIcon style={{ fontSize: 16, color: "#7c3aed" }} />}
                      <Typography variant="body2" fontWeight={600}>
                        {a.label}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              {form.actionType === "EMAIL_STAFF" && (
                <>
                  <TextField
                    select
                    label="Recipient Category"
                    value={form.recipient}
                    onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                    fullWidth
                  >
                    <MenuItem value="CLIENT_ADMIN">Client Admin / Manager</MenuItem>
                    <MenuItem value="ASSIGNED_STAFF">Assigned Lead Handler</MenuItem>
                    <MenuItem value="SPECIFIC_USER">Specific Team Member</MenuItem>
                  </TextField>
                  {form.recipient === "SPECIFIC_USER" && (
                    <TextField
                      select
                      label="Select Team Member"
                      value={form.userId}
                      onChange={(e) => setForm({ ...form, userId: e.target.value })}
                      fullWidth
                    >
                      {staff.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name} ({s.email})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </>
              )}

              {form.actionType === "REASSIGN_ENQUIRY" && (
                <TextField
                  select
                  label="Reassign Target Staff"
                  value={form.toUserId}
                  onChange={(e) => setForm({ ...form, toUserId: e.target.value })}
                  fullWidth
                >
                  {staff.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>
          )}

          {/* TAB 2: WhatsApp Template Editor */}
          {modalTab === "WHATSAPP" && hasWhatsAppTab && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Box>
                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                  Click to Insert Dynamic Placeholders:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.75} mt={1}>
                  {(options?.placeholders || []).map((p) => (
                    <Chip
                      key={p.tag}
                      label={p.tag}
                      onClick={() => insertPlaceholder(p.tag)}
                      sx={{
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        bgcolor: "#f1f5f9",
                        "&:hover": { bgcolor: "rgba(2, 132, 199, 0.15)", color: "#0284c7" },
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <TextField
                label="WhatsApp Message Template"
                multiline
                rows={8}
                value={form.messageTemplate}
                onFocus={() => setActiveFocusField("whatsapp")}
                onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })}
                placeholder="Namaste {customer_name}! Thank you for contacting {company_name}..."
                fullWidth
                helperText={`Character count: ${form.messageTemplate.length} | Format with *bold*, _italics_, and emojis`}
              />
            </Box>
          )}

          {/* TAB 3: Email Subject & Body Editor */}
          {modalTab === "EMAIL" && hasEmailTab && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Box>
                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                  Click to Insert Dynamic Placeholders:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.75} mt={1}>
                  {(options?.placeholders || []).map((p) => (
                    <Chip
                      key={p.tag}
                      label={p.tag}
                      onClick={() => insertPlaceholder(p.tag)}
                      sx={{
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        bgcolor: "#f1f5f9",
                        "&:hover": { bgcolor: "rgba(2, 132, 199, 0.15)", color: "#0284c7" },
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <TextField
                label="Email Subject Line"
                value={form.emailSubject}
                onFocus={() => setActiveFocusField("emailSubject")}
                onChange={(e) => setForm({ ...form, emailSubject: e.target.value })}
                placeholder="e.g. Booking Confirmed: #{booking_number} for {destination}"
                fullWidth
              />

              <TextField
                label="Branded HTML Email Content (Supports HTML tags)"
                multiline
                rows={8}
                value={form.emailBody}
                onFocus={() => setActiveFocusField("emailBody")}
                onChange={(e) => setForm({ ...form, emailBody: e.target.value })}
                placeholder="<p>Dear {customer_name},</p><p>Your booking is confirmed...</p>"
                fullWidth
              />
            </Box>
          )}

          {/* TAB 4: Live Preview */}
          {modalTab === "PREVIEW" && (
            <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={3}>
              {/* WhatsApp Preview Bubble */}
              {hasWhatsAppTab && (
                <Box flex={1}>
                  <Typography variant="subtitle2" fontWeight={800} color="#15803d" mb={1} display="flex" alignItems="center" gap={0.5}>
                    <WhatsAppIcon fontSize="small" /> WhatsApp Mobile Preview
                  </Typography>
                  <Paper
                    sx={{
                      p: 2.5,
                      borderRadius: 3.5,
                      bgcolor: "#efeae2",
                      border: "1px solid #dcd7ce",
                      minHeight: 220,
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        bgcolor: "#ffffff",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        whiteSpace: "pre-wrap",
                        fontSize: "0.85rem",
                        color: "#111b21",
                        lineHeight: 1.5,
                      }}
                    >
                      {previewInterpolate(form.messageTemplate) || "No message template specified yet."}
                    </Box>
                  </Paper>
                </Box>
              )}

              {/* Email Preview */}
              {hasEmailTab && (
                <Box flex={1}>
                  <Typography variant="subtitle2" fontWeight={800} color="#0369a1" mb={1} display="flex" alignItems="center" gap={0.5}>
                    <EmailRoundedIcon fontSize="small" /> Branded HTML Email Preview
                  </Typography>
                  <Paper
                    sx={{
                      p: 2.5,
                      borderRadius: 3.5,
                      border: "1px solid #e2e8f0",
                      bgcolor: "#f8fafc",
                      minHeight: 220,
                    }}
                  >
                    <Box bgcolor="#ffffff" p={2} borderRadius={2} border="1px solid #e2e8f0" mb={1.5}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Subject:
                      </Typography>
                      <Typography variant="body2" fontWeight={800} color="#0f172a">
                        {previewInterpolate(form.emailSubject) || "(No subject provided)"}
                      </Typography>
                    </Box>

                    <Box
                      bgcolor="#ffffff"
                      p={2}
                      borderRadius={2}
                      border="1px solid #e2e8f0"
                      sx={{ fontSize: "0.85rem" }}
                      dangerouslySetInnerHTML={{
                        __html: previewInterpolate(form.emailBody) || "<p>(No body content)</p>",
                      }}
                    />
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={() => setOpenModal(false)} sx={{ fontWeight: 600, color: "#64748b" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRule}
            sx={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              fontWeight: 800,
              px: 3,
            }}
          >
            {editingRuleId ? "Save Changes" : "Create Automation Rule"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* TEST EXECUTION MODAL */}
      <Dialog open={testModalOpen} onClose={() => setTestModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900, color: "#0f172a" }}>
          Test Automation Rule: {testingRule?.name}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Execute a live test dry-run using real sample data from your CRM. You can override the destination phone or email below:
          </Typography>

          <TextField
            label="Override Test WhatsApp Phone (Optional)"
            placeholder="+91 9876543210"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            helperText="Leave empty to use customer phone from the sample CRM record"
            fullWidth
          />

          <TextField
            label="Override Test Email (Optional)"
            placeholder="test@yourdomain.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            helperText="Leave empty to use customer email from the sample CRM record"
            fullWidth
          />

          {testResult && (
            <Alert
              severity={testResult.startsWith("✓") ? "success" : "error"}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {testResult}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setTestModalOpen(false)} sx={{ fontWeight: 600, color: "#64748b" }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleRunTest}
            disabled={testRunning}
            startIcon={testRunning ? <CircularProgress size={16} color="inherit" /> : <PlayArrowRoundedIcon />}
            sx={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              fontWeight: 800,
              px: 3,
            }}
          >
            {testRunning ? "Dispatching..." : "Fire Test Dispatch"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
export default AutomationPage;
