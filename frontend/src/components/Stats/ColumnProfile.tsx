import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TagRoundedIcon from "@mui/icons-material/TagRounded";
import type { ColumnStat } from "../../types/excel";

interface Props {
    stats: ColumnStat[];
    selectedColumns: string[];
    onToggleColumn: (column: string) => void;
}

const KIND_COLOR: Record<ColumnStat["type"], "primary" | "success" | "warning" | "info"> = {
    numeric: "primary",
    date: "success",
    boolean: "warning",
    text: "info",
};

function formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
        return "—";
    }
    if (Number.isInteger(value)) {
        return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function summarise(stat: ColumnStat): string {
    switch (stat.type) {
        case "numeric": {
            const hasRange = typeof stat.min === "number" && typeof stat.max === "number";
            const range = hasRange
                ? `${formatNumber(stat.min as number)} – ${formatNumber(stat.max as number)}`
                : "no numeric values";
            return typeof stat.mean === "number" ? `mean ${formatNumber(stat.mean)} · ${range}` : range;
        }
        case "date":
            return stat.min && stat.max ? `${String(stat.min).slice(0, 10)} → ${String(stat.max).slice(0, 10)}` : "no dates";
        case "boolean": {
            const entries = Object.entries(stat.counts ?? {});
            return entries.length > 0 ? entries.map(([key, value]) => `${key} ${value}`).join(" · ") : "no values";
        }
        default: {
            const top = Object.entries(stat.top_values ?? {}).slice(0, 2);
            return top.length > 0 ? top.map(([key, value]) => `${key} (${value})`).join(" · ") : "no values";
        }
    }
}

export default function ColumnProfile({ stats, selectedColumns, onToggleColumn }: Props) {
    const [query, setQuery] = useState("");

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return needle ? stats.filter((stat) => stat.column.toLowerCase().includes(needle)) : stats;
    }, [query, stats]);

    return (
        <Stack spacing={1.5}>
            <TextField
                size="small"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search columns…"
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchRoundedIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    },
                }}
            />

            {visible.length === 0 ? (
                <Stack spacing={1} sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 3, color: "text.secondary" }}>
                    <TagRoundedIcon />
                    <Typography variant="body2">No columns match “{query}”.</Typography>
                </Stack>
            ) : (
                <Stack spacing={0.75} sx={{ maxHeight: 340, overflowY: "auto", pr: 0.5 }}>
                    {visible.map((stat) => {
                        const active = selectedColumns.includes(stat.column);
                        return (
                            <Box
                                key={stat.column}
                                component="button"
                                type="button"
                                onClick={() => onToggleColumn(stat.column)}
                                aria-pressed={active}
                                sx={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    font: "inherit",
                                    p: 1.25,
                                    borderRadius: 1.5,
                                    border: "1px solid",
                                    borderColor: active ? "primary.main" : "divider",
                                    bgcolor: active ? (theme) => `${theme.palette.primary.main}0f` : "transparent",
                                    transition: "border-color 120ms ease, background-color 120ms ease",
                                    "&:hover": { borderColor: active ? "primary.main" : "primary.light" },
                                    "&:focus-visible": { outline: `2px solid`, outlineColor: "primary.main", outlineOffset: 1 },
                                }}
                            >
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{ alignItems: "center", justifyContent: "space-between" }}
                                >
                                    <Typography variant="subtitle2" noWrap sx={{ minWidth: 0 }}>
                                        {stat.column}
                                    </Typography>
                                    <Chip
                                        label={stat.type}
                                        size="small"
                                        color={KIND_COLOR[stat.type]}
                                        variant="outlined"
                                        sx={{ flex: "0 0 auto", height: 20, fontSize: "0.6875rem" }}
                                    />
                                </Stack>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                                    {summarise(stat)}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
                                    <Tooltip title={`${stat.unique} distinct values`}>
                                        <Typography variant="caption" color="text.secondary">
                                            {stat.unique} unique
                                        </Typography>
                                    </Tooltip>
                                    {stat.missing > 0 ? (
                                        <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 0.75 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min(stat.missing_pct, 100)}
                                                color="warning"
                                                sx={{ height: 4, borderRadius: 999, flex: 1 }}
                                            />
                                            <Typography variant="caption" color="warning.main" sx={{ whiteSpace: "nowrap" }}>
                                                {stat.missing} missing
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Typography variant="caption" color="success.main" sx={{ ml: "auto" }}>
                                            complete
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                        );
                    })}
                </Stack>
            )}
        </Stack>
    );
}
