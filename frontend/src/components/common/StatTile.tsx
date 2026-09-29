import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { tokens } from "../../theme";

interface StatTileProps {
    label: string;
    value: ReactNode;
    hint?: string;
    tone?: "default" | "positive" | "warning";
}

const TONE_COLOR = {
    default: "text.primary",
    positive: "success.main",
    warning: "warning.main",
} as const;

export default function StatTile({ label, value, hint, tone = "default" }: StatTileProps) {
    return (
        <Paper
            variant="outlined"
            sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: tokens.radius.md,
                borderColor: "divider",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "transparent"),
                minWidth: 0,
            }}
        >
            <Typography variant="overline" color="text.secondary" sx={{ display: "block" }}>
                {label}
            </Typography>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.3, color: TONE_COLOR[tone] }} noWrap>
                {value}
            </Typography>
            {hint ? (
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {hint}
                </Typography>
            ) : null}
        </Paper>
    );
}

interface StatTileRowProps {
    children: ReactNode;
}

export function StatTileRow({ children }: StatTileRowProps) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" },
                gap: 1.25,
            }}
        >
            {children}
        </Box>
    );
}

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
    compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
    return (
        <Stack
            spacing={1}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                py: compact ? 3 : 6,
                px: 2,
                borderRadius: tokens.radius.md,
                border: "1px dashed",
                borderColor: "divider",
                color: "text.secondary",
            }}
        >            {icon ? (
                <Box sx={{ color: "text.disabled", "& svg": { fontSize: compact ? 26 : 34 } }}>{icon}</Box>
            ) : null}
            <Typography variant="subtitle1" color="text.primary">
                {title}
            </Typography>
            <Typography variant="body2" sx={{ maxWidth: 420 }}>
                {description}
            </Typography>
            {action ? <Box sx={{ pt: 0.5 }}>{action}</Box> : null}
        </Stack>
    );
}
