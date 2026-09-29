import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { FilterOperator, FilterRule } from "../../types/chart";
import type { ColumnKind, ColumnStat } from "../../types/excel";

interface Props {
    columns: string[];
    stats: ColumnStat[];
    rules: FilterRule[];
    onChange: (rules: FilterRule[]) => void;
}

const TEXT_OPERATORS: FilterOperator[] = ["contains", "not_contains", "eq", "neq", "in", "is_null", "not_null"];
const NUMERIC_OPERATORS: FilterOperator[] = ["eq", "neq", "gt", "gte", "lt", "lte", "between", "is_null", "not_null"];
const DATE_OPERATORS: FilterOperator[] = ["eq", "neq", "gt", "lt", "between", "is_null", "not_null"];

const OPERATOR_LABELS: Record<FilterOperator, string> = {
    eq: "equals",
    neq: "does not equal",
    contains: "contains",
    not_contains: "does not contain",
    gt: "greater than",
    gte: "at least",
    lt: "less than",
    lte: "at most",
    between: "between",
    in: "is one of",
    is_null: "is empty",
    not_null: "is not empty",
};

const KIND_BY_COLUMN = (stats: ColumnStat[]): Record<string, ColumnKind> =>
    stats.reduce<Record<string, ColumnKind>>((accumulator, stat) => {
        accumulator[stat.column] = stat.type;
        return accumulator;
    }, {});

function operatorsFor(kind: ColumnKind | undefined): FilterOperator[] {
    if (kind === "numeric") return NUMERIC_OPERATORS;
    if (kind === "date") return DATE_OPERATORS;
    return TEXT_OPERATORS;
}

function needsValue(operator: FilterOperator): boolean {
    return operator !== "is_null" && operator !== "not_null";
}

export default function FilterBuilder({ columns, stats, rules, onChange }: Props) {
    const kinds = KIND_BY_COLUMN(stats);

    function updateRule(index: number, patch: Partial<FilterRule>) {
        onChange(rules.map((rule, position) => (position === index ? { ...rule, ...patch } : rule)));
    }

    function addRule() {
        const column = columns[0] ?? "";
        onChange([...rules, { column, operator: operatorsFor(kinds[column])[0], value: "" }]);
    }

    if (columns.length === 0) {
        return null;
    }

    return (
        <Stack spacing={1.25}>
            {rules.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No filters. Every row in the worksheet is included in the chart.
                </Typography>
            ) : (
                rules.map((rule, index) => {
                    const kind = kinds[rule.column];
                    const operators = operatorsFor(kind);
                    const showValue = needsValue(rule.operator);
                    return (
                        <Stack key={index} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <TextField
                                select
                                size="small"
                                label="Column"
                                value={rule.column}
                                onChange={(event) => {
                                    const column = event.target.value;
                                    updateRule(index, {
                                        column,
                                        operator: operatorsFor(kinds[column])[0],
                                        value: "",
                                        value_to: null,
                                    });
                                }}
                                sx={{ flex: "1 1 34%" }}
                            >
                                {columns.map((column) => (
                                    <MenuItem key={column} value={column}>
                                        {column}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                size="small"
                                label="Rule"
                                value={rule.operator}
                                onChange={(event) => updateRule(index, { operator: event.target.value as FilterOperator })}
                                sx={{ flex: "1 1 34%" }}
                            >
                                {operators.map((operator) => (
                                    <MenuItem key={operator} value={operator}>
                                        {OPERATOR_LABELS[operator]}
                                    </MenuItem>
                                ))}
                            </TextField>

                            {showValue ? (
                                <TextField
                                    size="small"
                                    label={rule.operator === "between" ? "From" : "Value"}
                                    type={rule.operator === "between" ? "date" : kind === "date" ? "date" : "text"}
                                    value={rule.value ?? ""}
                                    onChange={(event) => updateRule(index, { value: event.target.value })}
                                    sx={{ flex: "1 1 32%" }}
                                />
                            ) : null}

                            {rule.operator === "between" ? (
                                <TextField
                                    size="small"
                                    label="To"
                                    type={kind === "date" ? "date" : "text"}
                                    value={rule.value_to ?? ""}
                                    onChange={(event) => updateRule(index, { value_to: event.target.value })}
                                    sx={{ flex: "1 1 24%" }}
                                />
                            ) : null}

                            <Button
                                size="small"
                                color="inherit"
                                aria-label={`Remove filter ${index + 1}`}
                                onClick={() => onChange(rules.filter((_, position) => position !== index))}
                                sx={{ minWidth: 36, px: 1 }}
                            >
                                <CloseRoundedIcon fontSize="small" />
                            </Button>
                        </Stack>
                    );
                })
            )}

            <Box>
                <Button size="small" startIcon={<AddRoundedIcon />} onClick={addRule} disabled={rules.length >= 8}>
                    Add filter
                </Button>
            </Box>
        </Stack>
    );
}
