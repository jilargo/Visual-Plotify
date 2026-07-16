from pathlib import Path
import pandas as pd
import numpy as np
from pandas.api.types import is_numeric_dtype, is_datetime64_any_dtype, is_bool_dtype


class ExcelService:

    @staticmethod
    def _detect_column_type(series: pd.Series) -> str:
        if is_bool_dtype(series):
            return "boolean"
        if is_numeric_dtype(series):
            return "numeric"
        if is_datetime64_any_dtype(series):
            return "date"
        return "text"

    @staticmethod
    def _column_stats(series: pd.Series, detected_type: str) -> dict:
        stats = {
            "unique": int(series.nunique(dropna=True)),
            "missing": int(series.isna().sum())
        }

        if detected_type == "numeric":
            vals = pd.to_numeric(series, errors="coerce")
            stats.update({
                "min": None if vals.dropna().empty else float(vals.min()),
                "max": None if vals.dropna().empty else float(vals.max()),
                "mean": None if vals.dropna().empty else float(vals.mean()),
                "median": None if vals.dropna().empty else float(vals.median()),
                "std": None if vals.dropna().empty else float(vals.std())
            })
        elif detected_type == "date":
            dates = pd.to_datetime(series, errors="coerce")
            stats.update({
                "min": None if dates.dropna().empty else str(dates.min()),
                "max": None if dates.dropna().empty else str(dates.max())
            })
        elif detected_type == "text":
            top = series.fillna("").astype(str).value_counts().head(5).to_dict()
            stats.update({
                "top_values": top
            })
        elif detected_type == "boolean":
            counts = series.value_counts(dropna=False).to_dict()
            stats.update({"counts": {str(k): int(v) for k, v in counts.items()}})

        return stats

    @staticmethod
    def read_excel(file_path: Path):

        excel = pd.ExcelFile(file_path)

        first_sheet = excel.sheet_names[0]

        df = pd.read_excel(file_path, sheet_name=first_sheet)

        # Build per-column metadata
        column_stats = []
        for col in df.columns:
            series = df[col]
            detected = ExcelService._detect_column_type(series)
            stats = ExcelService._column_stats(series, detected)
            column_stats.append({
                "column": col,
                "type": detected,
                **stats
            })

        return {
            "sheet_names": excel.sheet_names,
            "columns": list(df.columns),
            "dtypes": {col: str(df[col].dtype) for col in df.columns},
            "rows": int(len(df)),
            "column_stats": column_stats,
            "preview": df.head(100).fillna("").to_dict(orient="records")
        }