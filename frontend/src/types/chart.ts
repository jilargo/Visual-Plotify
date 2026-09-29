export type ChartType = "auto" | "bar" | "hbar" | "line" | "area" | "scatter" | "pie" | "donut";
export type Aggregation = "auto" | "sum" | "mean" | "median" | "min" | "max" | "count";
export type SortOrder = "none" | "asc" | "desc" | "label";
export type Granularity = "auto" | "year" | "quarter" | "month" | "week" | "day";
export type FilterOperator =
    | "eq"
    | "neq"
    | "contains"
    | "not_contains"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "between"
    | "in"
    | "is_null"
    | "not_null";

export interface FilterRule {
    column: string;
    operator: FilterOperator;
    value?: string | number | boolean | string[] | null;
    value_to?: string | number | boolean | null;
}

export interface ChartRequest {
    file_path: string;
    sheet_name?: string | null;
    selected_columns: string[];
    chart_type: ChartType;
    aggregation: Aggregation;
    sort: SortOrder;
    top_n?: number | null;
    time_granularity: Granularity;
    filters: FilterRule[];
}

export interface ChartSeries {
    name: string;
    data: Array<number | string | null>;
}

export interface ChartMeta {
    strategy: string;
    source_rows: number;
    plotted_rows: number;
    filtered_out_rows: number;
    categories: number;
    aggregation: string;
    columns: string[];
    time_granularity: string;
    top_n: number | null;
    truncated: boolean;
    notes: string[];
}

export interface ChartData {
    chart_type: ChartType;
    title: string;
    xAxis: string[];
    series: ChartSeries[];
    xAxisLabel: string;
    yAxisLabel: string;
    meta: ChartMeta;
}
