import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  InputAdornment,
  Avatar,
  TablePagination,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { apiClient } from "../../api/client";

export function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", roleId: "" });
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      apiClient.get("/users/staff").then(({ data }) => setStaff(data.data ?? [])),
      apiClient.get("/roles").then(({ data }) => setRoles(data.data ?? [])),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    try {
      setCreating(true);
      const { data } = await apiClient.post("/users/staff", form);
      setCreatedCreds({ email: form.email, password: data.data.temporaryPassword });
      setForm({ name: "", email: "", roleId: "" });
      load();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(u: any) {
    try {
      setTogglingId(u.id);
      await apiClient.patch(`/users/staff/${u.id}`, { isActive: !u.isActive });
      setStaff((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, isActive: !item.isActive } : item))
      );
    } catch (err: any) {
      window.alert(err.response?.data?.message ?? "Could not update team member status");
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteMember(u: any) {
    if (!window.confirm(`Delete ${u.name}'s account permanently?`)) return;
    try {
      setTogglingId(u.id);
      await apiClient.delete(`/users/staff/${u.id}`);
      setStaff((prev) => prev.filter((item) => item.id !== u.id));
    } catch (err: any) {
      window.alert(err.response?.data?.message ?? "Could not delete team member");
    } finally {
      setTogglingId(null);
    }
  }

  function handleCopyPassword(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const filteredStaff = useMemo(() => {
    return staff.filter((u) => {
      const q = searchQuery.toLowerCase();
      const name = u.name?.toLowerCase() ?? "";
      const email = u.email?.toLowerCase() ?? "";
      const role = u.role?.name?.toLowerCase() ?? "";
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [staff, searchQuery]);

  const paginatedStaff = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredStaff.slice(start, start + rowsPerPage);
  }, [filteredStaff, page, rowsPerPage]);

  const activeStaffCount = staff.filter((u) => u.isActive).length;

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
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
              Staff & Members
            </Typography>
            <Chip
              label={`${activeStaffCount}/${staff.length} Active`}
              size="small"
              icon={<GroupRoundedIcon style={{ fontSize: 14 }} />}
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
            Manage team accounts, assign RBAC access roles, and control operational login statuses.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => {
            setCreatedCreds(null);
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
          Add Staff Member
        </Button>
      </Box>

      {/* KPI Stats Strip */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "repeat(1, 1fr)", sm: "repeat(3, 1fr)" }}
        gap={2.5}
        mb={3}
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
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(2, 132, 199, 0.1)", color: "#0284c7", borderRadius: 2.5, width: 46, height: 46 }}>
            <GroupRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Members
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {staff.length}
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
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: 2.5, width: 46, height: 46 }}>
            <CheckCircleRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Login Access
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {activeStaffCount}
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
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(147, 51, 234, 0.1)", color: "#9333ea", borderRadius: 2.5, width: 46, height: 46 }}>
            <AdminPanelSettingsRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Defined RBAC Roles
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {roles.length} Roles
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Filter and Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search by member name, email, or role..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" sx={{ color: "#94a3b8" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: { xs: "1 1 100%", sm: "0 1 380px" },
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "#f8fafc",
            },
          }}
        />

        <Tooltip title="Refresh Staff List">
          <span>
            <IconButton
              onClick={load}
              disabled={loading}
              sx={{
                bgcolor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 2,
                "&:hover": { bgcolor: "#f1f5f9" },
              }}
            >
              <RefreshRoundedIcon fontSize="small" sx={{ color: "#475569" }} />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>

      {/* Main Staff Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3.5,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          bgcolor: "#ffffff",
          boxShadow: "0 4px 16px rgba(16, 24, 40, 0.03)",
        }}
      >
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ bgcolor: "#fafcff" }}>
            <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                TEAM MEMBER
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                EMAIL ADDRESS
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                ACCESS ROLE
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                STATUS
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                ACTION
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedStaff.map((u) => {
              const isToggling = togglingId === u.id;

              return (
                <TableRow
                  key={u.id}
                  hover
                  sx={{
                    transition: "background-color 0.15s ease",
                    "&:hover": { bgcolor: "#fbfcfe !important" },
                    "&:last-child td": { border: 0 },
                  }}
                >
                  {/* Name and Avatar */}
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Box display="flex" alignItems="center" gap={1.75}>
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          bgcolor: u.isClientAdmin ? "#eff6ff" : "#f1f5f9",
                          color: u.isClientAdmin ? "#2563eb" : "#475569",
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          borderRadius: 2,
                        }}
                      >
                        {u.name?.[0]?.toUpperCase() || <PersonRoundedIcon fontSize="small" />}
                      </Avatar>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={800} sx={{ color: "#0f172a" }}>
                            {u.name}
                          </Typography>
                          {u.isClientAdmin && (
                            <Chip
                              size="small"
                              icon={<AdminPanelSettingsRoundedIcon style={{ fontSize: 13 }} />}
                              label="Admin"
                              sx={{
                                height: 20,
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                bgcolor: "#eff6ff",
                                color: "#2563eb",
                                border: "1px solid #bfdbfe",
                                borderRadius: "4px",
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          User ID #{u.id?.slice(-6).toUpperCase()}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Email */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                      <EmailRoundedIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                      <Typography variant="body2" fontWeight={500} color="#334155">
                        {u.email}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Role */}
                  <TableCell sx={{ py: 2 }}>
                    <Chip
                      size="small"
                      label={u.role?.name ?? (u.isClientAdmin ? "Super Admin" : "Standard Staff")}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        bgcolor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        color: "#334155",
                        borderRadius: 1.5,
                      }}
                    />
                  </TableCell>

                  {/* Status */}
                  <TableCell sx={{ py: 2 }}>
                    <Chip
                      size="small"
                      label={u.isActive ? "Active" : "Deactivated"}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        borderRadius: "6px",
                        bgcolor: u.isActive ? "#ecfdf5" : "#f1f5f9",
                        color: u.isActive ? "#047857" : "#64748b",
                        border: `1px solid ${u.isActive ? "#a7f3d0" : "#e2e8f0"}`,
                      }}
                    />
                  </TableCell>

                  {/* Action */}
                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
                    {!u.isClientAdmin ? (
                      <Box display="flex" justifyContent="flex-end" gap={0.5}>
                      <Button
                        size="small" disabled={isToggling} onClick={() => toggleActive(u)}
                        startIcon={
                          isToggling ? (
                            <CircularProgress size={14} sx={{ color: "inherit" }} />
                          ) : u.isActive ? (
                            <BlockRoundedIcon fontSize="small" />
                          ) : (
                            <HowToRegRoundedIcon fontSize="small" />
                          )
                        }
                        sx={{
                          textTransform: "none",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          borderRadius: 2,
                          px: 1.75,
                          py: 0.5,
                          color: u.isActive ? "#dc2626" : "#2563eb",
                          bgcolor: u.isActive ? "#fef2f2" : "#eff6ff",
                          "&:hover": {
                            bgcolor: u.isActive ? "#fee2e2" : "#dbeafe",
                          },
                        }}
                      >
                        {u.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                      <IconButton size="small" color="error" disabled={isToggling} onClick={() => deleteMember(u)} title="Delete team member"><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Protected
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredStaff.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 8, textAlign: "center" }}>
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "#eff6ff",
                        color: "#2563eb",
                        mb: 0.5,
                      }}
                    >
                      <GroupRoundedIcon fontSize="medium" />
                    </Avatar>
                    <Typography variant="body1" fontWeight={700} sx={{ color: "#0f172a" }}>
                      {searchQuery ? "No matching staff members found" : "No staff enrolled yet"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {searchQuery
                        ? "Check your query spelling or clear search filters."
                        : "Add team members to assign inquiries, dispatch roles, and manage permissions."}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredStaff.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{ borderTop: "1px solid #f1f5f9" }}
        />
      </Paper>

      {/* Add Staff / Credentials Modal */}
      <Dialog
        open={open}
        onClose={() => {
          if (!creating) {
            setOpen(false);
            setCreatedCreds(null);
          }
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#0f172a", pb: 1 }}>
          {createdCreds ? "Account Provisioned" : "Add Staff Member"}
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "10px !important" }}>
          {createdCreds ? (
            <Box display="flex" flexDirection="column" gap={2}>
              <Alert
                severity="success"
                icon={<CheckCircleRoundedIcon fontSize="inherit" />}
                sx={{ borderRadius: 2.5 }}
              >
                Staff account created successfully. Share these credentials with the team member.
              </Alert>

              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Box mb={2}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                    Registered Email
                  </Typography>
                  <Typography variant="body1" fontWeight={800} color="#0f172a">
                    {createdCreds.email}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                    Temporary One-Time Password
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                    <Box
                      sx={{
                        p: 1.25,
                        px: 2,
                        borderRadius: 2,
                        bgcolor: "#ffffff",
                        border: "1px solid #cbd5e1",
                        fontFamily: "monospace",
                        fontWeight: 800,
                        fontSize: "1rem",
                        color: "#2563eb",
                        flexGrow: 1,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {createdCreds.password}
                    </Box>
                    <Tooltip title={copied ? "Copied!" : "Copy Temporary Password"}>
                      <IconButton
                        onClick={() => handleCopyPassword(createdCreds.password)}
                        sx={{
                          bgcolor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 2,
                          "&:hover": { bgcolor: "#f1f5f9" },
                        }}
                      >
                        <ContentCopyRoundedIcon fontSize="small" sx={{ color: "#475569" }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : (
            <>
              <TextField
                size="small"
                label="Full Name"
                placeholder="e.g. Ananya Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />

              <TextField
                size="small"
                label="Corporate Email"
                type="email"
                placeholder="e.g. ananya@agency.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />

              <TextField
                select
                size="small"
                label="Role & Privileges"
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                required
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              >
                {roles.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          {createdCreds ? (
            <Button
              variant="contained"
              onClick={() => {
                setOpen(false);
                setCreatedCreds(null);
              }}
              sx={{
                bgcolor: "#2563eb",
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                px: 3,
                "&:hover": { bgcolor: "#1d4ed8" },
              }}
            >
              Done
            </Button>
          ) : (
            <>
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
                disabled={creating || !form.name.trim() || !form.email.trim() || !form.roleId}
                startIcon={creating ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <KeyRoundedIcon />}
                sx={{
                  bgcolor: "#2563eb",
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  px: 2.5,
                  "&:hover": { bgcolor: "#1d4ed8" },
                }}
              >
                {creating ? "Provisioning..." : "Create Member"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}