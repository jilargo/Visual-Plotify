import { useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    Menu,
    MenuItem,
    Select,
    Typography
} from "@mui/material";
import { jsPDF } from "jspdf";
import ReactECharts from "echarts-for-react";

interface Props {
    data: {
        title: string;
        chart_type: string;
        xAxis: string[];
        series: Array<{ name: string; data: number[] }>;
    };
    chartType?: string;
}

export default function ChartViewer({
    data,
    chartType = "bar"
}: Props) {
    const chartRef = useRef<ReactECharts | null>(null);
    const [selectedChartType, setSelectedChartType] = useState<string>(data.chart_type || chartType || "bar");
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const normalizedChartType = selectedChartType === "area" ? "line" : selectedChartType;
    const chartTypeToUse = selectedChartType || data.chart_type || chartType;

    const option = useMemo(() => {
        if (chartTypeToUse === "pie") {
            return {
                title: { text: data.title },
                tooltip: { trigger: "item" },
                series: [
                    {
                        name: "Values",
                        type: "pie",
                        radius: "55%",
                        data: data.xAxis.map((label, index) => ({
                            value: data.series[0]?.data[index] ?? 0,
                            name: label
                        })),
                        label: { formatter: "{b}: {c}" }
                    }
                ]
            };
        }

        return {
            title: { text: data.title },
            tooltip: { trigger: "axis" },
            xAxis: {
                type: "category",
                data: data.xAxis
            },
            yAxis: {
                type: "value"
            },
            series: data.series.map((item) => ({
                name: item.name,
                data: item.data,
                type: normalizedChartType,
                smooth: chartTypeToUse === "line",
                areaStyle: chartTypeToUse === "area" ? {} : undefined
            }))
        };
    }, [chartTypeToUse, data.series, data.title, data.xAxis, normalizedChartType]);

    async function exportChart(format: "png" | "jpeg" | "pdf") {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) {
            return;
        }

        const fileName = (data.title || "chart")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        const dataUrl = instance.getDataURL({
            type: format === "pdf" ? "png" : format === "jpeg" ? "jpeg" : "png",
            pixelRatio: 2,
            backgroundColor: "#ffffff"
        });

        if (format === "pdf") {
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "pt",
                format: "a4"
            });
            pdf.addImage(dataUrl, "PNG", 20, 20, 550, 300);
            pdf.save(`${fileName}.pdf`);
            setAnchorEl(null);
            return;
        }

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${fileName}.${format}`;
        link.click();
        setAnchorEl(null);
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: 1.5
                }}
            >
                <Typography variant="h6">Generated chart</Typography>
                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5 }}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Chart type</InputLabel>
                        <Select
                            value={selectedChartType}
                            label="Chart type"
                            onChange={(event) => setSelectedChartType(event.target.value)}
                        >
                            <MenuItem value="bar">Bar chart</MenuItem>
                            <MenuItem value="line">Line chart</MenuItem>
                            <MenuItem value="area">Area chart</MenuItem>
                            <MenuItem value="pie">Pie chart</MenuItem>
                            <MenuItem value="scatter">Scatter chart</MenuItem>
                        </Select>
                    </FormControl>

                    <Button
                        variant="outlined"
                        onClick={(event) => setAnchorEl(event.currentTarget)}
                    >
                        Export
                    </Button>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                    >
                        <MenuItem onClick={() => exportChart("png")}>Export as PNG</MenuItem>
                        <MenuItem onClick={() => exportChart("jpeg")}>Export as JPEG</MenuItem>
                        <MenuItem onClick={() => exportChart("pdf")}>Export as PDF</MenuItem>
                    </Menu>
                </Box>
            </Box>

            <div>
                <ReactECharts
                    ref={chartRef}
                    option={option}
                    style={{ height: "420px", width: "100%" }}
                />
            </div>
        </Box>
    );
}
