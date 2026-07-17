import {
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";

import { useState } from "react";

import api from "../../services/api";

interface Props {
    columns: string[];
    columnTypes?: Record<string, string>;
    filePath?: string | null;
    onChartGenerated: (data: { title: string; chart_type: string; xAxis: string[]; series: { name: string; data: number[] }[] }) => void;
}

function normalizeType(rawType?: string) {
    if (!rawType) {
        return "text";
    }

    const lower = rawType.toLowerCase();
    if (/int|float|double|numeric|decimal|number/.test(lower)) {
        return "numeric";
    }
    if (/datetime|date|timestamp|time/.test(lower)) {
        return "date";
    }
    if (/bool|boolean/.test(lower)) {
        return "boolean";
    }
    return "text";
}

export default function ChartBuilder({
    columns,
    columnTypes = {},
    filePath,
    onChartGenerated
}: Props) {
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function handleSelectedColumnsChange(event: SelectChangeEvent<string[]>) {
        const value = event.target.value;
        setSelectedColumns(typeof value === "string" ? value.split(",") : value);
        setError(null);
    }

    function handleRemoveSelectedColumn(column: string) {
        setSelectedColumns((current) => current.filter((item) => item !== column));
        setError(null);
    }

    function getSuggestedColumns() {
        const normalizedTypes = columns.reduce<Record<string, string>>((acc, col) => {
            acc[col] = normalizeType(columnTypes[col]);
            return acc;
        }, {});

        const numeric = columns.filter((col) => normalizedTypes[col] === "numeric");
        const dates = columns.filter((col) => normalizedTypes[col] === "date");
        const text = columns.filter((col) => normalizedTypes[col] === "text");
        const boolean = columns.filter((col) => normalizedTypes[col] === "boolean");

        const suggestions: string[] = [];

        if (text.length > 0 && numeric.length > 0) {
            suggestions.push(`${text[0]} + ${numeric[0]}`);
        }
        if (dates.length > 0 && numeric.length > 0) {
            suggestions.push(`${dates[0]} + ${numeric[0]}`);
        }
        if (numeric.length > 1) {
            suggestions.push(`${numeric[0]} + ${numeric[1]}`);
        }
        if (numeric.length > 0) {
            suggestions.push(numeric[0]);
        }
        if (text.length > 0) {
            suggestions.push(text[0]);
        }
        if (dates.length > 0) {
            suggestions.push(dates[0]);
        }
        if (boolean.length > 0) {
            suggestions.push(boolean[0]);
        }

        return suggestions.slice(0, 3);
    }

    async function generateChart() {
        if (!filePath) {
            setError("Upload a file before generating a chart.");
            return;
        }

        if (selectedColumns.length < 1) {
            setError("Select at least one column to visualize.");
            return;
        }

        try {
            setLoading(true);
            const response = await api.post("/chart/", {
                file_path: filePath,
                selected_columns: selectedColumns
            });

            const chartResult = response.data;
            const noData = chartResult.xAxis.length === 0 || chartResult.series.every((item: { data: number[] }) => item.data.length === 0);

            if (noData) {
                const suggestions = getSuggestedColumns();
                const suggestionText = suggestions.length > 0 ? `Try ${suggestions.join(", ")} as a good starting point.` : "Try selecting a different combination of columns.";
                setError(`No chart data is available for the selected columns. ${suggestionText}`);
                return;
            }

            onChartGenerated(chartResult);
        } catch (error) {
            console.error("Chart generation failed:", error);
            const suggestions = getSuggestedColumns();
            const suggestionText = suggestions.length > 0 ? `Try ${suggestions.join(", ")} as a good starting point.` : "Try selecting a different combination of columns.";
            setError(`Could not generate chart. Please verify the selected columns. ${suggestionText}`);
        } finally {
            setLoading(false);
        }
    }

    const suggestions = getSuggestedColumns();

    function applySuggestion(suggestion: string) {
        const selected = suggestion.split(" + ").map((value) => value.trim()).filter(Boolean);
        setSelectedColumns(selected);
        setError(null);
    }

    return (
        <Stack spacing={2.5} sx={{ mt: 3, maxWidth: 520 }}>
            <Typography variant="body2">
                Select one or more columns and let the backend choose the best chart automatically.
            </Typography>
            <Typography variant="h6">Smart Visualization</Typography>

            <FormControl fullWidth>
                <InputLabel>Select columns</InputLabel>
                <Select
                    multiple
                    value={selectedColumns}
                    label="Select columns"
                    onChange={handleSelectedColumnsChange}
                    renderValue={(selected) => (
                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: 0.5 }}>
                            {selected.map((value) => (
                                <Chip
                                    key={value}
                                    label={value}
                                    size="small"
                                    onDelete={(event) => {
                                        event.stopPropagation();
                                        handleRemoveSelectedColumn(value);
                                    }}
                                    onMouseDown={(event) => event.stopPropagation()}
                                    sx={{
                                        maxWidth: 220,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                />
                            ))}
                        </Stack>
                    )}
                >
                    {columns.map((column) => (
                        <MenuItem key={column} value={column} selected={selectedColumns.includes(column)}>
                            {column}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {suggestions.length > 0 && (
                <Box sx={{ display: "grid", gap: 1, pt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Recommended starting combinations — click a suggestion to auto-fill the columns.
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {suggestions.map((suggestion) => (
                            <Chip
                                key={suggestion}
                                label={`Try ${suggestion}`}
                                size="small"
                                color="info"
                                onClick={() => applySuggestion(suggestion)}
                                sx={{ cursor: "pointer" }}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            {error && (
                <Typography color="error" variant="body2">
                    {error}
                </Typography>
            )}

            <Button variant="contained" onClick={generateChart} disabled={!filePath || loading}>
                {loading ? "Generating..." : "Visualize"}
            </Button>
        </Stack>
    );
}
