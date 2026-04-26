"""
data_normalizer.py — Normalizes raw DataFrames from job tracking files.

Responsibilities:
  - Map arbitrary column names → canonical schema
  - Normalize status strings (Hebrew synonyms → canonical keys)
  - Parse and clean date columns
  - Fill in missing required columns with sensible defaults
  - Validate and flag data quality issues
"""

import re
import logging
from datetime import datetime, date
from typing import Optional

import pandas as pd
import numpy as np

from config import COLUMN_MAPPINGS, STATUSES, STATUS_LABEL_TO_KEY, STATUS_SYNONYMS

logger = logging.getLogger(__name__)

# ─── Column Mapping ───────────────────────────────────────────────────────────

def map_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Rename df columns from whatever they are to canonical names.
    Unrecognised columns are kept as-is (prefixed with 'extra_').
    """
    col_lower = {c.strip().lower(): c for c in df.columns}
    rename_map = {}

    for canonical, variants in COLUMN_MAPPINGS.items():
        for variant in variants:
            if variant.lower() in col_lower:
                original = col_lower[variant.lower()]
                if original not in rename_map.values():
                    rename_map[original] = canonical
                break

    df = df.rename(columns=rename_map)

    # Prefix unrecognised columns so they don't clash
    known = set(COLUMN_MAPPINGS.keys())
    for col in list(df.columns):
        if col not in known and not col.startswith("extra_"):
            df = df.rename(columns={col: f"extra_{col}"})

    return df


def add_missing_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure all canonical columns exist; fill missing ones with empty strings."""
    for col in COLUMN_MAPPINGS.keys():
        if col not in df.columns:
            df[col] = ""
    return df


# ─── Status Normalisation ─────────────────────────────────────────────────────

def _normalise_status_value(raw: str) -> str:
    """
    Map a raw status string (Hebrew or English, any capitalisation)
    to a canonical status key.  Falls back to 'saved' if unrecognised.
    """
    if not isinstance(raw, str) or not raw.strip():
        return "saved"

    cleaned = raw.strip().lower()

    # Direct canonical-key match
    if cleaned in STATUSES:
        return cleaned

    # Hebrew label match
    for label, key in STATUS_LABEL_TO_KEY.items():
        if label.lower() == cleaned:
            return key

    # Synonym match
    for synonym, key in STATUS_SYNONYMS.items():
        if synonym.lower() in cleaned:
            return key

    logger.debug(f"Unknown status '{raw}' → defaulting to 'saved'")
    return "saved"


def normalise_statuses(df: pd.DataFrame) -> pd.DataFrame:
    """Apply status normalisation to the current_status column."""
    if "current_status" in df.columns:
        df["current_status"] = df["current_status"].apply(_normalise_status_value)
    return df


# ─── Date Normalisation ───────────────────────────────────────────────────────

_DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y",
    "%d.%m.%Y", "%d.%m.%y", "%Y/%m/%d",
]

def _parse_date(value) -> Optional[date]:
    """Try to parse a date from a string or datetime-like value."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if isinstance(value, (datetime, date)):
        return value.date() if isinstance(value, datetime) else value
    if isinstance(value, pd.Timestamp):
        return value.date()

    s = str(value).strip()
    if not s or s.lower() in ("nan", "none", "", "n/a", "-"):
        return None

    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue

    logger.debug(f"Could not parse date: '{value}'")
    return None


DATE_COLUMNS = [
    "date_saved", "date_applied", "last_followup_date", "next_action_date",
]


def normalise_dates(df: pd.DataFrame) -> pd.DataFrame:
    """Parse all date columns to Python date objects (or None)."""
    for col in DATE_COLUMNS:
        if col in df.columns:
            df[col] = df[col].apply(_parse_date)
    return df


# ─── Text Cleaning ────────────────────────────────────────────────────────────

def clean_text_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Strip whitespace from string columns; replace NaN strings with ''."""
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = (
                df[col]
                .fillna("")
                .astype(str)
                .str.strip()
                .replace({"nan": "", "None": "", "N/A": "", "none": ""})
            )
    return df


# ─── Boolean Normalisation ────────────────────────────────────────────────────

_TRUTHY = {"yes", "כן", "true", "1", "v", "✓", "x", "נכון"}

def normalise_booleans(df: pd.DataFrame) -> pd.DataFrame:
    """Normalise response_received to True/False."""
    if "response_received" in df.columns:
        df["response_received"] = (
            df["response_received"]
            .astype(str)
            .str.strip()
            .str.lower()
            .apply(lambda v: v in _TRUTHY)
        )
    return df


# ─── Status Inference ────────────────────────────────────────────────────────

def infer_status_from_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    When status is 'saved' (default) but other columns provide signals,
    infer a better status automatically:
      - has date_applied → 'applied'
      - has last_followup_date and date_applied → 'followup_sent'
      - has interview_stage text → 'first_interview' or 'advanced_interview'
      - response_received=True and no interview → 'followup_sent'
    """
    if "current_status" not in df.columns:
        return df

    def _infer(row):
        status = str(row.get("current_status", "saved")).strip()
        # Only auto-infer if still at default 'saved'
        if status not in ("saved", "fit_checked", ""):
            return status

        has_applied   = bool(row.get("date_applied"))
        has_followup  = bool(row.get("last_followup_date"))
        has_interview = bool(str(row.get("interview_stage", "")).strip())
        has_response  = bool(row.get("response_received"))
        has_contact   = bool(str(row.get("contact_name", "")).strip())

        if has_interview:
            stage_text = str(row.get("interview_stage", "")).lower()
            if any(w in stage_text for w in ["מתקדם", "שני", "שלישי", "advanced", "second"]):
                return "advanced_interview"
            return "first_interview"
        if has_applied and has_followup:
            return "followup_sent"
        if has_applied and (has_response or has_contact):
            return "followup_sent"
        if has_applied:
            return "applied"
        return status

    df["current_status"] = df.apply(_infer, axis=1)
    return df


# ─── Derived Columns ──────────────────────────────────────────────────────────

def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute helper columns used by the insights engine and UI:
      - days_since_saved
      - days_since_applied
      - days_since_followup
      - followup_overdue  (applied but no followup within threshold)
      - is_stale          (no update for N days)
      - status_label      (Hebrew display label)
      - status_color      (hex colour for the status)
      - status_order      (pipeline position integer)
    """
    today = date.today()

    def days_since(d):
        if d is None:
            return None
        if isinstance(d, datetime):
            d = d.date()
        return (today - d).days

    df["days_since_saved"]    = df["date_saved"].apply(days_since)
    df["days_since_applied"]  = df["date_applied"].apply(days_since)
    df["days_since_followup"] = df["last_followup_date"].apply(days_since)

    # Stale: applied > 21 days ago with no followup
    from config import THRESHOLDS
    stale_days = THRESHOLDS["stale_opportunity_days"]
    followup_threshold = THRESHOLDS["followup_overdue_days"]

    df["is_stale"] = (
        (df["days_since_applied"].notna()) &
        (df["days_since_applied"] > stale_days) &
        (~df["current_status"].isin(["rejected", "accepted", "frozen"]))
    )

    df["followup_overdue"] = (
        (df["days_since_applied"].notna()) &
        (df["days_since_applied"] > followup_threshold) &
        (df["last_followup_date"].isna() | df["last_followup_date"].isnull()) &
        (~df["current_status"].isin(["rejected", "accepted", "frozen", "saved", "fit_checked"]))
    )

    # Status display helpers
    df["status_label"] = df["current_status"].apply(
        lambda s: STATUSES.get(s, {}).get("label", s)
    )
    df["status_color"] = df["current_status"].apply(
        lambda s: STATUSES.get(s, {}).get("color", "#BDBDBD")
    )
    df["status_order"] = df["current_status"].apply(
        lambda s: STATUSES.get(s, {}).get("order", 99)
    )

    return df


# ─── Master Normalisation Pipeline ───────────────────────────────────────────

def normalize(raw_df: pd.DataFrame) -> pd.DataFrame:
    """
    Full normalisation pipeline.
    Accepts a raw DataFrame from any supported tracking file.
    Returns a clean, canonical DataFrame ready for the dashboard.
    """
    df = raw_df.copy()

    # 1. Drop completely empty rows
    df.dropna(how="all", inplace=True)
    df = df[df.apply(lambda r: any(str(v).strip() for v in r if str(v).strip()), axis=1)]

    # 2. Map columns to canonical names
    df = map_columns(df)

    # 3. Ensure all required columns exist
    df = add_missing_columns(df)

    # 4. Clean text
    df = clean_text_columns(df)

    # 5. Normalise statuses
    df = normalise_statuses(df)

    # 6. Normalise booleans
    df = normalise_booleans(df)

    # 7. Parse dates
    df = normalise_dates(df)

    # 7b. Infer status from data when no explicit status column present
    df = infer_status_from_data(df)

    # 8. Add derived columns
    df = add_derived_columns(df)

    # 9. Reset index
    df = df.reset_index(drop=True)

    logger.info(f"Normalised DataFrame: {len(df)} rows, {len(df.columns)} columns")
    return df


# ─── Data Quality Report ─────────────────────────────────────────────────────

def data_quality_report(df: pd.DataFrame) -> dict:
    """Return a summary of data completeness for key columns."""
    report = {}
    key_cols = ["company_name", "role_title", "date_applied", "current_status",
                "last_followup_date", "next_action"]
    total = len(df)
    if total == 0:
        return {"total_rows": 0}

    for col in key_cols:
        if col in df.columns:
            filled = df[col].apply(lambda v: bool(str(v).strip()) if v is not None else False).sum()
            report[col] = {"filled": int(filled), "pct": round(filled / total * 100)}

    report["total_rows"] = total
    return report
