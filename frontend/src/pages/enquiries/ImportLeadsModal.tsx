import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { apiClient } from "../../api/client";

export interface ImportLeadRow {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupLocation?: string;
  destination?: string;
  travelDate?: string;
  vehicleService?: string;
  source?: string;
  status?: string;
  notes?: string;
  followUpDate?: string;
  isValid: boolean;
  validationError?: string;
}

interface ImportLeadsModalProps {
  open: boolean;
  onClose: () => void;
  staff: Array<{ id: string; name: string; email: string }>;
  onSuccess: (result: { imported: number; newCustomers: number }) => void;
}

const SAMPLE_CSV_CONTENT = `Customer Name,Phone,Email,Pickup Location,Drop Location,Travel Date,Vehicle Type,Source,Status,Requirement / Notes
Rahul Sharma,9876543210,rahul@example.com,Jaipur,Delhi,2026-09-25,Innova Crysta,Website,NEW,Family trip with 4 adults and luggage
Priya Patel,9123456780,priya@example.com,Udaipur,Mount Abu,2026-09-28,Sedan,Walk-in,CONTACTED,Sightseeing 2 days
Amit Verma,9988776655,,Jodhpur,Jaisalmer,2026-10-02,Tempo Traveller,Call,NEW,Group tour 12 passengers
Sunita Meena,9829012345,sunita@example.com,Jaipur,Agra,2026-10-05,Dzire,Google,QUOTED,One way drop to Agra
Vikram Singh,9414012345,vikram@example.com,Delhi,Jaipur,2026-10-10,Innova,WhatsApp,NEW,Airport pickup and hotel transfer`;

/**
 * Robust zero-dependency CSV parser that handles quotes, line breaks, and whitespace
 */
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function ImportLeadsModal({ open, onClose, staff, onSuccess }: ImportLeadsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportLeadRow[]>([]);
  const [assignTo, setAssignTo] = useState<"NONE" | "MANUAL" | "ROUND_ROBIN">("NONE");
  const [assignedToId, setAssignedToId] = useState("");
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function resetState() {
    setFile(null);
    setParsedRows([]);
    setAssignTo("NONE");
    setAssignedToId("");
    setErrorMsg(null);
    setImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClose() {
    if (!importing) {
      resetState();
      onClose();
    }
  }

  function downloadSampleCSV() {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "leads_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleFileSelected(selectedFile: File) {
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setErrorMsg("Please select a valid .csv file.");
      return;
    }
    setErrorMsg(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          setErrorMsg("Selected CSV file is empty.");
          return;
        }

        const data = parseCSV(text);
        if (data.length < 2) {
          setErrorMsg("CSV file must contain at least a header row and one lead row.");
          return;
        }

        const headers = data[0].map(normalizeHeader);

        // Find column indices
        const nameIdx = headers.findIndex((h) =>
          ["customername", "name", "clientname", "customer", "passengername"].includes(h)
        );
        const phoneIdx = headers.findIndex((h) =>
          ["phone", "phonenumber", "mobile", "mobilenumber", "contact", "contactnumber"].includes(h)
        );
        const emailIdx = headers.findIndex((h) =>
          ["email", "emailaddress", "mail", "customeremail"].includes(h)
        );
        const pickupIdx = headers.findIndex((h) =>
          ["pickuplocation", "pickup", "source", "from", "pickupcity", "origin"].includes(h)
        );
        const dropIdx = headers.findIndex((h) =>
          ["droplocation", "destination", "drop", "to", "dropcity", "dropoff"].includes(h)
        );
        const dateIdx = headers.findIndex((h) =>
          ["traveldate", "journeydate", "date", "tripdate", "datetime"].includes(h)
        );
        const vehicleIdx = headers.findIndex((h) =>
          ["vehicletype", "vehicle", "vehicleservice", "service", "cartype", "cab"].includes(h)
        );
        const sourceIdx = headers.findIndex((h) =>
          ["source", "leadsource", "channel", "referral"].includes(h)
        );
        const statusIdx = headers.findIndex((h) =>
          ["status", "stage", "leadstatus"].includes(h)
        );
        const notesIdx = headers.findIndex((h) =>
          ["requirementnotes", "requirement", "notes", "remarks", "description", "details"].includes(h)
        );
        const followUpIdx = headers.findIndex((h) =>
          ["followupdate", "followup", "nextfollowup"].includes(h)
        );

        if (nameIdx === -1 && phoneIdx === -1) {
          setErrorMsg(
            "Could not detect 'Customer Name' and 'Phone' columns. Please ensure your CSV includes headers."
          );
          return;
        }

        const validStages = ["NEW", "CONTACTED", "QUOTED", "NEGOTIATION", "WON", "LOST"];

        const rows: ImportLeadRow[] = data.slice(1).map((row, idx) => {
          const rawName = nameIdx !== -1 ? row[nameIdx] ?? "" : "";
          const rawPhone = phoneIdx !== -1 ? row[phoneIdx] ?? "" : "";
          const rawEmail = emailIdx !== -1 ? row[emailIdx] ?? "" : "";
          const rawPickup = pickupIdx !== -1 ? row[pickupIdx] ?? "" : "";
          const rawDrop = dropIdx !== -1 ? row[dropIdx] ?? "" : "";
          const rawDate = dateIdx !== -1 ? row[dateIdx] ?? "" : "";
          const rawVehicle = vehicleIdx !== -1 ? row[vehicleIdx] ?? "" : "";
          const rawSource = sourceIdx !== -1 ? row[sourceIdx] ?? "" : "";
          const rawStatus = (statusIdx !== -1 ? row[statusIdx] ?? "" : "").toUpperCase().trim();
          const rawNotes = notesIdx !== -1 ? row[notesIdx] ?? "" : "";
          const rawFollowUp = followUpIdx !== -1 ? row[followUpIdx] ?? "" : "";

          const hasName = rawName.trim().length > 0;
          const hasPhone = rawPhone.trim().length > 0;

          let validationError: string | undefined;
          if (!hasName && !hasPhone) {
            validationError = "Missing Name & Phone";
          } else if (!hasName) {
            validationError = "Missing Customer Name";
          } else if (!hasPhone) {
            validationError = "Missing Phone Number";
          }

          return {
            customerName: rawName.trim(),
            customerPhone: rawPhone.trim(),
            customerEmail: rawEmail.trim() || undefined,
            pickupLocation: rawPickup.trim() || undefined,
            destination: rawDrop.trim() || undefined,
            travelDate: rawDate.trim() || undefined,
            vehicleService: rawVehicle.trim() || undefined,
            source: rawSource.trim() || (rawPickup.trim() ? `CSV - ${rawPickup.trim()}` : "CSV Import"),
            status: validStages.includes(rawStatus) ? rawStatus : "NEW",
            notes: rawNotes.trim() || undefined,
            followUpDate: rawFollowUp.trim() || undefined,
            isValid: !validationError,
            validationError,
          };
        });

        setParsedRows(rows);
      } catch (err: any) {
        setErrorMsg("Failed to parse CSV file: " + (err.message || "Unknown error"));
      }
    };
    reader.readAsText(selectedFile);
  }

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  async function handleImport() {
    if (validRows.length === 0) return;
    try {
      setImporting(true);
      setErrorMsg(null);

      const payload = {
        rows: validRows.map((r) => ({
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          customerEmail: r.customerEmail,
          pickupLocation: r.pickupLocation,
          destination: r.destination,
          travelDate: r.travelDate,
          vehicleService: r.vehicleService,
          source: r.source,
          status: r.status,
          notes: r.notes,
          followUpDate: r.followUpDate,
        })),
        assignTo,
        assignedToId: assignTo === "MANUAL" ? assignedToId || undefined : undefined,
      };

      const res = await apiClient.post("/enquiries/import", payload);
      onSuccess(res.data?.data ?? { imported: validRows.length, newCustomers: 0 });
      handleClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Import failed";
      setErrorMsg(msg);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          p: 1,
          boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.2)",
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", pb: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={800} color="#0f172a">
            Import Leads from CSV
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Upload a spreadsheet of inquiries to import leads and automatically link or create customers.
          </Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={importing} size="small" sx={{ color: "#64748b" }}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: "#f1f5f9" }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Top actions & template download */}
        <Box
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          gap={1.5}
          mb={2.5}
          p={2}
          sx={{ bgcolor: "#f8fafc", borderRadius: 2.5, border: "1px solid #e2e8f0" }}
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
              Need the format?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Download our pre-formatted template with standard travel CRM columns.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadRoundedIcon />}
            onClick={downloadSampleCSV}
            sx={{
              borderColor: "#cbd5e1",
              color: "#0369a1",
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#ffffff",
              whiteSpace: "nowrap",
              "&:hover": { borderColor: "#0284c7", bgcolor: "#f0f9ff" },
            }}
          >
            Download Sample CSV
          </Button>
        </Box>

        {/* Drag & Drop Upload Zone */}
        {!file ? (
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files?.[0]) {
                handleFileSelected(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: `2px dashed ${dragActive ? "#0284c7" : "#cbd5e1"}`,
              borderRadius: 3,
              p: 4,
              textAlign: "center",
              bgcolor: dragActive ? "rgba(2, 132, 199, 0.04)" : "#ffffff",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderColor: "#0284c7",
                bgcolor: "rgba(2, 132, 199, 0.02)",
              },
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />
            <CloudUploadRoundedIcon sx={{ fontSize: 48, color: "#0284c7", mb: 1.5 }} />
            <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
              Click to browse or drag and drop your CSV file here
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Supports .csv files up to 1,000 leads per batch
            </Typography>
          </Box>
        ) : (
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={2}
            sx={{ bgcolor: "#f1f5f9", borderRadius: 2.5, mb: 2 }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <InsertDriveFileRoundedIcon sx={{ color: "#0284c7", fontSize: 32 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} rows detected
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Remove file">
              <IconButton onClick={resetState} size="small" sx={{ color: "#dc2626" }} disabled={importing}>
                <DeleteOutlineRoundedIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Configuration & Preview Section */}
        {parsedRows.length > 0 && (
          <Box mt={2.5}>
            {/* Lead Assignment Option */}
            <Box mb={3} p={2} sx={{ bgcolor: "#f8fafc", borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" mb={1.5}>
                Staff Allocation Setting for Imported Leads
              </Typography>
              <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2}>
                <TextField
                  select
                  size="small"
                  label="Staff Allocation Policy"
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value as any)}
                  sx={{ minWidth: 240, bgcolor: "#fff" }}
                >
                  <MenuItem value="NONE">Leave unassigned</MenuItem>
                  <MenuItem value="ROUND_ROBIN">Auto-assign (Round Robin across active staff)</MenuItem>
                  <MenuItem value="MANUAL">Assign all to a specific staff member</MenuItem>
                </TextField>

                {assignTo === "MANUAL" && (
                  <TextField
                    select
                    size="small"
                    label="Select Staff Member"
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    sx={{ minWidth: 240, bgcolor: "#fff" }}
                  >
                    {staff.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Box>
            </Box>

            {/* Validation Stats Pill */}
            <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
              <Chip
                icon={<CheckCircleRoundedIcon style={{ fontSize: 16 }} />}
                label={`${validRows.length} Valid Leads`}
                size="small"
                sx={{
                  bgcolor: "#f0fdf4",
                  color: "#166534",
                  fontWeight: 700,
                  border: "1px solid #bbf7d0",
                }}
              />
              {invalidRows.length > 0 && (
                <Chip
                  icon={<ErrorOutlineRoundedIcon style={{ fontSize: 16 }} />}
                  label={`${invalidRows.length} Incomplete (will be skipped)`}
                  size="small"
                  sx={{
                    bgcolor: "#fef2f2",
                    color: "#991b1b",
                    fontWeight: 700,
                    border: "1px solid #fecaca",
                  }}
                />
              )}
            </Box>

            {/* Preview Table */}
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Preview of first {Math.min(parsedRows.length, 5)} rows:
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>Route / Journey</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>Travel Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>Vehicle</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedRows.slice(0, 5).map((r, i) => (
                    <TableRow key={i} sx={{ bgcolor: r.isValid ? "inherit" : "rgba(254, 242, 242, 0.4)" }}>
                      <TableCell>
                        {r.isValid ? (
                          <Chip label="Ready" size="small" sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 700, fontSize: "0.7rem", height: 22 }} />
                        ) : (
                          <Chip label={r.validationError} size="small" sx={{ bgcolor: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: "0.7rem", height: 22 }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "#0f172a" }}>{r.customerName || "—"}</TableCell>
                      <TableCell sx={{ color: "#334155" }}>{r.customerPhone || "—"}</TableCell>
                      <TableCell sx={{ color: "#334155" }}>
                        {r.pickupLocation || r.destination ? `${r.pickupLocation || "?"} → ${r.destination || "?"}` : "—"}
                      </TableCell>
                      <TableCell sx={{ color: "#334155" }}>{r.travelDate || "—"}</TableCell>
                      <TableCell sx={{ color: "#334155" }}>{r.vehicleService || "—"}</TableCell>
                      <TableCell sx={{ color: "#64748b", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={importing} sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={importing || validRows.length === 0 || (assignTo === "MANUAL" && !assignedToId)}
          startIcon={importing ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : null}
          sx={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            px: 2.75,
            boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
            "&:hover": { background: "linear-gradient(135deg, #0369a1 0%, #075985 100%)" },
          }}
        >
          {importing ? "Importing Leads..." : `Import ${validRows.length} Leads`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
