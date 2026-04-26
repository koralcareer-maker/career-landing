"""
drive_connector.py — Google Drive API integration.

Supports two authentication methods:
  1. Service Account JSON (recommended for server/deployment)
  2. OAuth2 (for local/user usage)

Usage:
    connector = DriveConnector(credentials_path="credentials/service_account.json")
    files = connector.list_folder_files(folder_id="YOUR_FOLDER_ID")
    content = connector.download_file(file_id, dest_path)
"""

import os
import io
import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Optional Google API imports (gracefully degraded if not installed) ───────
try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
    from google.oauth2 import service_account
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    import pickle
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    logger.warning("Google API libraries not installed. Drive connectivity disabled.")

SCOPES = ["https://www.googleapis.com/auth/drive"]
TOKEN_CACHE_PATH = "credentials/token.pickle"


class DriveConnector:
    """Connects to Google Drive and exposes file listing + downloading."""

    def __init__(
        self,
        credentials_path: Optional[str] = None,
        use_oauth: bool = False,
        cache_dir: str = ".drive_cache",
    ):
        self.credentials_path = credentials_path
        self.use_oauth = use_oauth
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._service = None
        self._connected = False

    # ─── Authentication ────────────────────────────────────────────────────

    def connect(self) -> bool:
        """
        Attempt to authenticate and build the Drive service.
        Priority order:
          1. Saved token.pickle (fastest — from prior rclone/OAuth auth)
          2. Service Account JSON
          3. OAuth2 flow (opens browser)
        Returns True on success.
        """
        if not GOOGLE_AVAILABLE:
            logger.error("Google API libraries not available.")
            return False

        try:
            creds = None

            # 1. Try saved token.pickle first (works after rclone auth)
            token_path = Path(TOKEN_CACHE_PATH)
            if token_path.exists():
                with open(token_path, "rb") as f:
                    creds = pickle.load(f)
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                    with open(token_path, "wb") as f:
                        pickle.dump(creds, f)
                if creds and creds.valid:
                    logger.info("Using saved token.pickle for Drive auth.")
                    self._service = build("drive", "v3", credentials=creds, cache_discovery=False)
                    self._connected = True
                    return True

            # 2. Service Account JSON
            if self.credentials_path and Path(self.credentials_path).exists():
                creds = service_account.Credentials.from_service_account_file(
                    self.credentials_path, scopes=SCOPES
                )
            # 3. OAuth2 flow
            elif self.use_oauth:
                creds = self._oauth_credentials()
            else:
                logger.error("No credentials available. Run rclone authorize or provide credentials.")
                return False

            self._service = build("drive", "v3", credentials=creds, cache_discovery=False)
            self._connected = True
            logger.info("Connected to Google Drive successfully.")
            return True

        except Exception as e:
            logger.error(f"Drive connection failed: {e}")
            return False

    def _oauth_credentials(self):
        """Load or refresh OAuth2 credentials with local token caching."""
        creds = None
        token_path = Path(TOKEN_CACHE_PATH)

        if token_path.exists():
            with open(token_path, "rb") as f:
                creds = pickle.load(f)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not self.credentials_path or not Path(self.credentials_path).exists():
                    raise FileNotFoundError("OAuth credentials file not found.")
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, SCOPES
                )
                creds = flow.run_local_server(port=0)

            token_path.parent.mkdir(parents=True, exist_ok=True)
            with open(token_path, "wb") as f:
                pickle.dump(creds, f)

        return creds

    # ─── Folder Parsing ────────────────────────────────────────────────────

    @staticmethod
    def extract_folder_id(folder_url_or_id: str) -> str:
        """
        Accept a full Google Drive folder URL or a bare folder ID.
        Returns the folder ID string.
        """
        if "drive.google.com" in folder_url_or_id:
            # e.g. https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
            parts = folder_url_or_id.split("/folders/")
            if len(parts) == 2:
                return parts[1].split("?")[0].strip()
        # Assume it's already a bare ID
        return folder_url_or_id.strip()

    # ─── File Listing ──────────────────────────────────────────────────────

    def list_folder_files(self, folder_id: str) -> list[dict]:
        """
        List all files in a Drive folder (non-recursive).
        Returns list of dicts: {id, name, mimeType, size, modifiedTime}.
        """
        if not self._connected:
            raise RuntimeError("Not connected to Drive. Call connect() first.")

        folder_id = self.extract_folder_id(folder_id)
        query = f"'{folder_id}' in parents and trashed=false"
        fields = "files(id, name, mimeType, size, modifiedTime)"

        results = (
            self._service.files()
            .list(q=query, fields=fields, pageSize=100)
            .execute()
        )
        files = results.get("files", [])
        logger.info(f"Found {len(files)} files in folder {folder_id}")
        return files

    # ─── File Downloading ─────────────────────────────────────────────────

    def download_file(self, file_id: str, file_name: str) -> Optional[Path]:
        """
        Download a file from Drive to the local cache directory.
        Returns the local Path on success, None on failure.
        """
        if not self._connected:
            return None

        dest_path = self.cache_dir / file_name
        if dest_path.exists():
            logger.debug(f"Cache hit: {file_name}")
            return dest_path

        try:
            # Check if it's a Google Workspace file (needs export)
            file_meta = self._service.files().get(fileId=file_id, fields="mimeType,name").execute()
            mime = file_meta.get("mimeType", "")

            if mime == "application/vnd.google-apps.spreadsheet":
                request = self._service.files().export_media(
                    fileId=file_id,
                    mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
                dest_path = self.cache_dir / (Path(file_name).stem + ".xlsx")
            elif mime == "application/vnd.google-apps.document":
                request = self._service.files().export_media(
                    fileId=file_id,
                    mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
                dest_path = self.cache_dir / (Path(file_name).stem + ".docx")
            else:
                request = self._service.files().get_media(fileId=file_id)

            buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(buffer, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()

            with open(dest_path, "wb") as f:
                f.write(buffer.getvalue())

            logger.info(f"Downloaded: {dest_path}")
            return dest_path

        except Exception as e:
            logger.error(f"Failed to download {file_name}: {e}")
            return None

    def download_all(self, folder_id: str) -> dict[str, Path]:
        """
        Download all files in a folder.
        Returns {file_name: local_path} mapping.
        """
        files = self.list_folder_files(folder_id)
        downloaded = {}
        for f in files:
            path = self.download_file(f["id"], f["name"])
            if path:
                downloaded[f["name"]] = path
        return downloaded

    def list_all_files(self, page_size: int = 100) -> list[dict]:
        """List all files in the user's Drive root (not in a specific folder)."""
        if not self._connected:
            return []
        results = self._service.files().list(
            pageSize=page_size,
            fields="files(id, name, mimeType, modifiedTime)",
            orderBy="modifiedTime desc",
        ).execute()
        return results.get("files", [])

    def get_connected_account(self) -> str:
        """Return the email of the authenticated Drive user."""
        if not self._connected:
            return ""
        try:
            about = self._service.about().get(fields="user").execute()
            return about.get("user", {}).get("emailAddress", "")
        except Exception:
            return ""

    def upload_file(self, file_id: str, content: bytes, mime_type: str = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") -> bool:
        """
        Update an existing Drive file with new content (bytes).
        Returns True on success.
        """
        if not self._connected:
            return False
        try:
            from googleapiclient.http import MediaIoBaseUpload
            buffer = io.BytesIO(content)
            media = MediaIoBaseUpload(buffer, mimetype=mime_type, resumable=False)
            self._service.files().update(
                fileId=file_id,
                media_body=media,
            ).execute()
            logger.info(f"Uploaded updated file to Drive (id={file_id})")
            return True
        except Exception as e:
            logger.error(f"Failed to upload file to Drive: {e}")
            return False

    def create_file(self, name: str, content: bytes, parent_id: Optional[str] = None,
                    mime_type: str = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") -> Optional[str]:
        """
        Create a new file in Drive.  Returns the new file ID on success.
        """
        if not self._connected:
            return None
        try:
            from googleapiclient.http import MediaIoBaseUpload
            metadata = {"name": name}
            if parent_id:
                metadata["parents"] = [parent_id]
            buffer = io.BytesIO(content)
            media = MediaIoBaseUpload(buffer, mimetype=mime_type, resumable=False)
            result = self._service.files().create(
                body=metadata,
                media_body=media,
                fields="id",
            ).execute()
            new_id = result.get("id")
            logger.info(f"Created new Drive file '{name}' (id={new_id})")
            return new_id
        except Exception as e:
            logger.error(f"Failed to create file in Drive: {e}")
            return None

    @property
    def is_connected(self) -> bool:
        return self._connected


def get_connector(credentials_path: Optional[str] = None, use_oauth: bool = False) -> DriveConnector:
    """
    Factory function: returns a connected DriveConnector.
    Automatically tries saved token.pickle first.
    """
    connector = DriveConnector(credentials_path=credentials_path, use_oauth=use_oauth)
    success = connector.connect()
    if not success:
        raise ConnectionError("Could not connect to Google Drive. Check credentials.")
    return connector
