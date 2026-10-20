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
  Chip,
  TextField,
  InputAdornment,
  Avatar,
  TablePagination,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import { apiClient } from "../../api/client";

export function InvoicesListPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  function load() {
    setLoading(true);
    apiClient
      .get("/invoices")
      .then(({ data }) => setInvoices(data.data ?? []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchQuery.toLowerCase();
      const customer = inv.customer?.name?.toLowerCase() ?? "";
      const invId = inv.id?.toLowerCase() ?? "";
      return customer.includes(q) || invId.includes(q);
    });
  }, [invoices, searchQuery]);

  const paginatedInvoices = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredInvoices.slice(start, start + rowsPerPage);
  }, [filteredInvoices, page, rowsPerPage]);

  const totalInvoicedAmount = useMemo(() => {
    return invoices.reduce((acc, inv) => acc + (inv.totalInPaise || 0), 0);
  }, [invoices]);

  const stats = useMemo(() => {
    const totalAmount = totalInvoicedAmount / 100;
    const avgAmount = invoices.length ? totalAmount / invoices.length : 0;
    return { count: invoices.length, totalAmount, avgAmount };
  }, [invoices, totalInvoicedAmount]);

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
              Invoices
            </Typography>
            <Chip
              label={`${invoices.length} Documents`}
              size="small"
              icon={<ReceiptLongRoundedIcon style={{ fontSize: 14 }} />}
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
            Formal tax invoices generated across verified bookings with automated GST calculations.
          </Typography>
        </Box>
      </Box>

      {/* KPI Stat Cards */}
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
            <ReceiptLongRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Issued
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {stats.count} Invoices
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
            <PersonRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Gross Billed Amount
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              ₹{stats.totalAmount.toLocaleString("en-IN")}
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
            <CalendarTodayRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Average Ticket
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              ₹{Math.round(stats.avgAmount).toLocaleString("en-IN")}
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
          placeholder="Search by customer name or invoice number..."
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

        <Tooltip title="Refresh Invoices">
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

      {/* Main Invoices Table */}
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
                INVOICE & CUSTOMER
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                SUBTOTAL
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                GST LEVY
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                TOTAL AMOUNT
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                DATE ISSUED
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                ACTION
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedInvoices.map((inv) => (
              <TableRow
                key={inv.id}
                hover
                sx={{
                  transition: "background-color 0.15s ease",
                  "&:hover": { bgcolor: "#fbfcfe !important" },
                  "&:last-child td": { border: 0 },
                }}
              >
                {/* Customer & Invoice Reference */}
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
                        {inv.customer?.name ?? "Direct Passenger"}
                      </Typography>
                      <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                        INV-{inv.id?.slice(-8).toUpperCase()}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                {/* Subtotal */}
                <TableCell sx={{ py: 2 }}>
                  <Typography variant="body2" fontWeight={600} color="#334155">
                    ₹{((inv.subtotalInPaise || 0) / 100).toLocaleString("en-IN")}
                  </Typography>
                </TableCell>

                {/* GST */}
                <TableCell sx={{ py: 2 }}>
                  <Chip
                    size="small"
                    label={`₹${((inv.gstInPaise || 0) / 100).toLocaleString("en-IN")}`}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      bgcolor: "#f1f5f9",
                      color: "#475569",
                      borderRadius: "6px",
                    }}
                  />
                </TableCell>

                {/* Total */}
                <TableCell sx={{ py: 2 }}>
                  <Typography variant="body2" fontWeight={800} color="#0f172a">
                    ₹{((inv.totalInPaise || 0) / 100).toLocaleString("en-IN")}
                  </Typography>
                </TableCell>

                {/* Date */}
                <TableCell sx={{ py: 2 }}>
                  <Box display="flex" alignItems="center" gap={0.75} sx={{ color: "#64748b" }}>
                    <CalendarTodayRoundedIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                    <Typography variant="caption" fontWeight={600}>
                      {inv.createdAt
                        ? new Date(inv.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Actions */}
                <TableCell align="right" sx={{ py: 2, px: 3 }}>
                  <Button
                    component={RouterLink}
                    to={`/app/invoices/${inv.id}`}
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
            ))}

            {filteredInvoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 8, textAlign: "center" }}>
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
                      <ReceiptLongRoundedIcon fontSize="medium" />
                    </Avatar>
                    <Typography variant="body1" fontWeight={700} sx={{ color: "#0f172a" }}>
                      {searchQuery ? "No matching invoices found" : "No invoices issued yet"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {searchQuery
                        ? "Check customer name or invoice reference search terms."
                        : "Navigate to any confirmed booking to generate an official tax invoice."}
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
          count={filteredInvoices.length}
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