import { useEffect, useState, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
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
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import { apiClient } from "../../api/client";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  SCHEDULED: { label: "Scheduled", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  IN_PROGRESS: { label: "In Transit", bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  COMPLETED: { label: "Completed", bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  CANCELLED: { label: "Cancelled", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
};

const STATUS_OPTIONS = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export function TripsListPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  function load() {
    setLoading(true);
    apiClient
      .get("/trips", { params: statusFilter ? { status: statusFilter } : {} })
      .then(({ data }) => setTrips(data.data ?? []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const q = searchQuery.toLowerCase();
      const customer = t.booking?.customer?.name?.toLowerCase() ?? "";
      const pickup = t.pickup?.toLowerCase() ?? "";
      const drop = t.drop?.toLowerCase() ?? "";
      const driver = t.driver?.name?.toLowerCase() ?? "";
      const vehicle = t.vehicle?.registrationNumber?.toLowerCase() ?? "";
      const status = t.status?.toLowerCase() ?? "";
      return (
        customer.includes(q) ||
        pickup.includes(q) ||
        drop.includes(q) ||
        driver.includes(q) ||
        vehicle.includes(q) ||
        status.includes(q)
      );
    });
  }, [trips, searchQuery]);

  const paginatedTrips = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredTrips.slice(start, start + rowsPerPage);
  }, [filteredTrips, page, rowsPerPage]);

  const stats = useMemo(() => {
    const total = trips.length;
    const scheduled = trips.filter((t) => t.status === "SCHEDULED").length;
    const inTransit = trips.filter((t) => t.status === "IN_PROGRESS").length;
    const completed = trips.filter((t) => t.status === "COMPLETED").length;
    return { total, scheduled, inTransit, completed };
  }, [trips]);

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
              Trips Dispatch
            </Typography>
            <Chip
              label={`${trips.length} Dispatches`}
              size="small"
              icon={<RouteRoundedIcon style={{ fontSize: 15 }} />}
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
            Live operational fleet movements, driver assignments, and transit routes.
          </Typography>
        </Box>
      </Box>

      {/* KPI Stats Strip */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
        gap={2}
        mb={3}
      >
        <Paper
          sx={{
            p: 2.25,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(2, 132, 199, 0.1)", color: "#0284c7", borderRadius: 2.5, width: 44, height: 44 }}>
            <RouteRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Dispatches
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {stats.total}
            </Typography>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2.25,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", borderRadius: 2.5, width: 44, height: 44 }}>
            <CalendarMonthRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Scheduled
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {stats.scheduled}
            </Typography>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2.25,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(249, 115, 22, 0.1)", color: "#f97316", borderRadius: 2.5, width: 44, height: 44 }}>
            <DirectionsCarRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              In Transit
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {stats.inTransit}
            </Typography>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2.25,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Avatar sx={{ bgcolor: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: 2.5, width: 44, height: 44 }}>
            <BadgeRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Completed
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {stats.completed}
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
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search by customer, route, driver, vehicle plate..."
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
              minWidth: 160,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "#f8fafc",
              },
            }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_CONFIG[s]?.label ?? s.replace("_", " ")}
              </MenuItem>
            ))}
          </TextField>

          <Tooltip title="Refresh Trips">
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

      {/* Main Trips Table */}
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
                ROUTE SECTOR
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                START DATE
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                DRIVER
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                FLEET VEHICLE
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
            {paginatedTrips.map((t) => {
              const statusMeta = STATUS_CONFIG[t.status] ?? {
                label: t.status?.replace("_", " ") ?? "—",
                bg: "#f1f5f9",
                color: "#475569",
                border: "#e2e8f0",
              };

              return (
                <TableRow
                  key={t.id}
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
                          {t.booking?.customer?.name ?? "Direct Passenger"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Booking #{t.bookingId?.slice(-6).toUpperCase() ?? "DIRECT"}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Route Details */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <RouteRoundedIcon sx={{ fontSize: 16, color: "#2563eb" }} />
                      <Typography variant="body2" fontWeight={700} color="#334155">
                        {t.pickup || "Pickup"} → {t.drop || "Drop"}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Start Date */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                      <CalendarMonthRoundedIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                      <Typography variant="body2" fontWeight={600} color="#334155">
                        {t.startDate
                          ? new Date(t.startDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "TBD"}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Assigned Driver */}
                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                      <BadgeRoundedIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                      <Typography variant="body2" fontWeight={600} color={t.driver ? "#1e293b" : "#94a3b8"}>
                        {t.driver?.name ?? "Unassigned"}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Fleet Vehicle Plate */}
                  <TableCell sx={{ py: 2 }}>
                    {t.vehicle?.registrationNumber ? (
                      <Box display="flex" alignItems="center" gap={0.75}>
                        <DirectionsCarRoundedIcon sx={{ fontSize: 15, color: "#2563eb" }} />
                        <Typography
                          variant="body2"
                          fontFamily="monospace"
                          fontWeight={800}
                          sx={{
                            bgcolor: "#f1f5f9",
                            px: 1,
                            py: 0.25,
                            borderRadius: 1.5,
                            color: "#1e293b",
                            fontSize: "0.8rem",
                          }}
                        >
                          {t.vehicle.registrationNumber}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Unassigned
                      </Typography>
                    )}
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
                      to={`/app/trips/${t.id}`}
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

            {filteredTrips.length === 0 && (
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
                      <LocalShippingRoundedIcon fontSize="medium" />
                    </Avatar>
                    <Typography variant="body1" fontWeight={700} sx={{ color: "#0f172a" }}>
                      {searchQuery || statusFilter ? "No matching trips found" : "No trips scheduled yet"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {searchQuery || statusFilter
                        ? "Clear filters or search terms to inspect other dispatches."
                        : "Trips spawned from confirmed bookings will populate this dispatch view."}
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
          count={filteredTrips.length}
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