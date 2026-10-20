import { useEffect, useState, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  InputAdornment,
  TablePagination,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { apiClient } from "../../api/client";

interface ClientRow {
  id: string;
  clientCode: string;
  businessName: string;
  email: string;
  subscriptionStatus: string;
  subscriptionExpiry: string;
  plan: { name: string };
}

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  ACTIVE: "success",
  EXPIRING_SOON: "warning",
  GRACE: "warning",
  LOCKED: "error",
  DELETED: "default",
};

export function ClientsListPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [plans, setPlans] = useState<Array<{ id: string; name: string }>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    planId: "",
    subscriptionStart: new Date().toISOString().slice(0, 10),
    subscriptionExpiry: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  });

  const [createdCreds, setCreatedCreds] = useState<{
    clientCode: string;
    temporaryPassword: string;
    resetUrl?: string;
    loginUrl?: string;
    emailSent?: boolean;
    emailSimulated?: boolean;
    email?: string;
  } | null>(null);

  function load() {
    apiClient.get("/super-admin/clients").then(({ data }) => setClients(data.data ?? []));
    apiClient.get("/super-admin/plans").then(({ data }) => setPlans(data.data ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    try {
      setLoading(true);
      const { data } = await apiClient.post("/super-admin/clients", form);
      setCreatedCreds({
        clientCode: data.data.client.clientCode,
        temporaryPassword: data.data.temporaryPassword,
        resetUrl: data.data.resetUrl,
        loginUrl: data.data.loginUrl,
        emailSent: data.data.emailSent,
        emailSimulated: data.data.emailSimulated,
        email: data.data.client.email,
      });
      load();
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || "Failed to create client");
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage(`${label} copied to clipboard!`);
  };

  async function handleDeleteClient(c: ClientRow) {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${c.businessName}" (${c.clientCode})?\n\nWARNING: All database records, bookings, customers, staff users, itineraries, and settings for this client will be permanently wiped from the database.\n\nThis action CANNOT be undone.`
      )
    ) {
      return;
    }
    try {
      await apiClient.post(`/super-admin/clients/${c.id}/delete`);
      setClients((prev) => prev.filter((item) => item.id !== c.id));
      setToastMessage(`Client "${c.businessName}" permanently deleted from database.`);
    } catch (err: any) {
      window.alert(err.response?.data?.message ?? "Failed to delete client");
    }
  }

  // Filter Search & Status logic
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        c.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.clientCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.plan?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || c.subscriptionStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const paginatedClients = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredClients.slice(start, start + rowsPerPage);
  }, [filteredClients, page, rowsPerPage]);

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
          <Typography variant="h4" fontWeight={800} sx={{ color: "#0f172a", letterSpacing: "-0.02em" }}>
            Clients
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Manage organizations, billing subscriptions, and provisioning credentials.
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
            bgcolor: "#2563eb",
            borderRadius: 2.5,
            px: 2.5,
            py: 1,
            textTransform: "none",
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
            "&:hover": { bgcolor: "#1d4ed8" },
          }}
        >
          New Client
        </Button>
      </Box>

      {/* Filter and Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search by code, business, or email..."
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
            flex: { xs: "1 1 100%", sm: "0 1 340px" },
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "#f8fafc",
            },
          }}
        />

        <Box display="flex" alignItems="center" gap={1.5} width={{ xs: "100%", sm: "auto" }}>
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterListRoundedIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: 150,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "#f8fafc",
              },
            }}
          >
            <MenuItem value="ALL">All Statuses</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="EXPIRING_SOON">Expiring Soon</MenuItem>
            <MenuItem value="GRACE">Grace Period</MenuItem>
            <MenuItem value="LOCKED">Locked</MenuItem>
            <MenuItem value="DELETED">Deleted</MenuItem>
          </TextField>
        </Box>
      </Paper>

      {/* Main Table Paper */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }}>CLIENT CODE</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }}>BUSINESS & CONTACT</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }}>PLAN</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }}>EXPIRY DATE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: "#475569", py: 2 }}>ACTION</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedClients.map((c) => (
              <TableRow
                key={c.id}
                hover
                sx={{
                  "&:last-child td, &:last-child th": { border: 0 },
                  transition: "background-color 0.15s ease",
                }}
              >
                {/* Client Code */}
                <TableCell>
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    fontWeight={700}
                    sx={{ color: "#0f172a" }}
                  >
                    {c.clientCode}
                  </Typography>
                </TableCell>

                {/* Business Info */}
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar
                      sx={{
                        width: 38,
                        height: 38,
                        bgcolor: "#eff6ff",
                        color: "#2563eb",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                      }}
                    >
                      <BusinessRoundedIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700} sx={{ color: "#1e293b" }}>
                        {c.businessName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                {/* Plan */}
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={c.plan?.name || "No Plan"}
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      borderColor: "#cbd5e1",
                      color: "#334155",
                      borderRadius: 1.5,
                    }}
                  />
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Chip
                    size="small"
                    label={c.subscriptionStatus?.replace("_", " ")}
                    color={STATUS_COLOR[c.subscriptionStatus] ?? "default"}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      borderRadius: "6px",
                    }}
                  />
                </TableCell>

                {/* Expiry */}
                <TableCell>
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    {c.subscriptionExpiry ? new Date(c.subscriptionExpiry).toLocaleDateString() : "—"}
                  </Typography>
                </TableCell>

                {/* Action View & Delete */}
                <TableCell align="right">
                  <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                    <Button
                      component={RouterLink}
                      to={`/super-admin/clients/${c.id}`}
                      size="small"
                      endIcon={<ArrowForwardRoundedIcon fontSize="small" />}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        color: "#2563eb",
                        borderRadius: 1.5,
                        "&:hover": { bgcolor: "#eff6ff" },
                      }}
                    >
                      View
                    </Button>
                    <Tooltip title="Permanently Delete Client">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClient(c)}
                        sx={{
                          borderRadius: 1.5,
                          "&:hover": { bgcolor: "#fef2f2" },
                        }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}

            {filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 6, textAlign: "center" }}>
                  <Typography variant="body1" fontWeight={600} color="text.secondary">
                    No clients found
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {searchQuery ? "Try refining your search filter" : "Get started by adding your first client"}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredClients.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{ borderTop: "1px solid #e2e8f0" }}
        />
      </Paper>

      {/* Dialog for Creation / Generated Credentials */}
      <Dialog
        open={open}
        onClose={() => {
          if (!loading) {
            setOpen(false);
            setCreatedCreds(null);
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>
          {createdCreds ? "Client Credentials Provisioned" : "Create New Client"}
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "10px !important" }}>
          {createdCreds ? (
            <Box>
              <Alert
                icon={<CheckCircleOutlineRoundedIcon fontSize="inherit" />}
                severity="success"
                sx={{ mb: 2.5, borderRadius: 2 }}
              >
                Client created successfully!
                {createdCreds.emailSent ? (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    A welcome email containing password reset instructions and portal access has been sent to{" "}
                    <strong>{createdCreds.email}</strong>.
                    {createdCreds.emailSimulated && " (Simulated in development mode)"}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Please securely record and share these access links with the client.
                  </Typography>
                )}
              </Alert>

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  bgcolor: "#f8fafc",
                  borderRadius: 2.5,
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      CLIENT CODE
                    </Typography>
                    <Typography variant="body1" fontFamily="monospace" fontWeight={700}>
                      {createdCreds.clientCode}
                    </Typography>
                  </Box>
                  <Tooltip title="Copy Client Code">
                    <IconButton size="small" onClick={() => handleCopy(createdCreds.clientCode, "Client code")}>
                      <ContentCopyRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      TEMPORARY PASSWORD
                    </Typography>
                    <Typography variant="body1" fontFamily="monospace" fontWeight={700} color="#2563eb">
                      {createdCreds.temporaryPassword}
                    </Typography>
                  </Box>
                  <Tooltip title="Copy Password">
                    <IconButton size="small" onClick={() => handleCopy(createdCreds.temporaryPassword, "Temporary password")}>
                      <ContentCopyRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {createdCreds.resetUrl && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box sx={{ maxWidth: "80%" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        PASSWORD SETUP LINK (1-CLICK RESET)
                      </Typography>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        color="#059669"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {createdCreds.resetUrl}
                      </Typography>
                    </Box>
                    <Tooltip title="Copy Password Reset Link">
                      <IconButton size="small" onClick={() => handleCopy(createdCreds.resetUrl!, "Password setup link")}>
                        <ContentCopyRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}

                {createdCreds.loginUrl && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box sx={{ maxWidth: "80%" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        CRM LOGIN URL
                      </Typography>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        color="#2563eb"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {createdCreds.loginUrl}
                      </Typography>
                    </Box>
                    <Tooltip title="Copy CRM Login URL">
                      <IconButton size="small" onClick={() => handleCopy(createdCreds.loginUrl!, "CRM login URL")}>
                        <ContentCopyRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Paper>
            </Box>
          ) : (
            <>
              <TextField
                label="Business Name"
                size="small"
                fullWidth
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              />
              <TextField
                label="Owner Name"
                size="small"
                fullWidth
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              />
              <TextField
                label="Email Address"
                size="small"
                type="email"
                fullWidth
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <TextField
                label="Phone Number"
                size="small"
                fullWidth
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <TextField
                select
                size="small"
                label="Subscription Plan"
                fullWidth
                value={form.planId}
                onChange={(e) => setForm({ ...form, planId: e.target.value })}
              >
                {plans.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Subscription Start"
                size="small"
                type="date"
                fullWidth
                value={form.subscriptionStart}
                onChange={(e) => setForm({ ...form, subscriptionStart: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Subscription Expiry"
                size="small"
                type="date"
                fullWidth
                value={form.subscriptionExpiry}
                onChange={(e) => setForm({ ...form, subscriptionExpiry: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
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
              sx={{ bgcolor: "#2563eb", borderRadius: 2, textTransform: "none", fontWeight: 700 }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setOpen(false)}
                disabled={loading}
                sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={loading || !form.businessName || !form.email || !form.planId}
                sx={{
                  bgcolor: "#2563eb",
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": { bgcolor: "#1d4ed8" },
                }}
              >
                {loading ? "Creating..." : "Create Client"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={3000}
        onClose={() => setToastMessage(null)}
        message={toastMessage}
      />
    </Box>
  );
}