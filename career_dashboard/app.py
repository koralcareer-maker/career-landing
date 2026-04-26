"""
app.py — Career Progress Dashboard (לוח הבקרה של חיפוש העבודה)

Main Streamlit entry point.  Run with:
    streamlit run app.py

The app supports two data modes:
  1. Google Drive folder (live connection via service account or OAuth)
  2. Demo / sample data (built-in, no credentials required)
"""

from __future__ import annotations

import io
import logging
import os
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import pandas as pd
import streamlit as st

# ── Internal modules ──────────────────────────────────────────────────────────
from config import (
    STATUSES, STATUS_LABEL_TO_KEY, UI, COLUMN_DISPLAY,
    TABLE_COLUMNS,
)
from data_normalizer import normalize, data_quality_report
from insights_engine import InsightsEngine
from ui_components import (
    inject_rtl_css,
    section_header,
    render_profile_header,
    render_kpi_cards,
    render_pipeline_chart,
    render_jobs_table,
    render_insights_panel,
    render_weekly_actions,
    render_alerts_panel,
    render_applications_over_time,
    render_source_performance,
    render_status_distribution,
    render_category_performance,
    render_file_intelligence,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CACHE_DIR = Path(".drive_cache")
EXPORTS_DIR = Path("exports")
EXPORTS_DIR.mkdir(exist_ok=True)

# ─── Page config (must be first Streamlit call) ───────────────────────────────

st.set_page_config(
    page_title="לוח הבקרה — חיפוש עבודה",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded",
)
inject_rtl_css()


# ─── Session State Initialisation ────────────────────────────────────────────

def init_session():
    defaults = {
        "df":               None,
        "file_intelligence": {},
        "loaded_files":     [],
        "profile":          {},
        "data_source":      "sample",
        "folder_id":        "",
        "credentials_path": "",
        "use_oauth":        False,
        "last_saved":       None,
        "save_path":        None,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


init_session()


# ─── Data Loading ─────────────────────────────────────────────────────────────

@st.cache_data(show_spinner=False, ttl=300)
def load_sample_data() -> tuple[pd.DataFrame, dict, dict]:
    """Load built-in demo data."""
    from sample_data import generate_sample_jobs, get_sample_trainee_profile, get_sample_file_insights
    raw_df   = generate_sample_jobs()
    profile  = get_sample_trainee_profile()
    file_intel = get_sample_file_insights()
    df = normalize(raw_df)
    return df, profile, file_intel


def load_from_drive(folder_id: str, credentials_path: str, use_oauth: bool) -> tuple[Optional[pd.DataFrame], dict, dict]:
    """Connect to Google Drive, download files, parse and normalize."""
    try:
        from drive_connector import DriveConnector
        from file_parser import FileProcessor

        connector = DriveConnector(
            credentials_path=credentials_path or None,
            use_oauth=use_oauth,
            cache_dir=str(CACHE_DIR),
        )
        with st.spinner("מתחבר ל-Google Drive..."):
            success = connector.connect()

        if not success:
            st.error("❌ לא ניתן להתחבר ל-Google Drive. בדוק את הקרדנשיאלים.")
            return None, {}, {}

        with st.spinner("מוריד קבצים..."):
            downloaded = connector.download_all(folder_id)

        if not downloaded:
            st.warning("⚠️ לא נמצאו קבצים בתיקייה.")
            return None, {}, {}

        paths = list(downloaded.values())
        processor = FileProcessor(paths)

        raw_df     = processor.get_tracking_df()
        file_intel = processor.get_file_intelligence()
        loaded     = processor.get_loaded_files_summary()

        st.session_state["loaded_files"] = loaded

        df = normalize(raw_df) if raw_df is not None else pd.DataFrame()

        # Build basic profile from file intelligence
        profile = _build_profile_from_intelligence(file_intel)

        return df, profile, file_intel

    except Exception as e:
        st.error(f"❌ שגיאה בטעינת הנתונים: {e}")
        logger.exception("Drive load error")
        return None, {}, {}


def _build_profile_from_intelligence(fi: dict) -> dict:
    """Construct a trainee profile dict from file intelligence."""
    cv      = fi.get("cv", {})
    guidance = fi.get("guidance", {})
    roles   = cv.get("inferred_roles", [])
    return {
        "name":         "מועמד/ת",
        "target_roles": " / ".join(roles[:2]) if roles else "—",
        "seniority":    cv.get("seniority", ""),
        "industries":   ", ".join(cv.get("industries", [])),
        "search_stage": "חיפוש פעיל",
    }


def load_file_from_drive_by_id(file_id: str, file_name: str):
    """Load a specific Drive file by ID and return (df, profile, file_intelligence)."""
    try:
        from drive_connector import DriveConnector
        connector = DriveConnector(cache_dir=str(CACHE_DIR))
        if not connector.connect():
            st.error("❌ לא ניתן להתחבר ל-Drive")
            return None, {}, {}

        with st.spinner(f"מוריד {file_name}..."):
            local_path = connector.download_file(file_id, file_name)

        if local_path is None:
            st.error(f"❌ לא ניתן להוריד את הקובץ: {file_name}")
            return None, {}, {}

        from file_parser import FileProcessor
        processor = FileProcessor([local_path])
        raw_df    = processor.get_tracking_df()
        fi        = processor.get_file_intelligence()
        loaded    = processor.get_loaded_files_summary()
        st.session_state["loaded_files"] = loaded

        if raw_df is None or raw_df.empty:
            st.warning("⚠️ לא נמצאו נתונים בקובץ. בודק מבנה...")
            # Try to read raw and show columns for debugging
            import pandas as pd
            try:
                raw = pd.read_excel(local_path, header=None)
                # Find header row
                for i, row in raw.iterrows():
                    vals = [str(v) for v in row if str(v) not in ('nan','None','')]
                    if len(vals) >= 3:
                        raw.columns = raw.iloc[i]
                        raw_df = raw.iloc[i+1:].reset_index(drop=True)
                        break
            except Exception:
                pass

        if raw_df is None or raw_df.empty:
            return None, {}, fi

        df      = normalize(raw_df)
        profile = _build_profile_from_intelligence(fi)
        # Try to get name from Drive account
        account = st.session_state.get("drive_account", "")
        if account:
            profile["name"] = account.split("@")[0].replace(".", " ").title()
        return df, profile, fi

    except Exception as e:
        st.error(f"❌ שגיאה בטעינת הקובץ: {e}")
        logger.exception("File load error")
        return None, {}, {}


# ─── Save / Export ────────────────────────────────────────────────────────────

def save_to_excel(df: pd.DataFrame) -> bytes:
    """Serialize the DataFrame to an Excel file in memory."""
    output = io.BytesIO()
    export_df = df.copy()

    # Convert dates to strings for Excel export
    for col in ["date_saved", "date_applied", "last_followup_date", "next_action_date"]:
        if col in export_df.columns:
            export_df[col] = export_df[col].apply(
                lambda d: d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else (str(d) if d else "")
            )

    # Replace canonical status with Hebrew labels
    if "current_status" in export_df.columns:
        export_df["current_status"] = export_df["current_status"].map(
            lambda s: STATUSES.get(s, {}).get("label", s)
        )

    # Rename to Hebrew headers
    rename_map = {k: v for k, v in COLUMN_DISPLAY.items() if k in export_df.columns}
    export_df = export_df.rename(columns=rename_map)

    # Drop internal computed columns
    internal = ["days_since_saved", "days_since_applied", "days_since_followup",
                 "is_stale", "followup_overdue", "status_label", "status_color", "status_order"]
    export_df = export_df.drop(columns=[c for c in internal if c in export_df.columns])

    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        export_df.to_excel(writer, index=False, sheet_name="משרות")
        workbook  = writer.book
        worksheet = writer.sheets["משרות"]

        # Header format
        hdr_fmt = workbook.add_format({
            "bold": True, "bg_color": "#1a1a2e", "font_color": "white",
            "align": "center", "border": 1, "font_size": 11,
        })
        for col_num, col_name in enumerate(export_df.columns):
            worksheet.write(0, col_num, col_name, hdr_fmt)
            worksheet.set_column(col_num, col_num, max(14, len(str(col_name)) + 4))

    return output.getvalue()


def merge_edited_back(original_df: pd.DataFrame, edited_display_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge changes from the editable display table back into the canonical DataFrame.
    The display table has Hebrew column headers and Hebrew status labels.
    """
    if edited_display_df is None or edited_display_df.empty:
        return original_df

    edited = edited_display_df.copy()

    # Reverse-map Hebrew headers → canonical
    rev_col = {v: k for k, v in COLUMN_DISPLAY.items()}
    edited = edited.rename(columns=rev_col)

    # Reverse-map Hebrew status labels → canonical keys
    if "current_status" in edited.columns:
        edited["current_status"] = edited["current_status"].map(
            lambda s: STATUS_LABEL_TO_KEY.get(s, s)
        )

    # Keep only columns that exist in original
    common = [c for c in edited.columns if c in original_df.columns]
    result = original_df.copy()
    result_rows = min(len(result), len(edited))
    for col in common:
        result.loc[:result_rows - 1, col] = edited[col].values[:result_rows]

    return result


# ─── Sidebar ─────────────────────────────────────────────────────────────────

def render_sidebar():
    with st.sidebar:
        st.markdown(
            '<div style="text-align:center; padding:20px 0 10px 0;">'
            '<div style="font-size:2.5rem;">🎯</div>'
            '<div style="font-size:1.1rem; font-weight:700; color:#e0e0e0;">Career Dashboard</div>'
            '<div style="font-size:0.75rem; color:#888; margin-top:4px;">מרכז ניהול חיפוש עבודה</div>'
            '</div>',
            unsafe_allow_html=True,
        )
        st.divider()

        # ── Data source selector ──────────────────────────────────────────
        # Auto-detect saved token
        token_exists = Path("credentials/token.pickle").exists()

        source = st.radio(
            "מקור נתונים",
            options=["sample", "drive"],
            format_func=lambda x: "📊 נתוני דמו" if x == "sample" else "☁️ Google Drive",
            index=1 if token_exists else (0 if st.session_state["data_source"] == "sample" else 1),
            key="source_radio",
        )
        st.session_state["data_source"] = source

        if source == "drive":
            st.markdown("---")

            if token_exists:
                st.success("✅ מחובר ל-Google Drive")
                # Show file picker from Drive
                if st.button("🔄 רענן רשימת קבצים", use_container_width=True):
                    st.session_state.pop("drive_files", None)

                if "drive_files" not in st.session_state:
                    try:
                        from drive_connector import DriveConnector
                        conn = DriveConnector()
                        if conn.connect():
                            st.session_state["drive_account"] = conn.get_connected_account()
                            all_files = conn.list_all_files(page_size=80)
                            # Filter to spreadsheets and relevant docs
                            tracking_files = [
                                f for f in all_files
                                if "spreadsheet" in f.get("mimeType", "")
                                or f["name"].endswith((".xlsx", ".csv"))
                            ]
                            st.session_state["drive_files"] = tracking_files
                    except Exception as e:
                        st.error(f"שגיאה: {e}")

                account = st.session_state.get("drive_account", "")
                if account:
                    st.caption(f"חשבון: {account}")

                drive_files = st.session_state.get("drive_files", [])
                if drive_files:
                    file_names = [f["name"] for f in drive_files]
                    selected_name = st.selectbox(
                        "בחר קובץ מעקב משרות",
                        options=file_names,
                        key="selected_drive_file",
                    )
                    selected_id = next(
                        (f["id"] for f in drive_files if f["name"] == selected_name), None
                    )

                    # Store selected file info for auto-load in main()
                    st.session_state["_pending_file_id"]   = selected_id
                    st.session_state["_pending_file_name"] = selected_name

                    if st.button("📥 טען קובץ זה", use_container_width=True):
                        st.session_state["_auto_loaded"] = False  # allow reload
                        df, profile, fi = load_file_from_drive_by_id(selected_id, selected_name)
                        if df is not None:
                            st.session_state["df"]               = df
                            st.session_state["profile"]          = profile
                            st.session_state["file_intelligence"] = fi
                            st.session_state["data_source"]      = "drive"
                            st.success("✅ נטען בהצלחה!")
                            st.rerun()
                else:
                    st.info("לא נמצאו גיליונות אלקטרוניים ב-Drive.")
            else:
                st.info("לא נמצא token. הרץ את פקודת ה-rclone authorize כפי שמוסבר ב-README.")
                st.markdown("**הגדרות ידניות**")
                folder_input = st.text_input(
                    "קישור / ID של תיקיית Drive",
                    value=st.session_state["folder_id"],
                    placeholder="https://drive.google.com/drive/folders/...",
                    key="folder_input",
                )
                st.session_state["folder_id"] = folder_input
                creds_path = st.text_input(
                    "נתיב לקרדנשיאלים (Service Account)",
                    value=st.session_state["credentials_path"],
                    placeholder="credentials/service_account.json",
                    key="creds_input",
                )
                st.session_state["credentials_path"] = creds_path
                if st.button("🔄 טען נתונים מ-Drive", use_container_width=True):
                    df, profile, fi = load_from_drive(
                        folder_input, creds_path, False,
                    )
                    if df is not None:
                        st.session_state.update({"df": df, "profile": profile,
                                                  "file_intelligence": fi})
                        st.success("✅ הנתונים נטענו בהצלחה!")
                        st.rerun()

        st.markdown("---")

        # ── Trainee profile override ──────────────────────────────────────
        st.markdown("**פרטי מועמד/ת**")
        name_override = st.text_input(
            "שם מלא",
            value=st.session_state["profile"].get("name", ""),
            key="name_override",
        )
        role_override = st.text_input(
            "תפקיד יעד",
            value=st.session_state["profile"].get("target_roles", ""),
            key="role_override",
        )
        if name_override:
            st.session_state["profile"]["name"] = name_override
        if role_override:
            st.session_state["profile"]["target_roles"] = role_override

        st.markdown("---")

        # ── Quick stats in sidebar ────────────────────────────────────────
        if st.session_state["df"] is not None and not st.session_state["df"].empty:
            df = st.session_state["df"]
            engine = InsightsEngine(df, st.session_state["file_intelligence"])
            kpis   = engine.kpis
            st.markdown("**סיכום מהיר**")
            st.metric("סה\"כ משרות", kpis["total"])
            st.metric("ראיונות פעילים", kpis["in_process"] + kpis["interviews_scheduled"])
            st.metric("ימים ללא פעילות", kpis["days_inactive"])

        st.markdown("---")
        st.markdown(
            '<div style="font-size:0.7rem; color:#555; text-align:center;">'
            'Career Progress Dashboard v1.0<br>Powered by Streamlit</div>',
            unsafe_allow_html=True,
        )


# ─── Add New Job Dialog ───────────────────────────────────────────────────────

def render_add_job_form(df: pd.DataFrame) -> Optional[pd.DataFrame]:
    """Show a form to add a new job application. Returns updated df or None."""
    with st.expander("➕ הוספת משרה חדשה", expanded=False):
        with st.form("add_job_form", clear_on_submit=True):
            col1, col2, col3 = st.columns(3)

            with col1:
                company  = st.text_input("חברה *")
                role     = st.text_input("תפקיד *")
                category = st.text_input("קטגוריה")

            with col2:
                source   = st.selectbox("מקור", options=["", "LinkedIn", "Drushim", "AllJobs",
                                        "Referral", "Recruiter", "Company Website", "פנייה יזומה", "אחר"])
                status_label = st.selectbox(
                    "סטטוס",
                    options=[STATUSES[k]["label"] for k in STATUSES],
                    index=0,
                )
                link     = st.text_input("לינק למשרה")

            with col3:
                date_s   = st.date_input("תאריך שמירה", value=date.today())
                date_a   = st.date_input("תאריך הגשה", value=None)
                contact  = st.text_input("איש קשר")

            notes = st.text_area("הערות", height=80)

            submitted = st.form_submit_button("שמור משרה ➕", use_container_width=True)
            if submitted:
                if not company or not role:
                    st.error("חברה ותפקיד הם שדות חובה.")
                    return None

                status_key = STATUS_LABEL_TO_KEY.get(status_label, "saved")
                new_row = {col: "" for col in df.columns}
                new_row.update({
                    "company_name":   company,
                    "role_title":     role,
                    "source":         source,
                    "job_link":       link,
                    "date_saved":     date_s,
                    "date_applied":   date_a,
                    "current_status": status_key,
                    "contact_name":   contact,
                    "notes":          notes,
                    "role_category":  category,
                })
                new_df = pd.concat(
                    [df, pd.DataFrame([new_row])],
                    ignore_index=True,
                )
                # Re-run derived columns
                from data_normalizer import add_derived_columns
                new_df = add_derived_columns(new_df)
                return new_df
    return None


# ─── Main App ─────────────────────────────────────────────────────────────────

def main():
    render_sidebar()

    # ── Load data if not yet loaded ──────────────────────────────────────
    if st.session_state["df"] is None:
        if st.session_state["data_source"] == "sample":
            with st.spinner(UI["loading"]):
                df, profile, fi = load_sample_data()
            st.session_state["df"]               = df
            st.session_state["profile"]          = profile
            st.session_state["file_intelligence"] = fi
        elif (
            not st.session_state.get("_auto_loaded")
            and st.session_state.get("_pending_file_id")
        ):
            # Auto-load the first available Drive file
            fid   = st.session_state["_pending_file_id"]
            fname = st.session_state.get("_pending_file_name", "")
            st.session_state["_auto_loaded"] = True
            with st.spinner(f"טוען {fname} מ-Google Drive..."):
                df, profile, fi = load_file_from_drive_by_id(fid, fname)
            if df is not None:
                st.session_state["df"]               = df
                st.session_state["profile"]          = profile
                st.session_state["file_intelligence"] = fi
                st.session_state["data_source"]      = "drive"
                st.rerun()

    df      = st.session_state["df"]
    profile = st.session_state["profile"]
    fi      = st.session_state["file_intelligence"]

    # Fallback: show connect message
    if df is None or df.empty:
        if st.session_state["data_source"] == "sample":
            df, profile, fi = load_sample_data()
            st.session_state.update({"df": df, "profile": profile, "file_intelligence": fi})
        else:
            st.info("⬅️ בחר קובץ מעקב משרות בסרגל הצד וגרור כדי לטעון נתונים.")
            return

    # ── Run insights engine ──────────────────────────────────────────────
    engine  = InsightsEngine(df, fi)
    results = engine.run()
    kpis    = results["kpis"]

    # ── Profile header ───────────────────────────────────────────────────
    if st.session_state["data_source"] == "sample":
        st.info("📊 מצב דמו פעיל — מוצגים נתונים לדוגמה. חבר ל-Google Drive כדי לראות נתונים אמיתיים.")

    render_profile_header(profile, kpis)

    # ── Alerts strip ────────────────────────────────────────────────────
    alerts = results["alerts"]
    has_critical = any(
        a.severity == "critical"
        for a in alerts
        if hasattr(a, "severity")
    )
    if has_critical:
        section_header(UI["section_alerts"], "🚨")
        render_alerts_panel(alerts)
        st.markdown("")

    # ── Tabs ─────────────────────────────────────────────────────────────
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "📊 " + UI["section_header"],
        "📋 " + UI["section_jobs_table"],
        "🧠 " + UI["section_insights"],
        "📈 " + UI["section_charts"],
        "📁 " + UI["section_files"],
        "⚙️ ייצוא ושמירה",
    ])

    # ── Tab 1: Overview ──────────────────────────────────────────────────
    with tab1:
        section_header("מדדי ביצוע מרכזיים", "📊")
        render_kpi_cards(kpis)

        st.markdown("")
        col_pipe, col_dist = st.columns([3, 2])

        with col_pipe:
            section_header(UI["section_pipeline"], "🔄")
            render_pipeline_chart(df)

        with col_dist:
            section_header("התפלגות סטטוסים", "🥧")
            render_status_distribution(df)

        # Non-critical alerts below main KPIs
        if not has_critical:
            section_header(UI["section_alerts"], "⚠️")
            render_alerts_panel(alerts)

    # ── Tab 2: Jobs Table ────────────────────────────────────────────────
    with tab2:
        section_header(UI["section_jobs_table"], "📋")

        # Filter controls
        fcol1, fcol2, fcol3 = st.columns([2, 2, 3])
        with fcol1:
            status_filter = st.multiselect(
                "סינון לפי סטטוס",
                options=[STATUSES[k]["label"] for k in STATUSES],
                default=[],
                key="status_filter",
            )
        with fcol2:
            source_filter = st.multiselect(
                "סינון לפי מקור",
                options=sorted(df["source"].replace("", pd.NA).dropna().unique().tolist()),
                default=[],
                key="source_filter",
            )
        with fcol3:
            search_text = st.text_input(
                "🔍 חיפוש חופשי (חברה / תפקיד)",
                placeholder="חיפוש...",
                key="table_search",
            )

        # Apply filters
        filtered = df.copy()
        if status_filter:
            status_keys = [STATUS_LABEL_TO_KEY.get(lbl, lbl) for lbl in status_filter]
            filtered = filtered[filtered["current_status"].isin(status_keys)]
        if source_filter:
            filtered = filtered[filtered["source"].isin(source_filter)]
        if search_text:
            mask = (
                filtered["company_name"].str.contains(search_text, case=False, na=False) |
                filtered["role_title"].str.contains(search_text, case=False, na=False)
            )
            filtered = filtered[mask]

        st.markdown(f"**מציג {len(filtered)} מתוך {len(df)} רשומות**")

        # Stale jobs highlight
        stale_count = int(filtered.get("is_stale", pd.Series([False]*len(filtered))).sum())
        if stale_count > 0:
            st.warning(f"⚠️ {stale_count} משרות מסומנות כ'תקועות' בטבלה הבאה.")

        edited_display = render_jobs_table(filtered)

        # Merge edits back
        if edited_display is not None:
            if st.button("💾 " + UI["edit_save"], use_container_width=False):
                updated = merge_edited_back(df, edited_display)
                from data_normalizer import add_derived_columns
                updated = add_derived_columns(updated)
                st.session_state["df"] = updated
                st.success(UI["save_success"])
                st.rerun()

        st.markdown("")
        # Add new job
        updated_df = render_add_job_form(df)
        if updated_df is not None:
            st.session_state["df"] = updated_df
            st.success("✅ המשרה נוספה בהצלחה!")
            st.rerun()

    # ── Tab 3: Coach Insights + Weekly Actions ───────────────────────────
    with tab3:
        col_ins, col_act = st.columns([3, 2])

        with col_ins:
            section_header(UI["section_insights"], "🧠")
            insights = results["insights"]
            if not insights:
                st.success("✅ לא זוהו בעיות מרכזיות. המשך בקצב זה!")
            else:
                st.markdown(
                    f'<div style="color:#555; font-size:0.85rem; margin-bottom:16px; direction:rtl;">'
                    f'זוהו <strong>{len(insights)}</strong> תובנות מקצועיות על בסיס הנתונים שלך.</div>',
                    unsafe_allow_html=True,
                )
                render_insights_panel(insights)

        with col_act:
            section_header(UI["section_actions"], "🗓️")
            render_weekly_actions(results["weekly_actions"])

            st.markdown("")
            # Data quality indicator
            with st.expander("📋 איכות הנתונים"):
                dq = data_quality_report(df)
                for col, stats in dq.items():
                    if col == "total_rows":
                        st.markdown(f"**סה\"כ שורות:** {stats}")
                        continue
                    if isinstance(stats, dict):
                        pct = stats.get("pct", 0)
                        color = "#4CAF50" if pct >= 70 else ("#FF9800" if pct >= 40 else "#EF5350")
                        heb = COLUMN_DISPLAY.get(col, col)
                        st.markdown(
                            f'<div style="direction:rtl; margin-bottom:4px;">'
                            f'<span style="color:{color};">{"█" * (pct // 10)}{"░" * (10 - pct // 10)}</span> '
                            f'<strong>{heb}</strong> — {pct}% מולא</div>',
                            unsafe_allow_html=True,
                        )

    # ── Tab 4: Charts ────────────────────────────────────────────────────
    with tab4:
        section_header(UI["section_charts"], "📈")

        row1col1, row1col2 = st.columns(2)
        with row1col1:
            render_applications_over_time(results["weekly_stats"])
        with row1col2:
            render_source_performance(df)

        row2col1, row2col2 = st.columns(2)
        with row2col1:
            render_category_performance(df)
        with row2col2:
            # Applications vs. interviews trend (stacked area)
            ws = results["weekly_stats"]
            if ws is not None and not ws.empty and "interviews" in ws.columns:
                import plotly.graph_objects as go
                fig = go.Figure()
                fig.add_trace(go.Bar(
                    x=ws["week_str"], y=ws["applications"],
                    name="הגשות", marker_color="#42A5F5",
                ))
                fig.add_trace(go.Bar(
                    x=ws["week_str"], y=ws["interviews"],
                    name="ראיונות", marker_color="#66BB6A",
                ))
                fig.update_layout(
                    barmode="group",
                    title="הגשות מול ראיונות לפי שבוע",
                    height=300,
                    plot_bgcolor="white",
                    paper_bgcolor="white",
                    font=dict(family="Arial"),
                    margin=dict(l=0, r=0, t=40, b=10),
                    legend=dict(orientation="h"),
                )
                st.plotly_chart(fig, use_container_width=True)

    # ── Tab 5: Files ─────────────────────────────────────────────────────
    with tab5:
        section_header(UI["section_files"], "📁")

        loaded_files = st.session_state.get("loaded_files", [])
        if loaded_files:
            st.markdown("**קבצים שנסרקו מהתיקייה:**")
            st.dataframe(
                pd.DataFrame(loaded_files),
                use_container_width=True,
                hide_index=True,
            )
            st.markdown("")

        render_file_intelligence(fi)

    # ── Tab 6: Export & Save ──────────────────────────────────────────────
    with tab6:
        section_header("ייצוא ושמירה", "⚙️")

        st.markdown("### ייצוא לאקסל")
        st.markdown("הורד את כל הנתונים כקובץ Excel עדכני עם עיצוב מלא.")

        excel_bytes = save_to_excel(df)
        timestamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename    = f"job_search_{timestamp}.xlsx"

        st.download_button(
            label="📥 הורד קובץ Excel",
            data=excel_bytes,
            file_name=filename,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True,
        )

        st.markdown("---")
        st.markdown("### ייצוא ל-CSV")
        export_csv = df.copy()
        for col in ["date_saved", "date_applied", "last_followup_date", "next_action_date"]:
            if col in export_csv.columns:
                export_csv[col] = export_csv[col].apply(
                    lambda d: d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else ""
                )

        csv_data = export_csv[
            [c for c in TABLE_COLUMNS if c in export_csv.columns]
        ].to_csv(index=False, encoding="utf-8-sig")

        st.download_button(
            label="📥 הורד קובץ CSV",
            data=csv_data.encode("utf-8-sig"),
            file_name=f"job_search_{timestamp}.csv",
            mime="text/csv",
            use_container_width=True,
        )

        # ── Save back to Google Drive ─────────────────────────────────
        st.markdown("---")
        st.markdown("### ☁️ שמירה חזרה ל-Google Drive")

        file_id   = st.session_state.get("_pending_file_id")
        file_name = st.session_state.get("_pending_file_name", "מעקב משרות")

        if file_id and Path("credentials/token.pickle").exists():
            st.markdown(f"יעדכן את הקובץ **{file_name}** ב-Drive בנתונים הנוכחיים.")
            col_save, col_new = st.columns(2)

            with col_save:
                if st.button("☁️ עדכן קובץ קיים ב-Drive", use_container_width=True, type="primary"):
                    try:
                        from drive_connector import DriveConnector
                        conn = DriveConnector()
                        conn.connect()
                        ok = conn.upload_file(file_id, excel_bytes)
                        if ok:
                            st.success(f"✅ הקובץ **{file_name}** עודכן ב-Drive בהצלחה!")
                            # Invalidate local cache so next load is fresh
                            cache_path = CACHE_DIR / file_name
                            if cache_path.exists():
                                cache_path.unlink()
                        else:
                            st.error("❌ העדכון נכשל. נסי שוב.")
                    except Exception as e:
                        st.error(f"❌ שגיאה: {e}")

            with col_new:
                new_name = st.text_input(
                    "שם לקובץ חדש",
                    value=f"מעקב משרות {datetime.now().strftime('%d/%m/%Y')}",
                    key="new_drive_filename",
                )
                if st.button("➕ צור קובץ חדש ב-Drive", use_container_width=True):
                    try:
                        from drive_connector import DriveConnector
                        conn = DriveConnector()
                        conn.connect()
                        new_id = conn.create_file(new_name + ".xlsx", excel_bytes)
                        if new_id:
                            st.success(f"✅ קובץ חדש **{new_name}.xlsx** נוצר ב-Drive!")
                            st.session_state["_pending_file_id"]   = new_id
                            st.session_state["_pending_file_name"] = new_name + ".xlsx"
                            st.session_state.pop("drive_files", None)  # refresh list
                        else:
                            st.error("❌ יצירת הקובץ נכשלה.")
                    except Exception as e:
                        st.error(f"❌ שגיאה: {e}")
        else:
            st.info("חיבור ל-Drive נדרש לשמירה חזרה.")

        # ── Local backup ──────────────────────────────────────────────
        st.markdown("---")
        st.markdown("### 💾 גיבוי מקומי")
        st.markdown("שמור גיבוי מוחתם-תאריך בתיקיית `exports/`.")
        if st.button("💾 שמור גיבוי מקומי עכשיו"):
            backup_path = EXPORTS_DIR / filename
            backup_path.write_bytes(excel_bytes)
            st.success(f"✅ גיבוי נשמר: `{backup_path}`")

        st.markdown("---")
        st.markdown("### ℹ️ מבנה תיקיית Drive המומלץ")
        st.code(
            """
📂 [שם המועמד/ת] — Job Search
 ├── 📊 job_tracking.xlsx        ← גיליון מעקב משרות (עמודות לפי סכמה)
 ├── 📄 CV_firstname_lastname.pdf ← קורות חיים
 ├── 💼 linkedin_profile.pdf      ← סיכום פרופיל LinkedIn
 ├── 🎓 guidance_summary.docx    ← סיכום הנחיה תעסוקתית
 ├── 🎤 interview_prep.docx      ← הכנה לראיונות
 └── 📝 meeting_notes.docx       ← סיכומי פגישות
""",
            language="text",
        )

        st.markdown("### ℹ️ סכמת גיליון המשרות המומלץ")
        schema_cols = [
            "company_name", "role_title", "source", "job_link",
            "date_saved", "date_applied", "current_status",
            "contact_name", "last_followup_date", "next_action",
            "next_action_date", "notes", "role_category",
            "application_type", "response_received",
            "interview_stage", "final_outcome",
        ]
        schema_df = pd.DataFrame({
            "עמודה (אנגלית)": schema_cols,
            "עמודה (עברית)": [COLUMN_DISPLAY.get(c, c) for c in schema_cols],
            "סוג": [
                "טקסט", "טקסט", "רשימה", "URL",
                "תאריך", "תאריך", "רשימה",
                "טקסט", "תאריך", "טקסט",
                "תאריך", "טקסט", "טקסט",
                "רשימה", "כן/לא",
                "טקסט", "טקסט",
            ],
        })
        st.dataframe(schema_df, use_container_width=True, hide_index=True)


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    main()
