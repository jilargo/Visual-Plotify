import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import SchemaOutlinedIcon from "@mui/icons-material/SchemaOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import FileUpload from "../components/Upload/FileUpload";
import ColumnProfile from "../components/Stats/ColumnProfile";
import ChartBuilder from "../components/Charts/ChartBuilder";
import SectionCard from "../components/common/SectionCard";
import { EmptyState } from "../components/common/StatTile";
import { datasetApi, describeApiError } from "../services/api";
import { useColorMode } from "../hooks/useColorMode";
import { tokens } from "../theme";
import type { ChartData } from "../types/chart";
import type { ExcelPreview } from "../types/excel";

/** The data grid and the ECharts runtime are the two heavy chunks: load them on demand. */
const DataPreview = lazy(() => import("../components/Preview/DataPreview"));
const ChartViewer = lazy(() => import("../components/Charts/ChartViewer"));

const STEPS = ["Upload", "Explore", "Build", "Export"];

export default function Home() {
    const { mode, toggleMode } = useColorMode();
    const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");
    const [dataset, setDataset] = useState<ExcelPreview | null>(null);
    const [sheetName, setSheetName] = useState<string | null>(null);
    const [chart, setChart] = useState<ChartData | null>(null);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [previewError, setPreviewError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        datasetApi
            .health()
            .then((status) => active && setHealth(status.toLowerCase() === "ok" ? "online" : "offline"))
            .catch(() => active && setHealth("offline"));
        return () => {
            active = false;
        };
    }, []);

    const handleDatasetLoaded = useCallback((data: ExcelPreview) => {
        setDataset(data);
        setSheetName(data.active_sheet ?? data.sheet_names[0] ?? null);
        setChart(null);
        setSelectedColumns([]);
        setPreviewError(null);
    }, []);

    const handleSheetChange = useCallback(
        async (nextSheet: string) => {
            if (!dataset?.file_path) {
                return;
            }
            setSheetName(nextSheet);
            setChart(null);
            setSelectedColumns([]);
            setPreviewError(null);
            try {
                setDataset(await datasetApi.preview({ filePath: dataset.file_path, sheetName: nextSheet }));
            } catch (error) {
                setPreviewError(describeApiError(error, "Could not switch worksheet."));
            }
        },
        [dataset],
    );

    const stats = useMemo(() => dataset?.column_stats ?? [], [dataset]);
    const activeStep = chart ? 3 : dataset ? (stats.length > 0 ? 2 : 1) : 0;

    const toggleColumn = useCallback((column: string) => {
        setSelectedColumns((current) =>
            current.includes(column) ? current.filter((item) => item !== column) : [...current, column],
        );
    }, []);

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <AppBar
                position="sticky"
                elevation={0}
                color="transparent"
                sx={{
                    backdropFilter: "blur(12px)",
                    bgcolor: (current) => alpha(current.palette.background.default, 0.82),
                    borderBottom: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Toolbar sx={{ gap: 1.5, py: 1 }}>
                    <Box
                        sx={{
                            display: "grid",
                            placeItems: "center",
                            width: 34,
                            height: 34,
                            borderRadius: tokens.radius.sm,
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                        }}
                    >
                        <InsightsRoundedIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h4" component="p" noWrap>
                            Visual Plotify
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                            Spreadsheets to charts, entirely on your machine
                        </Typography>
                    </Box>

                    <Box sx={{ flex: 1 }} />

                    <Chip
                        size="small"
                        variant="outlined"
                        color={health === "online" ? "success" : health === "offline" ? "error" : "default"}
                        label={`Backend: ${health === "online" ? "OK" : health === "offline" ? "unreachable" : "checking"}`}
                        sx={{ fontWeight: 600 }}
                    />

                    <Tooltip title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}>
                        <Button
                            color="inherit"
                            aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
                            onClick={toggleMode}
                            sx={{ minWidth: 40, px: 1 }}
                        >
                            {mode === "light" ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
                        </Button>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            <Box sx={{ width: "100%", maxWidth: tokens.layout.maxWidth, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
                <Stepper
                    activeStep={activeStep}
                    alternativeLabel
                    sx={{
                        mb: 3,
                        "& .MuiStepLabel-label": { fontSize: "0.75rem" },
                        "& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed": { color: "primary.main" },
                    }}
                >
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Box
                    sx={{
                        display: "grid",
                        gap: 2.5,
                        gridTemplateColumns: { xs: "1fr", lg: `${tokens.layout.sidebar}px minmax(0, 1fr)` },
                        alignItems: "start",
                    }}
                >
                    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
                            <SectionCard
                                title="1. Add your data"
                                subtitle="Excel or CSV, never leaves this computer."
                                icon={<UploadFileRoundedIcon />}
                            >
                            <FileUpload onDatasetLoaded={handleDatasetLoaded} />
                        </SectionCard>

                        {dataset && dataset.sheet_names.length > 1 ? (
                            <SectionCard title="Worksheet" icon={<TableChartOutlinedIcon />}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="sheet-label">Worksheet</InputLabel>
                                    <Select
                                        labelId="sheet-label"
                                        label="Worksheet"
                                        value={sheetName ?? ""}
                                        onChange={(event) => void handleSheetChange(event.target.value)}
                                    >
                                        {dataset.sheet_names.map((name) => (
                                            <MenuItem key={name} value={name}>
                                                {name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </SectionCard>
                        ) : null}

                        {dataset ? (
                            <SectionCard
                                title="2. Build your chart"
                                subtitle="Pick columns, then tune the options."
                                icon={<AutoGraphRoundedIcon />}
                            >
                                <ChartBuilder
                                    columns={dataset.columns}
                                    stats={stats}
                                    filePath={dataset.file_path ?? null}
                                    sheetName={sheetName}
                                    selectedColumns={selectedColumns}
                                    onSelectionChange={setSelectedColumns}
                                    onChartGenerated={setChart}
                                />
                            </SectionCard>
                        ) : null}

                        {dataset ? (
                            <SectionCard
                                title="Column profile"
                                subtitle="Types, ranges and missing values. Click to add a column to the chart."
                                icon={<SchemaOutlinedIcon />}
                            >
                                <ColumnProfile stats={stats} selectedColumns={selectedColumns} onToggleColumn={toggleColumn} />
                            </SectionCard>
                        ) : null}
                    </Stack>

                    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
                        <SectionCard
                            title="Dataset"
                            subtitle="Everything the chart engine sees."
                            icon={<TableChartOutlinedIcon />}
                        >
                            {dataset ? (
                                <>
                                    <Suspense fallback={<Skeleton variant="rectangular" height={420} sx={{ borderRadius: 2 }} />}>
                                        <DataPreview data={dataset} selectedSheet={sheetName} />
                                    </Suspense>
                                    {previewError ? (
                                        <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                                            {previewError}
                                        </Typography>
                                    ) : null}
                                </>
                            ) : (
                                <EmptyState
                                    icon={<InsightsRoundedIcon fontSize="large" />}
                                    title="No dataset yet"
                                    description="Upload a workbook or load one of the sample datasets to see columns, ranges and data quality here."
                                />
                            )}
                        </SectionCard>

                        <SectionCard
                            title="Chart"
                            subtitle="Switch style, inspect the data and export."
                            icon={<BarChartRoundedIcon />}
                        >
                            {chart ? (
                                <>
                                    <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
                                        Generated chart
                                    </Typography>
                                    <Suspense fallback={<Skeleton variant="rectangular" height={460} sx={{ borderRadius: 2 }} />}>
                                        <ChartViewer
                                            key={`${chart.title}|${chart.chart_type}|${chart.xAxis.length}|${chart.meta.plotted_rows}`}
                                            data={chart}
                                        />
                                    </Suspense>
                                </>
                            ) : (
                                <EmptyState
                                    compact
                                    icon={<InsightsRoundedIcon fontSize="large" />}
                                    title="Nothing to show yet"
                                    description={
                                        dataset
                                            ? "Choose one or two columns and press Visualize to render a chart."
                                            : "Your chart will appear here once a dataset is loaded."
                                    }
                                />
                            )}
                        </SectionCard>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
}
