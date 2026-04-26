"""
insights_engine.py — Rule-based career coaching insights engine.

Each rule returns an Insight object with:
  - observation  (what is happening)
  - reasoning    (why it matters)
  - action       (recommended next step)
  - priority     ('urgent' | 'important' | 'improve')
  - category     (for grouping)

The engine also generates a weekly action plan.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional

import pandas as pd

from config import THRESHOLDS, STATUSES, PRIORITIES

logger = logging.getLogger(__name__)


# ─── Insight Data Class ───────────────────────────────────────────────────────

@dataclass
class Insight:
    observation: str
    reasoning:   str
    action:      str
    priority:    str          # 'urgent' | 'important' | 'improve'
    category:    str          # 'consistency' | 'conversion' | 'positioning' | etc.
    icon:        str = "💡"

    def to_dict(self) -> dict:
        return {
            "תובנה":        self.observation,
            "למה זה חשוב":  self.reasoning,
            "פעולה מומלצת": self.action,
            "עדיפות":       PRIORITIES[self.priority]["label"],
            "קטגוריה":      self.category,
            "icon":         self.icon,
            "priority_key": self.priority,
        }


@dataclass
class WeeklyAction:
    action:   str
    priority: str   # 'urgent' | 'important' | 'improve'
    count:    Optional[int] = None   # numeric target if relevant


# ─── KPI Calculator ──────────────────────────────────────────────────────────

def compute_kpis(df: pd.DataFrame) -> dict:
    """Compute all KPI values from the normalised jobs DataFrame."""
    if df.empty:
        return {k: 0 for k in [
            "saved", "applied", "outreach", "followups", "interviews_scheduled",
            "in_process", "rejected", "accepted", "total", "active",
            "conversion_apply_pct", "conversion_interview_pct",
            "days_inactive", "stale_count", "overdue_followups",
        ]}

    today = date.today()
    status = df["current_status"]

    saved      = (status == "saved").sum()
    applied    = status.isin(["applied", "followup_sent",
                               "interview_scheduled", "first_interview",
                               "advanced_interview", "task_home",
                               "offer", "rejected", "accepted"]).sum()
    outreach   = (status == "proactive_outreach").sum()
    followups  = (status == "followup_sent").sum()
    interviews_sched = (status == "interview_scheduled").sum()
    in_process = status.isin(["first_interview", "advanced_interview",
                               "task_home", "offer"]).sum()
    rejected   = (status == "rejected").sum()
    accepted   = (status == "accepted").sum()
    total      = len(df)
    active     = status.apply(lambda s: STATUSES.get(s, {}).get("is_active", True)).sum()

    # Conversion ratios
    conv_apply   = round((applied / total * 100) if total else 0, 1)
    conv_ivw     = round(((interviews_sched + in_process) / applied * 100)
                         if applied > 0 else 0, 1)

    # Days since last activity (any date field updated recently)
    date_cols = ["date_saved", "date_applied", "last_followup_date"]
    all_dates = []
    for col in date_cols:
        if col in df.columns:
            all_dates += [d for d in df[col].dropna() if isinstance(d, date)]
    days_inactive = (today - max(all_dates)).days if all_dates else 999

    stale_count       = int(df.get("is_stale", pd.Series([False]*len(df))).sum())
    overdue_followups = int(df.get("followup_overdue", pd.Series([False]*len(df))).sum())

    return {
        "saved":                  int(saved),
        "applied":                int(applied),
        "outreach":               int(outreach),
        "followups":              int(followups),
        "interviews_scheduled":   int(interviews_sched),
    "in_process":             int(in_process),
        "rejected":               int(rejected),
        "accepted":               int(accepted),
        "total":                  int(total),
        "active":                 int(active),
        "conversion_apply_pct":   conv_apply,
        "conversion_interview_pct": conv_ivw,
        "days_inactive":          int(days_inactive),
        "stale_count":            stale_count,
        "overdue_followups":      overdue_followups,
    }


def compute_weekly_stats(df: pd.DataFrame) -> pd.DataFrame:
    """Return weekly aggregates: applications, interviews, responses."""
    if df.empty or "date_applied" not in df.columns:
        return pd.DataFrame()

    applied_df = df[df["date_applied"].notna()].copy()
    if applied_df.empty:
        return pd.DataFrame()

    applied_df["week"] = pd.to_datetime(applied_df["date_applied"]).dt.to_period("W")
    weekly = applied_df.groupby("week").agg(
        applications=("company_name", "count"),
        interviews=("current_status",
                    lambda s: s.isin(["interview_scheduled", "first_interview",
                                      "advanced_interview"]).sum()),
        responses=("response_received", lambda s: s.sum() if s.dtype == bool else
                   (s.astype(str).str.lower().isin(["true", "yes", "1", "כן"])).sum()),
    ).reset_index()
    weekly["week_str"] = weekly["week"].astype(str)
    return weekly


# ─── Individual Insight Rules ─────────────────────────────────────────────────

def _rule_inactivity(kpis: dict) -> Optional[Insight]:
    days = kpis["days_inactive"]
    crit = THRESHOLDS["days_inactive_critical"]
    warn = THRESHOLDS["days_inactive_warning"]

    if days >= crit:
        return Insight(
            observation=f"לא נרשמה פעילות חיפוש עבודה כבר {days} ימים",
            reasoning="רצף הוא המנוע העיקרי בחיפוש עבודה. הפסקות ארוכות מאטות מומנטום ומשאירות הזדמנויות קפואות.",
            action="קבע שעה קבועה מחר: בדוק 2 הגשות פתוחות, שלח פולואפ אחד, ושמור משרה חדשה אחת.",
            priority="urgent",
            category="consistency",
            icon="🛑",
        )
    if days >= warn:
        return Insight(
            observation=f"לא נרשמה פעילות חיפוש עבודה בשבוע האחרון ({days} ימים)",
            reasoning="קצב נמוך פוגע בסיכויי ההצלחה. שוק העבודה דורש נוכחות עקבית.",
            action="חדש פעילות היום: שלח לפחות פולואפ אחד ובדוק משרה חדשה אחת.",
            priority="important",
            category="consistency",
            icon="⚠️",
        )
    return None


def _rule_too_many_saved_not_applied(kpis: dict) -> Optional[Insight]:
    saved   = kpis["saved"]
    applied = kpis["applied"]
    total   = saved + applied
    if total < 5:
        return None

    ratio = saved / total if total else 0
    threshold = 1 - THRESHOLDS["saved_to_applied_ratio"]  # >50% saved = hesitation

    if ratio > threshold:
        return Insight(
            observation=f"{saved} משרות שמורות מתוך {total} — עדיין לא הוגשה מועמדות",
            reasoning="שמירת משרות ללא הגשה יוצרת אשליה של עשייה. חיפוש עבודה אמיתי מתחיל בהגשה.",
            action=f"עבור על המשרות השמורות הישן ביותר והגש לפחות 3 מהן היום. אם לא מתאימות — מחק.",
            priority="important",
            category="consistency",
            icon="📋",
        )
    return None


def _rule_low_interview_conversion(kpis: dict) -> Optional[Insight]:
    applied  = kpis["applied"]
    ivw_conv = kpis["conversion_interview_pct"]
    if applied < 8:
        return None  # not enough data

    low = THRESHOLDS["low_interview_conversion"] * 100  # percent

    if ivw_conv < low:
        return Insight(
            observation=f"רק {ivw_conv}% מההגשות הגיעו לשלב ראיון (מתחת לציפייה של {int(low * 2)}%)",
            reasoning="יחס המרה נמוך מאוד מצביע על בעיית פוזישיינינג: ייתכן שהקורות חיים לא מתאימים לתפקידים, או שהתפקידים אינם מתאימים לרקע.",
            action="בצע תהליך בדיקה: האם הקורות חיים מותאמים לכל הגשה? האם שורת הפתיחה חזקה? שקול ייעוץ מקצועי על הקו\"ח.",
            priority="urgent",
            category="positioning",
            icon="🎯",
        )

    good = THRESHOLDS["good_interview_conversion"] * 100
    if ivw_conv < good:
        return Insight(
            observation=f"יחס ההמרה מהגשות לראיון ({ivw_conv}%) נמוך מהממוצע הרצוי ({int(good)}%)",
            reasoning="יש מקום לשיפור. כל נקודת אחוז נוספת מגדילה את כמות הראיונות משמעותית.",
            action="התמקד בהתאמת קורות חיים לכל משרה. שקול לשוחח עם מגייסים על 'מה חסר'.",
            priority="important",
            category="positioning",
            icon="📊",
        )
    return None


def _rule_no_followups(kpis: dict, df: pd.DataFrame) -> Optional[Insight]:
    overdue = kpis["overdue_followups"]
    if overdue >= 3:
        return Insight(
            observation=f"{overdue} הגשות ללא פולואפ אחרי יותר מ-{THRESHOLDS['followup_overdue_days']} ימים",
            reasoning="פולואפ מעלה שיעור תגובה ב-30-40%. לרוב, מועמדים שלא עושים פולואפ 'נעלמים' מהרדאר.",
            action=f"שלח היום פולואפ מקצועי לכל {overdue} ההגשות הישנות. תבנית: 'ברצוני לחדש עניין — נשמח לדבר'.",
            priority="urgent",
            category="followup",
            icon="📬",
        )
    return None


def _rule_stale_opportunities(kpis: dict) -> Optional[Insight]:
    stale = kpis["stale_count"]
    if stale >= 4:
        return Insight(
            observation=f"{stale} משרות 'תקועות' ללא עדכון סטטוס מעל 3 שבועות",
            reasoning="משרות תקועות יוצרות עומס מנטלי ומסתירות את התמונה האמיתית. יש להכריע לגביהן.",
            action=f"עבור על המשרות התקועות: החל עליהן 'הקפאה' אם לא רלוונטיות, או שלח פולואפ אחרון.",
            priority="important",
            category="followup",
            icon="🧊",
        )
    return None


def _rule_too_broad_search(df: pd.DataFrame) -> Optional[Insight]:
    if "role_category" not in df.columns:
        return None
    categories = df["role_category"].replace("", pd.NA).dropna()
    unique_cats = categories.nunique()

    if unique_cats > THRESHOLDS["max_roles_variety"]:
        top = categories.value_counts().head(2).index.tolist()
        top_str = " / ".join(top)
        return Insight(
            observation=f"חיפוש עבודה פרוס על {unique_cats} קטגוריות תפקיד שונות",
            reasoning="חיפוש רחב מדי מדלל את המסר ומקשה על מגייסים להבין מה אתה/את רוצה. זה גם מייצר עייפות החלטה.",
            action=f"צמצם את החיפוש ל-2-3 תחומי ליבה. הנתונים מראים הכי הרבה פעילות ב: {top_str}.",
            priority="important",
            category="strategy",
            icon="🔎",
        )
    return None


def _rule_proactive_outreach_signal(df: pd.DataFrame) -> Optional[Insight]:
    """Check if proactive outreach is performing better than passive applications."""
    if df.empty:
        return None

    proactive = df[df["application_type"].isin(["proactive", "referral"])
                   if "application_type" in df.columns
                   else df["current_status"] == "proactive_outreach"]
    passive   = df[~df.index.isin(proactive.index)]

    def interview_rate(subset):
        if len(subset) == 0:
            return 0
        return subset["current_status"].isin([
            "interview_scheduled", "first_interview", "advanced_interview"
        ]).mean()

    if len(proactive) < 3 or len(passive) < 5:
        return None

    pro_rate  = interview_rate(proactive)
    pass_rate = interview_rate(passive)

    if pro_rate > pass_rate * 1.5:
        return Insight(
            observation=f"פניות יזומות מניבות ראיונות בשיעור גבוה פי 1.5 מהגשות פסיביות",
            reasoning="הנתונים שלך מראים שפנייה ישירה לחברות / אנשי קשר עובדת טוב יותר מהגשת מועמדות באתרים.",
            action="הכפל את הפניות היזומות: שלח לפחות 5 הודעות ישירות השבוע למנהלים רלוונטיים ב-LinkedIn.",
            priority="important",
            category="strategy",
            icon="🚀",
        )
    return None


def _rule_many_rejections(kpis: dict) -> Optional[Insight]:
    rejected = kpis["rejected"]
    applied  = kpis["applied"]
    if applied < 5:
        return None
    ratio = rejected / applied
    if ratio > THRESHOLDS["max_rejection_rate"]:
        return Insight(
            observation=f"{int(ratio * 100)}% מההגשות הסתיימו בדחייה — מעל הסף המדאיג",
            reasoning="שיעור דחייה גבוה עשוי להצביע על חוסר התאמה בין הפרופיל לדרישות, או על בעיה בקורות חיים.",
            action="קבע פגישת ניתוח: האם הדחיות מתרכזות בתפקיד/תעשייה מסוימת? שאל מגייס על הסיבות. שקול לעדכן קו\"ח.",
            priority="urgent",
            category="positioning",
            icon="🔴",
        )
    return None


def _rule_interview_bottleneck(kpis: dict) -> Optional[Insight]:
    in_process = kpis["in_process"]
    ivw_sched  = kpis["interviews_scheduled"]

    if in_process + ivw_sched < 2:
        return None

    # Check if there are interviews but no progression
    # (this is inferred from having first interviews but no advanced)
    return None  # placeholder; needs more granular data in future versions


def _rule_low_volume(kpis: dict, df: pd.DataFrame) -> Optional[Insight]:
    """Warn if overall application volume is very low."""
    if df.empty:
        return None
    applied = kpis["applied"]
    total   = kpis["total"]
    days_active = max((df["days_since_saved"].max() or 1), 1) if "days_since_saved" in df.columns else 1
    weeks_active = max(days_active / 7, 1)
    weekly_rate  = applied / weeks_active

    min_weekly = THRESHOLDS["min_weekly_applications"]
    if weekly_rate < min_weekly and total > 3:
        return Insight(
            observation=f"ממוצע הגשות שבועי: {weekly_rate:.1f} — מתחת ליעד מינימלי של {min_weekly} הגשות",
            reasoning="חיפוש עבודה הוא משחק מספרים. קצב נמוך מקטין משמעותית את הסיכוי למצוא הזדמנות בטווח הקרוב.",
            action=f"קבע יעד שבועי: לפחות {min_weekly} הגשות + {THRESHOLDS['min_outreach_per_week']} פניות יזומות. צור לוח זמנים יומי.",
            priority="important",
            category="consistency",
            icon="📅",
        )
    return None


def _rule_file_consistency(file_intelligence: dict) -> Optional[Insight]:
    """Check if CV positioning matches LinkedIn/guidance signals."""
    cv       = file_intelligence.get("cv", {})
    linkedin = file_intelligence.get("linkedin", {})
    guidance = file_intelligence.get("guidance", {})

    if not cv.get("loaded") and not linkedin.get("loaded"):
        return None

    # If LinkedIn text exists, check for consistency signal
    if linkedin.get("loaded") and cv.get("loaded"):
        cv_roles = set(cv.get("inferred_roles", []))
        if len(cv_roles) > 0:
            return Insight(
                observation="זוהתה אפשרות לחוסר עקביות בין פרופיל LinkedIn לקורות חיים",
                reasoning="מגייסים בודקים גם LinkedIn וגם קו\"ח. אם המסר שונה — זה יוצר חוסר אמון ובלבול לגבי הפוזישיינינג.",
                action="השווה ידנית בין כותרת LinkedIn, סיכום ה-About, לבין פתיחת קורות החיים. ודא שהמסר זהה.",
                priority="improve",
                category="positioning",
                icon="🔗",
            )
    return None


def _rule_missing_followup_system(df: pd.DataFrame, kpis: dict) -> Optional[Insight]:
    """Flag if many applications exist with no followup tracking."""
    applied_statuses = ["applied", "proactive_outreach"]
    applied_df = df[df["current_status"].isin(applied_statuses)]
    if len(applied_df) < 4:
        return None

    no_followup = applied_df["last_followup_date"].isna().sum()
    ratio = no_followup / len(applied_df)
    if ratio > (1 - THRESHOLDS["min_followup_rate"]):
        return Insight(
            observation=f"{int(no_followup)} הגשות ללא תיעוד פולואפ כלל ({int(ratio*100)}%)",
            reasoning="ללא מעקב, ההגשות 'נופלות בין הכסאות'. תיעוד פולואפ הוא אחד הגורמים החשובים ביותר להצלחה.",
            action="הקדש 15 דקות מחר לעדכן בטבלה את תאריכי הפולואפ. לאחר מכן — שלח פולואפ לכל משרה בת 7+ ימים.",
            priority="important",
            category="followup",
            icon="📝",
        )
    return None


def _rule_positive_momentum(kpis: dict) -> Optional[Insight]:
    """Generate a positive reinforcement insight when things are going well."""
    ivw_conv = kpis["conversion_interview_pct"]
    in_process = kpis["in_process"]

    if ivw_conv >= THRESHOLDS["good_interview_conversion"] * 100 and in_process >= 2:
        return Insight(
            observation=f"יחס המרה גבוה ({ivw_conv}%) ו-{in_process} תהליכים פעילים — המומנטום חיובי!",
            reasoning="כשדברים עובדים — חשוב להמשיך ולשמור על קצב, לא להתעייף ולא לעצור.",
            action="המשך את הקצב. וודא שכל תהליך פעיל מקבל פולואפ אקטיבי. הוסף 2-3 הגשות חדשות שבועיות לשמור על צינור מלא.",
            priority="improve",
            category="strategy",
            icon="🚀",
        )
    return None


# ─── Weekly Action Plan ───────────────────────────────────────────────────────

def generate_weekly_actions(kpis: dict, df: pd.DataFrame, insights: list[Insight]) -> list[WeeklyAction]:
    """Generate a prioritised weekly action list based on insights and KPIs."""
    actions = []

    overdue = kpis.get("overdue_followups", 0)
    if overdue > 0:
        actions.append(WeeklyAction(
            action=f"שלח פולואפ ל-{overdue} הגשות שחלפו יותר מ-7 ימים ללא מענה",
            priority="urgent",
            count=overdue,
        ))

    stale = kpis.get("stale_count", 0)
    if stale > 0:
        actions.append(WeeklyAction(
            action=f"עבור על {stale} משרות 'תקועות' — החלט: פולואפ אחרון, הקפאה, או מחיקה",
            priority="urgent",
            count=stale,
        ))

    if kpis["days_inactive"] > THRESHOLDS["days_inactive_warning"]:
        actions.append(WeeklyAction(
            action="חדש פעילות יומית: קבע שעה קבועה לחיפוש עבודה כל יום",
            priority="urgent",
        ))

    target_weekly = THRESHOLDS["min_weekly_applications"]
    actions.append(WeeklyAction(
        action=f"הגש לפחות {target_weekly} מועמדויות חדשות השבוע",
        priority="important",
        count=target_weekly,
    ))

    outreach_target = THRESHOLDS["min_outreach_per_week"]
    actions.append(WeeklyAction(
        action=f"שלח לפחות {outreach_target} פניות יזומות ב-LinkedIn לאנשי קשר רלוונטיים",
        priority="important",
        count=outreach_target,
    ))

    if kpis["conversion_interview_pct"] < THRESHOLDS["low_interview_conversion"] * 100:
        actions.append(WeeklyAction(
            action="בצע עדכון קורות חיים: התאם לפחות 3 הגשות קרובות לדרישות הספציפיות",
            priority="important",
        ))

    # Category-specific insight actions
    categories_in_insights = {i.category for i in insights}
    if "positioning" in categories_in_insights:
        actions.append(WeeklyAction(
            action="עדכן את כותרת LinkedIn ותקציר קורות החיים — ודא פוזישיינינג עקבי ובהיר",
            priority="improve",
        ))

    if "strategy" in categories_in_insights:
        actions.append(WeeklyAction(
            action="צמצם חיפוש ל-2-3 כותרות תפקיד ממוקדות לפני הגשת משרות חדשות",
            priority="improve",
        ))

    actions.append(WeeklyAction(
        action="עיין בדחיות האחרונות — זהה מגמות ותקן בהתאם",
        priority="improve",
    ))

    return actions


# ─── Alerts ──────────────────────────────────────────────────────────────────

@dataclass
class Alert:
    message:  str
    severity: str   # 'critical' | 'warning' | 'info'
    icon:     str


def generate_alerts(kpis: dict, df: pd.DataFrame) -> list[Alert]:
    """Generate operational alerts for the alerts panel."""
    alerts = []

    if kpis["days_inactive"] >= THRESHOLDS["days_inactive_critical"]:
        alerts.append(Alert(
            message=f"לא נרשמה פעילות כבר {kpis['days_inactive']} ימים!",
            severity="critical", icon="🛑",
        ))

    elif kpis["days_inactive"] >= THRESHOLDS["days_inactive_warning"]:
        alerts.append(Alert(
            message=f"שבוע ללא פעילות ({kpis['days_inactive']} ימים) — זמן לחזור לפעולה",
            severity="warning", icon="⚠️",
        ))

    if kpis["overdue_followups"] >= 3:
        alerts.append(Alert(
            message=f"{kpis['overdue_followups']} הגשות ממתינות לפולואפ שעבר מועדו",
            severity="critical", icon="📬",
        ))
    elif kpis["overdue_followups"] > 0:
        alerts.append(Alert(
            message=f"{kpis['overdue_followups']} הגשות דורשות פולואפ",
            severity="warning", icon="📩",
        ))

    if kpis["stale_count"] >= 4:
        alerts.append(Alert(
            message=f"{kpis['stale_count']} משרות ללא עדכון מעל 3 שבועות",
            severity="warning", icon="🧊",
        ))

    if kpis["saved"] > kpis["applied"] * 2 and kpis["saved"] > 5:
        alerts.append(Alert(
            message=f"יש לך {kpis['saved']} משרות שמורות שעדיין לא הוגשת — תתחיל להגיש!",
            severity="warning", icon="📋",
        ))

    if kpis["conversion_interview_pct"] < THRESHOLDS["low_interview_conversion"] * 100 \
       and kpis["applied"] > 8:
        alerts.append(Alert(
            message="יחס המרה נמוך מאוד מהגשות לראיונות — בדוק פוזישיינינג וקורות חיים",
            severity="critical", icon="🎯",
        ))

    if not alerts:
        alerts.append(Alert(
            message="אין התראות פעילות — כל הכבוד, המעקב שלך מסודר! 🎉",
            severity="info", icon="✅",
        ))

    return alerts


# ─── Master Engine ────────────────────────────────────────────────────────────

class InsightsEngine:
    """
    Orchestrates the full insights pipeline.
    Takes a normalised DataFrame + file intelligence dict.
    Returns KPIs, insights, weekly actions, alerts.
    """

    def __init__(self, df: pd.DataFrame, file_intelligence: Optional[dict] = None):
        self.df   = df
        self.fi   = file_intelligence or {}
        self.kpis = compute_kpis(df)

    def run(self) -> dict:
        insights = self._collect_insights()
        weekly   = generate_weekly_actions(self.kpis, self.df, insights)
        alerts   = generate_alerts(self.kpis, self.df)
        weekly_stats = compute_weekly_stats(self.df)

        return {
            "kpis":          self.kpis,
            "insights":      [i.to_dict() for i in insights],
            "weekly_actions": [{"פעולה": w.action,
                                "עדיפות": w.priority,
                                "מספר": w.count} for w in weekly],
            "alerts":        alerts,
            "weekly_stats":  weekly_stats,
        }

    def _collect_insights(self) -> list[Insight]:
        rules = [
            _rule_inactivity(self.kpis),
            _rule_too_many_saved_not_applied(self.kpis),
            _rule_low_interview_conversion(self.kpis),
            _rule_no_followups(self.kpis, self.df),
            _rule_stale_opportunities(self.kpis),
            _rule_too_broad_search(self.df),
            _rule_proactive_outreach_signal(self.df),
            _rule_many_rejections(self.kpis),
            _rule_low_volume(self.kpis, self.df),
            _rule_file_consistency(self.fi),
            _rule_missing_followup_system(self.df, self.kpis),
            _rule_positive_momentum(self.kpis),
        ]
        # Filter None results and sort: urgent first
        priority_order = {"urgent": 0, "important": 1, "improve": 2}
        valid = [r for r in rules if r is not None]
        valid.sort(key=lambda i: priority_order.get(i.priority, 9))
        return valid
