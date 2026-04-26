"""
ui_components.py — Reusable Streamlit UI components for the Career Dashboard.

All display text is in Hebrew. RTL layout is applied via CSS injection.
"""

from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from datetime import date

from config import STATUSES, PRIORITIES, UI, COLUMN_DISPLAY, TABLE_COLUMNS, STATUS_LABELS


# ─── RTL CSS ─────────────────────────────────────────────────────────────────

RTL_CSS = """
<style>
/* ── Global RTL ── */
html, body, [class*="css"] {
    direction: rtl !important;
    font-family: 'Segoe UI', 'Arial', sans-serif !important;
}

/* ── Main content area ── */
.main .block-container {
    direction: rtl;
    padding-top: 1.5rem;
    max-width: 1400px;
}

/* ── Headers ── */
h1, h2, h3, h4, h5 {
    text-align: right;
    color: #1a1a2e;
}

/* ── Metric cards ── */
[data-testid="metric-container"] {
    direction: rtl;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    transition: transform 0.2s, box-shadow 0.2s;
}
[data-testid="metric-container"]:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.10);
}
[data-testid="metric-container"] label {
    direction: rtl;
    text-align: right;
    font-size: 0.82rem !important;
    color: #5a5a7a !important;
}
[data-testid="metric-container"] [data-testid="stMetricValue"] {
    direction: ltr;
    font-size: 2rem !important;
    font-weight: 700 !important;
    color: #1a1a2e !important;
}

/* ── Sidebar ── */
[data-testid="stSidebar"] {
    direction: rtl;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
}
[data-testid="stSidebar"] * {
    color: #e0e0e0 !important;
}
[data-testid="stSidebar"] .stSelectbox label,
[data-testid="stSidebar"] .stTextInput label {
    color: #b0b0d0 !important;
    font-size: 0.85rem;
}

/* ── Tabs ── */
[data-testid="stTabs"] {
    direction: rtl;
}
button[data-baseweb="tab"] {
    direction: rtl;
    font-size: 0.9rem;
    font-weight: 600;
}

/* ── DataFrame / Data Editor ── */
[data-testid="stDataFrame"], [data-testid="data_editor"] {
    direction: rtl;
}

/* ── Expander ── */
[data-testid="expander"] {
    direction: rtl;
    border-radius: 8px;
}

/* ── Alert boxes ── */
.alert-critical {
    background: #FFEBEE;
    border-right: 4px solid #EF5350;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    direction: rtl;
}
.alert-warning {
    background: #FFF8E1;
    border-right: 4px solid #FFA726;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    direction: rtl;
}
.alert-info {
    background: #E8F5E9;
    border-right: 4px solid #66BB6A;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    direction: rtl;
}

/* ── KPI card custom ── */
.kpi-card {
    background: white;
    border-radius: 12px;
    padding: 1.2rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    text-align: center;
    border-top: 4px solid #4A90E2;
}
.kpi-number { font-size: 2.4rem; font-weight: 800; color: #1a1a2e; }
.kpi-label  { font-size: 0.8rem; color: #666; margin-top: 4px; }

/* ── Insight cards ── */
.insight-card {
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 10px;
    direction: rtl;
}
.insight-urgent    { background: #FFF3F3; border-right: 5px solid #EF5350; }
.insight-important { background: #FFFBF0; border-right: 5px solid #FFA726; }
.insight-improve   { background: #F0F8FF; border-right: 5px solid #42A5F5; }

/* ── Section dividers ── */
.section-header {
    font-size: 1.3rem;
    font-weight: 700;
    color: #1a1a2e;
    padding: 8px 0 4px 0;
    border-bottom: 2px solid #4A90E2;
    margin-bottom: 16px;
    direction: rtl;
    text-align: right;
}

/* ── Profile header card ── */
.profile-card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
    border-radius: 16px;
    padding: 24px 32px;
    color: white;
    margin-bottom: 24px;
    direction: rtl;
}
.profile-name { font-size: 1.8rem; font-weight: 800; margin-bottom: 4px; }
.profile-meta { font-size: 0.9rem; opacity: 0.8; }
.profile-badge {
    display: inline-block;
    background: rgba(255,255,255,0.2);
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 0.85rem;
    margin-left: 8px;
}

/* ── Action card ── */
.action-card {
    background: white;
    border-radius: 8px;
    padding: 10px 16px;
    margin-bottom: 8px;
    box-shadow: 0 1px 6px rgba(0,0,0,0.06);
    display: flex;
    align-items: center;
    gap: 12px;
    direction: rtl;
}

/* ── Plotly chart RTL fix ── */
.js-plotly-plot { direction: ltr; }

/* ── Input fields ── */
.stTextInput input, .stTextArea textarea, .stSelectbox select {
    direction: rtl;
    text-align: right;
}

/* ── Status badge ── */
.status-badge {
    display: inline-block;
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 0.78rem;
    font-weight: 600;
    color: white;
}

/* ── Hide default Streamlit header ── */
#MainMenu { visibility: hidden; }
footer    { visibility: hidden; }
</style>
"""


def inject_rtl_css():
    """Inject the RTL CSS into the Streamlit app."""
    st.markdown(RTL_CSS, unsafe_allow_html=True)


# ─── Section Header ───────────────────────────────────────────────────────────

def section_header(title: str, icon: str = ""):
    st.markdown(
        f'<div class="section-header">{icon} {title}</div>',
        unsafe_allow_html=True,
    )


# ─── Profile Header Card ──────────────────────────────────────────────────────

def render_profile_header(profile: dict, kpis: dict):
    """Render the top header card with trainee profile and momentum."""
    import streamlit.components.v1 as components
    today = date.today()

    days = kpis.get("days_inactive", 0)
    if days <= 3:
        momentum = UI["momentum_high"]
        mom_color = "#4CAF50"
    elif days <= 7:
        momentum = UI["momentum_medium"]
        mom_color = "#FF9800"
    elif days <= 14:
        momentum = UI["momentum_low"]
        mom_color = "#EF5350"
    else:
        momentum = UI["momentum_stalled"]
        mom_color = "#9E9E9E"

    name      = profile.get("name", "מועמד/ת")
    roles     = profile.get("target_roles", "—")
    stage     = profile.get("search_stage", "חיפוש פעיל")
    seniority = profile.get("seniority", "")
    total     = kpis.get("total", 0)
    rgb       = _hex_to_rgb(mom_color)

    seniority_row = f'<div style="font-size:0.9rem;color:#b0c4de;margin-top:4px;">🏆 {seniority}</div>' if seniority else ""

    html = f"""<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8">
<style>
  body {{ margin:0; padding:0; font-family:'Segoe UI',Arial,sans-serif; background:transparent; }}
  .card {{ background:linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);
           border-radius:16px; padding:24px 28px; color:#e0e0e0; direction:rtl; }}
  .name {{ font-size:1.6rem; font-weight:700; color:#fff; margin-bottom:6px; }}
  .meta {{ font-size:0.95rem; color:#90caf9; margin-top:4px; }}
  .badge {{ display:inline-block; background:rgba(144,202,249,0.15); border:1px solid rgba(144,202,249,0.3);
            border-radius:20px; padding:4px 14px; font-size:0.82rem; margin-left:8px; margin-top:10px; }}
  .stats {{ font-size:0.82rem; color:#b0bec5; text-align:left; direction:ltr; }}
  .stats div {{ margin-bottom:4px; }}
  .row {{ display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; }}
</style></head><body>
<div class="card">
  <div class="row">
    <div>
      <div class="name">👤 {name}</div>
      <div class="meta">🎯 תפקיד יעד: <strong style="color:#fff;">{roles}</strong></div>
      {seniority_row}
      <div>
        <span class="badge">📍 {stage}</span>
        <span class="badge" style="background:rgba({rgb},0.25);border-color:rgba({rgb},0.5);">⚡ מומנטום: {momentum}</span>
      </div>
    </div>
    <div class="stats">
      <div>🗓️ {today.strftime('%d/%m/%Y')}</div>
      <div>פעילות אחרונה לפני <strong>{days} ימים</strong></div>
      <div>סה"כ משרות: <strong>{total}</strong></div>
    </div>
  </div>
</div>
</body></html>"""

    components.html(html, height=140, scrolling=False)


def _hex_to_rgb(hex_color: str) -> str:
    """Convert #RRGGBB to 'R,G,B' string."""
    h = hex_color.lstrip("#")
    try:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return f"{r},{g},{b}"
    except Exception:
        return "74,144,226"


# ─── KPI Cards ────────────────────────────────────────────────────────────────

def render_kpi_cards(kpis: dict):
    """Render the main KPI metric cards in a responsive grid."""
    cards = [
        (UI["kpi_saved"],             kpis["saved"],                    "📌", None),
        (UI["kpi_applied"],           kpis["applied"],                  "📤", None),
        (UI["kpi_outreach"],          kpis["outreach"],                 "📨", None),
        (UI["kpi_followups"],         kpis["followups"],                "🔄", None),
        (UI["kpi_interviews"],        kpis["interviews_scheduled"],     "📅", None),
        (UI["kpi_in_process"],        kpis["in_process"],               "🔥", None),
        (UI["kpi_rejected"],          kpis["rejected"],                 "❌", None),
        (UI["kpi_interview_conv"],    f'{kpis["conversion_interview_pct"]}%', "📊", None),
        (UI["kpi_days_inactive"],     kpis["days_inactive"],            "💤",
             "inverse" if kpis["days_inactive"] > 7 else "normal"),
        (UI["kpi_stale"],             kpis["stale_count"],              "🧊",
             "inverse" if kpis["stale_count"] > 3 else "normal"),
    ]

    # First row — cards 0-4
    cols1 = st.columns(5)
    for i, (label, value, icon, _) in enumerate(cards[:5]):
        with cols1[i]:
            st.metric(label=f"{icon} {label}", value=value)

    # Second row — cards 5-9
    cols2 = st.columns(5)
    for i, (label, value, icon, _) in enumerate(cards[5:]):
        with cols2[i]:
            st.metric(label=f"{icon} {label}", value=value)


# ─── Pipeline Funnel ─────────────────────────────────────────────────────────

def render_pipeline_chart(df: pd.DataFrame):
    """Render a horizontal funnel / pipeline bar chart."""
    if df.empty:
        st.info(UI["no_data"])
        return

    # Aggregate counts per status
    counts = df.groupby("current_status").size().reset_index(name="count")
    counts["order"]  = counts["current_status"].map(
        lambda s: STATUSES.get(s, {}).get("order", 99)
    )
    counts["label"]  = counts["current_status"].map(
        lambda s: STATUSES.get(s, {}).get("label", s)
    )
    counts["color"]  = counts["current_status"].map(
        lambda s: STATUSES.get(s, {}).get("color", "#BDBDBD")
    )
    counts = counts.sort_values("order")

    # Remove zero-count statuses
    counts = counts[counts["count"] > 0]

    fig = go.Figure(go.Bar(
        y=counts["label"],
        x=counts["count"],
        orientation="h",
        marker_color=counts["color"].tolist(),
        text=counts["count"],
        textposition="outside",
        hovertemplate="<b>%{y}</b><br>מספר משרות: %{x}<extra></extra>",
    ))

    fig.update_layout(
        height=max(300, len(counts) * 40 + 80),
        margin=dict(l=0, r=40, t=10, b=10),
        xaxis_title="מספר משרות",
        yaxis_title="",
        plot_bgcolor="white",
        paper_bgcolor="white",
        font=dict(family="Arial", size=13),
        yaxis=dict(autorange="reversed"),
        showlegend=False,
    )
    st.plotly_chart(fig, use_container_width=True)


# ─── Jobs Editable Table ─────────────────────────────────────────────────────

def render_jobs_table(df: pd.DataFrame) -> pd.DataFrame:
    """
    Render an editable data table.
    Returns the edited DataFrame for the caller to save.
    """
    if df.empty:
        st.info(UI["no_data"])
        return df

    # Prepare display columns
    display_cols = [c for c in TABLE_COLUMNS if c in df.columns]

    # Build a display DataFrame with Hebrew column headers
    display_df = df[display_cols].copy()

    # Format dates for display
    for col in ["date_saved", "date_applied", "last_followup_date", "next_action_date"]:
        if col in display_df.columns:
            display_df[col] = display_df[col].apply(
                lambda d: d.strftime("%d/%m/%Y") if hasattr(d, "strftime") else (str(d) if d else "")
            )

    # Replace canonical status keys with Hebrew labels for display
    if "current_status" in display_df.columns:
        display_df["current_status"] = display_df["current_status"].map(
            lambda s: STATUSES.get(s, {}).get("label", s)
        )

    display_df = display_df.rename(columns=COLUMN_DISPLAY)

    # Column config for st.data_editor
    col_config = {
        COLUMN_DISPLAY.get("current_status", "סטטוס"): st.column_config.SelectboxColumn(
            "סטטוס",
            options=STATUS_LABELS,
            required=True,
        ),
        COLUMN_DISPLAY.get("job_link", "לינק"): st.column_config.LinkColumn(
            "לינק",
            display_text="פתח",
        ),
        COLUMN_DISPLAY.get("date_saved",         "תאריך שמירה"):  st.column_config.TextColumn("תאריך שמירה"),
        COLUMN_DISPLAY.get("date_applied",        "תאריך הגשה"):   st.column_config.TextColumn("תאריך הגשה"),
        COLUMN_DISPLAY.get("last_followup_date",  "פולואפ אחרון"): st.column_config.TextColumn("פולואפ אחרון"),
        COLUMN_DISPLAY.get("next_action_date",    "תאריך פעולה"):  st.column_config.TextColumn("תאריך פעולה"),
        COLUMN_DISPLAY.get("response_received",   "קיבלתי תגובה"): st.column_config.CheckboxColumn("קיבלתי תגובה"),
    }

    edited = st.data_editor(
        display_df,
        column_config=col_config,
        use_container_width=True,
        num_rows="dynamic",
        hide_index=True,
        key="jobs_table_editor",
    )

    return edited


# ─── Insights Panel ───────────────────────────────────────────────────────────

def render_insights_panel(insights: list[dict]):
    """Render career coach insights as styled cards."""
    if not insights:
        st.success("✅ לא זוהו בעיות. המשך כך!")
        return

    priority_order = {"urgent": 0, "important": 1, "improve": 2}
    sorted_insights = sorted(insights, key=lambda i: priority_order.get(i.get("priority_key", "improve"), 9))

    for item in sorted_insights:
        pkey  = item.get("priority_key", "improve")
        icon  = item.get("icon", "💡")
        pri   = PRIORITIES.get(pkey, PRIORITIES["improve"])

        css_class = f"insight-{pkey}"
        st.markdown(
            f"""
            <div class="insight-card {css_class}">
              <div style="font-size:1rem; font-weight:700; margin-bottom:6px;">
                {icon} {item.get('תובנה', '')}
              </div>
              <div style="font-size:0.85rem; color:#555; margin-bottom:6px;">
                🔍 {item.get('למה זה חשוב', '')}
              </div>
              <div style="font-size:0.88rem; font-weight:600; color:#333;">
                ✅ {item.get('פעולה מומלצת', '')}
              </div>
              <div style="margin-top:8px;">
                <span style="background:{pri['color']}; color:white; border-radius:12px;
                             padding:2px 10px; font-size:0.75rem; font-weight:600;">
                  {pri['label']}
                </span>
                <span style="background:#eee; color:#666; border-radius:12px;
                             padding:2px 10px; font-size:0.75rem; margin-right:6px;">
                  {item.get('קטגוריה', '')}
                </span>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


# ─── Weekly Actions Panel ─────────────────────────────────────────────────────

def render_weekly_actions(actions: list[dict]):
    """Render the weekly action recommendations."""
    if not actions:
        return

    priority_icons = {"urgent": "⚡", "important": "⚠️", "improve": "💡"}
    priority_colors = {
        "urgent":    "#FFEBEE",
        "important": "#FFF8E1",
        "improve":   "#E3F2FD",
    }
    priority_border = {
        "urgent":    "#EF5350",
        "important": "#FFA726",
        "improve":   "#42A5F5",
    }

    for item in actions:
        pkey   = item.get("עדיפות", "improve")
        action = item.get("פעולה", "")
        count  = item.get("מספר")
        icon   = priority_icons.get(pkey, "💡")
        bg     = priority_colors.get(pkey, "#F5F5F5")
        border = priority_border.get(pkey, "#9E9E9E")
        label  = PRIORITIES.get(pkey, PRIORITIES["improve"])["label"]

        count_tag = f"<span style='font-size:0.75rem; color:#888;'>(יעד: {count})</span>" if count else ""

        st.markdown(
            f"""
            <div style="background:{bg}; border-right:4px solid {border};
                        border-radius:8px; padding:10px 16px; margin-bottom:8px;
                        direction:rtl;">
              <span style="font-size:1rem;">{icon}</span>
              <span style="font-weight:600; margin-right:8px;">{action}</span>
              {count_tag}
              <span style="float:left; font-size:0.72rem; color:#888;">{label}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )


# ─── Alerts Panel ────────────────────────────────────────────────────────────

def render_alerts_panel(alerts: list):
    """Render operational alerts."""
    if not alerts:
        return

    for alert in alerts:
        severity = alert.severity if hasattr(alert, "severity") else "info"
        message  = alert.message  if hasattr(alert, "message")  else str(alert)
        icon     = alert.icon     if hasattr(alert, "icon")     else "ℹ️"

        css_class = f"alert-{severity}"
        st.markdown(
            f'<div class="{css_class}">{icon} {message}</div>',
            unsafe_allow_html=True,
        )


# ─── Charts ──────────────────────────────────────────────────────────────────

def render_applications_over_time(weekly_stats: pd.DataFrame):
    """Line chart: applications and interviews per week."""
    if weekly_stats is None or weekly_stats.empty:
        st.info("אין מספיק נתונים להצגת מגמות שבועיות.")
        return

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=weekly_stats["week_str"],
        y=weekly_stats["applications"],
        name="הגשות",
        mode="lines+markers",
        line=dict(color="#42A5F5", width=2.5),
        marker=dict(size=7),
    ))
    fig.add_trace(go.Scatter(
        x=weekly_stats["week_str"],
        y=weekly_stats["interviews"],
        name="ראיונות",
        mode="lines+markers",
        line=dict(color="#66BB6A", width=2.5),
        marker=dict(size=7),
    ))
    if "responses" in weekly_stats.columns:
        fig.add_trace(go.Scatter(
            x=weekly_stats["week_str"],
            y=weekly_stats["responses"],
            name="תגובות",
            mode="lines+markers",
            line=dict(color="#FFA726", width=2, dash="dot"),
            marker=dict(size=6),
        ))

    fig.update_layout(
        title="פעילות שבועית",
        xaxis_title="שבוע",
        yaxis_title="מספר",
        plot_bgcolor="white",
        paper_bgcolor="white",
        font=dict(family="Arial", size=12),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
        height=320,
        margin=dict(l=0, r=0, t=40, b=10),
    )
    st.plotly_chart(fig, use_container_width=True)


def render_source_performance(df: pd.DataFrame):
    """Bar chart: interview conversion rate by source."""
    if df.empty or "source" not in df.columns:
        return

    interview_statuses = [
        "interview_scheduled", "first_interview",
        "advanced_interview", "task_home", "offer", "accepted",
    ]
    source_data = (
        df.groupby("source")
        .agg(
            total=("company_name", "count"),
            interviews=("current_status", lambda s: s.isin(interview_statuses).sum()),
        )
        .reset_index()
    )
    source_data = source_data[source_data["total"] >= 2]
    if source_data.empty:
        return

    source_data["conversion"] = (source_data["interviews"] / source_data["total"] * 100).round(1)
    source_data = source_data.sort_values("conversion", ascending=True)

    fig = px.bar(
        source_data,
        x="conversion",
        y="source",
        orientation="h",
        text="conversion",
        color="conversion",
        color_continuous_scale="RdYlGn",
        labels={"conversion": "% המרה לראיון", "source": "מקור"},
        title="יחס המרה לראיון לפי מקור",
    )
    fig.update_traces(texttemplate="%{text}%", textposition="outside")
    fig.update_layout(
        height=300,
        margin=dict(l=0, r=0, t=40, b=10),
        plot_bgcolor="white",
        paper_bgcolor="white",
        coloraxis_showscale=False,
    )
    st.plotly_chart(fig, use_container_width=True)


def render_status_distribution(df: pd.DataFrame):
    """Pie chart: status distribution."""
    if df.empty:
        return

    counts = df["current_status"].value_counts().reset_index()
    counts.columns = ["status", "count"]
    counts["label"] = counts["status"].map(lambda s: STATUSES.get(s, {}).get("label", s))
    counts["color"] = counts["status"].map(lambda s: STATUSES.get(s, {}).get("color", "#BDBDBD"))

    fig = px.pie(
        counts,
        names="label",
        values="count",
        color="label",
        color_discrete_map=dict(zip(counts["label"], counts["color"])),
        title="התפלגות סטטוסים",
        hole=0.45,
    )
    fig.update_traces(textinfo="label+percent", textposition="outside")
    fig.update_layout(
        height=340,
        margin=dict(l=0, r=0, t=40, b=10),
        showlegend=False,
        paper_bgcolor="white",
    )
    st.plotly_chart(fig, use_container_width=True)


def render_category_performance(df: pd.DataFrame):
    """Horizontal bar: applications per role category."""
    if df.empty or "role_category" not in df.columns:
        return

    cats = df["role_category"].replace("", pd.NA).dropna()
    if cats.empty:
        return

    cat_counts = cats.value_counts().reset_index()
    cat_counts.columns = ["category", "count"]
    cat_counts = cat_counts.sort_values("count", ascending=True)

    fig = px.bar(
        cat_counts,
        x="count",
        y="category",
        orientation="h",
        title="פילוח הגשות לפי קטגוריית תפקיד",
        color="count",
        color_continuous_scale="Blues",
        labels={"count": "מספר הגשות", "category": "קטגוריה"},
    )
    fig.update_layout(
        height=300,
        margin=dict(l=0, r=0, t=40, b=10),
        plot_bgcolor="white",
        paper_bgcolor="white",
        coloraxis_showscale=False,
    )
    st.plotly_chart(fig, use_container_width=True)


# ─── File Intelligence Panel ─────────────────────────────────────────────────

def render_file_intelligence(file_intelligence: dict):
    """Display signals extracted from supporting files."""
    if not file_intelligence:
        st.info("לא נטענו קבצי תמיכה. התחבר ל-Google Drive כדי לטעון קבצים.")
        return

    for ft, signals in file_intelligence.items():
        if not signals.get("loaded"):
            continue

        labels = {
            "cv":            "📄 קורות חיים",
            "linkedin":      "💼 פרופיל LinkedIn",
            "guidance":      "🎓 סיכום הנחיה תעסוקתית",
            "interview_prep":"🎤 הכנה לראיונות",
            "meeting_notes": "📝 סיכומי פגישות",
        }
        label = labels.get(ft, ft)

        with st.expander(f"{label} — {signals.get('source_file', '')}"):
            if ft == "cv":
                col1, col2 = st.columns(2)
                with col1:
                    st.markdown("**תפקידים שזוהו:**")
                    for r in signals.get("inferred_roles", []):
                        st.markdown(f"• {r}")
                    st.markdown(f"**רמת בכירות:** {signals.get('seniority', '—')}")
                with col2:
                    st.markdown("**תעשיות:**")
                    for ind in signals.get("industries", []):
                        st.markdown(f"• {ind}")
                    st.markdown("**מיומנויות מרכזיות:**")
                    kws = signals.get("keywords", [])
                    st.markdown(", ".join(kws[:10]) if kws else "—")
                gaps = signals.get("gaps", [])
                if gaps:
                    st.warning("**פערים שזוהו:** " + "; ".join(gaps))

            elif ft == "guidance":
                st.markdown("**מגזרים ממוקדים:**")
                st.markdown(", ".join(signals.get("focus_sectors", [])) or "—")
                constraints = signals.get("constraints", [])
                if constraints:
                    st.markdown("**אילוצים:**")
                    for c in constraints:
                        st.markdown(f"• {c.get('type', '')}: {c.get('excerpt', '')}")

            elif ft == "meeting_notes":
                col1, col2 = st.columns(2)
                with col1:
                    st.markdown(f"**רמת ביטחון עצמי:** {signals.get('confidence_level', '—')}")
                    st.markdown("**נושאים עיקריים:**")
                    for t in signals.get("themes", []):
                        st.markdown(f"• {t}")
                with col2:
                    st.markdown("**מחסומים שזוהו:**")
                    for b in signals.get("barriers", []):
                        st.markdown(f"• {b}")
                    goals = signals.get("goals", "")
                    if goals:
                        st.markdown(f"**מטרות:** {goals}")

            else:
                raw = signals.get("raw_text", "")
                if raw:
                    st.text_area("תוכן", raw[:600], height=120, disabled=True)
