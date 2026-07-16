import {
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography
} from "@mui/material";

import { useState } from "react";

import api from "../../services/api";

interface Props {
    columns: string[];
    filePath?: string | null;
    onChartGenerated: (data: { title: string; chart_type: string; xAxis: string[]; series: { name: string; data: number[] }[] }) => void;
}

export default function ChartBuilder({
    columns,
    filePath,
    onChartGenerated
}: Props) {
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function toggleColumn(column: string) {
        setSelectedColumns((current) => {
            if (current.includes(column)) {
                return current.filter((item) => item !== column);
            }
            return [...current, column];
        });
        setError(null);
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

            onChartGenerated(response.data);
        } catch (error) {
            console.error("Chart generation failed:", error);
            setError("Could not generate chart. Please verify the selected columns.");
        } finally {
            setLoading(false);
        }
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
                    renderValue={(selected) => (
                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: 0.5 }}>
                            {selected.map((value) => (
                                <Chip key={value} label={value} size="small" />
                            ))}
                        </Stack>
                    )}
                >
                    {columns.map((column) => (
                        <MenuItem key={column} value={column} onClick={() => toggleColumn(column)}>
                            {column}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

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
