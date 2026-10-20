import { useEffect, useState, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  TextField,
  MenuItem,
  InputAdornment,
  Avatar,
  TablePagination,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import DateRangeRoundedIcon from "@mui/icons-material/DateRangeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import { apiClient } from "../../api/client";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  PAID: { label: "Fully Paid", bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  PARTIALLY_PAID: { label: "Partially Paid", bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  UNPAID: { label: "Unpaid", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
};

const STAT_THEMES = [
  {
    key: "totalReceivable",
    label: "Total Receivable",
    icon: AccountBalanceWalletRoundedIcon,
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    key: "dueToday",
    label: "Due Today",
    icon: HourglassTopRoundedIcon,
    color: "#0891b2",
    bg: "#ecfeff",
  },
  {
    key: "overdue",
    label: "Overdue Outstanding",
    icon: ErrorOutlineRoundedIcon,
    color: "#dc2626",
    bg: "#fef2f2",
  },
  {
    key: "dueThisWeek",
    label: "Due This Week",
    icon: DateRangeRoundedIcon,
    color: "#d97706",
    bg: "#fffbeb",
  },
  {
    key: "paid",
    label: "Settled Payments",
    icon: CheckCircleRoundedIcon,
    color: "#16a34a",
    bg: "#f0fdf4",
  },
];

export function ReceivablesPage() {
  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  function load() {
    setLoading(true);
    Promise.all([
      apiClient.get("/receivables/dashboard").catch(() => ({ data: { data: null } })),
      apiClient.get("/receivables", { params: statusFilter ? { paymentStatus: statusFilter } : {} }).catch(() => ({ data: { data: [] } })),
    ])
      .then(([dashRes, listRes]) => {
        setSummary(dashRes.data?.data ?? null);
        setRows(listRes.data?.data ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  const cards = useMemo(() => {
    return STAT_THEMES.map((theme) => ({
      ...theme,
      amount: summary?.[theme.key] ?? 0,
    }));
  }, [summary]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = searchQuery.toLowerCase();
      const customer = r.customer?.name?.toLowerCase() ?? "";
      const booking = String(r.bookingId ?? "").toLowerCase();
      const status = r.status?.toLowerCase() ?? "";
      return customer.includes(q) || booking.includes(q) || status.includes(q);
    });
  }, [rows, searchQuery]);

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

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
              Receivables Ledger
            </Typography>
            <Chip
              label="Accounts Receivable"
              size="small"
              icon={<PaymentsRoundedIcon style={{ fontSize: 14 }} />}
              sx={{
                bgcolor: "#eff6ff",
                color: "#2563eb",
                fontWeight: 800,
                fontSize: "0.72rem",
                borderRadius: "6px",
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Track cash collections, pending dues, aging timelines, and customer billing status.
          </Typography>
        </Box>
      </Box>

      {/* KPI Stat Cards */}
      <Grid container spacing={2.5} mb={4}>
        {cards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Grid item xs={12} sm={6} md={12 / 5} key={card.key}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3.5,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
                  },
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.75}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2.5,
                      bgcolor: card.bg,
                      color: card.color,
                    }}
                  >
                    <IconComponent fontSize="small" />
                  </Avatar>
                </Box>

                <Typography variant="h5" fontWeight={900} sx={{ color: "#0f172a", mb: 0.5, letterSpacing: "-0.02em" }}>
                  ₹{(Number(card.amount || 0) / 100).toLocaleString("en-IN")}
                </Typography>
                <Typography variant="caption" fontWeight={700} color="#64748b" textTransform="uppercase" letterSpacing="0.04em">
                  {card.label}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

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
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search by customer name or booking ref..."
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
            flex: { xs: "1 1 100%", sm: "0 1 360px" },
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
              minWidth: 170,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "#f8fafc",
              },
            }}
          >
            <MenuItem value="">All Payment States</MenuItem>
            <MenuItem value="UNPAID">Unpaid</MenuItem>
            <MenuItem value="PARTIALLY_PAID">Partially Paid</MenuItem>
            <MenuItem value="PAID">Fully Paid</MenuItem>
          </TextField>

          <Tooltip title="Refresh Receivables">
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
        </Box>
      </Paper>

      {/* Main Ledger Table */}
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
        <Table sx={{ minWidth: 850 }}>
          <TableHead sx={{ bgcolor: "#fafcff" }}>
            <TableRow sx={{ borderBottom: "1px solid #eef2f6" }}>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                CUSTOMER
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                INVOICED TOTAL
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                RECEIVED
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                BALANCE DUE
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                DUE DATE
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                PAYMENT STATUS
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                ACTION
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedRows.map((r) => {
              const statusMeta = STATUS_CONFIG[r.status] ?? {
                label: r.status?.replace("_", " ") ?? "—",
                bg: "#f1f5f9",
                color: "#475569",
                border: "#e2e8f0",
              };

              const isOverdue = r.dueDate && new Date(r.dueDate).getTime() < Date.now() && r.status !== "PAID";

              return (
                <TableRow
                  key={r.bookingId}
                  hover
                  sx={{
                    transition: "background-color 0.15s ease",
                    "&:hover": { bgcolor: "#fbfcfe !important" },
                    "&:last-child td": { border: 0 },
                  }}
                >
                  {/* Customer Information */}
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Box display="flex" alignItems="center" gap={1.75}>
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          bgcolor: "#eff6ff",
                          color: "#2563eb",
                          borderRadius: 2,
                        }}
                      >
                        <PersonRoundedIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={800} sx={{ color: "#0f172a" }}>
                          {r.customer?.name ?? "Anonymous Customer"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Booking #{r.bookingId?.slice(-6).toUpperCase()}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Total Amount */}
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                      ₹{((r.totalInPaise || 0) / 100).toLocaleString("en-IN")}
                    </Typography>
                  </TableCell>

                  {/* Paid Amount */}
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="body2" fontWeight={700} color="#16a34a">
                      ₹{((r.paidInPaise || 0) / 100).toLocaleString("en-IN")}
                    </Typography>
                  </TableCell>

                  {/* Pending Amount */}
                  <TableCell sx={{ py: 2 }}>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      color={r.pendingInPaise > 0 ? "#dc2626" : "#475569"}
                    >
                      ₹{((r.pendingInPaise || 0) / 100).toLocaleString("en-IN")}
                    </Typography>
                  </TableCell>

                  {/* Due Date */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                      <CalendarTodayRoundedIcon sx={{ fontSize: 14, color: isOverdue ? "#dc2626" : "#94a3b8" }} />
                      <Typography
                        variant="body2"
                        fontWeight={isOverdue ? 700 : 500}
                        color={isOverdue ? "#dc2626" : "#334155"}
                      >
                        {r.dueDate
                          ? new Date(r.dueDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Status Chip */}
                  <TableCell sx={{ py: 2 }}>
                    <Chip
                      size="small"
                      label={statusMeta.label}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        bgcolor: statusMeta.bg,
                        color: statusMeta.color,
                        border: `1px solid ${statusMeta.border}`,
                        borderRadius: "6px",
                      }}
                    />
                  </TableCell>

                  {/* Action Link */}
                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
                    <Button
                      component={RouterLink}
                      to={`/app/bookings/${r.bookingId}`}
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
                        py: 0.5,
                        "&:hover": { bgcolor: "#dbeafe" },
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 8, textAlign: "center" }}>
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
                      <PaymentsRoundedIcon fontSize="medium" />
                    </Avatar>
                    <Typography variant="body1" fontWeight={700} sx={{ color: "#0f172a" }}>
                      {searchQuery || statusFilter ? "No matching receivable records" : "All accounts clear"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {searchQuery || statusFilter
                        ? "Check search keywords or clear filters to view all entries."
                        : "No outstanding or partial payments pending across bookings."}
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
          count={filteredRows.length}
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
    </Box>
  );
}