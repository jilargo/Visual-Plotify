import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import FilterBuilder from "./FilterBuilder";
import { chartApi, describeApiError } from "../../services/api";
import type {
    Aggregation,
    ChartData,
    FilterRule,
    Granularity,
    SortOrder,
} from "../../types/chart";
import type { ColumnStat } from "../../types/excel";

interface Props {
    columns: string[];
    stats: ColumnStat[];
    filePath?: string | null;
    sheetName?: string | null;
    selectedColumns: string[];
    onSelectionChange: (columns: string[]) => void;
    onChartGenerated: (data: ChartData) => void;
}

const AGGREGATIONS: Array<{ value: Aggregation; label: string }> = [
    { value: "auto", label: "Automatic (sum)" },
    { value: "sum", label: "Sum" },
    { value: "mean", label: "Average" },
    { value: "median", label: "Median" },
    { value: "min", label: "Minimum" },
    { value: "max", label: "Maximum" },
    { value: "count", label: "Count of rows" },
];

const SORT_ORDERS: Array<{ value: SortOrder; label: string }> = [
    { value: "none", label: "Automatic (largest first)" },
    { value: "asc", label: "Smallest first" },
    { value: "desc", label: "Largest first" },
    { value: "label", label: "Alphabetical" },
];

const GRANULARITIES: Array<{ value: Granularity; label: string }> = [
    { value: "auto", label: "Automatic" },
    { value: "year", label: "Year" },
    { value: "quarter", label: "Quarter" },
    { value: "month", label: "Month" },
    { value: "week", label: "Week" },
    { value: "day", label: "Day" },
];

export default function ChartBuilder({
    columns,
    stats,
    filePath,
    sheetName,
    selectedColumns,
    onSelectionChange,
    onChartGenerated,
}: Props) {
    const [aggregation, setAggregation] = useState<Aggregation>("auto");
    const [sort, setSort] = useState<SortOrder>("none");
    const [topN, setTopN] = useState<string>("");
    const [granularity, setGranularity] = useState<Granularity>("auto");
    const [filters, setFilters] = useState<FilterRule[]>([]);
    const [showOptions, setShowOptions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const kindByColumn = useMemo(
        () => stats.reduce<Record<string, string>>((accumulator, stat) => {
            accumulator[stat.column] = stat.type;
            return accumulator;
        }, {}),
        [stats],
    );

    const hasNumeric = selectedColumns.some((column) => kindByColumn[column] === "numeric");
    const hasDate = selectedColumns.some((column) => kindByColumn[column] === "date");
    const hasCategory = selectedColumns.some((column) => kindByColumn[column] === "text" || kindByColumn[column] === "boolean");

    const suggestions = useMemo(() => {
        const of = (kind: string) => columns.filter((column) => kindByColumn[column] === kind);
        const text = of("text");
        const numeric = of("numeric");
        const dates = of("date");
        const booleans = of("boolean");

        const pairs: string[][] = [];
        if (text.length > 0 && numeric.length > 0) pairs.push([text[0], numeric[0]]);
        if (dates.length > 0 && numeric.length > 0) pairs.push([dates[0], numeric[0]]);
        if (numeric.length > 1) pairs.push([numeric[0], numeric[1]]);
        if (text.length > 1) pairs.push([text[0], text[1]]);

        const singles = [...numeric, ...text, ...dates, ...booleans];
        return [...pairs, ...singles.map((column) => [column])].slice(0, 4);
    }, [columns, kindByColumn]);

    function toggleColumn(column: string) {
        onSelectionChange(
            selectedColumns.includes(column) ? selectedColumns.filter((item) => item !== column) : [...selectedColumns, column],
        );
        setError(null);
    }

    async function generateChart() {
        if (!filePath) {
            setError("Upload a file or load a sample dataset first.");
            return;
        }
        if (selectedColumns.length === 0) {
            setError("Select at least one column to visualize.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await chartApi.create({
                file_path: filePath,
                sheet_name: sheetName ?? null,
                selected_columns: selectedColumns,
                chart_type: "auto",
                aggregation,
                sort,
                top_n: topN ? Number(topN) : null,
                time_granularity: granularity,
                filters,
            });

            const isEmpty = data.xAxis.length === 0 || data.series.every((item) => item.data.length === 0);
            if (isEmpty) {
                const reason = data.meta.notes[0] ?? "No chart data is available for the selected columns.";
                setError(reason);
                return;
            }

            onChartGenerated(data);
        } catch (chartError) {
            setError(
                describeApiError(
                    chartError,
                    "Could not build the chart. Try a different combination of columns.",
                ),
            );
        } finally {
            setLoading(false);
        }
    }

    const activeFilterCount = filters.filter((rule) => rule.column && String(rule.value ?? "").length > 0).length;

    return (
        <Stack spacing={2}>
            <FormControl fullWidth size="small">
                <InputLabel id="columns-label">Select columns</InputLabel>
                <Select
                    labelId="columns-label"
                    multiple
                    value={selectedColumns}
                    label="Select columns"
                    onChange={(event) => {
                        const value = event.target.value;
                        onSelectionChange(typeof value === "string" ? value.split(",") : value);
                        setError(null);
                    }}
                    renderValue={(selected) => (
                        <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.5, py: 0.25 }}>
                            {selected.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    Pick one or more columns
                                </Typography>
                            ) : (
                                selected.map((value) => (
                                    <Chip
                                        key={value}
                                        label={value}
                                        size="small"
                                        onDelete={(event) => {
                                            event.stopPropagation();
                                            toggleColumn(value);
                                        }}
                                        onMouseDown={(event) => event.stopPropagation()}
                                        sx={{ maxWidth: 190 }}
                                    />
                                ))
                            )}
                        </Stack>
                    )}
                >
                    {columns.map((column) => (
                        <MenuItem key={column} value={column} selected={selectedColumns.includes(column)}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
                                <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                                    {column}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {kindByColumn[column] ?? "unknown"}
                                </Typography>
                            </Stack>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {suggestions.length > 0 ? (
                <Box>
                    <Typography variant="overline" color="text.secondary">
                        Recommended combinations
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
                        {suggestions.map((suggestion) => (
                            <Chip
                                key={suggestion.join(" + ")}
                                label={`Try ${suggestion.join(" + ")}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                onClick={() => {
                                    onSelectionChange(suggestion);
                                    setError(null);
                                }}
                                sx={{ cursor: "pointer" }}
                            />
                        ))}
                    </Stack>
                </Box>
            ) : null}

            <Box>
                <Button
                    size="small"
                    color="inherit"
                    endIcon={
                        <ExpandMoreRoundedIcon
                            sx={{ transform: showOptions ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
                        />
                    }
                    onClick={() => setShowOptions((open) => !open)}
                    aria-expanded={showOptions}
                >
                    {showOptions ? "Hide options" : "Options"}
                    {activeFilterCount > 0 ? ` (${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""})` : ""}
                </Button>
            </Box>

            <Collapse in={showOptions} unmountOnExit>
                <Stack spacing={2} sx={{ pt: 0.5 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <FormControl fullWidth size="small" disabled={!hasNumeric}>
                            <InputLabel id="aggregation-label">Aggregate</InputLabel>
                            <Select
                                labelId="aggregation-label"
                                label="Aggregate"
                                value={aggregation}
                                onChange={(event) => setAggregation(event.target.value as Aggregation)}
                            >
                                {AGGREGATIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel id="sort-label">Order</InputLabel>
                            <Select
                                labelId="sort-label"
                                label="Order"
                                value={sort}
                                onChange={(event) => setSort(event.target.value as SortOrder)}
                            >
                                {SORT_ORDERS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <TextField
                            size="small"
                            label="Top categories"
                            placeholder="All"
                            value={topN}
                            onChange={(event) => setTopN(event.target.value.replace(/[^0-9]/g, ""))}
                            helperText="Long tails collapse into an “Other” bar"
                            disabled={!hasCategory}
                            slotProps={{ htmlInput: { inputMode: "numeric" } }}
                            sx={{ flex: 1 }}
                        />
                        <FormControl fullWidth size="small" disabled={!hasDate}>
                            <InputLabel id="granularity-label">Time bucket</InputLabel>
                            <Select
                                labelId="granularity-label"
                                label="Time bucket"
                                value={granularity}
                                onChange={(event) => setGranularity(event.target.value as Granularity)}
                            >
                                {GRANULARITIES.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    <Box>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 1 }}>
                            <FilterAltOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                            <Typography variant="overline" color="text.secondary">
                                Filter rows
                            </Typography>
                        </Stack>
                        <FilterBuilder columns={columns} stats={stats} rules={filters} onChange={setFilters} />
                    </Box>
                </Stack>
            </Collapse>

            {error ? (
                <Alert severity="warning" onClose={() => setError(null)}>
                    {error}
                </Alert>
            ) : null}

            {loading ? <LinearProgress sx={{ height: 4, borderRadius: 999 }} /> : null}

            <Button
                variant="contained"
                startIcon={<AutoGraphRoundedIcon />}
                onClick={() => void generateChart()}
                disabled={!filePath || loading || selectedColumns.length === 0}
                sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, px: 3 }}
            >
                {loading ? "Generating…" : "Visualize"}
            </Button>
        </Stack>
    );
}
