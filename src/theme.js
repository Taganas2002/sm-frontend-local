    import { createContext, useState, useMemo } from "react";
    import { createTheme } from "@mui/material/styles";

    // color design tokens export
   // color design tokens export
    export const tokens = (mode) => ({
    ...(mode === "dark"
        ? {
            grey: {
            100: "#F1F5F9", // light text
            200: "#E2E8F0",
            300: "#CBD5E1",
            400: "#94A3B8",
            500: "#64748B",
            600: "#475569",
            700: "#334155",
            800: "#1E293B",
            900: "#0F172A", // darkest background
            },
            primary: {
            100: "#1E293B", // background base
            200: "#273548",
            300: "#2F3F56",
            400: "#334155", 
            500: "#1E293B", // main dashboard background
            600: "#182333",
            700: "#141E2B",
            800: "#0F172A",
            900: "#0B111F",
            },
            blueAccent: {
            100: "#DBEAFE",
            200: "#BFDBFE",
            300: "#93C5FD",
            400: "#60A5FA",
            500: "#2563EB", // main accent (buttons, links)
            600: "#1D4ED8",
            700: "#1E40AF",
            800: "#1E3A8A",
            900: "#172554",
            },
            greenAccent: {
            100: "#DCFCE7",
            200: "#BBF7D0",
            300: "#86EFAC",
            400: "#4ADE80",
            500: "#22C55E", // success
            600: "#16A34A",
            700: "#15803D",
            800: "#166534",
            900: "#14532D",
            },
            redAccent: {
            100: "#FEE2E2",
            200: "#FCA5A5",
            300: "#F87171",
            400: "#EF4444",
            500: "#DC2626", // errors
            600: "#B91C1C",
            700: "#991B1B",
            800: "#7F1D1D",
            900: "#450A0A",
            },
            yellowAccent: {
            100: "#FEF9C3",
            200: "#FDE68A",
            300: "#FCD34D",
            400: "#FBBF24",
            500: "#F59E0B", // warnings
            600: "#D97706",
            700: "#B45309",
            800: "#92400E",
            900: "#78350F",
            },
        }
        : {
            grey: {
            100: "#0F172A",
            200: "#1E293B",
            300: "#334155",
            400: "#475569",
            500: "#64748B",
            600: "#94A3B8",
            700: "#CBD5E1",
            800: "#E2E8F0",
            900: "#F1F5F9",
            },
            primary: {
            100: "#F8FAFC", // background
            200: "#F1F5F9",
            300: "#E2E8F0",
            400: "#CBD5E1",
            500: "#94A3B8",
            600: "#64748B",
            700: "#475569",
            800: "#334155",
            900: "#1E293B", // sidebar
            },
            blueAccent: {
            100: "#EFF6FF",
            200: "#DBEAFE",
            300: "#BFDBFE",
            400: "#93C5FD",
            500: "#2563EB",
            600: "#1D4ED8",
            700: "#1E40AF",
            800: "#1E3A8A",
            900: "#172554",
            },
            greenAccent: {
            100: "#ECFDF5",
            200: "#D1FAE5",
            300: "#A7F3D0",
            400: "#6EE7B7",
            500: "#22C55E",
            600: "#16A34A",
            700: "#15803D",
            800: "#166534",
            900: "#14532D",
            },
            redAccent: {
            100: "#FEF2F2",
            200: "#FEE2E2",
            300: "#FCA5A5",
            400: "#F87171",
            500: "#DC2626",
            600: "#B91C1C",
            700: "#991B1B",
            800: "#7F1D1D",
            900: "#450A0A",
            },
            yellowAccent: {
            100: "#FFFBEB",
            200: "#FEF3C7",
            300: "#FDE68A",
            400: "#FCD34D",
            500: "#F59E0B",
            600: "#D97706",
            700: "#B45309",
            800: "#92400E",
            900: "#78350F",
            },
        }),
    });



    // mui theme settings
    export const themeSettings = (mode) => {
    const colors = tokens(mode);
    return {
        palette: {
        mode: mode,
        ...(mode === "dark"
            ? {
                // palette values for dark mode
                primary: {
                main: colors.primary[500],
                },
                secondary: {
                main: colors.blueAccent[400],
                },
                neutral: {
                dark: colors.grey[700],
                main: colors.grey[500],
                light: colors.grey[100],
                },
                background: {
                default: colors.primary[500],
                },
            }
            : {
                // palette values for light mode
                primary: {
                main: colors.primary[100],
                },
                secondary: {
                main: colors.blueAccent[800],
                },
                neutral: {
                dark: colors.grey[700],
                main: colors.grey[500],
                light: colors.grey[100],
                },
                background: {
                default: "#fcfcfc",
                },
            }),
        },
        typography: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 12,
        h1: {
            fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
            fontSize: 40,
        },
        h2: {
            fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
            fontSize: 32,
        },
        h3: {
            fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
            fontSize: 24,
        },
        h4: {
            fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
            fontSize: 20,
        },
        h5: {
            fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
            fontSize: 16,
            
        },
        h6: {
            fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
            fontSize: 14,
        // color: mode === "dark" ? "#60a5fa" : "#1e3a8a", // 👈 custom subtitle color

        },
        },
        components: {
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor:
                mode === "light"
                  ? colors.blueAccent[700] // dark blue borders in light mode
                  : colors.blueAccent[200], // light blue borders in dark mode
            },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor:
                    mode === "light"
                    ? colors.blueAccent[900]
                    : colors.blueAccent[100],
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor:
                    mode === "light"
                    ? colors.blueAccent[900]
                    : colors.blueAccent[50],
                },
            },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
            root: {
                color:
                mode === "light"
                    ? colors.blueAccent[700]
                    : colors.blueAccent[200], // label color matches border
                "&.Mui-focused": {
                color:
                    mode === "light"
                    ? colors.blueAccent[900]
                    : colors.blueAccent[50],
                },
            },
            },
        },
        },
    };
    };

    // context for color mode
    export const ColorModeContext = createContext({
    toggleColorMode: () => {},
    });

    export const useMode = () => {
    const [mode, setMode] = useState("dark");

    const colorMode = useMemo(
        () => ({
        toggleColorMode: () =>
            setMode((prev) => (prev === "light" ? "dark" : "light")),
        }),
        []
    );

    const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);
    return [theme, colorMode];
    };