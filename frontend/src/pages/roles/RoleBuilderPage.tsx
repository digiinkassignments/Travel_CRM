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
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  Grid,
  Divider,
  CircularProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import RemoveDoneRoundedIcon from "@mui/icons-material/RemoveDoneRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockPersonRoundedIcon from "@mui/icons-material/LockPersonRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { apiClient } from "../../api/client";

const ACTIONS = ["view", "add", "edit", "delete", "export"] as const;

const ACTION_COLORS: Record<string, string> = {
  view: "#2563eb",
  add: "#16a34a",
  edit: "#d97706",
  delete: "#dc2626",
  export: "#7c3aed",
};

function emptyGrid(modules: string[]) {
  const grid: Record<string, Record<string, boolean>> = {};
  for (const m of modules) {
    grid[m] = { view: false, add: false, edit: false, delete: false, export: false };
  }
  return grid;
}

export function RoleBuilderPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [grid, setGrid] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedRole, setSelectedRole] = useState<any | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      apiClient.get("/roles").then(({ data }) => setRoles(data.data ?? [])),
      apiClient.get("/roles/modules").then(({ data }) => {
        const mods = data.data ?? [];
        setModules(mods);
        setGrid(emptyGrid(mods));
      }),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(moduleName: string, action: string) {
    setGrid((prev) => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        [action]: !prev[moduleName]?.[action],
      },
    }));
  }

  function toggleRow(moduleName: string, enableAll: boolean) {
    setGrid((prev) => ({
      ...prev,
      [moduleName]: {
        view: enableAll,
        add: enableAll,
        edit: enableAll,
        delete: enableAll,
        export: enableAll,
      },
    }));
  }

  function selectAllMatrix(enable: boolean) {
    const next: Record<string, Record<string, boolean>> = {};
    for (const m of modules) {
      next[m] = {
        view: enable,
        add: enable,
        edit: enable,
        delete: enable,
        export: enable,
      };
    }
    setGrid(next);
  }

  async function handleCreate() {
    try {
      setCreating(true);
      await apiClient.post("/roles", { name, permissionsJson: grid });
      setOpen(false);
      setName("");
      setGrid(emptyGrid(modules));
      load();
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(role: any) {
    if (role.isSystemRole || !window.confirm(`Delete the ${role.name} role?`)) return;
    try {
      await apiClient.delete(`/roles/${role.id}`);
      load();
    } catch (err: any) {
      window.alert(err.response?.data?.message ?? "Could not delete role");
    }
  }

  const permissionCount = useMemo(() => {
    let count = 0;
    Object.values(grid).forEach((actions) => {
      Object.values(actions).forEach((val) => {
        if (val) count++;
      });
    });
    return count;
  }, [grid]);

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Header */}
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
              Role & RBAC Studio
            </Typography>
            <Chip
              label={`${roles.length} Defined Roles`}
              size="small"
              icon={<ShieldRoundedIcon style={{ fontSize: 14 }} />}
              sx={{
                bgcolor: "rgba(2, 132, 199, 0.1)",
                color: "#0284c7",
                fontWeight: 800,
                fontSize: "0.72rem",
                borderRadius: "6px",
                border: "1px solid rgba(2, 132, 199, 0.2)",
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Configure modular CRUD privileges and export boundaries across tenant workflows.
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5}>
          <Tooltip title="Refresh Roles">
            <span>
              <IconButton
                onClick={load}
                disabled={loading}
                sx={{
                  bgcolor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 2.5,
                  "&:hover": { bgcolor: "#f1f5f9" },
                }}
              >
                <RefreshRoundedIcon fontSize="small" sx={{ color: "#475569" }} />
              </IconButton>
            </span>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setGrid(emptyGrid(modules));
              setName("");
              setOpen(true);
            }}
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
            Create Custom Role
          </Button>
        </Box>
      </Box>

      {/* Role Cards Grid */}
      <Grid container spacing={2.5} mb={4}>
        {roles.map((r) => {
          const permMap = r.permissionsJson || {};
          let activeRulesCount = 0;
          Object.values(permMap).forEach((mod: any) => {
            if (typeof mod === "object" && mod !== null) {
              Object.values(mod).forEach((act) => {
                if (act) activeRulesCount++;
              });
            }
          });

          return (
            <Grid item xs={12} sm={6} md={4} key={r.id}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3.5,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
                    borderColor: "#cbd5e1",
                  },
                }}
              >
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Avatar
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.5,
                        bgcolor: r.isSystemRole ? "#eff6ff" : "#f8fafc",
                        color: r.isSystemRole ? "#2563eb" : "#475569",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {r.isSystemRole ? (
                        <AdminPanelSettingsRoundedIcon fontSize="small" />
                      ) : (
                        <SecurityRoundedIcon fontSize="small" />
                      )}
                    </Avatar>

                    <Chip
                      size="small"
                      label={r.isSystemRole ? "System Built-in" : "Custom Defined"}
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.68rem",
                        bgcolor: r.isSystemRole ? "#f0fdf4" : "#f1f5f9",
                        color: r.isSystemRole ? "#16a34a" : "#475569",
                        borderRadius: "6px",
                      }}
                    />
                  </Box>

                  <Typography variant="h6" fontWeight={800} sx={{ color: "#0f172a", mb: 0.5 }}>
                    {r.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2.5}>
                    {r.isSystemRole
                      ? "Full unrestricted administrative governance across all modules."
                      : "Fine-grained permissions curated specifically for this operational profile."}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    pt: 2,
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={0.75}>
                    <LockPersonRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                    <Typography variant="caption" fontWeight={700} color="#475569">
                      {r.isSystemRole ? "Unrestricted Access" : `${activeRulesCount} Action Grants`}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Button size="small" onClick={() => setSelectedRole(r)} sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.8rem", color: "#2563eb" }}>View Scope</Button>
                    {!r.isSystemRole && <IconButton size="small" color="error" onClick={() => handleDelete(r)} title="Delete role"><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Role Creation Modal */}
      <Dialog
        open={open}
        onClose={() => !creating && setOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#0f172a", pb: 0.5 }}>
          Create Custom Access Role
        </DialogTitle>
        <Typography variant="body2" color="text.secondary" px={3} mb={1}>
          Define module boundaries and permit granular permissions.
        </Typography>

        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Role Title"
            placeholder="e.g. Sales Coordinator, Transport Lead, Dispatch Auditor"
            fullWidth
            required
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#ffffff" },
            }}
          />

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={1.5}
            flexWrap="wrap"
            gap={1}
          >
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
              Permission Matrix ({permissionCount} actions granted)
            </Typography>

            <Box display="flex" gap={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DoneAllRoundedIcon fontSize="small" />}
                onClick={() => selectAllMatrix(true)}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  borderRadius: 2,
                  color: "#2563eb",
                  borderColor: "#bfdbfe",
                  bgcolor: "#eff6ff",
                  "&:hover": { borderColor: "#93c5fd", bgcolor: "#dbeafe" },
                }}
              >
                Grant All
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RemoveDoneRoundedIcon fontSize="small" />}
                onClick={() => selectAllMatrix(false)}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  borderRadius: 2,
                  color: "#64748b",
                  borderColor: "#e2e8f0",
                  "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
                }}
              >
                Revoke All
              </Button>
            </Box>
          </Box>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              bgcolor: "#ffffff",
            }}
          >
            <Table size="small">
              <TableHead sx={{ bgcolor: "#fafcff" }}>
                <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.5, px: 2.5, fontSize: "0.75rem" }}>
                    MODULE WORKSPACE
                  </TableCell>
                  {ACTIONS.map((a) => (
                    <TableCell
                      key={a}
                      align="center"
                      sx={{
                        fontWeight: 800,
                        color: ACTION_COLORS[a] || "#64748b",
                        py: 1.5,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {a}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ py: 1.5, px: 2, fontSize: "0.75rem", color: "#64748b", fontWeight: 800 }}>
                    QUICK ROW
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {modules.map((m) => {
                  const allInRow = ACTIONS.every((a) => grid[m]?.[a]);

                  return (
                    <TableRow key={m} hover sx={{ "&:last-child td": { border: 0 } }}>
                      <TableCell sx={{ py: 1.25, px: 2.5 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: "#0f172a", textTransform: "capitalize" }}>
                          {m.replace(/_/g, " ")}
                        </Typography>
                      </TableCell>

                      {ACTIONS.map((a) => (
                        <TableCell key={a} align="center" sx={{ py: 1 }}>
                          <Checkbox
                            size="small"
                            checked={Boolean(grid[m]?.[a])}
                            onChange={() => toggle(m, a)}
                            sx={{
                              color: "#cbd5e1",
                              "&.Mui-checked": {
                                color: ACTION_COLORS[a] || "#2563eb",
                              },
                            }}
                          />
                        </TableCell>
                      ))}

                      <TableCell align="right" sx={{ py: 1, px: 2 }}>
                        <Button
                          size="small"
                          onClick={() => toggleRow(m, !allInRow)}
                          sx={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "none",
                            color: allInRow ? "#dc2626" : "#2563eb",
                            p: 0.5,
                          }}
                        >
                          {allInRow ? "Deselect" : "Select All"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setOpen(false)}
            disabled={creating}
            sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            startIcon={creating ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : null}
            sx={{
              bgcolor: "#2563eb",
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            {creating ? "Saving Role..." : "Publish Role"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Scope Inspector Dialog */}
      <Dialog
        open={Boolean(selectedRole)}
        onClose={() => setSelectedRole(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#0f172a", pb: 0.5 }}>
          {selectedRole?.name} Privileges
        </DialogTitle>
        <Typography variant="body2" color="text.secondary" px={3} mb={2}>
          {selectedRole?.isSystemRole
            ? "Unrestricted global root privileges across all CRM functionalities."
            : "Assigned permissions granted to this operational role."}
        </Typography>

        <DialogContent sx={{ pt: 1 }}>
          {selectedRole?.isSystemRole ? (
            <Box
              sx={{
                p: 3,
                bgcolor: "#f0fdf4",
                borderRadius: 2.5,
                border: "1px solid #dcfce7",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <CheckCircleRoundedIcon sx={{ color: "#16a34a", fontSize: 32 }} />
              <Box>
                <Typography variant="body2" fontWeight={800} color="#166534">
                  Super Administrator Access
                </Typography>
                <Typography variant="caption" color="#15803d">
                  Users with this role automatically bypass all individual module checks.
                </Typography>
              </Box>
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#fafcff" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: "#64748b" }}>Module</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b" }}>
                      Active Privileges
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modules.map((m) => {
                    const grants = Object.entries(selectedRole?.permissionsJson?.[m] || {})
                      .filter(([_, active]) => Boolean(active))
                      .map(([act]) => act);

                    return (
                      <TableRow key={m}>
                        <TableCell sx={{ textTransform: "capitalize", fontWeight: 700 }}>
                          {m.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell align="right">
                          {grants.length > 0 ? (
                            <Box display="flex" justifyContent="flex-end" gap={0.5} flexWrap="wrap">
                              {grants.map((g) => (
                                <Chip
                                  key={g}
                                  size="small"
                                  label={g.toUpperCase()}
                                  sx={{
                                    height: 20,
                                    fontSize: "0.65rem",
                                    fontWeight: 800,
                                    bgcolor: "#eff6ff",
                                    color: "#2563eb",
                                    borderRadius: "4px",
                                  }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No Access
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSelectedRole(null)}
            variant="contained"
            sx={{
              bgcolor: "#2563eb",
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              px: 2.5,
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}