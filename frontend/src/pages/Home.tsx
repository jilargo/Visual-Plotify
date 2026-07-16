import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    Typography
} from "@mui/material";
import api from "../services/api";
import ChartViewer from "../components/Charts/ChartViewer";
import FileUpload from "../components/Upload/FileUpload";
import DataPreview from "../components/Preview/DataPreview";
import ChartBuilder from "../components/Charts/ChartBuilder";
import type { ExcelPreview } from "../types/excel";

export default function Home() {
    const [backendStatus, setBackendStatus] = useState("Checking...");
    const [excelData, setExcelData] = useState<ExcelPreview | null>(null);
    const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
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

    function handleUploadSuccess(data: ExcelPreview) {
        setExcelData(data);
        if (data.file_path) {
            setUploadedFilePath(data.file_path);
        }
        setChartData(null);
    }

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background: "linear-gradient(135deg, #f7fbff 0%, #edf4ff 100%)",
                px: { xs: 2, md: 4 },
                py: { xs: 3, md: 5 },
            }}
        >
            <Box
                sx={{
                    width: { xs: "100%", md: 960 },
                    maxWidth: 960,
                    mx: "auto",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    borderRadius: 3,
                    overflow: "hidden",
                    boxShadow: "0 20px 70px rgba(15, 23, 42, 0.1)",
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(10px)",
                }}
            >
                <Box
                    sx={{
                        p: { xs: 3, md: 4 },
                        background: "linear-gradient(90deg, #0f172a 0%, #2563eb 100%)",
                        color: "white",
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: { xs: "column", md: "row" },
                            justifyContent: "space-between",
                            alignItems: { xs: "flex-start", md: "center" },
                            gap: 2,
                        }}
                    >
                        <Box>
                            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                                📊 Visual Plotify
                            </Typography>
                            <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 760 }}>
                                Upload an Excel file, preview your dataset, and generate a polished chart from the columns you choose.
                            </Typography>
                        </Box>

                        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Backend status:
                            </Typography>
                            <Chip
                                label={backendStatus}
                                color={backendStatus === "OK" ? "success" : "error"}
                                sx={{
                                    backgroundColor: backendStatus === "OK" ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.16)",
                                    color: "white",
                                    border: "1px solid rgba(255,255,255,0.22)",
                                }}
                            />
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ p: { xs: 2.5, md: 4 } }}>
                    <Grid container spacing={3}>
                        <Grid size={12}>
                            <Card
                                variant="outlined"
                                sx={{
                                    borderRadius: 3,
                                    border: "1px solid rgba(37, 99, 235, 0.14)",
                                    boxShadow: "0 12px 36px rgba(15, 23, 42, 0.06)",
                                }}
                            >
                                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                                    <Typography component="h6" variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                                        Step 1 — Upload your Excel file
                                    </Typography>
                                    <FileUpload onUploadSuccess={handleUploadSuccess} />
                                </CardContent>
                            </Card>
                        </Grid>

                        {excelData && (
                            <>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 3,
                                            border: "1px solid rgba(37, 99, 235, 0.14)",
                                            boxShadow: "0 12px 36px rgba(15, 23, 42, 0.06)",
                                            height: "100%",
                                        }}
                                    >
                                        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                                            <Typography component="h6" variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                                                Step 2 — Preview dataset
                                            </Typography>
                                            <DataPreview data={excelData} />
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 3,
                                            border: "1px solid rgba(37, 99, 235, 0.14)",
                                            boxShadow: "0 12px 36px rgba(15, 23, 42, 0.06)",
                                            height: "100%",
                                        }}
                                    >
                                        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                                            <Typography component="h6" variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                                                Step 3 — Configure a chart
                                            </Typography>
                                            <ChartBuilder
                                                columns={excelData.columns}
                                                filePath={uploadedFilePath}
                                                onChartGenerated={(data) => setChartData(data)}
                                            />
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </>
                        )}

                        {chartData && (
                            <Grid size={12}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        borderRadius: 3,
                                        border: "1px solid rgba(37, 99, 235, 0.14)",
                                        boxShadow: "0 12px 36px rgba(15, 23, 42, 0.06)",
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                                        <Typography component="h6" variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                                            Step 4 — Chart output
                                        </Typography>
                                        <ChartViewer data={chartData} chartType={chartData.chart_type} />
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            </Box>
        </Box>
    );
}
