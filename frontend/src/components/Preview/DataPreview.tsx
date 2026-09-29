import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import StatTile, { EmptyState, StatTileRow } from "../common/StatTile";
import TableRowsOutlinedIcon from "@mui/icons-material/TableRowsOutlined";
import type { ExcelPreview } from "../../types/excel";

interface Props {
    data: ExcelPreview;
    selectedSheet?: string | null;
}

function formatCell(value: unknown): string {
    if (value === null || value === undefined || value === "") {
        return "—";
    }
    if (typeof value === "number") {
        return value.toLocaleString();
    }
    return String(value);
}

export default function DataPreview({ data, selectedSheet }: Props) {
    const [columnQuery, setColumnQuery] = useState("");

    const visibleColumns = useMemo(() => {
        const query = columnQuery.trim().toLowerCase();
        return query ? data.columns.filter((column) => column.toLowerCase().includes(query)) : data.columns;
    }, [columnQuery, data.columns]);

    const columns = useMemo<GridColDef<Record<string, unknown>>[]>(
        () =>
            visibleColumns.map((column) => ({
                field: column,
                headerName: column,
                minWidth: 130,
                flex: 1,
                valueFormatter: (value: unknown) => formatCell(value),
            })),
        [visibleColumns],
    );

    const rows = useMemo(
        () => data.preview.map((row, index) => ({ id: index, ...row })),
        [data.preview],
    );

    const sheetLabel = selectedSheet ?? data.active_sheet ?? data.sheet_names[0] ?? "Single table";

    return (
        <Stack spacing={2}>
            <StatTileRow>
                <StatTile label="Rows" value={data.rows.toLocaleString()} hint="in this worksheet" />
                <StatTile label="Columns" value={data.columns.length} hint={`${visibleColumns.length} shown`} />
                <StatTile
                    label="Missing"
                    value={`${data.quality?.missing_pct ?? 0}%`}
                    hint={`${(data.quality?.missing_cells ?? 0).toLocaleString()} cells`}
                    tone={(data.quality?.missing_pct ?? 0) > 20 ? "warning" : "default"}
                />
                <StatTile
                    label="Duplicates"
                    value={(data.quality?.duplicate_rows ?? 0).toLocaleString()}
                    hint="identical rows"
                />
            </StatTileRow>

            <Box>
                <Typography variant="h4" component="h2" sx={{ mb: 0.25 }}>
                    Dataset Preview
                </Typography>
                <Typography component="p" variant="body2" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                        File:
                    </Box>{" "}
                    {data.filename}
                </Typography>
                <Typography component="p" variant="body2" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                        Total Rows:
                    </Box>{" "}
                    {data.rows}
                </Typography>
                <Typography component="p" variant="body2" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                        Selected sheet:
                    </Box>{" "}
                    {sheetLabel}
                </Typography>
                <Typography component="p" variant="body2" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                        Sheets:
                    </Box>{" "}
                    {data.sheet_names.length > 0 ? data.sheet_names.join(", ") : "none (CSV file)"}
                </Typography>
            </Box>

            {rows.length === 0 ? (
                <EmptyState
                    compact
                    icon={<TableRowsOutlinedIcon />}
                    title="No rows to preview"
                    description="The selected worksheet has headers but no data rows."
                />
            ) : (
                <Stack spacing={1.25}>
                    <TextField
                        size="small"
                        value={columnQuery}
                        onChange={(event) => setColumnQuery(event.target.value)}
                        placeholder="Find a column…"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchRoundedIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{ maxWidth: 280 }}
                    />

                    <Box
                        sx={{
                            height: 420,
                            width: "100%",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                            overflow: "hidden",
                        }}
                    >
                        <DataGrid
                            rows={rows}
                            columns={columns}
                            columnHeaderHeight={44}
                            rowHeight={40}
                            disableRowSelectionOnClick
                            disableColumnMenu
                            disableColumnResize={false}
                            pageSizeOptions={[10, 25, 50, 100]}
                            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                        />
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                        Showing {data.preview.length} of {data.rows.toLocaleString()} rows
                        {data.has_more_rows ? " — scroll further in the table for more" : ""}
                    </Typography>
                </Stack>
            )}
        </Stack>
    );
}
