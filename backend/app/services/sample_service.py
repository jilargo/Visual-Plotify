"""Bundled example datasets so the app is useful before a file is uploaded.

The samples are generated in code (no binary assets in the repository) and written
into the uploads directory so that they flow through exactly the same code path as
a real upload.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

SAMPLE_QUARTERLY_SALES = "quarterly-sales"
SAMPLE_EMPLOYEE_ROSTER = "employee-roster"
SAMPLE_WEB_TRAFFIC = "web-traffic"

_CATALOG = {
    SAMPLE_QUARTERLY_SALES: {
        "label": "Quarterly sales",
        "description": "Revenue, units and returns per region, product and quarter.",
    },
    SAMPLE_EMPLOYEE_ROSTER: {
        "label": "Employee roster",
        "description": "Department, salary, tenure and performance scores for 40 people.",
    },
    SAMPLE_WEB_TRAFFIC: {
        "label": "Website traffic",
        "description": "Daily sessions, conversions and bounce rate for one quarter.",
    },
}


def catalog() -> list[dict[str, str]]:
    return [
        {"id": key, "label": value["label"], "description": value["description"]}
        for key, value in _CATALOG.items()
    ]


def _quarterly_sales() -> pd.DataFrame:
    regions = ["North", "South", "East", "West"]
    products = ["Analytics", "Automation", "Reporting", "Storage"]
    quarters = ["2024 Q1", "2024 Q2", "2024 Q3", "2024 Q4", "2025 Q1", "2025 Q2"]
    growth = {
        "Analytics": 1.35,
        "Automation": 1.12,
        "Reporting": 0.92,
        "Storage": 1.05,
    }
    region_weight = {"North": 1.25, "South": 0.95, "East": 1.1, "West": 0.8}

    rows = []
    for quarter_index, quarter in enumerate(quarters):
        for region in regions:
            for product in products:
                base = 18_000 * region_weight[region] * (growth[product] ** quarter_index)
                # Deterministic wobble keeps the sample stable across runs.
                wobble = ((quarter_index * 7 + len(region) * 3 + len(product)) % 11) * 260
                units = int(base / 190) + 40
                revenue = round(base + wobble, 2)
                rows.append({
                    "Region": region,
                    "Product": product,
                    "Quarter": quarter,
                    "Units": units,
                    "Revenue": revenue,
                    "Cost": round(revenue * 0.61, 2),
                    "Returned": (quarter_index + len(product)) % 5 == 0,
                })
    return pd.DataFrame(rows)


def _employee_roster() -> pd.DataFrame:
    departments = ["Engineering", "Sales", "Support", "Finance", "People"]
    roles = {
        "Engineering": ["Backend", "Frontend", "Platform"],
        "Sales": ["Account Executive", "Solutions Consultant"],
        "Support": ["Tier 1", "Tier 2"],
        "Finance": ["Analyst", "Controller"],
        "People": ["Recruiter", "People Partner"],
    }
    base_salary = {
        "Engineering": 96_000,
        "Sales": 78_000,
        "Support": 58_000,
        "Finance": 84_000,
        "People": 68_000,
    }

    rows = []
    for index in range(40):
        department = departments[index % len(departments)]
        role = roles[department][index % len(roles[department])]
        salary = base_salary[department] + (index % 9) * 2_750
        rows.append({
            "Employee ID": f"EMP-{1000 + index}",
            "Full Name": f"Employee {index + 1}",
            "Department": department,
            "Role": role,
            "Salary": salary,
            "Years Experience": 1 + (index * 3) % 15,
            "Performance Score": round(2.4 + ((index * 7) % 26) / 10, 1),
            "Hire Date": pd.to_datetime("2019-01-01") + pd.Timedelta(days=index * 23),
            "Remote": index % 3 == 0,
        })
    return pd.DataFrame(rows)


def _web_traffic() -> pd.DataFrame:
    dates = pd.date_range("2025-01-01", periods=120, freq="D")
    rows = []
    for index, day in enumerate(dates):
        weekly = 1 + 0.18 * ((index % 7) - 3) / 3
        trend = 1 + index / 260
        sessions = int(4_200 * weekly * trend)
        conversions = int(sessions * (0.031 + (index % 5) * 0.0016))
        rows.append({
            "Date": day,
            "Channel": ["Organic", "Paid", "Referral", "Social"][index % 4],
            "Sessions": sessions,
            "Conversions": conversions,
            "Bounce Rate": round(0.42 + ((index % 9) - 4) * 0.011, 3),
            "Revenue": round(conversions * (58 + (index % 7) * 4), 2),
        })
    return pd.DataFrame(rows)


_BUILDERS = {
    SAMPLE_QUARTERLY_SALES: _quarterly_sales,
    SAMPLE_EMPLOYEE_ROSTER: _employee_roster,
    SAMPLE_WEB_TRAFFIC: _web_traffic,
}


def build(sample_id: str, upload_dir: Path) -> Path:
    """Materialise a sample dataset inside ``upload_dir`` and return its path."""
    builder = _BUILDERS.get(sample_id)
    if builder is None:
        available = ", ".join(_CATALOG)
        raise KeyError(f"Unknown sample '{sample_id}'. Available samples: {available}.")

    upload_dir.mkdir(parents=True, exist_ok=True)
    target = upload_dir / f"sample-{sample_id}.csv"
    builder().to_csv(target, index=False)
    return target
