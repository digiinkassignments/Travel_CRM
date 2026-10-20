import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  InputAdornment,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  SearchRounded as SearchIcon,
  ContactPhoneRounded as LeadIcon,
  PeopleRounded as CustomerIcon,
  BookOnlineRounded as BookingIcon,
  DirectionsCarRounded as TripIcon,
  ArrowForwardRounded as ArrowIcon,
} from "@mui/icons-material";
import { apiClient } from "../../api/client";

interface SearchResult {
  id: string;
  category: "Leads" | "Customers" | "Bookings" | "Trips";
  title: string;
  subtitle: string;
  link: string;
}

interface GlobalQuickSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalQuickSearchModal({ open, onClose }: GlobalQuickSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/notifications/quick-search", {
          params: { q: query.trim() },
        });
        setResults(data?.data?.results ?? []);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Global search failed", err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter" && results.length > 0 && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (item: SearchResult) => {
    onClose();
    navigate(item.link);
  };

  const getCategoryIcon = (category: SearchResult["category"]) => {
    switch (category) {
      case "Leads":
        return <LeadIcon sx={{ color: "#0284c7", fontSize: 18 }} />;
      case "Customers":
        return <CustomerIcon sx={{ color: "#16a34a", fontSize: 18 }} />;
      case "Bookings":
        return <BookingIcon sx={{ color: "#8b5cf6", fontSize: 18 }} />;
      case "Trips":
        return <TripIcon sx={{ color: "#ea580c", fontSize: 18 }} />;
      default:
        return <SearchIcon sx={{ color: "#64748b", fontSize: 18 }} />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          position: "fixed",
          top: "12%",
          m: 0,
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          border: "1px solid #e2e8f0",
        },
      }}
    >
      <Box sx={{ p: 2, bgcolor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search leads, customers, bookings, trips... (min 2 chars)"
          variant="standard"
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#0284c7", fontSize: 24, mr: 1 }} />
              </InputAdornment>
            ),
            endAdornment: loading ? (
              <InputAdornment position="end">
                <CircularProgress size={18} />
              </InputAdornment>
            ) : null,
            sx: {
              fontSize: "1.05rem",
              fontWeight: 500,
            },
          }}
        />
      </Box>

      <DialogContent sx={{ p: 0, maxHeight: 420, overflowY: "auto", bgcolor: "#f8fafc" }}>
        {query.trim().length >= 2 && results.length === 0 && !loading ? (
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            <Typography variant="body2">No matching records found for "{query}".</Typography>
          </Box>
        ) : results.length > 0 ? (
          <List disablePadding>
            {results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <ListItem
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    cursor: "pointer",
                    bgcolor: isSelected ? "#e0f2fe" : "#ffffff",
                    borderLeft: isSelected ? "3px solid #0284c7" : "3px solid transparent",
                    transition: "all 0.12s ease",
                    "&:hover": {
                      bgcolor: "#f0f9ff",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>{getCategoryIcon(item.category)}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" fontWeight={700} color="#0f172a">
                          {item.title}
                        </Typography>
                        <Chip
                          label={item.category}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            bgcolor: "#f1f5f9",
                            color: "#475569",
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                        {item.subtitle}
                      </Typography>
                    }
                  />
                  <ArrowIcon sx={{ fontSize: 16, color: "#94a3b8", opacity: isSelected ? 1 : 0.4 }} />
                </ListItem>
              );
            })}
          </List>
        ) : (
          <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
            <Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>
              QUICK SUGGESTIONS
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontSize: "0.85rem" }}>
              Search by customer phone, name, pickup city, destination, booking # or driver.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <Box
        sx={{
          p: 1.25,
          px: 2.5,
          bgcolor: "#f1f5f9",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            <kbd style={{ background: "#ffffff", padding: "2px 5px", borderRadius: 4, border: "1px solid #cbd5e1" }}>↑</kbd>{" "}
            <kbd style={{ background: "#ffffff", padding: "2px 5px", borderRadius: 4, border: "1px solid #cbd5e1" }}>↓</kbd> Navigate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <kbd style={{ background: "#ffffff", padding: "2px 5px", borderRadius: 4, border: "1px solid #cbd5e1" }}>↵</kbd> Select
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <kbd style={{ background: "#ffffff", padding: "2px 5px", borderRadius: 4, border: "1px solid #cbd5e1" }}>ESC</kbd> Close
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          Digiink Fast Search
        </Typography>
      </Box>
    </Dialog>
  );
}
