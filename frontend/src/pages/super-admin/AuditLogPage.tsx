import { useEffect, useState, useMemo } from "react";
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
  Avatar,
  TextField,
  InputAdornment,
  TablePagination,
  IconButton,
  Tooltip,
  MenuItem,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import HistoryToggleOffRoundedIcon from "@mui/icons-material/HistoryToggleOffRounded";
import { apiClient } from "../../api/client";

interface AuditLog {
  id: string;
  createdAt: string;
  actorEmail: string;
  action: string;
  targetClientId: string | null;
}

const getActionColor = (action: string): "success" | "error" | "warning" | "info" | "default" => {
  const act = action?.toUpperCase() || "";
  if (act.includes("CREATE") || act.includes("ACTIVATE") || act.includes("PROVISION")) return "success";
  if (act.includes("DELETE") || act.includes("LOCK") || act.includes("REVOKE")) return "error";
  if (act.includes("UPDATE") || act.includes("PATCH") || act.includes("LIMIT")) return "warning";
  if (act.includes("LOGIN") || act.includes("AUTH") || act.includes("VIEW")) return "info";
  return "default";
};

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  function load() {
    setLoading(true);
    apiClient
      .get("/super-admin/audit-logs")
      .then(({ data }) => setLogs(data.data ?? []))
      .catch((err) => console.error("Failed to load audit logs", err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const uniqueActionCategories = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action).filter(Boolean));
    return Array.from(actions);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        l.actorEmail?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        (l.targetClientId && l.targetClientId.toLowerCase().includes(q));

      const matchesFilter = actionFilter === "ALL" || l.action === actionFilter;

      return matchesSearch && matchesFilter;
    });
  }, [logs, searchQuery, actionFilter]);

  const paginatedLogs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredLogs.slice(start, start + rowsPerPage);
  }, [filteredLogs, page, rowsPerPage]);

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
            <Typography variant="h4" fontWeight={800} sx={{ color: "#0f172a", letterSpacing: "-0.02em" }}>
              Audit Logs
            </Typography>
            <Chip
              label="Immutable Trail"
              size="small"
              icon={<SecurityRoundedIcon style={{ fontSize: 15 }} />}
              sx={{
                bgcolor: "#eff6ff",
                color: "#2563eb",
                fontWeight: 700,
                fontSize: "0.72rem",
                borderRadius: "6px",
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Complete chronicle of administrative activities, plan modifications, and client state transitions.
          </Typography>
        </Box>

        {/* Filter Controls */}
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={1.5} width={{ xs: "100%", sm: "auto" }}>
          <TextField
            size="small"
            placeholder="Search actor, action, client ID..."
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

          {uniqueActionCategories.length > 0 && (
            <TextField
              select
              size="small"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
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
                  bgcolor: "#ffffff",
                },
              }}
            >
              <MenuItem value="ALL">All Actions</MenuItem>
              {uniqueActionCategories.map((act) => (
                <MenuItem key={act} value={act}>
                  {act}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Tooltip title="Refresh Logs">
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

      {/* Main Table Paper */}
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
                TIMESTAMP
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                PERFORMED BY (ACTOR)
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 2.2, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                ACTION TRIGGERED
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#64748b", py: 2.2, px: 3, fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                TARGET CLIENT ID
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedLogs.map((l) => (
              <TableRow
                key={l.id}
                hover
                sx={{
                  transition: "background-color 0.15s ease",
                  "&:hover": { bgcolor: "#fbfcfe !important" },
                  "&:last-child td": { border: 0 },
                }}
              >
                {/* Time */}
                <TableCell sx={{ py: 2, px: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} sx={{ color: "#475569" }}>
                    <AccessTimeRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                    <Typography variant="body2" fontWeight={600} fontSize="0.825rem">
                      {new Date(l.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                        {new Date(l.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </Typography>
                    </Typography>
                  </Box>
                </TableCell>

                {/* Actor Email */}
                <TableCell sx={{ py: 2 }}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "#eff6ff",
                        color: "#2563eb",
                        borderRadius: 2,
                      }}
                    >
                      <PersonOutlineRoundedIcon fontSize="small" />
                    </Avatar>
                    <Typography variant="body2" fontWeight={700} sx={{ color: "#1e293b" }}>
                      {l.actorEmail || "System Automation"}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Action Triggered */}
                <TableCell sx={{ py: 2 }}>
                  <Chip
                    size="small"
                    label={l.action?.replace(/_/g, " ")}
                    color={getActionColor(l.action)}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      borderRadius: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  />
                </TableCell>

                {/* Target Client */}
                <TableCell align="right" sx={{ py: 2, px: 3 }}>
                  {l.targetClientId ? (
                    <Box display="inline-flex" alignItems="center" gap={0.75}>
                      <BusinessRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        fontWeight={700}
                        sx={{
                          bgcolor: "#f1f5f9",
                          px: 1,
                          py: 0.3,
                          borderRadius: 1.5,
                          color: "#334155",
                          fontSize: "0.8rem",
                        }}
                      >
                        {l.targetClientId}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {filteredLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ py: 8, textAlign: "center" }}>
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "#f8fafc",
                        color: "#94a3b8",
                        border: "1px solid #e2e8f0",
                        mb: 0.5,
                      }}
                    >
                      <HistoryToggleOffRoundedIcon fontSize="medium" />
                    </Avatar>
                    <Typography variant="body1" fontWeight={700} sx={{ color: "#0f172a" }}>
                      {searchQuery || actionFilter !== "ALL" ? "No matching audit records" : "No audit entries recorded"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {searchQuery || actionFilter !== "ALL"
                        ? "Try clearing filters or search terms to inspect more history."
                        : "System mutations and administrative activities will be recorded here automatically."}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredLogs.length}
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