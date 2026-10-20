import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { apiClient } from "../../api/client";

export interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

interface EditCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  customer: CustomerData | null;
  onSaved: (updated: CustomerData) => void;
}

export function EditCustomerDialog({
  open,
  onClose,
  customer,
  onSaved,
}: EditCustomerDialogProps) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        notes: customer.notes || "",
      });
      setError(null);
    }
  }, [customer, open]);

  async function handleSave() {
    if (!customer?.id) return;
    const nameTrimmed = form.name.trim();
    const phoneTrimmed = form.phone.trim();

    if (!nameTrimmed) {
      setError("Customer name is required.");
      return;
    }
    if (!phoneTrimmed) {
      setError("Phone number is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = {
        name: nameTrimmed,
        phone: phoneTrimmed,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };

      const { data } = await apiClient.patch(`/customers/${customer.id}`, payload);
      onSaved(data.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update customer details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          p: 1,
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.15)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.25}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              bgcolor: "rgba(2, 132, 199, 0.1)",
              color: "#0284c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EditRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ color: "#0f172a", lineHeight: 1.2 }}>
              Edit Customer Profile
            </Typography>
            {customer?.id && (
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                ID: #{customer.id.slice(-6).toUpperCase()}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={saving}
          size="small"
          sx={{
            color: "#94a3b8",
            "&:hover": { bgcolor: "#f1f5f9", color: "#0f172a" },
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.2, pt: "12px !important" }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          size="small"
          label="Full Name"
          placeholder="e.g. John Doe"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          fullWidth
          disabled={saving}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />

        <TextField
          size="small"
          label="Phone Contact"
          placeholder="e.g. +91 9876543210"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
          fullWidth
          disabled={saving}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />

        <TextField
          size="small"
          label="Email Address"
          placeholder="e.g. client@example.com"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          fullWidth
          disabled={saving}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />

        <TextField
          size="small"
          label="Billing / Residential Address"
          placeholder="City, State, Country"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          fullWidth
          disabled={saving}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />

        <TextField
          size="small"
          label="Internal Notes"
          placeholder="Special preferences, billing terms, VIP status..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          multiline
          rows={3}
          fullWidth
          disabled={saving}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{ textTransform: "none", fontWeight: 700, color: "#64748b" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !form.name.trim() || !form.phone.trim()}
          startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : null}
          sx={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            borderRadius: 2.5,
            textTransform: "none",
            fontWeight: 800,
            px: 3,
            py: 0.9,
            boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #0369a1 0%, #075985 100%)",
            },
          }}
        >
          {saving ? "Saving Changes..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
