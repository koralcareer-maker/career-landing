"""
sample_data.py — Generates realistic Hebrew dummy data for testing the dashboard
without a real Google Drive connection.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random


def generate_sample_jobs(n: int = 35, seed: int = 42) -> pd.DataFrame:
    """Return a DataFrame of realistic sample job applications."""
    random.seed(seed)
    np.random.seed(seed)

    companies = [
        "Microsoft Israel", "Google Israel", "Amazon AWS", "Meta", "Apple",
        "Wix", "Monday.com", "Check Point", "CyberArk", "Amdocs",
        "Fiverr", "IronSource", "Outbrain", "Varonis", "SentinelOne",
        "Salesforce", "SAP Israel", "IBM Israel", "Cisco Israel", "NICE Systems",
        "Radcom", "AudioCodes", "Ceragon", "Allot", "Silicom",
        "JFrog", "Kaltura", "AppsFlyer", "Taboola", "Similarweb",
        "ECI Telecom", "Akamai Israel", "Comverse", "Elbit Systems", "Rafael",
    ]

    roles_by_category = {
        "ניהול פרויקטים": ["Project Manager", "Program Manager", "IT Project Manager", "Technical PM"],
        "ניהול מוצר": ["Product Manager", "Senior Product Manager", "Product Owner", "Group PM"],
        "ניתוח עסקי": ["Business Analyst", "Systems Analyst", "Data Analyst", "BI Analyst"],
        "Customer Success": ["Customer Success Manager", "Account Manager", "CS Team Lead"],
        "תפעול": ["Operations Manager", "Operations Analyst", "Process Manager", "COO"],
    }

    sources = ["LinkedIn", "Drushim", "AllJobs", "Indeed", "Company Website",
               "Referral", "Recruiter", "Networking", "פנייה יזומה", "Glassdoor"]

    application_types = ["passive", "proactive", "referral", "recruiter"]

    status_pool = [
        ("saved",               0.12),
        ("fit_checked",         0.08),
        ("applied",             0.20),
        ("proactive_outreach",  0.08),
        ("followup_sent",       0.12),
        ("interview_scheduled", 0.08),
        ("first_interview",     0.08),
        ("advanced_interview",  0.04),
        ("task_home",           0.02),
        ("offer",               0.02),
        ("rejected",            0.12),
        ("frozen",              0.03),
        ("accepted",            0.01),
    ]
    statuses, weights = zip(*status_pool)

    today = datetime.today()
    rows = []

    for i in range(n):
        category = random.choice(list(roles_by_category.keys()))
        role = random.choice(roles_by_category[category])
        company = random.choice(companies)
        source = random.choice(sources)
        status = random.choices(statuses, weights=weights, k=1)[0]
        app_type = random.choice(application_types)

        # Dates — spread over last 8 weeks
        date_saved = today - timedelta(days=random.randint(1, 56))
        date_applied = None
        last_followup = None
        interview_stage = None
        response_received = False
        final_outcome = None

        from config import STATUSES
        status_order = STATUSES[status]["order"]

        if status_order >= 3:  # applied or further
            date_applied = date_saved + timedelta(days=random.randint(0, 5))

        if status_order >= 5:  # followup sent or further
            last_followup = date_applied + timedelta(days=random.randint(5, 10)) if date_applied else None
            response_received = True

        if status_order >= 6:  # interview scheduled or further
            interview_stage = "ראיון ראשון" if status_order >= 7 else "זימון"

        if status_order >= 8:
            interview_stage = "ראיון מתקדם"

        if status in ("rejected",):
            final_outcome = "נדחה"
        elif status == "accepted":
            final_outcome = "התקבל!"

        # Next action
        next_actions_by_status = {
            "saved":               "לבדוק התאמה ולהגיש",
            "fit_checked":         "להגיש מועמדות",
            "applied":             "לשלוח פולואפ",
            "proactive_outreach":  "לעקוב אחר תגובה",
            "followup_sent":       "להמתין / לשלוח פולואפ נוסף",
            "interview_scheduled": "להתכונן לראיון",
            "first_interview":     "לשלוח תודה / פולואפ",
            "advanced_interview":  "לחכות לתגובה",
            "task_home":           "לשלוח את המשימה",
            "offer":               "לנהל משא ומתן",
        }
        next_action = next_actions_by_status.get(status, "")
        next_action_date = today + timedelta(days=random.randint(1, 7)) if next_action else None

        notes_pool = [
            "נראה מעניין, חברה שצומחת מהר",
            "משרה טובה אבל דורשת 5+ שנים ניסיון",
            "ה-HR נראה מאוד רספונסיבי",
            "דרשו קורות חיים מותאמים",
            "מגייס מ-LinkedIn פנה אליי",
            "הראיון היה נעים, הרגשתי בנוח",
            "לא ענו על פניות - כנראה לא פעיל",
            "משרה בתחום שמעניין אותי מאוד",
            "",
            "",
            "",
        ]

        rows.append({
            "company_name":       company,
            "role_title":         role,
            "source":             source,
            "job_link":           f"https://linkedin.com/jobs/{random.randint(100000, 999999)}",
            "date_saved":         date_saved.strftime("%Y-%m-%d"),
            "date_applied":       date_applied.strftime("%Y-%m-%d") if date_applied else "",
            "current_status":     status,
            "contact_name":       random.choice(["", "דנה לוי", "יוסי כהן", "מיכל שרון", "אורן גרין", ""]),
            "contact_linkedin":   "",
            "last_followup_date": last_followup.strftime("%Y-%m-%d") if last_followup else "",
            "next_action":        next_action,
            "next_action_date":   next_action_date.strftime("%Y-%m-%d") if next_action_date else "",
            "notes":              random.choice(notes_pool),
            "role_category":      category,
            "application_type":   app_type,
            "response_received":  response_received,
            "interview_stage":    interview_stage or "",
            "final_outcome":      final_outcome or "",
        })

    return pd.DataFrame(rows)


def get_sample_trainee_profile() -> dict:
    """Return sample profile metadata for the dummy trainee."""
    return {
        "name":          "נועה כהן",
        "target_roles":  "Project Manager / Product Manager",
        "seniority":     "מנהלת בכירה, 7+ שנות ניסיון",
        "industries":    "טכנולוגיה, SaaS, FinTech",
        "strengths":     "ניהול תהליכים, עבודה בסביבות Agile, שיתוף פעולה בין-ארגוני",
        "constraints":   "לא מעוניינת ב-Relocate. מחפשת היברידי לפחות 3 ימים מהבית.",
        "start_date":    (datetime.today() - timedelta(weeks=8)).strftime("%Y-%m-%d"),
    }


def get_sample_file_insights() -> dict:
    """Return simulated signals extracted from supporting files (CV, LinkedIn, etc.)."""
    return {
        "cv": {
            "loaded": True,
            "inferred_roles": ["Project Manager", "Program Manager", "Product Owner"],
            "seniority": "Senior",
            "industries": ["Tech", "SaaS", "Consulting"],
            "keywords": ["Agile", "Scrum", "Stakeholder Management", "OKRs", "Roadmap"],
            "gaps": ["ניסיון ישיר ב-Product Management לא בא לידי ביטוי ברור"],
        },
        "linkedin": {
            "loaded": True,
            "headline": "Senior Project Manager | SaaS | Agile",
            "consistency": "בינונית - הכותרת ב-LinkedIn מדגישה PM, הקורות חיים מדגישים תפעול",
            "recommendations": "עדכן כותרת ל-LinkedIn להתאים את הפוזישיינינג המרכזי",
        },
        "guidance": {
            "loaded": True,
            "focus_sectors": ["Tech", "FinTech", "Scale-ups"],
            "constraints": ["לא ליישובים מחוץ למרכז", "שכר מינימום: 30,000₪"],
            "notes": "מחפשת תפקיד עם השפעה ותקציב. פחות מעוניינת בתפקידים 'מבצעיים' בלבד.",
        },
        "interview_prep": {
            "loaded": True,
            "recurring_concerns": ["שאלות STAR", "ניהול קונפליקטים", "הגדרת הצלחה בתפקיד"],
            "signals": "ייתכן שהכנה לראיונות טכניים חסרה - אין מסמך הכנה ל-PM interviews",
        },
        "meeting_notes": {
            "loaded": True,
            "themes": ["אמביוולנטיות לגבי Product vs. Project", "ביטחון עצמי גבוה בשלבי ראיון ראשוניים",
                       "חשש מדחיות"],
            "goals": "להיכנס לחברה שצומחת ומאפשרת קידום מהיר בתוך שנה",
            "barriers": ["קשה לקבל החלטה על מיקוד בין Product ל-Project",
                         "נוטה להגיש למשרות רבות מדי בלי מיקוד"],
        },
    }
