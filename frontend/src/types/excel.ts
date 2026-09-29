export type ColumnKind = "numeric" | "text" | "date" | "boolean";

export interface ColumnStat {
    column: string;
    type: ColumnKind;
    unique: number;
    missing: number;
    missing_pct: number;
    min?: number | string | null;
    max?: number | string | null;
    mean?: number | null;
    median?: number | null;
    std?: number | null;
    q1?: number | null;
    q3?: number | null;
    sum?: number | null;
    top_values?: Record<string, number> | null;
    sample_values?: string[] | null;
    counts?: Record<string, number> | null;
}

export interface DataQuality {
    total_cells: number;
    missing_cells: number;
    missing_pct: number;
    duplicate_rows: number;
    empty_columns: string[];
}

export interface ExcelPreview {
    filename: string;
    file_path?: string;
    sheet_names: string[];
    active_sheet: string | null;
    columns: string[];
    dtypes: Record<string, string>;
    rows: number;
    column_stats: ColumnStat[];
    quality: DataQuality;
    preview: Record<string, unknown>[];
    preview_offset: number;
    preview_limit: number;
    preview_total: number;
    has_more_rows: boolean;
}

export interface SampleInfo {
    id: string;
    label: string;
    description: string;
}
