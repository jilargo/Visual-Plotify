import { createTheme, type Theme, type ThemeOptions } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

/**
 * Design tokens for Visual Plotify.
 *
 * The palette is deliberately restrained: one brand hue for interaction, a neutral
 * slate ramp for structure, and semantic colours only for state. Depth comes from
 * hairline borders plus a single soft shadow, which keeps dense data screens calm.
 */
export const tokens = {
    brand: {
        light: "#3b5bdb",
        dark: "#748ffc",
        accent: "#0ca678",
    },
    radius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 22,
    },
    shadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px -12px rgba(16, 24, 40, 0.18)",
        raised: "0 2px 4px rgba(16, 24, 40, 0.06), 0 18px 40px -18px rgba(16, 24, 40, 0.35)",
    },
    layout: {
        maxWidth: 1440,
        sidebar: 344,
    },
} as const;

/** Series colours shared by every chart so a category keeps its colour everywhere. */
export const chartPalette = [
    "#3b5bdb",
    "#0ca678",
    "#f76707",
    "#7048e8",
    "#1098ad",
    "#e8590c",
    "#5c7cfa",
    "#66a80f",
    "#d6336c",
    "#868e96",
];

export type AppColorMode = "light" | "dark";

const typography: ThemeOptions["typography"] = {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", sans-serif',
    h1: { fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.015em" },
    h3: { fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.01em" },
    h4: { fontSize: "1rem", fontWeight: 650, letterSpacing: "-0.005em" },
    subtitle1: { fontSize: "0.9375rem", fontWeight: 600 },
    subtitle2: { fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.01em" },
    body1: { fontSize: "0.9375rem" },
    body2: { fontSize: "0.875rem" },
    caption: { fontSize: "0.75rem", lineHeight: 1.5 },
    overline: { fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em" },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
};

const shape = { borderRadius: tokens.radius.md };

const LIGHT_SHADOWS = [
    "none",
    "0 1px 2px rgba(16, 24, 40, 0.05)",
    "0 1px 3px rgba(16, 24, 40, 0.07)",
    "0 2px 4px -1px rgba(16, 24, 40, 0.07)",
    "0 4px 8px -2px rgba(16, 24, 40, 0.09)",
    "0 8px 16px -4px rgba(16, 24, 40, 0.1)",
    "0 12px 28px -12px rgba(16, 24, 40, 0.22)",
] as const;

const DARK_SHADOWS = LIGHT_SHADOWS.map((shadow) => (shadow === "none" ? shadow : shadow.replace("16, 24, 40", "0, 0, 0")));

function buildShadows(isDark: boolean): Theme["shadows"] {
    const palette = isDark ? DARK_SHADOWS : LIGHT_SHADOWS;
    return Array.from({ length: 25 }, (_, index) => palette[index] ?? palette[palette.length - 1]) as Theme["shadows"];
}

function buildTheme(mode: AppColorMode): Theme {
    const isDark = mode === "dark";
    const brand = isDark ? tokens.brand.dark : tokens.brand.light;

    return createTheme({
        palette: {
            mode,
            primary: { main: brand, dark: isDark ? "#5c7cfa" : "#2b44b8", light: isDark ? "#91a7ff" : "#5c7cfa" },
            secondary: { main: isDark ? "#38d9a9" : "#0ca678" },
            error: { main: isDark ? "#ff8787" : "#e03131" },
            warning: { main: isDark ? "#ffd43b" : "#f08c00" },
            info: { main: isDark ? "#66d9e8" : "#0c8599" },
            success: { main: isDark ? "#69db7c" : "#2f9e44" },
            background: {
                default: isDark ? "#0b0f19" : "#f4f6fb",
                paper: isDark ? "#141a26" : "#ffffff",
            },
            text: {
                primary: isDark ? "#e7ecf3" : "#1c2434",
                secondary: isDark ? "#9aa7bd" : "#5a6478",
            },
            divider: isDark ? "rgba(154, 167, 189, 0.16)" : "rgba(28, 36, 52, 0.10)",
        },
        shape,
        typography,
        cssVariables: false,
        shadows: buildShadows(isDark),
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    "::selection": { backgroundColor: alpha(brand, 0.22) },
                    body: {
                        backgroundImage: isDark
                            ? "radial-gradient(1100px 520px at 12% -8%, rgba(59, 91, 219, 0.18), transparent 60%)"
                            : "radial-gradient(1100px 520px at 12% -8%, rgba(59, 91, 219, 0.08), transparent 60%)",
                        backgroundAttachment: "fixed",
                    },
                    "*::-webkit-scrollbar": { width: 10, height: 10 },
                    "*::-webkit-scrollbar-thumb": {
                        backgroundColor: isDark ? "rgba(154,167,189,0.25)" : "rgba(28,36,52,0.18)",
                        borderRadius: 999,
                        border: "2px solid transparent",
                        backgroundClip: "content-box",
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: { backgroundImage: "none" },
                },
            },
            MuiCard: {
                defaultProps: { elevation: 0 },
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderRadius: tokens.radius.lg,
                        border: `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme.palette.background.paper,
                        boxShadow: isDark ? "0 1px 0 rgba(255,255,255,0.02) inset" : tokens.shadow.card,
                    }),
                },
            },
            MuiButton: {
                defaultProps: { disableElevation: true },
                styleOverrides: {
                    root: { borderRadius: tokens.radius.sm, paddingInline: 16 },
                    sizeSmall: { paddingInline: 12 },
                    outlined: ({ theme }) => ({ borderColor: theme.palette.divider }),
                    contained: { boxShadow: isDark ? "none" : `0 6px 16px -8px ${alpha(brand, 0.85)}` },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: { borderRadius: tokens.radius.sm, fontWeight: 600 },
                    sizeSmall: { height: 24, fontSize: "0.75rem" },
                    outlined: ({ theme }) => ({ borderColor: theme.palette.divider }),
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderRadius: tokens.radius.sm,
                        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : theme.palette.background.paper,
                    }),
                    notchedOutline: ({ theme }) => ({ borderColor: theme.palette.divider }),
                },
            },
            MuiTooltip: {
                defaultProps: { arrow: true },
                styleOverrides: {
                    tooltip: {
                        backgroundColor: isDark ? "#0f1520" : "#1c2434",
                        fontSize: "0.75rem",
                        borderRadius: tokens.radius.sm,
                    },
                    arrow: { color: isDark ? "#0f1520" : "#1c2434" },
                },
            },
            MuiMenu: {
                styleOverrides: {
                    paper: ({ theme }) => ({
                        borderRadius: tokens.radius.md,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: tokens.shadow.raised,
                    }),
                },
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: { borderRadius: tokens.radius.sm, marginInline: 4, minHeight: 38 },
                },
            },
            MuiSelect: {
                defaultProps: { MenuProps: { elevation: 8 } },
            },
            MuiFormLabel: {
                styleOverrides: {
                    root: { fontSize: "0.875rem", fontWeight: 500 },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: ({ theme }) => ({ borderColor: theme.palette.divider }),
                },
            },
            MuiAlert: {
                styleOverrides: {
                    root: { borderRadius: tokens.radius.md, alignItems: "center" },
                },
            },
            MuiSkeleton: {
                defaultProps: { animation: "wave" },
            },
            MuiToggleButton: {
                styleOverrides: {
                    root: { borderRadius: tokens.radius.sm, textTransform: "none", fontWeight: 600, paddingInline: 12 },
                },
            },
        },
    });
}

export const lightTheme = buildTheme("light");
export const darkTheme = buildTheme("dark");
