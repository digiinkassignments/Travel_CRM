import { useEffect, useState, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Link,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import { apiClient } from "../../api/client";

const STAGES = ["NEW", "CONTACTED", "QUOTED", "NEGOTIATION", "WON", "LOST"];

const STAGE_CONFIG: Record<
  string,
  { label: string; dot: string; bg: string; badgeBg: string; badgeColor: string }
> = {
  NEW: { label: "New Leads", dot: "#3b82f6", bg: "#f0f7ff", badgeBg: "#dbeafe", badgeColor: "#1e40af" },
  CONTACTED: { label: "Contacted", dot: "#eab308", bg: "#fefce8", badgeBg: "#fef08a", badgeColor: "#854d0e" },
  QUOTED: { label: "Quoted", dot: "#8b5cf6", bg: "#faf5ff", badgeBg: "#ede9fe", badgeColor: "#5b21b6" },
  NEGOTIATION: { label: "Negotiation", dot: "#f97316", bg: "#fff7ed", badgeBg: "#ffedd5", badgeColor: "#9a3412" },
  WON: { label: "Won Deals", dot: "#22c55e", bg: "#f0fdf4", badgeBg: "#dcfce7", badgeColor: "#166534" },
  LOST: { label: "Lost", dot: "#ef4444", bg: "#fef2f2", badgeBg: "#fee2e2", badgeColor: "#991b1b" },
};

export function PipelinePage() {
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiClient
      .get("/enquiries/pipeline")
      .then(({ data }) => setGrouped(data.data ?? {}))
      .catch(() => setGrouped({}))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function moveStage(enquiryId: string, status: string) {
    try {
      setMovingId(enquiryId);
      await apiClient.patch(`/enquiries/${enquiryId}/status`, { status });
      load();
    } finally {
      setMovingId(null);
    }
  }

  const totalCount = useMemo(() => {
    return Object.values(grouped).reduce((acc, list) => acc + (list?.length || 0), 0);
  }, [grouped]);

  const filterEnquiries = (list: any[] = []) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (e) =>
        e.customer?.name?.toLowerCase().includes(q) ||
        e.destination?.toLowerCase().includes(q) ||
        e.source?.toLowerCase().includes(q) ||
        e.assignedTo?.name?.toLowerCase().includes(q)
    );
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header & Global Toolbar */}
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
              Deal Pipeline
            </Typography>
            <Chip
              label={`${totalCount} Leads`}
              size="small"
              icon={<ViewListRoundedIcon style={{ fontSize: 15 }} />}
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
            A structured view of every lead, grouped by its current conversion stage.
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5} width={{ xs: "100%", sm: "auto" }}>
          <TextField
            size="small"
            placeholder="Filter by customer, agent, route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: "100%", sm: 280 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2.5,
                bgcolor: "#ffffff",
              },
            }}
          />

          <Tooltip title="Refresh Pipeline">
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
        </Box>
      </Box>

      {/* Stage overview */}
      <Box display="grid" gridTemplateColumns={{ xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }} gap={1.25} mb={2.5}>
        {STAGES.map((stage) => {
          const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG.NEW;
          const stageEnquiries = filterEnquiries(grouped[stage] ?? []);
          return (
            <Paper key={stage} elevation={0} sx={{ p: 1.5, border: "1px solid #e2e8f0", borderTop: `3px solid ${config.dot}`, borderRadius: 2.25, bgcolor: "#fff" }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                <Typography variant="caption" fontWeight={800} color="#475569" noWrap>{config.label}</Typography>
                <Typography variant="h6" fontWeight={900} color="#0f172a" lineHeight={1}>{stageEnquiries.length}</Typography>
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Structured stage sections */}
      <Box display="flex" flexDirection="column" gap={1.5}>
        {STAGES.map((stage) => {
          const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG.NEW;
          const stageEnquiries = filterEnquiries(grouped[stage] ?? []);
          return (
            <Paper
              key={stage}
              elevation={0}
              sx={{
                borderRadius: 2.5,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
                overflow: "hidden",
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" px={2} py={1.25} sx={{ bgcolor: config.bg, borderBottom: "1px solid #e2e8f0" }}>
                <Box display="flex" alignItems="center" gap={1.2}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: config.dot,
                    }}
                  />
                  <Typography variant="subtitle2" fontWeight={900} sx={{ color: "#0f172a", fontSize: "0.82rem" }}>
                    {config.label}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={stageEnquiries.length}
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    bgcolor: config.badgeBg,
                    color: config.badgeColor,
                    borderRadius: "6px",
                    height: 20,
                  }}
                />
              </Box>
              {stageEnquiries.length > 0 ? <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#fafcff" }}>
                    <TableCell sx={{ py: 1, fontSize: "0.68rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.05em" }}>LEAD</TableCell>
                    <TableCell sx={{ py: 1, fontSize: "0.68rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.05em" }}>ROUTE</TableCell>
                    <TableCell sx={{ py: 1, fontSize: "0.68rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.05em" }}>ASSIGNED TO</TableCell>
                    <TableCell sx={{ py: 1, fontSize: "0.68rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.05em" }}>ADDED</TableCell>
                    <TableCell align="right" sx={{ py: 1, fontSize: "0.68rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.05em" }}>MOVE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{stageEnquiries.map((e) => {
                  const isMoving = movingId === e.id;
                  return (
                    <TableRow
                      key={e.id}
                      sx={{
                        "&:last-child td": { borderBottom: 0 },
                        "&:hover": { bgcolor: "#f8fafc" },
                      }}
                    >
                      <TableCell sx={{ py: 1.1 }}><Link component={RouterLink} to={`/app/enquiries/${e.id}`} underline="none" sx={{ color: "#0f172a", fontWeight: 800, fontSize: "0.84rem", "&:hover": { color: "#2563eb" } }}>{e.customer?.name || "Unnamed Lead"}</Link><Typography variant="caption" display="block" color="text.secondary">{e.customer?.phone || "No phone"}</Typography></TableCell>
                      <TableCell sx={{ py: 1.1, maxWidth: 260 }}><Box display="flex" alignItems="center" gap={0.7}><RouteRoundedIcon sx={{ fontSize: 14, color: "#94a3b8" }} /><Typography variant="caption" color="#475569" fontWeight={600} noWrap>{[e.pickupLocation || e.source, e.destination].filter(Boolean).join(" → ") || "Open route"}</Typography></Box></TableCell>
                      <TableCell sx={{ py: 1.1 }}><Box display="flex" alignItems="center" gap={0.7}><Avatar sx={{ width: 22, height: 22, fontSize: "0.65rem", bgcolor: "#eff6ff", color: "#2563eb" }}>{e.assignedTo?.name?.[0]?.toUpperCase() || <BadgeRoundedIcon sx={{ fontSize: 13 }} />}</Avatar><Typography variant="caption" fontWeight={600} noWrap>{e.assignedTo?.name || "Unassigned"}</Typography></Box></TableCell>
                      <TableCell sx={{ py: 1.1 }}><Typography variant="caption" color="text.secondary">{e.createdAt ? new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</Typography></TableCell>
                      <TableCell align="right" sx={{ py: 1.1 }}><Box display="flex" justifyContent="flex-end" alignItems="center" gap={0.75}><Select size="small" disabled={isMoving} value={e.status} onChange={(ev) => moveStage(e.id, ev.target.value)} sx={{ minWidth: 145, fontSize: "0.74rem", fontWeight: 700, borderRadius: 1.5, "& .MuiSelect-select": { py: 0.45, px: 1 } }}>{STAGES.map((s) => <MenuItem key={s} value={s} sx={{ fontSize: "0.78rem" }}>{STAGE_CONFIG[s]?.label ?? s}</MenuItem>)}</Select>{isMoving && <CircularProgress size={15} />}</Box></TableCell>
                    </TableRow>
                  );
                })}</TableBody>
              </Table> : (
                  <Box
                    sx={{
                      p: 1.75,
                      border: "1.5px dashed #cbd5e1",
                      borderRadius: 1.5,
                      textAlign: "center",
                      bgcolor: "#fafcff",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {search ? "No matching leads" : "No leads in this stage"}
                    </Typography>
                  </Box>
              )}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}