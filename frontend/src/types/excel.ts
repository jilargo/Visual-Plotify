export interface ExcelPreview {
    filename: string;
    file_path?: string;
    sheet_names: string[];
    columns: string[];
    rows: number;
    preview: Record<string, unknown>[];
    dtypes?: Record<string, string>;
    column_stats?: Array<Record<string, unknown>>;
}
