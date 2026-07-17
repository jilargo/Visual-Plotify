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

    const colorPalette = ["#2563eb", "#0ea5e9", "#14b8a6", "#f97316", "#e11d48", "#8b5cf6"];

    const option = useMemo(() => {
        if (chartTypeToUse === "pie") {
            return {
                color: colorPalette,
                title: {
                    text: data.title,
                    left: "center",
                    textStyle: {
                        fontWeight: 700,
                        fontSize: 18,
                        color: "#0f172a"
                    }
                },
                tooltip: {
                    trigger: "item",
                    formatter: "{b}: {c} ({d}%)"
                },
                legend: {
                    top: "80%",
                    left: "center",
                    textStyle: { color: "#475569" },
                    itemGap: 16
                },
                series: [
                    {
                        name: "Values",
                        type: "pie",
                        radius: ["40%", "65%"],
                        center: ["50%", "45%"],
                        data: data.xAxis.map((label, index) => ({
                            value: data.series[0]?.data[index] ?? 0,
                            name: label
                        })),
                        label: {
                            formatter: "{b}: {d}%",
                            color: "#0f172a"
                        },
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 15,
                                shadowOffsetX: 0,
                                shadowColor: "rgba(0, 0, 0, 0.25)"
                            }
                        }
                    }
                ]
            };
        }

        const isLineLike = chartTypeToUse === "line" || chartTypeToUse === "area" || chartTypeToUse === "scatter";

        return {
            color: colorPalette,
            backgroundColor: "#ffffff",
            textStyle: {
                fontFamily: "Inter, sans-serif",
                color: "#0f172a"
            },
            animationDuration: 900,
            animationEasing: "cubicOut",
            title: {
                text: data.title,
                left: "center",
                textStyle: {
                    fontWeight: 700,
                    fontSize: 18,
                    color: "#0f172a"
                }
            },
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                textStyle: { color: "#f8fafc" },
                axisPointer: {
                    type: isLineLike ? "cross" : "shadow",
                    label: { backgroundColor: "#0f172a" }
                }
            },
            grid: {
                left: "6%",
                right: "6%",
                bottom: "10%",
                containLabel: true
            },
            xAxis: {
                type: "category",
                data: data.xAxis,
                axisTick: { alignWithLabel: true },
                axisLine: { lineStyle: { color: "#cbd5e1" } },
                axisLabel: { color: "#475569", rotate: 0 }
            },
            yAxis: {
                type: "value",
                splitLine: {
                    lineStyle: { color: "rgba(148, 163, 184, 0.2)", type: "dashed" }
                },
                axisLine: { lineStyle: { color: "#cbd5e1" } },
                axisLabel: { color: "#475569" }
            },
            legend: data.series.length > 1 ? {
                top: "8%",
                left: "center",
                textStyle: { color: "#475569" },
                itemGap: 16
            } : undefined,
            series: data.series.map((item) => ({
                name: item.name,
                data: item.data,
                type: normalizedChartType,
                smooth: chartTypeToUse === "line" || chartTypeToUse === "area",
                showSymbol: chartTypeToUse !== "scatter" ? false : true,
                symbolSize: chartTypeToUse === "scatter" ? 12 : undefined,
                areaStyle: chartTypeToUse === "area" ? {
                    opacity: 0.22,
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(59, 130, 246, 0.35)" },
                            { offset: 1, color: "rgba(59, 130, 246, 0.05)" }
                        ]
                    }
                } : undefined,
                itemStyle: chartTypeToUse === "bar" ? {
                    borderRadius: [8, 8, 0, 0],
                    shadowColor: "rgba(15, 23, 42, 0.12)",
                    shadowBlur: 8
                } : undefined,
                emphasis: {
                    focus: "series",
                    itemStyle: {
                        shadowBlur: 18,
                        shadowColor: "rgba(15, 23, 42, 0.22)"
                    }
                },
                lineStyle: {
                    width: 3
                }
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, backgroundColor: "#ffffff", borderRadius: 3, p: 3, boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)" }}>
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

            {data.xAxis.length === 0 || data.series.every((item) => item.data.length === 0) ? (
                <Typography color="text.secondary">
                    No chart data is available for the selected columns. Try selecting a different combination of columns.
                </Typography>
            ) : (
                <div>
                    <ReactECharts
                        ref={chartRef}
                        option={option}
                        style={{ height: "460px", width: "100%" }}
                    />
                </div>
            )}
        </Box>
    );
}
