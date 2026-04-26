# Career Progress Dashboard — לוח הבקרה של חיפוש העבודה

A production-ready Hebrew job search dashboard for career coaches and trainees.  
Combines a job search CRM, real-time career coaching insights, and a visual progress tracker.

---

## Features

| Section | What it does |
|---|---|
| **Profile Header** | Shows trainee name, target role, momentum level, and last activity |
| **KPI Cards** | 10 key performance metrics at a glance |
| **Pipeline Chart** | Horizontal funnel showing applications across all status stages |
| **Editable Jobs Table** | Full CRUD table with filters, search, and inline status editing |
| **Coach Insights Panel** | Rule-based career coaching observations with priority levels |
| **Weekly Action Plan** | Prioritised next-step recommendations |
| **Charts & Trends** | Weekly activity, source performance, category breakdowns |
| **Alerts** | Operational alerts for inactivity, stale jobs, overdue followups |
| **File Intelligence** | Signals extracted from CV, LinkedIn, meeting notes, and guidance files |
| **Export** | Download as Excel or CSV with timestamped backups |

---

## Quick Start

### 1. Install dependencies

```bash
cd career_dashboard
pip install -r requirements.txt
```

### 2. Run with sample data (no Google Drive needed)

```bash
streamlit run app.py
```

The app opens at `http://localhost:8501` with built-in demo data.

---

## Google Drive Integration

### Option A — Service Account (recommended for deployment)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → Create a project
2. Enable **Google Drive API**
3. Create a **Service Account** → Download the JSON key
4. Place the JSON file at `credentials/service_account.json`
5. Share the trainee's Drive folder with the service account email (Viewer permission)
6. In the dashboard sidebar: select **Google Drive**, paste the folder URL/ID, select "Service Account"

### Option B — OAuth2 (for local personal use)

1. In Google Cloud Console → Enable Drive API
2. Create **OAuth 2.0 Client ID** → Desktop app → Download JSON
3. Place the JSON file at `credentials/oauth_credentials.json`
4. In the dashboard sidebar: select "OAuth2" auth method
5. A browser window will open for Google sign-in on first run

---

## Recommended Drive Folder Structure

```
📂 [Trainee Name] — Job Search
 ├── 📊 job_tracking.xlsx        ← Main tracking spreadsheet
 ├── 📄 CV_firstname.pdf          ← Resume / CV
 ├── 💼 linkedin_profile.pdf      ← LinkedIn profile summary
 ├── 🎓 guidance_summary.docx    ← Employment guidance summary
 ├── 🎤 interview_prep.docx      ← Interview preparation notes
 └── 📝 meeting_notes.docx       ← Session / meeting notes
```

Files are auto-classified by name keywords. The app is tolerant of different naming conventions.

---

## Job Tracking File Schema

The tracking spreadsheet can use **English or Hebrew column headers**.

| English Column | Hebrew Column | Type | Required |
|---|---|---|---|
| `company_name` | חברה | Text | ✅ |
| `role_title` | תפקיד | Text | ✅ |
| `source` | מקור | Text | |
| `job_link` | לינק | URL | |
| `date_saved` | תאריך שמירה | Date (YYYY-MM-DD) | |
| `date_applied` | תאריך הגשה | Date | |
| `current_status` | סטטוס | See status list | ✅ |
| `contact_name` | איש קשר | Text | |
| `contact_linkedin` | לינקדאין קשר | URL | |
| `last_followup_date` | תאריך פולואפ אחרון | Date | |
| `next_action` | פעולה הבאה | Text | |
| `next_action_date` | תאריך פעולה הבאה | Date | |
| `notes` | הערות | Text | |
| `role_category` | קטגוריית תפקיד | Text | |
| `application_type` | סוג פנייה | proactive/passive/referral | |
| `response_received` | קיבלתי תגובה | Yes/No | |
| `interview_stage` | שלב ראיון | Text | |
| `final_outcome` | תוצאה סופית | Text | |

### Supported Status Values

| Key | Hebrew Label |
|---|---|
| `saved` | נשמרה משרה |
| `fit_checked` | נבדקה התאמה |
| `applied` | הוגשה מועמדות |
| `proactive_outreach` | פנייה יזומה |
| `followup_sent` | נשלח פולואפ |
| `interview_scheduled` | זימון לראיון |
| `first_interview` | ראיון ראשון |
| `advanced_interview` | ראיון מתקדם |
| `task_home` | משימה / בית |
| `offer` | הצעה |
| `rejected` | נדחה |
| `frozen` | הוקפא |
| `accepted` | התקבל |

---

## Architecture

```
career_dashboard/
├── app.py               # Main Streamlit application
├── config.py            # All constants, mappings, thresholds
├── drive_connector.py   # Google Drive API wrapper
├── file_parser.py       # Parse Excel/CSV/PDF/DOCX/TXT files
├── data_normalizer.py   # Clean and normalise raw data
├── insights_engine.py   # Rule-based coaching insights
├── ui_components.py     # Streamlit UI building blocks
├── sample_data.py       # Demo data generator
├── requirements.txt
├── README.md
├── credentials/         # Place Google JSON files here (gitignored)
└── exports/             # Auto-created; stores Excel backups
```

---

## Insight Rules Summary

| Rule | Trigger | Priority |
|---|---|---|
| Inactivity | >7 days no activity | Urgent / Important |
| Many saved, few applied | >50% of jobs still saved | Important |
| Low interview conversion | <5% applications → interviews | Urgent |
| Overdue followups | Applied >7 days, no followup | Urgent |
| Stale opportunities | >21 days without status update | Important |
| Too broad search | >5 role categories | Important |
| Proactive outreach signal | Outreach outperforms passive | Important |
| High rejection rate | >55% rejections | Urgent |
| Low application volume | <5 applications/week avg | Important |
| File consistency | CV ↔ LinkedIn positioning mismatch | Improve |
| Missing followup system | <60% of applies tracked | Important |
| Positive momentum | High conversion + active processes | Improve |

---

## Deployment

### Streamlit Community Cloud

1. Push the project to GitHub (add `credentials/` to `.gitignore`)
2. Go to [share.streamlit.io](https://share.streamlit.io) → New app
3. Add Google credentials as **Streamlit Secrets** (see `st.secrets` docs)
4. In `drive_connector.py`, add a branch to load from `st.secrets` when available

### Docker (optional)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8501
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

---

## Configuration

All thresholds, status definitions, and UI text are in `config.py`.  
Edit that file to adjust:
- Alert thresholds (days inactive, conversion rates, etc.)
- Status pipeline stages
- Column name mappings
- Hebrew UI strings

---

## License

MIT — free to use and adapt for career coaching practices.
