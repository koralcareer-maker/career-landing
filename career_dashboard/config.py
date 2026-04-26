"""
config.py — Configuration, column mappings, status definitions, thresholds, and UI constants.
All UI-facing strings are in Hebrew.
"""

# ─── Column Mapping ───────────────────────────────────────────────────────────
# Maps canonical English field names → list of acceptable Hebrew/English variations
COLUMN_MAPPINGS = {
    "company_name":      ["company_name", "חברה", "שם חברה", "שם האירגון", "ארגון", "company", "employer", "organization"],
    "role_title":        ["role_title", "תפקיד", "שם תפקיד", "שם המשרה", "role", "position", "job_title", "title"],
    "source":            ["source", "מקור", "מקור המשרה", "אופן פניה", "job_source", "channel", "ערוץ"],
    "job_link":          ["job_link", "לינק", "קישור", "קישור למשרה", "link", "url", "job_url"],
    "date_saved":        ["date_saved", "תאריך שמירה", "saved_date", "date_added", "תאריך הוספה"],
    "date_applied":      ["date_applied", "תאריך הגשה", "תאריך הגשת מעומדות", "תאריך הגשת מועמדות",
                          "applied_date", "submission_date", "תאריך פנייה"],
    "current_status":    ["current_status", "סטטוס", "status", "current_stage", "שלב", "stage"],
    "contact_name":      ["contact_name", "איש קשר", "פרטי קשר למעקב", "contact", "recruiter", "מגייס", "hr"],
    "contact_linkedin":  ["contact_linkedin", "לינקדאין קשר", "contact_profile", "contact_link"],
    "last_followup_date":["last_followup_date", "תאריך פולואפ אחרון", "תאריך יצירת קשר איתי",
                          "followup_date", "last_follow_up", "פולואפ אחרון"],
    "next_action":       ["next_action", "פעולה הבאה", "action", "next_step", "todo", "פעולה"],
    "next_action_date":  ["next_action_date", "תאריך פעולה הבאה", "due_date", "action_date", "deadline"],
    "notes":             ["notes", "הערות", "הערות/פרטים חשובים קשורים למשרה", "comments", "remarks", "memo", "פרטים"],
    "role_category":     ["role_category", "קטגוריית תפקיד", "category", "job_category", "קטגוריה"],
    "application_type":  ["application_type", "סוג פנייה", "type", "outreach_type", "סוג"],
    "response_received": ["response_received", "קיבלתי תגובה", "response", "got_response", "תגובה"],
    "interview_stage":   ["interview_stage", "שלב ראיון", "interview_level", "interview_round"],
    "final_outcome":     ["final_outcome", "תוצאה סופית", "outcome", "result", "תוצאה"],
}

# ─── Status Definitions ───────────────────────────────────────────────────────
# order = pipeline position; is_active = counts toward active pipeline
STATUSES = {
    "saved":               {"label": "נשמרה משרה",     "color": "#B0BEC5", "order": 1,  "is_active": True},
    "fit_checked":         {"label": "נבדקה התאמה",    "color": "#90CAF9", "order": 2,  "is_active": True},
    "applied":             {"label": "הוגשה מועמדות",  "color": "#42A5F5", "order": 3,  "is_active": True},
    "proactive_outreach":  {"label": "פנייה יזומה",    "color": "#29B6F6", "order": 4,  "is_active": True},
    "followup_sent":       {"label": "נשלח פולואפ",    "color": "#FFA726", "order": 5,  "is_active": True},
    "interview_scheduled": {"label": "זימון לראיון",   "color": "#66BB6A", "order": 6,  "is_active": True},
    "first_interview":     {"label": "ראיון ראשון",    "color": "#4CAF50", "order": 7,  "is_active": True},
    "advanced_interview":  {"label": "ראיון מתקדם",    "color": "#2E7D32", "order": 8,  "is_active": True},
    "task_home":           {"label": "משימה / בית",    "color": "#AB47BC", "order": 9,  "is_active": True},
    "offer":               {"label": "הצעה",            "color": "#FF9800", "order": 10, "is_active": True},
    "rejected":            {"label": "נדחה",            "color": "#EF5350", "order": 11, "is_active": False},
    "frozen":              {"label": "הוקפא",           "color": "#78909C", "order": 12, "is_active": False},
    "accepted":            {"label": "התקבל",           "color": "#1B5E20", "order": 13, "is_active": False},
}

# Reverse lookup: Hebrew label → canonical key
STATUS_LABEL_TO_KEY = {v["label"]: k for k, v in STATUSES.items()}
STATUS_LABELS = [v["label"] for v in STATUSES.values()]

# Hebrew status synonyms that appear in raw files
STATUS_SYNONYMS = {
    "נשמר":              "saved",
    "שמור":              "saved",
    "נשמרה":             "saved",
    "נבדק":              "fit_checked",
    "נבדקה":             "fit_checked",
    "הוגש":              "applied",
    "הוגשה":             "applied",
    "הגשה":              "applied",
    "applied":           "applied",
    "פנייה יזומה":       "proactive_outreach",
    "יזום":              "proactive_outreach",
    "פולואפ":            "followup_sent",
    "follow up":         "followup_sent",
    "follow-up":         "followup_sent",
    "זומן":              "interview_scheduled",
    "זימון":             "interview_scheduled",
    "ראיון ראשון":       "first_interview",
    "ראיון":             "first_interview",
    "ראיון שני":         "advanced_interview",
    "ראיון שלישי":       "advanced_interview",
    "מתקדם":             "advanced_interview",
    "מטלה":              "task_home",
    "בית":               "task_home",
    "הצעה":              "offer",
    "offer":             "offer",
    "נדחה":              "rejected",
    "rejected":          "rejected",
    "דחייה":             "rejected",
    "הוקפא":             "frozen",
    "frozen":            "frozen",
    "עצור":              "frozen",
    "התקבל":             "accepted",
    "accepted":          "accepted",
    "קיבלתי":            "accepted",
}

# ─── Insight Thresholds ───────────────────────────────────────────────────────
THRESHOLDS = {
    "days_inactive_warning":     7,    # days without any activity → warning
    "days_inactive_critical":    14,   # days without any activity → critical
    "followup_overdue_days":     7,    # days after apply → followup should have happened
    "stale_opportunity_days":    21,   # days without any status change → stale
    "min_weekly_applications":   5,    # minimum expected applications per week
    "good_interview_conversion": 0.15, # 15%+ application→interview = healthy
    "low_interview_conversion":  0.05, # <5% application→interview = concerning
    "min_followup_rate":         0.60, # 60%+ of applies should have followup
    "max_rejection_rate":        0.55, # >55% rejections = potential issue
    "saved_to_applied_ratio":    0.50, # <50% saved→applied = hesitation
    "min_outreach_per_week":     3,    # minimum proactive outreach per week
    "max_roles_variety":         5,    # >5 distinct role types = too broad
}

# ─── Job Sources ──────────────────────────────────────────────────────────────
JOB_SOURCES = [
    "LinkedIn", "Indeed", "Drushim", "AllJobs", "Glassdoor",
    "Company Website", "Referral", "Recruiter", "Networking",
    "JobMaster", "פנייה יזומה", "Facebook", "אחר",
]

# ─── Priority Labels ──────────────────────────────────────────────────────────
PRIORITIES = {
    "urgent":    {"label": "⚡ דחוף",    "color": "#EF5350"},
    "important": {"label": "⚠️ חשוב",    "color": "#FF9800"},
    "improve":   {"label": "💡 לשיפור",  "color": "#42A5F5"},
}

# ─── File Classification Keywords ─────────────────────────────────────────────
FILE_TYPE_KEYWORDS = {
    "tracking": {
        "extensions": [".xlsx", ".xls", ".csv"],
        "name_keywords": ["job", "track", "application", "search", "משרות", "חיפוש", "מעקב", "jobs"],
    },
    "cv": {
        "extensions": [".pdf", ".docx", ".doc"],
        "name_keywords": ["cv", "resume", "curriculum", "קורות חיים", "קוח", "rez", "vitae"],
    },
    "linkedin": {
        "extensions": [".pdf", ".docx", ".txt"],
        "name_keywords": ["linkedin", "לינקדאין", "profile", "פרופיל"],
    },
    "guidance": {
        "extensions": [".pdf", ".docx", ".txt"],
        "name_keywords": ["guidance", "summary", "סיכום", "הנחיה", "employment", "תעסוקה", "coaching", "ליווי"],
    },
    "interview_prep": {
        "extensions": [".pdf", ".docx", ".txt"],
        "name_keywords": ["interview", "ראיון", "prep", "הכנה", "שאלות", "questions"],
    },
    "meeting_notes": {
        "extensions": [".pdf", ".docx", ".txt"],
        "name_keywords": ["meeting", "פגישה", "notes", "סיכום פגישה", "session", "שיחה"],
    },
}

# ─── UI Texts (Hebrew) ────────────────────────────────────────────────────────
UI = {
    "app_title":             "לוח הבקרה של חיפוש העבודה",
    "app_subtitle":          "מרכז הניהול האישי לחיפוש עבודה",
    "kpi_saved":             "משרות שנשמרו",
    "kpi_applied":           "משרות שהוגשו",
    "kpi_outreach":          "פניות יזומות",
    "kpi_followups":         "פולואפים שבוצעו",
    "kpi_interviews":        "זימונים לראיונות",
    "kpi_in_process":        "ראיונות בתהליך",
    "kpi_rejected":          "דחיות",
    "kpi_apply_conversion":  "% הגשות מתוך שמורות",
    "kpi_interview_conv":    "% ראיונות מתוך הגשות",
    "kpi_days_inactive":     "ימים ללא פעילות",
    "kpi_stale":             'משרות "תקועות"',
    "section_header":        "סקירה כללית",
    "section_pipeline":      "צינור המועמדויות",
    "section_jobs_table":    "טבלת המשרות",
    "section_insights":      "תובנות מאמן הקריירה",
    "section_actions":       "פעולות מומלצות לשבוע הבא",
    "section_charts":        "מגמות ונתונים",
    "section_alerts":        "התראות פעילות",
    "section_files":         "מקורות מידע שנטענו",
    "no_data":               "אין מידע זמין",
    "loading":               "טוען נתונים...",
    "save_success":          "✅ השינויים נשמרו בהצלחה",
    "save_error":            "❌ שגיאה בשמירת הנתונים",
    "add_job":               "הוספת משרה חדשה",
    "edit_save":             "שמור שינויים",
    "export_excel":          "ייצוא לאקסל",
    "connect_drive":         "התחברות ל-Google Drive",
    "use_sample":            "השתמש בנתוני דמו",
    "trainee_name":          "שם המועמד/ת",
    "target_role":           "תפקיד יעד",
    "search_stage":          "שלב חיפוש",
    "last_activity":         "פעילות אחרונה",
    "momentum":              "מומנטום",
    "momentum_high":         "גבוה 🚀",
    "momentum_medium":       "בינוני 📈",
    "momentum_low":          "נמוך ⚠️",
    "momentum_stalled":      "מועד 🛑",
}

# ─── Column Display Labels (for editable table) ───────────────────────────────
COLUMN_DISPLAY = {
    "company_name":       "חברה",
    "role_title":         "תפקיד",
    "source":             "מקור",
    "job_link":           "לינק",
    "date_saved":         "תאריך שמירה",
    "date_applied":       "תאריך הגשה",
    "current_status":     "סטטוס",
    "contact_name":       "איש קשר",
    "last_followup_date": "פולואפ אחרון",
    "next_action":        "פעולה הבאה",
    "next_action_date":   "תאריך פעולה",
    "notes":              "הערות",
    "role_category":      "קטגוריה",
    "application_type":   "סוג פנייה",
    "response_received":  "קיבלתי תגובה",
    "interview_stage":    "שלב ראיון",
    "final_outcome":      "תוצאה",
}

# Canonical columns in display order
TABLE_COLUMNS = [
    "company_name", "role_title", "source", "current_status",
    "date_saved", "date_applied", "last_followup_date",
    "next_action", "next_action_date", "contact_name",
    "response_received", "interview_stage", "notes",
]
