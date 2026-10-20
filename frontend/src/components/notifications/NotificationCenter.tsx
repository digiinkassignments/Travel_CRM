import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  NotificationsRounded as BellIcon,
  PhoneCallbackRounded as FollowUpIcon,
  FiberNewRounded as NewLeadIcon,
  DirectionsCarRounded as DepartureIcon,
  ReceiptLongRounded as PaymentIcon,
  DoneAllRounded as MarkAllReadIcon,
  RefreshRounded as RefreshIcon,
  OpenInNewRounded as OpenLinkIcon,
  CheckCircleOutlineRounded as CheckCircleIcon,
} from "@mui/icons-material";
import { apiClient } from "../../api/client";

interface AlertItem {
  id: string;
  type: "FOLLOW_UP" | "NEW_LEAD" | "DEPARTURE" | "PAYMENT" | "VOUCHER";
  severity: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: string;
  link: string;
  meta?: Record<string, any>;
}

interface NotificationSummary {
  total: number;
  followUps: number;
  newLeads: number;
  departures: number;
  payments: number;
  urgentCount: number;
}

const READ_STORAGE_KEY = "digiink_read_notifications";

export function NotificationCenter() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>({
    total: 0,
    followUps: 0,
    newLeads: 0,
    departures: 0,
    payments: 0,
    urgentCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(READ_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/notifications");
      if (data?.data?.alerts) {
        setAlerts(data.data.alerts);
        setSummary(data.data.summary);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    // Poll every 60 seconds
    const interval = setInterval(fetchAlerts, 60000);

    // Refresh on window focus
    const onFocus = () => fetchAlerts();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchAlerts]);

  const unreadAlerts = useMemo(() => {
    return alerts.filter((a) => !readIds.has(a.id));
  }, [alerts, readIds]);

  const unreadCount = unreadAlerts.length;

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    fetchAlerts();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAllAsRead = () => {
    const updated = new Set([...readIds, ...alerts.map((a) => a.id)]);
    setReadIds(updated);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(updated)));
    } catch (err) {
      console.error("Failed to save read notifications", err);
    }
  };

  const handleItemClick = (item: AlertItem) => {
    const updated = new Set(readIds);
    updated.add(item.id);
    setReadIds(updated);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(updated)));
    } catch (err) {
      console.error("Failed to save read notification", err);
    }
    handleClose();
    navigate(item.link);
  };

  const filteredAlerts = useMemo(() => {
    if (activeTab === "ALL") return alerts;
    return alerts.filter((a) => a.type === activeTab);
  }, [alerts, activeTab]);

  const getIcon = (item: AlertItem) => {
    switch (item.type) {
      case "FOLLOW_UP":
        return <FollowUpIcon sx={{ color: item.severity === "error" ? "#ef4444" : "#f59e0b" }} />;
      case "NEW_LEAD":
        return <NewLeadIcon sx={{ color: "#0284c7" }} />;
      case "DEPARTURE":
        return <DepartureIcon sx={{ color: item.severity === "error" ? "#ef4444" : "#0d9488" }} />;
      case "PAYMENT":
        return <PaymentIcon sx={{ color: "#d97706" }} />;
      default:
        return <BellIcon sx={{ color: "#64748b" }} />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMinutes = Math.round((now.getTime() - date.getTime()) / 60000);

      if (diffMinutes < 0) {
        // Future date
        const absMin = Math.abs(diffMinutes);
        if (absMin < 60) return `In ${absMin}m`;
        const absHours = Math.round(absMin / 60);
        if (absHours < 24) return `In ${absHours}h`;
        return `Due on ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
      }

      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.round(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Operational Notifications & Alerts">
        <IconButton
          onClick={handleOpen}
          sx={{
            color: "#334155",
            bgcolor: open ? "#e2e8f0" : "rgba(241, 245, 249, 0.8)",
            border: "1px solid #cbd5e1",
            borderRadius: 2.5,
            p: 1,
            transition: "all 0.18s ease",
            "&:hover": {
              bgcolor: "#e2e8f0",
              color: "#0284c7",
              borderColor: "#94a3b8",
            },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color={summary.urgentCount > 0 ? "error" : "primary"}
            max={99}
            sx={{
              "& .MuiBadge-badge": {
                fontWeight: 800,
                fontSize: "0.7rem",
                height: 18,
                minWidth: 18,
              },
            }}
          >
            <BellIcon sx={{ fontSize: 20 }} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            width: 420,
            maxWidth: "92vw",
            maxHeight: 560,
            borderRadius: 3,
            boxShadow: "0 20px 35px -10px rgba(15, 23, 42, 0.18), 0 1px 3px 0 rgba(0, 0, 0, 0.08)",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            mt: 1,
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            bgcolor: "#0f172a",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BellIcon sx={{ color: "#38bdf8", fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={800}>
              Notification Center
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} New`}
                size="small"
                sx={{
                  bgcolor: "#ef4444",
                  color: "#ffffff",
                  fontWeight: 800,
                  height: 20,
                  fontSize: "0.7rem",
                }}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Refresh">
              <IconButton
                size="small"
                onClick={fetchAlerts}
                disabled={loading}
                sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff" } }}
              >
                <RefreshIcon fontSize="small" className={loading ? "spin" : ""} />
              </IconButton>
            </Tooltip>
            {unreadCount > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton
                  size="small"
                  onClick={markAllAsRead}
                  sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff" } }}
                >
                  <MarkAllReadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Category Tabs */}
        <Box sx={{ bgcolor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                minHeight: 40,
                py: 0.5,
                px: 1.5,
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "none",
              },
            }}
          >
            <Tab label={`All (${alerts.length})`} value="ALL" />
            <Tab label={`Follow-ups (${summary.followUps})`} value="FOLLOW_UP" />
            <Tab label={`Leads (${summary.newLeads})`} value="NEW_LEAD" />
            <Tab label={`Departures (${summary.departures})`} value="DEPARTURE" />
            <Tab label={`Payments (${summary.payments})`} value="PAYMENT" />
          </Tabs>
        </Box>

        {/* Alerts List */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", bgcolor: "#f8fafc" }}>
          {loading && alerts.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : filteredAlerts.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6, px: 3 }}>
              <CheckCircleIcon sx={{ fontSize: 44, color: "#94a3b8", mb: 1.5 }} />
              <Typography variant="subtitle2" fontWeight={700} color="#334155">
                All Caught Up!
              </Typography>
              <Typography variant="caption" color="text.secondary">
                No active operational alerts or pending follow-ups in this category.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredAlerts.map((item, index) => {
                const isRead = readIds.has(item.id);
                return (
                  <React.Fragment key={item.id}>
                    <ListItem
                      onClick={() => handleItemClick(item)}
                      sx={{
                        p: 1.75,
                        cursor: "pointer",
                        bgcolor: isRead ? "#ffffff" : "#f0f9ff",
                        transition: "all 0.15s ease",
                        borderLeft: isRead
                          ? "3px solid transparent"
                          : item.severity === "error"
                          ? "3px solid #ef4444"
                          : "3px solid #0284c7",
                        "&:hover": {
                          bgcolor: isRead ? "#f8fafc" : "#e0f2fe",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, mt: 0.25, alignSelf: "flex-start" }}>
                        {getIcon(item)}
                      </ListItemIcon>

                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.25 }}>
                            <Typography
                              variant="body2"
                              fontWeight={isRead ? 600 : 800}
                              color="#0f172a"
                              sx={{ fontSize: "0.85rem", lineHeight: 1.3 }}
                            >
                              {item.title}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: item.severity === "error" ? "#ef4444" : "text.secondary",
                                fontWeight: item.severity === "error" ? 700 : 500,
                                fontSize: "0.7rem",
                                flexShrink: 0,
                                ml: 1,
                              }}
                            >
                              {formatRelativeTime(item.timestamp)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: 1.4,
                              mt: 0.25,
                            }}
                          >
                            {item.message}
                          </Typography>
                        }
                      />

                      <OpenLinkIcon
                        sx={{
                          fontSize: 16,
                          color: "#94a3b8",
                          ml: 1,
                          alignSelf: "center",
                          opacity: 0.6,
                        }}
                      />
                    </ListItem>
                    {index < filteredAlerts.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 1.5,
            px: 2,
            bgcolor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Auto-refreshes every 60s
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              handleClose();
              navigate("/app/enquiries");
            }}
            sx={{ textTransform: "none", fontSize: "0.75rem", fontWeight: 700, color: "#0284c7" }}
          >
            Go to Leads Pipeline →
          </Button>
        </Box>
      </Popover>
    </>
  );
}
