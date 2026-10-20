import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0284c7", // Travel Sky Blue
      light: "#38bdf8",
      dark: "#0369a1",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#0c4a6e", // Deep Ocean
      light: "#075985",
      dark: "#082f49",
      contrastText: "#ffffff",
    },
    success: {
      main: "#10b981", // Emerald
      light: "#34d399",
      dark: "#059669",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#f97316", // Sunset Orange
      light: "#fb923c",
      dark: "#ea580c",
      contrastText: "#ffffff",
    },
    error: {
      main: "#ef4444",
      light: "#f87171",
      dark: "#dc2626",
      contrastText: "#ffffff",
    },
    info: {
      main: "#06b6d4",
      light: "#22d3ee",
      dark: "#0891b2",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f8fafc", // Crisp modern slate canvas
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a", // Deep slate
      secondary: "#64748b", // Balanced muted slate
    },
    divider: "#e2e8f0",
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: { fontWeight: 900, letterSpacing: "-0.03em" },
    h2: { fontWeight: 800, letterSpacing: "-0.03em" },
    h3: { fontWeight: 800, letterSpacing: "-0.025em" },
    h4: { fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.015em" },
    h6: { fontWeight: 700, letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body1: { fontSize: "0.925rem" },
    body2: { fontSize: "0.85rem" },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#f8fafc",
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": {
            width: "6px",
            height: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#cbd5e1",
            borderRadius: "6px",
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
          transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
          "&:hover": {
            borderColor: "#cbd5e1",
            boxShadow: "0 8px 24px -4px rgba(15, 23, 42, 0.08)",
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: "10px",
          textTransform: "none",
          fontWeight: 700,
          fontSize: "0.875rem",
          padding: "8px 18px",
          transition: "all 0.18s ease-in-out",
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
          boxShadow: "0 4px 12px rgba(2, 132, 199, 0.28)",
          "&:hover": {
            background: "linear-gradient(135deg, #0369a1 0%, #075985 100%)",
            boxShadow: "0 6px 16px rgba(2, 132, 199, 0.4)",
            transform: "translateY(-1px)",
          },
        },
        containedSecondary: {
          background: "linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)",
          boxShadow: "0 4px 12px rgba(12, 74, 110, 0.25)",
          "&:hover": {
            background: "linear-gradient(135deg, #082f49 0%, #021f35 100%)",
            boxShadow: "0 6px 16px rgba(12, 74, 110, 0.35)",
            transform: "translateY(-1px)",
          },
        },
        outlined: {
          borderColor: "#cbd5e1",
          color: "#334155",
          "&:hover": {
            borderColor: "#0284c7",
            backgroundColor: "rgba(2, 132, 199, 0.04)",
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: "separate",
          borderSpacing: "0",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#f8fafc",
          "& .MuiTableCell-head": {
            color: "#475569",
            fontWeight: 800,
            fontSize: "0.75rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            borderBottom: "1px solid #e2e8f0",
            paddingTop: "14px",
            paddingBottom: "14px",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid #f1f5f9",
          padding: "14px 16px",
          color: "#334155",
          fontSize: "0.875rem",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 0.15s ease",
          "&.MuiTableRow-hover:hover": {
            backgroundColor: "#f8fafc",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderRadius: "8px",
          fontSize: "0.75rem",
          height: "26px",
        },
        sizeSmall: {
          height: "22px",
          fontSize: "0.7rem",
          borderRadius: "6px",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "10px",
          backgroundColor: "#ffffff",
          transition: "all 0.18s ease-in-out",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#cbd5e1",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#94a3b8",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#0284c7",
            borderWidth: "1.5px",
            boxShadow: "0 0 0 3px rgba(2, 132, 199, 0.12)",
          },
        },
        input: {
          padding: "10px 14px",
          fontSize: "0.875rem",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          border: "1px solid #e2e8f0",
        },
      },
    },
  },
});
