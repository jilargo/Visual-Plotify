import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    SvgIcon,
    Typography
} from "@mui/material";
import type { SelectChangeEvent, SvgIconProps } from "@mui/material";
import api from "../services/api";
import ChartViewer from "../components/Charts/ChartViewer";
import FileUpload from "../components/Upload/FileUpload";
import DataPreview from "../components/Preview/DataPreview";
import ChartBuilder from "../components/Charts/ChartBuilder";
import type { ExcelPreview } from "../types/excel";

const UploadIcon = (props: SvgIconProps) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path d="M5 20h14v-2H5v2zm7-18l-5 5h3v6h4V7h3l-5-5z" />
    </SvgIcon>
);

const PreviewIcon = (props: SvgIconProps) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path d="M4 6h16v12H4V6zm2 2v8h12V8H6zm2 2h8v2H8v-2z" />
    </SvgIcon>
);

const ChartIcon = (props: SvgIconProps) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path d="M5 19h14v2H5v-2zm3-8h2v6H8v-6zm4-4h2v10h-2V7zm4 6h2v4h-2v-4z" />
    </SvgIcon>
);

const SheetIcon = (props: SvgIconProps) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z" />
    </SvgIcon>
);

export default function Home() {
    const [backendStatus, setBackendStatus] = useState("Checking...");
    const [excelData, setExcelData] = useState<ExcelPreview | null>(null);
    const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
    const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
    const [loadingSheet, setLoadingSheet] = useState(false);
    const [chartData, setChartData] = useState<{ title: string; chart_type: string; xAxis: string[]; series: Array<{ name: string; data: number[] }> } | null>(null);

    useEffect(() => {
        api.get("/health")
            .then((response) => {
                setBackendStatus(response.data.status);
            })
            .catch(() => {
                setBackendStatus("Offline");
            });
    }, []);

    async function fetchSheetPreview(sheetName: string) {
        if (!uploadedFilePath) {
            return;
        }

        setLoadingSheet(true);

        try {
            const response = await api.get("/upload/preview", {
                params: {
                    file_path: uploadedFilePath,
                    sheet_name: sheetName,
                },
            });

            setExcelData(response.data as ExcelPreview);
            setSelectedSheet(sheetName);
            setChartData(null);
        } catch (error) {
            console.error("Sheet preview failed:", error);
        } finally {
            setLoadingSheet(false);
        }
    }

    function handleUploadSuccess(data: ExcelPreview) {
        setExcelData(data);
        if (data.file_path) {
            setUploadedFilePath(data.file_path);
        }

        setSelectedSheet(data.sheet_names?.[0] ?? null);
        setChartData(null);
    }

    const steps = [
        { label: "Upload Data" },
        { label: "Check & Describe" },
        { label: "Visualize" },
        { label: "Publish & Embed" },
    ];

    const currentStep = chartData ? 3 : excelData ? 2 : 1;

    return (
        <Box
            sx={{
                minHeight: "100vh",
                backgroundColor: "#eef4fb",
                px: { xs: 2, md: 3 },
                py: { xs: 2, md: 4 },
            }}
        >
            <Box sx={{ maxWidth: 1080, mx: "auto", display: "grid", gap: 3 }}>
                <Box
                    sx={{
                        position: "sticky",
                        top: 0,
                        zIndex: 20,
                        backgroundColor: "#eef4fb",
                        borderRadius: 3,
                        p: { xs: 2, md: 3 },
                        boxShadow: "0 16px 30px rgba(15, 23, 42, 0.08)",
                    }}
                >
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, color: "#0f172a" }}>
                        Visual Plotify
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        No installation, just upload and visualize.
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
                            gap: 1,
                        }}
                    >
                        {steps.map((step, index) => {
                            const stepStatus = index + 1 < currentStep ? "done" : index + 1 === currentStep ? "active" : "future";
                            return (
                                <Box
                                    key={step.label}
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        textAlign: "center",
                                        backgroundColor: stepStatus === "active" ? "#ef4444" : stepStatus === "done" ? "#1d4ed8" : "#ffffff",
                                        color: stepStatus === "future" ? "#0f172a" : "#ffffff",
                                        border: stepStatus === "future" ? "1px solid rgba(15, 23, 42, 0.12)" : "none",
                                        boxShadow: stepStatus !== "future" ? "0 10px 24px rgba(29, 78, 216, 0.12)" : "none",
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                        {index + 1}. {step.label}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8, fontSize: 12 }}>
                                        {stepStatus === "done" ? "Completed" : stepStatus === "active" ? "Current" : "Upcoming"}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", xl: "300px 1fr" },
                        gap: 3,
                    }}
                >
                    <Box sx={{ display: "grid", gap: 3 }}>
                        <Card
                            variant="outlined"
                            sx={{ borderRadius: 4, overflow: "hidden", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)" }}
                        >
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
                                    <SheetIcon sx={{ color: "#1d4ed8", fontSize: 22 }} />
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            Worksheet selector
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                                            Pick the sheet you want to analyze.
                                        </Typography>
                                    </Box>
                                </Box>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Worksheet</InputLabel>
                                    <Select
                                        value={selectedSheet ?? excelData?.sheet_names?.[0] ?? ""}
                                        label="Worksheet"
                                        onChange={(event: SelectChangeEvent<string>) => {
                                            const sheetName = event.target.value;
                                            if (typeof sheetName === "string") {
                                                void fetchSheetPreview(sheetName);
                                            }
                                        }}
                                        disabled={loadingSheet || !excelData}
                                    >
                                        {excelData?.sheet_names.map((sheet) => (
                                            <MenuItem key={sheet} value={sheet}>
                                                {sheet}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Box sx={{ mt: 2.5, display: "grid", gap: 0.75 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: 12 }}>
                                        File info
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                                        {excelData?.filename ?? "No file uploaded"}
                                    </Typography>
                                    {excelData && (
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                                            {excelData.rows} rows · {excelData.columns.length} columns · {excelData.sheet_names.length} sheets
                                        </Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>

                        <Card
                            variant="outlined"
                            sx={{ borderRadius: 4, overflow: "hidden", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)" }}
                        >
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
                                    <UploadIcon sx={{ color: "#0f172a", fontSize: 22 }} />
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            Upload workbook
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                                            Upload a file to enable worksheet preview and visualization.
                                        </Typography>
                                    </Box>
                                </Box>
                                <FileUpload onUploadSuccess={handleUploadSuccess} />
                            </CardContent>
                        </Card>
                    </Box>

                    <Box sx={{ display: "grid", gap: 3 }}>
                        <Card
                            variant="outlined"
                            sx={{ borderRadius: 4, overflow: "hidden", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)" }}
                        >
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
                                    <PreviewIcon sx={{ color: "#1d4ed8", fontSize: 22 }} />
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            Data preview
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                                            Inspect the selected worksheet before building your chart.
                                        </Typography>
                                    </Box>
                                </Box>
                                {excelData ? (
                                    <DataPreview data={excelData} selectedSheet={selectedSheet ?? excelData.sheet_names[0]} />
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Upload an Excel workbook to see the preview here.
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>

                        <Card
                            variant="outlined"
                            sx={{ borderRadius: 4, overflow: "hidden", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)" }}
                        >
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
                                    <ChartIcon sx={{ color: "#0f172a", fontSize: 22 }} />
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            Build chart
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                                            Select columns and generate a smart visualization.
                                        </Typography>
                                    </Box>
                                </Box>
                                <ChartBuilder
                                    columns={excelData?.columns ?? []}
                                    columnTypes={excelData?.dtypes ?? {}}
                                    filePath={uploadedFilePath}
                                    onChartGenerated={(data) => setChartData(data)}
                                />
                            </CardContent>
                        </Card>

                        <Card
                            variant="outlined"
                            sx={{ borderRadius: 4, overflow: "hidden", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)" }}
                        >
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
                                    <ChartIcon sx={{ color: "#0f172a", fontSize: 22 }} />
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            Chart output
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                                            Your generated visualization will appear here.
                                        </Typography>
                                    </Box>
                                </Box>
                                {chartData ? (
                                    <ChartViewer data={chartData} chartType={chartData.chart_type} />
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Generate a chart to preview it here.
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
                <Box sx={{ pt: 1, textAlign: "center", color: "text.secondary", fontSize: 13 }}>
                    Author: James Ian Largo,
                    software developer
                    
                    
                </Box>
            </Box>
        </Box>
    );
}
