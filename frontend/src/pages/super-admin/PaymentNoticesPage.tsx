import { useEffect, useState, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  TablePagination,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import { apiClient } from "../../api/client";

interface PaymentNotice {
  id: string;
  clientId: string;
  createdAt: string;
  client: {
    businessName: string;
    email: string;
    clientCode?: string;
  };
}

export function PaymentNoticesPage() {
  const [notices, setNotices] = useState<PaymentNotice[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function load() {
    setLoading(true);
    apiClient
      .get("/super-admin/payment-notices")
      .then(({ data }) => setNotices(data.data ?? []))
      .catch(() => setToast({ message: "Failed to load payment notices", type: "error" }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function dismiss(id: string) {
    try {
      setDismissingId(id);
      await apiClient.post(`/super-admin/payment-notices/${id}/dismiss`);
      setNotices((prev) => prev.filter((item) => item.id !== id));
      setToast({ message: "Notice dismissed successfully", type: "success" });
    } catch {
      setToast({ message: "Unable to dismiss payment notice", type: "error" });
    } finally {
      setDismissingId(null);
    }
  }

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const q = searchQuery.toLowerCase();
      return (
        n.client?.businessName?.toLowerCase().includes(q) ||
        n.client?.email?.toLowerCase().includes(q) ||
        n.client?.clientCode?.toLowerCase().includes(q)
      );
    });
  }, [notices, searchQuery]);

  const paginatedNotices = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredNotices.slice(start, start + rowsPerPage);
  }, [filteredNotices, page, rowsPerPage]);

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Clean Top Header & Search Controls */}
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
            Payment Notices
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Review manual payment claims before confirming client subscription renewals.
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5} width={{ xs: "100%", sm: "auto" }}>
          <TextField
            size="small"
            placeholder="Search business or email..."
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
              width: { xs: "100%", sm: 260 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "#ffffff",
              },
            }}
          />
          <Tooltip title="Refresh Notices">
            <span>
              <IconButton
                onClick={load}
                disabled={loading}
                sx={{
                  bgcolor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  "&:hover": { bgcolor: "#f1f5f9" },
                }}
              >
                <RefreshRoundedIcon fontSize="small" sx={{ color: "#475569" }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          bgcolor: "#ffffff",
          boxShadow: "0 4px 12px rgba(16, 24, 40, 0.03)",
        }}
      >
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: "#fafcff" }}>
            <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                CLIENT & CONTACT
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                NOTICE RAISED AT
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                STATUS
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedNotices.map((n) => {
              const isDismissing = dismissingId === n.id;

              return (
                <TableRow
                  key={n.id}
                  hover
                  sx={{
                    transition: "background-color 0.15s ease",
                    "&:hover": { bgcolor: "#fbfcfe !important" },
                    "&:last-child td": { border: 0 },
                  }}
                >
                  {/* Client Info */}
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          bgcolor: "#eff6ff",
                          color: "#2563eb",
                          borderRadius: 2,
                        }}
                      >
                        <BusinessRoundedIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: "#0f172a" }}>
                            {n.client?.businessName || "Unknown Client"}
                          </Typography>
                          {n.client?.clientCode && (
                            <Chip
                              label={n.client.clientCode}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                fontFamily: "monospace",
                                bgcolor: "#f1f5f9",
                                color: "#475569",
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {n.client?.email || "No email on record"}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Timestamp */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={1} sx={{ color: "#475569" }}>
                      <AccessTimeRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                      <Typography variant="body2" fontWeight={600} fontSize="0.825rem">
                        {new Date(n.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                          {new Date(n.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Tag */}
                  <TableCell sx={{ py: 2 }}>
                    <Chip
                      size="small"
                      label="Pending Review"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        bgcolor: "#fff7ed",
                        color: "#c2410c",
                        border: "1px solid #ffedd5",
                        borderRadius: "6px",
                      }}
                    />
                  </TableCell>

                  {/* Action Buttons */}
                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1.25}>
                      <Button
                        component={RouterLink}
                        to={`/super-admin/clients/${n.clientId}`}
                        size="small"
                        endIcon={<ArrowForwardRoundedIcon fontSize="small" />}
                        sx={{
                          textTransform: "none",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          color: "#2563eb",
                          bgcolor: "#eff6ff",
                          borderRadius: 2,
                          px: 1.75,
                          py: 0.6,
                          "&:hover": { bgcolor: "#dbeafe" },
                        }}
                      >
                        Inspect
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        disabled={isDismissing}
                        onClick={() => dismiss(n.id)}
                        startIcon={
                          isDismissing ? (
                            <CircularProgress size={14} sx={{ color: "#64748b" }} />
                          ) : (
                            <DoneAllRoundedIcon fontSize="small" />
                          )
                        }
                        sx={{
                          textTransform: "none",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          color: "#64748b",
                          borderColor: "#e2e8f0",
                          borderRadius: 2,
                          px: 1.5,
                          py: 0.6,
                          "&:hover": {
                            borderColor: "#cbd5e1",
                            bgcolor: "#f8fafc",
                            color: "#0f172a",
                          },
                        }}
                      >
                        {isDismissing ? "Dismissing..." : "Dismiss"}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredNotices.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ py: 8, textAlign: "center" }}>
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "#f0fdf4",
                        color: "#16a34a",
                        mb: 0.5,
                      }}
                    >
                      <CheckCircleRoundedIcon fontSize="medium" />
                    </Avatar>
                    <Typography variant="body1" fontWeight={700} sx={{ color: "#0f172a" }}>
                      {searchQuery ? "No matching payment claims found" : "No Pending Payment Notices"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {searchQuery
                        ? "Check your query or clear filters to view all."
                        : "All claims have been handled. New client submission signals will appear here."}
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
          count={filteredNotices.length}
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

      {/* Floating Status Notification */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast?.type ?? "success"}
          icon={<CheckCircleRoundedIcon fontSize="inherit" />}
          sx={{
            borderRadius: 2.5,
            fontWeight: 600,
            fontSize: "0.85rem",
            bgcolor: toast?.type === "error" ? "#fef2f2" : "#0f172a",
            color: toast?.type === "error" ? "#991b1b" : "#ffffff",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            "& .MuiAlert-icon": {
              color: toast?.type === "error" ? "#dc2626" : "#4ade80",
            },
          }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}