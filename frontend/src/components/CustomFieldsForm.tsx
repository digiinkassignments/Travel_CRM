import { useEffect, useState } from "react";
import { Box, Typography, TextField, Switch, FormControlLabel, Paper } from "@mui/material";
import { apiClient } from "../api/client";

interface FieldWithValue {
  definitionId: string; fieldKey: string; label: string; fieldType: string; value: unknown;
}

// Renders whatever custom fields an Enterprise client has defined for a
// given module (customers/enquiries/bookings) against one specific
// record, and saves edits inline. Renders nothing (not even the "Custom
// Fields" heading) if the client hasn't defined any — so this component
// is safe to drop into any detail page unconditionally.
export function CustomFieldsForm({ module, recordId }: { module: string; recordId: string }) {
  const [fields, setFields] = useState<FieldWithValue[]>([]);

  function load() {
    apiClient.get(`/custom-fields/values/${module}/${recordId}`)
      .then(({ data }) => setFields(data.data))
      .catch(() => setFields([])); // not entitled (non-Enterprise) — render nothing
  }
  useEffect(load, [module, recordId]);

  async function saveValue(definitionId: string, value: unknown) {
    await apiClient.post("/custom-fields/values", { definitionId, recordId, value });
    load();
  }

  if (fields.length === 0) return null;

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>Custom Fields</Typography>
      <Box display="flex" flexDirection="column" gap={2} maxWidth={400}>
        {fields.map((f) => {
          if (f.fieldType === "BOOLEAN") {
            return (
              <FormControlLabel key={f.definitionId} control={
                <Switch checked={!!f.value} onChange={(e) => saveValue(f.definitionId, e.target.checked)} />
              } label={f.label} />
            );
          }
          return (
            <TextField
              key={f.definitionId}
              label={f.label}
              type={f.fieldType === "NUMBER" ? "number" : f.fieldType === "DATE" ? "date" : "text"}
              InputLabelProps={f.fieldType === "DATE" ? { shrink: true } : undefined}
              defaultValue={(f.value as string | number) ?? ""}
              onBlur={(e) => saveValue(f.definitionId, f.fieldType === "NUMBER" ? Number(e.target.value) : e.target.value)}
              size="small"
            />
          );
        })}
      </Box>
    </Paper>
  );
}
