import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Button, Table, TableRow, TableCell, TableBody,
  Divider, Avatar, IconButton, Tooltip, Chip
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { apiClient } from "../../api/client";

export function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    apiClient.get(`/invoices/${id}`).then(({ data }) => setInvoice(data.data));
  }, [id]);

  if (!invoice) {
    return (
      <Box sx={{ p: 4, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="body1" color="text.secondary" fontWeight={600}>
          Loading invoice details...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      {/* Top Meta Bar */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2.5} className="no-print">
        <Tooltip title="Back to Invoices">
          <IconButton
            onClick={() => navigate("/app/invoices")}
            size="small"
            sx={{
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              "&:hover": { bgcolor: "#f1f5f9" },
            }}
          >
            <ArrowBackRoundedIcon fontSize="small" sx={{ color: "#475569" }} />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          TAX INVOICE / #{id?.slice(-6).toUpperCase()}
        </Typography>
      </Box>

      {/* Page Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3.5}
        className="no-print"
      >
        <Box display="flex" alignItems="center" gap={1.75}>
          <Avatar
            sx={{
              width: 46,
              height: 46,
              background: "linear-gradient(135deg, #0284c7 0%, #0c4a6e 100%)",
              boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
            }}
          >
            <ReceiptLongRoundedIcon sx={{ color: "#fff", fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", letterSpacing: "-0.03em" }}>
              Tax Invoice
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generated GST-compliant bill for booking #{invoice.bookingId?.slice(-6).toUpperCase()}
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<PrintRoundedIcon />}
          onClick={() => window.print()}
          sx={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
            fontWeight: 700,
            borderRadius: 2.5,
            textTransform: "none",
            px: 3,
            py: 1,
          }}
        >
          Print Invoice
        </Button>
      </Box>

      {/* Invoice Sheet */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 5 },
          maxWidth: 780,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          boxShadow: "0 4px 20px -5px rgba(15, 23, 42, 0.06)",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={900} color="#0f172a">
              {invoice.companyProfile?.companyName ?? "Travel Agency Tax Invoice"}
            </Typography>
            {invoice.companyProfile?.gstNumber && (
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                GSTIN: <strong style={{ color: "#0f172a" }}>{invoice.companyProfile.gstNumber}</strong>
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Invoice Date:{" "}
              {new Date(invoice.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Typography>
          </Box>
          <Chip
            label="TAX INVOICE"
            sx={{
              bgcolor: "#f0fdf4",
              color: "#15803d",
              fontWeight: 800,
              fontSize: "0.75rem",
              borderRadius: "6px",
            }}
          />
        </Box>

        <Divider sx={{ my: 2.5, borderColor: "#f1f5f9" }} />

        {/* Customer & Billing Details */}
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={3} mb={4}>
          <Box p={2} sx={{ bgcolor: "#f8fafc", borderRadius: 2.5 }}>
            <Typography variant="caption" fontWeight={800} color="#64748b" textTransform="uppercase" display="block" mb={1}>
              Billed To Customer
            </Typography>
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
              {invoice.customer?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phone: {invoice.customer?.phone || "—"}
            </Typography>
            {invoice.customer?.email && (
              <Typography variant="body2" color="text.secondary">
                Email: {invoice.customer.email}
              </Typography>
            )}
          </Box>

          <Box p={2} sx={{ bgcolor: "#f8fafc", borderRadius: 2.5 }}>
            <Typography variant="caption" fontWeight={800} color="#64748b" textTransform="uppercase" display="block" mb={1}>
              Billing & Tax Metadata
            </Typography>
            <Typography variant="body2" color="#0f172a" fontWeight={600}>
              HSN/SAC: <strong>{invoice.hsnSac || "9985 (Tour Operator Services)"}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Place of Supply: Inter-State / Intra-State Tax
            </Typography>
          </Box>
        </Box>

        {/* Financial Breakdown Table */}
        <Table size="small" sx={{ mb: 3 }}>
          <TableBody>
            <TableRow sx={{ "& td": { py: 1.5, borderBottom: "1px solid #f1f5f9" } }}>
              <TableCell sx={{ color: "#475569", fontWeight: 600 }}>Tour & Travel Package Subtotal</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: "#0f172a" }}>
                ₹{((invoice.subtotalInPaise || 0) / 100).toLocaleString("en-IN")}
              </TableCell>
            </TableRow>
            <TableRow sx={{ "& td": { py: 1.5, borderBottom: "1px solid #f1f5f9" } }}>
              <TableCell sx={{ color: "#475569", fontWeight: 600 }}>Applicable GST</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: "#0f172a" }}>
                ₹{((invoice.gstInPaise || 0) / 100).toLocaleString("en-IN")}
              </TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: "#f0f9ff", "& td": { py: 2, borderBottom: 0 } }}>
              <TableCell sx={{ fontWeight: 900, color: "#0369a1", fontSize: "1.05rem" }}>
                Grand Total Payable
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 900, color: "#0284c7", fontSize: "1.2rem" }}>
                ₹{((invoice.totalInPaise || 0) / 100).toLocaleString("en-IN")}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Box pt={2} borderTop="1px dashed #cbd5e1" textAlign="center">
          <Typography variant="caption" color="text.secondary">
            Thank you for choosing our travel services. This is a computer-generated invoice and requires no physical signature.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
