import { useEffect, useState } from "react";
import {
  Box, Typography, Button, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Switch, Tabs, Tab, Avatar, Card, CardContent, Grid
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DynamicFormRoundedIcon from "@mui/icons-material/DynamicFormRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import PinRoundedIcon from "@mui/icons-material/PinRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import { apiClient } from "../../api/client";

const MODULES = ["customers", "enquiries", "bookings"];
const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "BOOLEAN"];

const MODULE_ICONS: Record<string, any> = {
  customers: PersonRoundedIcon,
  enquiries: RouteRoundedIcon,
  bookings: ConfirmationNumberRoundedIcon,
};

export function CustomFieldsPage() {
  const [tab, setTab] = useState(0);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fieldKey: "", label: "", fieldType: "TEXT" });

  const module = MODULES[tab];
  const CurrentIcon = MODULE_ICONS[module] || DynamicFormRoundedIcon;

  function load() {
    apiClient
      .get("/custom-fields/definitions", { params: { module } })
      .then(({ data }) => setDefinitions(data.data ?? []))
      .catch(() => setDefinitions([]));
  }
  useEffect(load, [module]);

  async function handleCreate() {
    await apiClient.post("/custom-fields/definitions", { module, ...form });
    setOpen(false);
    setForm({ fieldKey: "", label: "", fieldType: "TEXT" });
    load();
  }

  async function toggleActive(def: any) {
    await apiClient.patch(`/custom-fields/definitions/${def.id}`, { isActive: !def.isActive });
    load();
  }

  const activeCount = definitions.filter((d) => d.isActive).length;

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
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
            <Avatar
              sx={{
                width: 44,
                height: 44,
                background: "linear-gradient(135deg, #0284c7 0%, #0c4a6e 100%)",
                boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
              }}
            >
              <DynamicFormRoundedIcon sx={{ color: "#fff", fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.03em" }}>
                Custom Field Builder
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Extend Customers, Enquiries, and Bookings with custom travel data points without writing code.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5}>
          <Chip
            label={`${activeCount} Active on ${module.toUpperCase()}`}
            size="small"
            sx={{
              bgcolor: "#ecfdf5",
              color: "#059669",
              fontWeight: 800,
              fontSize: "0.75rem",
              borderRadius: "8px",
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setOpen(true)}
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
            New Custom Field
          </Button>
        </Box>
      </Box>

      {/* Metric Strip */}
      <Grid container spacing={2.5} mb={3.5}>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.25 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                    Total In Current Module
                  </Typography>
                  <Typography variant="h5" fontWeight={900} color="#0f172a">
                    {definitions.length} Fields
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#eff6ff", color: "#0284c7", width: 40, height: 40 }}>
                  <CurrentIcon sx={{ fontSize: 22 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.25 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                    Active Fields
                  </Typography>
                  <Typography variant="h5" fontWeight={900} color="#10b981">
                    {activeCount} Enabled
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#ecfdf5", color: "#10b981", width: 40, height: 40 }}>
                  <ToggleOnRoundedIcon sx={{ fontSize: 24 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.25 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                    Supported Data Types
                  </Typography>
                  <Typography variant="h5" fontWeight={900} color="#6366f1">
                    4 Formats
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#eef2ff", color: "#6366f1", width: 40, height: 40 }}>
                  <TextFieldsRoundedIcon sx={{ fontSize: 22 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Target Module Tabs */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 2.5, border: "1px solid #e2e8f0", bgcolor: "#ffffff", p: 0.5 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            "& .MuiTab-root": {
              fontWeight: 700,
              fontSize: "0.85rem",
              textTransform: "none",
              borderRadius: 2,
              minHeight: 44,
              px: 3,
            },
            "& .Mui-selected": {
              color: "#0284c7 !important",
              bgcolor: "#f0f9ff",
            },
            "& .MuiTabs-indicator": {
              bgcolor: "#0284c7",
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
          }}
        >
          <Tab icon={<PersonRoundedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Customers" />
          <Tab icon={<RouteRoundedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Enquiries & Leads" />
          <Tab icon={<ConfirmationNumberRoundedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Bookings & Trips" />
        </Tabs>
      </Paper>

      {/* Custom Fields Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff", overflow: "hidden" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.5 }}>FIELD KEY (API SLUG)</TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.5 }}>UI DISPLAY LABEL</TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.5 }}>INPUT TYPE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 1.5 }}>STATUS / ACTIVE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {definitions.map((d) => (
              <TableRow key={d.id} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                <TableCell sx={{ py: 1.75 }}>
                  <code
                    style={{
                      background: "#f1f5f9",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      color: "#0f172a",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      fontFamily: "monospace",
                    }}
                  >
                    {d.fieldKey}
                  </code>
                </TableCell>
                <TableCell sx={{ py: 1.75, fontWeight: 700, color: "#0f172a" }}>
                  {d.label}
                </TableCell>
                <TableCell sx={{ py: 1.75 }}>
                  <Chip
                    size="small"
                    label={d.fieldType}
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      bgcolor:
                        d.fieldType === "TEXT"
                          ? "#eff6ff"
                          : d.fieldType === "NUMBER"
                          ? "#fef3c7"
                          : d.fieldType === "DATE"
                          ? "#f0fdf4"
                          : "#fdf4ff",
                      color:
                        d.fieldType === "TEXT"
                          ? "#1e40af"
                          : d.fieldType === "NUMBER"
                          ? "#92400e"
                          : d.fieldType === "DATE"
                          ? "#166534"
                          : "#86198f",
                      borderRadius: "6px",
                    }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ py: 1.75 }}>
                  <Switch
                    checked={d.isActive}
                    onChange={() => toggleActive(d)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#0284c7",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "#0284c7",
                      },
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {definitions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: "center", py: 6, color: "#94a3b8" }}>
                  <Typography variant="body2" fontWeight={600} color="#64748b" mb={1}>
                    No custom fields configured for {module} yet.
                  </Typography>
                  <Typography variant="caption" color="#94a3b8">
                    Add custom fields such as "Passport Expiry", "Meal Preference", or "Flight PNR" to capture richer trip details.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* New Custom Field Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>
          Add Custom Field to {module.charAt(0).toUpperCase() + module.slice(1)}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          <TextField
            label="Field Display Label"
            placeholder="e.g. Passport Expiry Date, Dietary Requirement"
            fullWidth
            value={form.label}
            onChange={(e) => {
              const label = e.target.value;
              const slug = label.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
              setForm({ ...form, label, fieldKey: form.fieldKey || slug });
            }}
          />
          <TextField
            label="Field Key (Internal Slug)"
            placeholder="e.g. passport_expiry_date"
            helperText="Auto-formatted: lowercase letters, numbers, and underscores only"
            fullWidth
            value={form.fieldKey}
            onChange={(e) =>
              setForm({
                ...form,
                fieldKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
              })
            }
          />
          <TextField
            select
            label="Data Type"
            fullWidth
            value={form.fieldType}
            onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
          >
            {FIELD_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.label || !form.fieldKey}
            sx={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              fontWeight: 700,
              borderRadius: 2,
            }}
          >
            Create Field
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
