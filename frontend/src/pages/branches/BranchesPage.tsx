import { useEffect, useState } from "react";
import {
  Box, Typography, Button, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Grid, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, Chip, Avatar, Tooltip, IconButton, Card, CardContent
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import BookmarkAddedRoundedIcon from "@mui/icons-material/BookmarkAddedRounded";
import CurrencyRupeeRoundedIcon from "@mui/icons-material/CurrencyRupeeRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { apiClient } from "../../api/client";

// Multi-Branch (SRS FR-12.1, Enterprise only): manage branches, assign
// staff to them, and see the rolled-up cross-branch dashboard.
export function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [rollup, setRollup] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "" });

  function load() {
    apiClient.get("/branches").then(({ data }) => setBranches(data.data ?? []));
    apiClient.get("/branches/rollup").then(({ data }) => setRollup(data.data ?? null));
    apiClient.get("/users").then(({ data }) => setStaff(data.data ?? []));
  }
  useEffect(load, []);

  async function handleCreate() {
    await apiClient.post("/branches", form);
    setOpen(false);
    setForm({ name: "", address: "" });
    load();
  }

  async function assignStaff(userId: string, branchId: string) {
    await apiClient.patch(`/branches/assign-user/${userId}`, { branchId: branchId || null });
    load();
  }

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
              <BusinessRoundedIcon sx={{ color: "#fff", fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.03em" }}>
                Multi-Branch Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitor agency locations, staff allocation, and rolled-up trip revenue across all branches.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5}>
          <Chip
            label={`${branches.length} Registered Branches`}
            size="small"
            sx={{
              bgcolor: "#e0f2fe",
              color: "#0369a1",
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
            New Branch
          </Button>
        </Box>
      </Box>

      {/* Rolled-up Performance Section */}
      <Box mb={4}>
        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" mb={2} display="flex" alignItems="center" gap={1}>
          <StorefrontRoundedIcon sx={{ color: "#0284c7", fontSize: 20 }} />
          Regional Branch Performance
        </Typography>

        <Grid container spacing={2.5}>
          {rollup?.branches?.map((b: any) => (
            <Grid item xs={12} sm={6} md={4} key={b.branchId}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 12px 24px -10px rgba(12, 74, 110, 0.12)",
                    borderColor: "#38bdf8",
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={1.25}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: "#f0f9ff", color: "#0284c7" }}>
                        <LocationOnRoundedIcon sx={{ fontSize: 20 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                          {b.branchName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {b.staffCount} Dedicated Staff
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      size="small"
                      label={b.isActive ? "Operational" : "Inactive"}
                      sx={{
                        bgcolor: b.isActive ? "#ecfdf5" : "#f1f5f9",
                        color: b.isActive ? "#059669" : "#64748b",
                        fontWeight: 800,
                        fontSize: "0.72rem",
                        borderRadius: "6px",
                      }}
                    />
                  </Box>

                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5} mb={2} p={1.5} sx={{ bgcolor: "#f8fafc", borderRadius: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Enquiries (Won)
                      </Typography>
                      <Typography variant="body2" fontWeight={800} color="#0f172a">
                        {b.enquiryCount} <span style={{ color: "#10b981", fontSize: "0.75rem" }}>({b.wonCount} won)</span>
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Active Bookings
                      </Typography>
                      <Typography variant="body2" fontWeight={800} color="#0f172a">
                        {b.bookingCount} Trips
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center" pt={1} borderTop="1px solid #f1f5f9">
                    <Typography variant="caption" fontWeight={700} color="#64748b">
                      Total Booked Revenue
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={900} color="#0284c7">
                      ₹{((b.revenueInPaise || 0) / 100).toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {rollup?.unassigned && (rollup.unassigned.enquiryCount > 0 || rollup.unassigned.bookingCount > 0) && (
            <Grid item xs={12} sm={6} md={4}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1.5px dashed #cbd5e1",
                  bgcolor: "#f8fafc",
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800} color="#64748b">
                        Unassigned Operations
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        HQ / Centralized Leads
                      </Typography>
                    </Box>
                    <Chip size="small" label="Centralized" sx={{ bgcolor: "#e2e8f0", color: "#475569", fontWeight: 700 }} />
                  </Box>

                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5} mb={2} p={1.5} sx={{ bgcolor: "#ffffff", borderRadius: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Enquiries
                      </Typography>
                      <Typography variant="body2" fontWeight={800} color="#0f172a">
                        {rollup.unassigned.enquiryCount}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Bookings
                      </Typography>
                      <Typography variant="body2" fontWeight={800} color="#0f172a">
                        {rollup.unassigned.bookingCount}
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center" pt={1} borderTop="1px solid #e2e8f0">
                    <Typography variant="caption" fontWeight={700} color="#64748b">
                      Unassigned Revenue
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={900} color="#475569">
                      ₹{((rollup.unassigned.revenueInPaise || 0) / 100).toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Registered Branches & Staff Assignment Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                Branch Directory
              </Typography>
              <Chip size="small" label={`${branches.length} locations`} sx={{ bgcolor: "#f1f5f9", fontWeight: 700 }} />
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.25 }}>BRANCH</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.25 }}>ADDRESS</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: "#64748b", py: 1.25 }}>STAFF</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: "#64748b", py: 1.25 }}>LEADS</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: "#64748b", py: 1.25 }}>TRIPS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.id} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                    <TableCell sx={{ py: 1.5, fontWeight: 700, color: "#0f172a" }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <BusinessRoundedIcon sx={{ fontSize: 16, color: "#0284c7" }} />
                        {b.name}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, color: "#64748b", fontSize: "0.82rem" }}>
                      {b.address || "—"}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Chip size="small" label={b._count?.users ?? 0} sx={{ fontWeight: 800, bgcolor: "#eff6ff", color: "#1d4ed8" }} />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Chip size="small" label={b._count?.enquiries ?? 0} sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#15803d" }} />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Chip size="small" label={b._count?.bookings ?? 0} sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#b45309" }} />
                    </TableCell>
                  </TableRow>
                ))}
                {branches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: "center", py: 4, color: "#94a3b8" }}>
                      No branches defined yet. Click "New Branch" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                Assign Staff to Branch
              </Typography>
              <PeopleAltRoundedIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.25 }}>TEAM MEMBER</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#64748b", py: 1.25 }}>ASSIGNED BRANCH</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.id} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                    <TableCell sx={{ py: 1.25 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: "0.7rem", bgcolor: "#0284c7" }}>
                          {s.name?.[0]?.toUpperCase() || "U"}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} color="#0f172a">
                            {s.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {s.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <Select
                        size="small"
                        displayEmpty
                        value={s.branchId ?? ""}
                        onChange={(e) => assignStaff(s.id, e.target.value)}
                        sx={{
                          minWidth: 160,
                          fontSize: "0.8rem",
                          borderRadius: 2,
                          "& .MuiSelect-select": { py: 0.6 },
                        }}
                      >
                        <MenuItem value="">
                          <em>Unassigned (HQ)</em>
                        </MenuItem>
                        {branches.map((b) => (
                          <MenuItem key={b.id} value={b.id}>
                            {b.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog for New Branch */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a", pb: 1 }}>
          Create New Branch Location
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          <TextField
            label="Branch Name"
            placeholder="e.g. Mumbai North Hub, Goa Desk"
            fullWidth
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="Branch Street Address"
            placeholder="e.g. Suite 402, Travel Plaza, MG Road"
            fullWidth
            multiline
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.name}
            sx={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              fontWeight: 700,
              borderRadius: 2,
            }}
          >
            Create Branch
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
