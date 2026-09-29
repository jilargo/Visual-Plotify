import { useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReactECharts from "echarts-for-react";
import { jsPDF } from "jspdf";
import type { EChartsOption } from "echarts";
import { chartPalette } from "../../theme";
import type { ChartData, ChartType } from "../../types/chart";

interface Props {
    data: ChartData;
}

const CHART_TYPES: Array<{ value: Exclude<ChartType, "auto">; label: string }> = [
    { value: "bar", label: "Bar chart" },
    { value: "hbar", label: "Horizontal bar" },
    { value: "line", label: "Line chart" },
    { value: "area", label: "Area chart" },
    { value: "scatter", label: "Scatter chart" },
    { value: "pie", label: "Pie chart" },
    { value: "donut", label: "Donut chart" },
];

function slugify(value: string): string {
    return (
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "chart"
    );
}

function toCsv(data: ChartData): string {
    const header = [data.xAxisLabel || "category", ...data.series.map((series) => series.name)];
    const rows = data.xAxis.map((label, index) => [label, ...data.series.map((series) => series.data[index] ?? "")]);
    return [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
}

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default function ChartViewer({ data }: Props) {
    const theme = useTheme();
    const chartRef = useRef<ReactECharts | null>(null);
    const [chartType, setChartType] = useState<Exclude<ChartType, "auto">>(
        data.chart_type === "auto" ? "bar" : data.chart_type,
    );
    const [title, setTitle] = useState(data.title);
    const [xAxisLabel, setXAxisLabel] = useState(data.xAxisLabel);
    const [yAxisLabel, setYAxisLabel] = useState(data.yAxisLabel);
    const [showTable, setShowTable] = useState(false);
    const [showMeta, setShowMeta] = useState(false);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    const isDark = theme.palette.mode === "dark";
    const textColor = theme.palette.text.secondary;
    const gridColor = isDark ? "rgba(154,167,189,0.18)" : "rgba(28,36,52,0.10)";
    const tooltipBg = isDark ? "#0f1520" : "#1c2434";

    const option = useMemo<EChartsOption>(() => {
        const isPie = chartType === "pie" || chartType === "donut";
        const isHorizontal = chartType === "hbar";
        const categoryAxis = {
            type: "category" as const,
            data: data.xAxis,
            axisLabel: {
                color: textColor,
                hideOverlap: true,
                rotate: data.xAxis.some((label) => String(label).length > 8) ? 30 : 0,
                formatter: (value: string) => (String(value).length > 18 ? `${String(value).slice(0, 17)}…` : value),
            },
            axisLine: { lineStyle: { color: gridColor } },
            axisTick: { show: false },
            nameLocation: "middle" as const,
            nameGap: isHorizontal ? 40 : 34,
        };
        const valueAxis = {
            type: "value" as const,
            axisLabel: { color: textColor },
            splitLine: { lineStyle: { color: gridColor, type: "dashed" as const } },
            nameLocation: isHorizontal ? "middle" as const : ("end" as const),
            nameGap: isHorizontal ? 34 : 12,
            nameRotate: isHorizontal ? 0 : (90 as const),
        };

        const series = data.series.map((item, index) => {
            const color = chartPalette[index % chartPalette.length];
            const common = {
                name: item.name,
                color,
                emphasis: { focus: "series" as const },
                smooth: chartType === "line" || chartType === "area" ? 0.25 : undefined,
            };

            if (chartType === "scatter") {
                return { ...common, type: "scatter" as const, symbolSize: 9, data: item.data };
            }
            if (chartType === "line" || chartType === "area") {
                return {
                    ...common,
                    type: "line" as const,
                    areaStyle: chartType === "area" ? { opacity: 0.18 } : undefined,
                    data: item.data,
                };
            }
            return {
                ...common,
                type: "bar" as const,
                barMaxWidth: 44,
                itemStyle: { borderRadius: isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
                data: item.data,
            };
        });

        return {
            backgroundColor: "transparent",
            color: chartPalette,
            grid: { top: 28, right: 24, bottom: isHorizontal ? 28 : 56, left: isHorizontal ? 24 : 8, containLabel: true },
            tooltip: {
                trigger: "axis" as const,
                axisPointer: { type: isPie ? ("shadow" as const) : ("line" as const) },
                backgroundColor: tooltipBg,
                borderWidth: 0,
                textStyle: { color: "#f8fafc", fontSize: 12 },
                valueFormatter: (value: unknown) =>
                    typeof value === "number" ? value.toLocaleString() : String(value ?? ""),
            },
            legend: {
                show: data.series.length > 1,
                top: 0,
                textStyle: { color: textColor, fontSize: 12 },
                icon: "roundRect",
            },
            xAxis: isPie ? undefined : isHorizontal ? valueAxis : categoryAxis,
            yAxis: isPie ? undefined : isHorizontal ? { ...categoryAxis, name: xAxisLabel } : { ...valueAxis, name: yAxisLabel },
            series: isPie
                ? [
                      {
                          type: "pie" as const,
                          name: data.series[0]?.name ?? "Value",
                          radius: chartType === "donut" ? ["48%", "72%"] : "62%",
                          center: ["50%", "56%"] as [string, string],
                          avoidLabelOverlap: true,
                          itemStyle: { borderColor: theme.palette.background.paper, borderWidth: 2, borderRadius: 4 },
                          label: { color: textColor, formatter: "{b}\n{d}%" },
                          data: data.xAxis.map((label, index) => ({
                              name: String(label),
                              value: Number(data.series[0]?.data[index] ?? 0),
                          })),
                      },
                  ]
                : series,
        };
    }, [chartType, data, gridColor, textColor, theme.palette.background.paper, tooltipBg, xAxisLabel, yAxisLabel]);

    const filenameBase = slugify(title);

    function exportRaster(format: "png" | "jpeg") {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return;
        const dataUrl = instance.getDataURL({ type: format, pixelRatio: 2, backgroundColor: theme.palette.background.paper });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${filenameBase}.${format}`;
        link.click();
    }

    function exportSvg() {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return;
        triggerDownload(new Blob([instance.renderToSVGString()], { type: "image/svg+xml" }), `${filenameBase}.svg`);
    }

    function exportPdf() {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return;
        const landscape = instance.getWidth() >= instance.getHeight();
        const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
        const margin = 32;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const titleHeight = 26;
        const available = pageHeight - margin * 2 - titleHeight;
        const ratio = instance.getHeight() / instance.getWidth();
        const width = pageWidth - margin * 2;
        const height = Math.min(available, width * ratio);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(28, 36, 52);
        pdf.text(title, margin, margin + 12);
        pdf.addImage(
            instance.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: theme.palette.background.paper }),
            "PNG",
            margin + (width - height / ratio) / 2,
            margin + titleHeight,
            height / ratio,
            height,
        );
        pdf.save(`${filenameBase}.pdf`);
    }

    function exportCsv() {
        triggerDownload(new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" }), `${filenameBase}.csv`);
    }

    function copyJson() {
        void navigator.clipboard?.writeText(JSON.stringify({ ...data, chart_type: chartType }, null, 2));
        setAnchor(null);
    }

    return (
        <Stack spacing={2}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
            >
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="chart-type-label">Chart type</InputLabel>
                    <Select
                        labelId="chart-type-label"
                        label="Chart type"
                        value={chartType}
                        onChange={(event) => setChartType(event.target.value as Exclude<ChartType, "auto">)}
                    >
                        {CHART_TYPES.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        color="inherit"
                        onClick={() => setShowTable((open) => !open)}
                        aria-expanded={showTable}
                        startIcon={<ExpandMoreRoundedIcon sx={{ transform: showTable ? "rotate(180deg)" : "none" }} />}
                    >
                        Data table
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadRoundedIcon />}
                        onClick={(event) => setAnchor(event.currentTarget)}
                        aria-haspopup="menu"
                        aria-expanded={anchor ? "true" : undefined}
                    >
                        Export
                    </Button>
                    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                        <MenuItem
                            onClick={() => {
                                exportRaster("png");
                                setAnchor(null);
                            }}
                        >
                            Export as PNG
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                exportRaster("jpeg");
                                setAnchor(null);
                            }}
                        >
                            Export as JPEG
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                exportSvg();
                                setAnchor(null);
                            }}
                        >
                            Export as SVG
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                exportPdf();
                                setAnchor(null);
                            }}
                        >
                            Export as PDF
                        </MenuItem>
                        <Divider />
                        <MenuItem
                            onClick={() => {
                                exportCsv();
                                setAnchor(null);
                            }}
                        >
                            Download data (CSV)
                        </MenuItem>
                        <MenuItem onClick={copyJson}>Copy chart config (JSON)</MenuItem>
                    </Menu>
                </Stack>
            </Stack>

            <Box
                sx={{
                    height: 460,
                    width: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 1.5,
                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                }}
            >
                <ReactECharts
                    ref={chartRef}
                    option={option}
                    notMerge
                    style={{ height: "100%", width: "100%" }}
                    opts={{ renderer: "canvas" }}
                />
            </Box>

            <TextField
                fullWidth
                size="small"
                label="Chart title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 120 } }}
            />

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                <Chip
                    size="small"
                    variant="outlined"
                    color="primary"
                    label={`${data.meta.plotted_rows.toLocaleString()} rows plotted`}
                />
                <Chip size="small" variant="outlined" label={`${data.meta.categories} categories`} />
                <Chip size="small" variant="outlined" label={`${data.meta.aggregation}`} />
                {data.meta.truncated ? <Chip size="small" variant="outlined" color="warning" label="Long tail folded" /> : null}
                {data.meta.filtered_out_rows > 0 ? (
                    <Chip
                        size="small"
                        variant="outlined"
                        color="warning"
                        label={`${data.meta.filtered_out_rows.toLocaleString()} rows filtered out`}
                    />
                ) : null}
                <Tooltip title={data.meta.strategy.replace(/-/g, " ")}>
                    <Chip size="small" variant="outlined" label={data.meta.strategy} sx={{ textTransform: "capitalize" }} />
                </Tooltip>
                <Button size="small" color="inherit" onClick={() => setShowMeta((open) => !open)} startIcon={<InfoOutlinedIcon />}>
                    Details
                </Button>
            </Stack>

            <Collapse in={showMeta} unmountOnExit>
                <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <TextField
                            size="small"
                            label={chartType === "hbar" ? "Category axis" : "X axis label"}
                            value={xAxisLabel}
                            onChange={(event) => setXAxisLabel(event.target.value)}
                            fullWidth
                        />
                        <TextField
                            size="small"
                            label={chartType === "hbar" ? "Value axis label" : "Y axis label"}
                            value={yAxisLabel}
                            onChange={(event) => setYAxisLabel(event.target.value)}
                            fullWidth
                        />
                    </Stack>
                    {data.meta.notes.length > 0 ? (
                        <Stack spacing={0.5}>
                            {data.meta.notes.map((note) => (
                                <Typography key={note} variant="caption" color="text.secondary">
                                    • {note}
                                </Typography>
                            ))}
                        </Stack>
                    ) : null}
                    <Typography variant="caption" color="text.secondary">
                        Source: {data.meta.source_rows.toLocaleString()} rows read · {data.meta.columns.join(", ")} ·{" "}
                        {data.meta.time_granularity === "auto" ? "automatic time bucket" : `${data.meta.time_granularity} buckets`}
                        {data.meta.top_n ? ` · top ${data.meta.top_n}` : ""}
                    </Typography>
                </Stack>
            </Collapse>

            <Collapse in={showTable} unmountOnExit>
                <TableContainer sx={{ maxHeight: 340, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>{data.xAxisLabel || "Category"}</TableCell>
                                {data.series.map((series) => (
                                    <TableCell key={series.name} align="right" sx={{ fontWeight: 600 }}>
                                        {series.name}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.xAxis.map((label, index) => (
                                <TableRow key={`${label}-${index}`} hover>
                                    <TableCell>{String(label)}</TableCell>
                                    {data.series.map((series) => {
                                        const value = series.data[index];
                                        return (
                                            <TableCell key={series.name} align="right">
                                                {typeof value === "number" ? value.toLocaleString() : value ?? "—"}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Collapse>
        </Stack>
    );
}
