"""
file_parser.py — Parses files from the trainee's Drive folder.

Handles: .xlsx, .xls, .csv, .pdf, .docx, .txt
Classifies files by likely purpose based on name and content.
Extracts text signals from unstructured documents.
"""

import re
import logging
from pathlib import Path
from typing import Optional

import pandas as pd

from config import FILE_TYPE_KEYWORDS

logger = logging.getLogger(__name__)

# ─── Optional import wrappers ─────────────────────────────────────────────────

def _try_pdfplumber():
    try:
        import pdfplumber
        return pdfplumber
    except ImportError:
        return None

def _try_pypdf2():
    try:
        import PyPDF2
        return PyPDF2
    except ImportError:
        return None

def _try_docx():
    try:
        from docx import Document
        return Document
    except ImportError:
        return None


# ─── File Classification ──────────────────────────────────────────────────────

def classify_file(file_path: Path) -> str:
    """
    Classify a file into one of: tracking, cv, linkedin, guidance,
    interview_prep, meeting_notes, or 'unknown'.
    Uses file name keywords + extension matching.
    """
    name_lower = file_path.name.lower()
    suffix = file_path.suffix.lower()

    scores = {}
    for file_type, rules in FILE_TYPE_KEYWORDS.items():
        score = 0
        if suffix in rules["extensions"]:
            score += 1
        for kw in rules["name_keywords"]:
            if kw.lower() in name_lower:
                score += 3  # name match is stronger signal
        scores[file_type] = score

    best_type = max(scores, key=scores.get)
    if scores[best_type] == 0:
        return "unknown"
    return best_type


def classify_all_files(paths: list[Path]) -> dict[str, list[Path]]:
    """
    Given a list of paths, classify each and return a dict:
    {file_type: [paths]}
    """
    result: dict[str, list[Path]] = {}
    for p in paths:
        ft = classify_file(p)
        result.setdefault(ft, []).append(p)
    return result


# ─── Tracking File Parser ─────────────────────────────────────────────────────

def _find_header_row(raw_df: pd.DataFrame) -> int:
    """
    Scan a DataFrame (read with header=None) to find the row index that
    looks most like a column-header row: has the most non-null, non-numeric
    string cells. Returns that row index (0-based).
    """
    from config import COLUMN_MAPPINGS
    all_known_words = set()
    for variants in COLUMN_MAPPINGS.values():
        all_known_words.update(v.lower() for v in variants)

    best_row, best_score = 0, -1
    for i in range(min(10, len(raw_df))):
        row_vals = [str(v).strip().lower() for v in raw_df.iloc[i] if str(v).strip() not in ("", "nan", "none")]
        if not row_vals:
            continue
        # Score: how many cells match known column names
        known_hits = sum(1 for v in row_vals if any(v == kw for kw in all_known_words))
        str_ratio  = sum(1 for v in row_vals if not v.replace(".", "").replace("/", "").replace("-", "").isdigit()) / max(len(row_vals), 1)
        score = known_hits * 5 + len(row_vals) * str_ratio
        if score > best_score:
            best_score = score
            best_row   = i
    return best_row


def parse_tracking_file(path: Path) -> Optional[pd.DataFrame]:
    """
    Parse an Excel or CSV job tracking file.
    Handles sheets where the header row is not at row 0.
    Returns a raw DataFrame (normalization happens in data_normalizer.py).
    """
    suffix = path.suffix.lower()
    try:
        if suffix in (".xlsx", ".xls"):
            xf = pd.ExcelFile(path)
            best_df = None
            for sheet in xf.sheet_names:
                # First read without header to detect header row
                raw = pd.read_excel(path, sheet_name=sheet, header=None, dtype=str)
                raw.fillna("", inplace=True)
                header_row = _find_header_row(raw)
                # Now read with the correct header row
                df = pd.read_excel(path, sheet_name=sheet, header=header_row, dtype=str)
                df.dropna(how="all", inplace=True)
                df = df[df.apply(lambda r: any(str(v).strip() for v in r), axis=1)]
                if best_df is None or len(df.columns) > len(best_df.columns):
                    best_df = df
            return best_df

        elif suffix == ".csv":
            # Try common encodings
            for enc in ("utf-8-sig", "utf-8", "windows-1255", "iso-8859-8"):
                try:
                    return pd.read_csv(path, dtype=str, encoding=enc)
                except UnicodeDecodeError:
                    continue

    except Exception as e:
        logger.error(f"Failed to parse tracking file {path}: {e}")

    return None


# ─── Text Extraction ──────────────────────────────────────────────────────────

def extract_text_from_pdf(path: Path) -> str:
    """Extract text from a PDF file. Falls back between pdfplumber and PyPDF2."""
    text = ""

    pdfplumber = _try_pdfplumber()
    if pdfplumber:
        try:
            with pdfplumber.open(path) as pdf:
                text = "\n".join(
                    (page.extract_text() or "") for page in pdf.pages
                )
            if text.strip():
                return text
        except Exception as e:
            logger.debug(f"pdfplumber failed for {path}: {e}")

    PyPDF2 = _try_pypdf2()
    if PyPDF2:
        try:
            with open(path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                text = "\n".join(
                    (page.extract_text() or "") for page in reader.pages
                )
        except Exception as e:
            logger.debug(f"PyPDF2 failed for {path}: {e}")

    return text


def extract_text_from_docx(path: Path) -> str:
    """Extract plain text from a .docx file."""
    Document = _try_docx()
    if not Document:
        logger.warning("python-docx not installed; cannot parse .docx files.")
        return ""
    try:
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        logger.error(f"Failed to parse DOCX {path}: {e}")
        return ""


def extract_text(path: Path) -> str:
    """Dispatch text extraction based on file extension."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(path)
    elif suffix in (".docx", ".doc"):
        return extract_text_from_docx(path)
    elif suffix == ".txt":
        for enc in ("utf-8-sig", "utf-8", "windows-1255", "iso-8859-8"):
            try:
                return path.read_text(encoding=enc)
            except UnicodeDecodeError:
                continue
    return ""


# ─── Signal Extraction from Text ─────────────────────────────────────────────

def extract_cv_signals(text: str) -> dict:
    """
    Pull structured signals from CV text.
    Returns dict with: inferred_roles, keywords, seniority, industries.
    """
    signals = {
        "inferred_roles": [],
        "keywords": [],
        "seniority": "Unknown",
        "industries": [],
        "raw_excerpt": text[:800],
    }

    text_lower = text.lower()

    # Role detection
    role_patterns = {
        "Project Manager":   ["project manager", "מנהל פרויקטים", "ניהול פרויקטים"],
        "Product Manager":   ["product manager", "מנהל מוצר", "ניהול מוצר"],
        "Operations Manager":["operations manager", "מנהל תפעול", "ניהול תפעול"],
        "Business Analyst":  ["business analyst", "אנליסט עסקי", "ניתוח עסקי"],
        "Customer Success":  ["customer success", "הצלחת לקוח", "cs manager"],
        "Team Lead":         ["team lead", "ראש צוות", "מנהל צוות"],
        "Program Manager":   ["program manager", "מנהל תוכנית"],
    }
    for role, patterns in role_patterns.items():
        if any(p in text_lower for p in patterns):
            signals["inferred_roles"].append(role)

    # Seniority
    if any(w in text_lower for w in ["senior", "lead", "head", "director", "בכיר", "ראש"]):
        signals["seniority"] = "Senior"
    elif any(w in text_lower for w in ["junior", "entry", "junior", "בוגר"]):
        signals["seniority"] = "Junior"
    else:
        signals["seniority"] = "Mid"

    # Industry keywords
    industry_patterns = {
        "Tech / Software":   ["software", "saas", "tech", "startup", "היי-טק"],
        "FinTech":           ["fintech", "finance", "financial", "פינטק", "פיננסי"],
        "Healthcare":        ["health", "medical", "pharma", "בריאות", "רפואה"],
        "E-commerce":        ["e-commerce", "retail", "קמעונאות", "סחר"],
        "Consulting":        ["consulting", "ייעוץ", "consultancy"],
        "Defense":           ["defense", "ביטחון", "military", "צבאי", "ביטחוני"],
    }
    for industry, patterns in industry_patterns.items():
        if any(p in text_lower for p in patterns):
            signals["industries"].append(industry)

    # Skills keywords
    skill_patterns = [
        "agile", "scrum", "kanban", "okr", "roadmap", "stakeholder",
        "jira", "confluence", "excel", "sql", "data", "budget",
        "leadership", "communication", "strategy", "product", "process",
        "ניהול", "אסטרטגיה", "תקשורת", "מנהיגות",
    ]
    signals["keywords"] = [kw for kw in skill_patterns if kw in text_lower]

    return signals


def extract_guidance_signals(text: str) -> dict:
    """Extract coaching/guidance signals from employment guidance summaries."""
    signals = {
        "focus_sectors": [],
        "constraints": [],
        "preferred_roles": [],
        "notes": text[:600],
    }
    text_lower = text.lower()

    sector_keywords = {
        "Tech": ["tech", "היי-טק", "software", "startup"],
        "FinTech": ["fintech", "פינטק"],
        "Healthcare": ["health", "בריאות"],
        "Government": ["government", "ממשלה", "ציבורי"],
        "Non-Profit": ["ngo", "non-profit", "עמותה"],
    }
    for sector, kws in sector_keywords.items():
        if any(k in text_lower for k in kws):
            signals["focus_sectors"].append(sector)

    # Common constraints
    constraint_patterns = [
        (r"(?:מרחק|נסיעה|location)[^.]{0,80}", "geographic_constraint"),
        (r"(?:שכר|salary|משכורת)[^.]{0,80}", "salary_constraint"),
        (r"(?:שעות|hours|היברידי|remote|hybrid)[^.]{0,80}", "work_mode"),
    ]
    for pattern, label in constraint_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            signals["constraints"].append({"type": label, "excerpt": matches[0][:100]})

    return signals


def extract_meeting_signals(text: str) -> dict:
    """Extract emotional and strategic signals from meeting notes."""
    signals = {
        "themes": [],
        "barriers": [],
        "goals": [],
        "confidence_level": "unknown",
        "notes": text[:600],
    }
    text_lower = text.lower()

    # Confidence indicators
    positive_words = ["ביטחון", "בטוח", "אופטימי", "חיובי", "נחוש", "confident", "motivated"]
    negative_words = ["חשש", "פחד", "מסופק", "לא בטוח", "קשה", "doubt", "fear", "struggle"]
    pos = sum(1 for w in positive_words if w in text_lower)
    neg = sum(1 for w in negative_words if w in text_lower)
    if pos > neg * 2:
        signals["confidence_level"] = "high"
    elif neg > pos:
        signals["confidence_level"] = "low"
    else:
        signals["confidence_level"] = "medium"

    # Common barriers
    barrier_keywords = [
        "מיקוד", "focus", "decision", "החלטה", "clarity", "בהירות",
        "rejection", "דחייה", "fear", "חשש", "time", "זמן",
    ]
    signals["barriers"] = [kw for kw in barrier_keywords if kw in text_lower]

    return signals


# ─── Master File Processor ────────────────────────────────────────────────────

class FileProcessor:
    """
    Orchestrates file classification and parsing for a folder of files.
    Returns structured data and extracted signals.
    """

    def __init__(self, file_paths: list[Path]):
        self.paths = file_paths
        self.classified = classify_all_files(file_paths)
        self._log_classification()

    def _log_classification(self):
        for ft, paths in self.classified.items():
            logger.info(f"  [{ft}] → {[p.name for p in paths]}")

    def get_tracking_df(self) -> Optional[pd.DataFrame]:
        """Return the first successfully parsed tracking spreadsheet."""
        for path in self.classified.get("tracking", []):
            df = parse_tracking_file(path)
            if df is not None and not df.empty:
                logger.info(f"Tracking file loaded: {path.name} ({len(df)} rows)")
                return df
        return None

    def get_file_intelligence(self) -> dict:
        """
        Extract signals from all non-tracking files.
        Returns a dict keyed by file type with extracted signal dicts.
        """
        intelligence = {}

        for ft, paths in self.classified.items():
            if ft == "tracking":
                continue
            for path in paths:
                text = extract_text(path)
                if not text.strip():
                    logger.warning(f"Empty or unreadable text in {path.name}")
                    continue

                if ft == "cv":
                    intelligence["cv"] = extract_cv_signals(text)
                    intelligence["cv"]["loaded"] = True
                    intelligence["cv"]["source_file"] = path.name
                elif ft == "guidance":
                    intelligence["guidance"] = extract_guidance_signals(text)
                    intelligence["guidance"]["loaded"] = True
                    intelligence["guidance"]["source_file"] = path.name
                elif ft == "meeting_notes":
                    intelligence["meeting_notes"] = extract_meeting_signals(text)
                    intelligence["meeting_notes"]["loaded"] = True
                    intelligence["meeting_notes"]["source_file"] = path.name
                elif ft == "linkedin":
                    intelligence["linkedin"] = {
                        "loaded": True,
                        "raw_text": text[:500],
                        "source_file": path.name,
                    }
                elif ft == "interview_prep":
                    intelligence["interview_prep"] = {
                        "loaded": True,
                        "raw_text": text[:500],
                        "source_file": path.name,
                    }

        return intelligence

    def get_loaded_files_summary(self) -> list[dict]:
        """Return list of {name, type, status} for display in the dashboard."""
        summary = []
        for ft, paths in self.classified.items():
            for p in paths:
                summary.append({
                    "שם קובץ": p.name,
                    "סוג":     ft,
                    "סטטוס":   "✅ נטען" if ft != "unknown" else "⚠️ לא מזוהה",
                })
        return summary
