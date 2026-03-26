"""
gmail_connector.py — Gmail OAuth + Fetch + Ingest pipeline for ContextOS.

Handles:
  1. OAuth 2.0 flow (get_auth_url, exchange_code)
  2. Email fetching from Gmail INBOX
  3. Parsing (plain text preferred, HTML stripped fallback)
  4. Deduplication against ChromaDB
  5. Chunking + embedding + storage into ChromaDB
"""

import os
import json
import base64
import re
from datetime import datetime, timezone

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from bs4 import BeautifulSoup

from langchain_text_splitters import RecursiveCharacterTextSplitter
import ai_engine

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
TOKEN_PATH = os.path.join(os.path.dirname(__file__), "gmail_token.json")
BACKEND_DIR = os.path.dirname(__file__)
PLACEHOLDER_GOOGLE_VALUES = {
    "",
    "your_google_client_id",
    "your_google_client_secret",
    "your-google-client-id",
    "your-google-client-secret",
}

# Sync metadata file — persists last-sync timestamp & email count
SYNC_META_PATH = os.path.join(BACKEND_DIR, "gmail_sync_meta.json")


def _load_env():
    """Return client_id, client_secret, redirect_uri from environment."""
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BACKEND_DIR, ".env"))
    load_dotenv(os.path.join(BACKEND_DIR, ".env.local"), override=True)
    return (
        os.getenv("GOOGLE_CLIENT_ID"),
        os.getenv("GOOGLE_CLIENT_SECRET"),
        os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/gmail/callback"),
    )


def _client_config():
    """Build the client config dict expected by google-auth-oauthlib."""
    client_id, client_secret, redirect_uri = _load_env()
    if not client_id or not client_secret or client_id in PLACEHOLDER_GOOGLE_VALUES or client_secret in PLACEHOLDER_GOOGLE_VALUES:
        raise ValueError(
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, "
            "and GOOGLE_REDIRECT_URI in backend/.env."
        )
    return {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri],
        }
    }


# ---------------------------------------------------------------------------
# 1. OAuth helpers
# ---------------------------------------------------------------------------

def get_auth_url() -> str:
    """Generate and return the Google OAuth consent URL."""
    _, _, redirect_uri = _load_env()
    flow = Flow.from_client_config(
        _client_config(),
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )
    return auth_url


def exchange_code(code: str) -> Credentials:
    """Exchange the OAuth authorization code for tokens and persist them."""
    _, _, redirect_uri = _load_env()
    flow = Flow.from_client_config(
        _client_config(),
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )
    flow.fetch_token(code=code)
    creds = flow.credentials

    # Persist token to disk
    with open(TOKEN_PATH, "w") as f:
        f.write(creds.to_json())

    return creds


def load_credentials() -> Credentials | None:
    """Load saved credentials from disk, refreshing if expired."""
    if not os.path.exists(TOKEN_PATH):
        return None

    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    # If the token is expired and has a refresh token, refresh it
    if creds and creds.expired and creds.refresh_token:
        from google.auth.transport.requests import Request
        try:
            creds.refresh(Request())
            with open(TOKEN_PATH, "w") as f:
                f.write(creds.to_json())
        except Exception:
            # Refresh failed — caller should re-auth
            return None

    return creds if (creds and creds.valid) else None


def is_connected() -> bool:
    """Check if a valid Gmail token exists."""
    return load_credentials() is not None


def get_sync_meta() -> dict:
    """Return persisted sync metadata (last_sync, email_count)."""
    if os.path.exists(SYNC_META_PATH):
        try:
            with open(SYNC_META_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return {"last_sync": None, "email_count": 0}
    return {"last_sync": None, "email_count": 0}


def _save_sync_meta(synced: int):
    """Update sync metadata file."""
    meta = get_sync_meta()
    meta["last_sync"] = datetime.now(timezone.utc).isoformat()
    meta["email_count"] = meta.get("email_count", 0) + synced
    with open(SYNC_META_PATH, "w") as f:
        json.dump(meta, f)


# ---------------------------------------------------------------------------
# 2. Email fetching
# ---------------------------------------------------------------------------

def _decode_body(part: dict) -> str:
    """Decode a Gmail message part body from base64url."""
    data = part.get("body", {}).get("data", "")
    if not data:
        return ""
    return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")


def _extract_body(payload: dict) -> str:
    """
    Recursively extract plain-text body from a Gmail message payload.
    Falls back to HTML stripped via BeautifulSoup if no plain text found.
    """
    mime = payload.get("mimeType", "")
    parts = payload.get("parts", [])

    # Simple single-part message
    if not parts:
        text = _decode_body(payload)
        if "html" in mime:
            return BeautifulSoup(text, "html.parser").get_text(separator="\n", strip=True)
        return text

    # Multipart — prefer text/plain
    plain_text = ""
    html_text = ""
    for part in parts:
        part_mime = part.get("mimeType", "")
        if part_mime == "text/plain":
            plain_text += _decode_body(part)
        elif part_mime == "text/html":
            html_text += _decode_body(part)
        elif "multipart" in part_mime:
            # Recursion for nested multipart
            nested = _extract_body(part)
            if nested:
                plain_text += nested

    if plain_text.strip():
        return plain_text.strip()
    if html_text.strip():
        return BeautifulSoup(html_text, "html.parser").get_text(separator="\n", strip=True)
    return ""


def _get_header(headers: list, name: str) -> str:
    """Get a specific header value from the Gmail message headers list."""
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def fetch_emails(max_results: int = 75) -> list[dict]:
    """
    Fetch emails from INBOX using the Gmail API.
    Returns a list of dicts: {subject, sender, date, body, message_id}
    """
    creds = load_credentials()
    if creds is None:
        raise PermissionError("Gmail token missing or expired")

    service = build("gmail", "v1", credentials=creds)

    # List message IDs from INBOX
    results = service.users().messages().list(
        userId="me",
        labelIds=["INBOX"],
        maxResults=max_results,
    ).execute()

    message_ids = [m["id"] for m in results.get("messages", [])]

    emails = []
    for mid in message_ids:
        msg = service.users().messages().get(
            userId="me", id=mid, format="full"
        ).execute()

        headers = msg.get("payload", {}).get("headers", [])
        subject = _get_header(headers, "Subject") or "(No Subject)"
        sender = _get_header(headers, "From") or "Unknown"

        # Convert internalDate (ms since epoch) → ISO string
        internal_ms = int(msg.get("internalDate", "0"))
        date_iso = datetime.fromtimestamp(
            internal_ms / 1000, tz=timezone.utc
        ).isoformat()

        body = _extract_body(msg.get("payload", {}))

        # Skip empty bodies
        if not body.strip():
            continue

        emails.append({
            "subject": subject,
            "sender": sender,
            "date": date_iso,
            "body": body,
            "message_id": mid,
        })

    return emails


# ---------------------------------------------------------------------------
# 3. Deduplication helpers
# ---------------------------------------------------------------------------

def _get_existing_message_ids() -> set:
    """Query ChromaDB for all stored Gmail message_ids to skip duplicates."""
    ids = set()

    if getattr(ai_engine, "vectorstore", None) is not None:
        try:
            collection = ai_engine.vectorstore.get(where={"source_type": "email"})
            for meta in collection.get("metadatas", []):
                if meta and "message_id" in meta:
                    ids.add(meta["message_id"])
        except Exception:
            pass

    try:
        for memory in ai_engine._load_fallback_memories():
            meta = memory.get("metadata", {})
            if meta.get("source_type") == "email" and meta.get("message_id"):
                ids.add(meta["message_id"])
    except Exception:
        pass

    return ids


# ---------------------------------------------------------------------------
# 4. Embedding + storage
# ---------------------------------------------------------------------------

def ingest_emails_to_chromadb(emails: list[dict]) -> dict:
    """
    Chunk, embed, and store emails in ChromaDB.
    Returns { synced, skipped, total_chunks }.
    """
    existing_ids = _get_existing_message_ids()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
    )

    synced = 0
    skipped = 0
    total_chunks = 0

    for email in emails:
        if email["message_id"] in existing_ids:
            skipped += 1
            continue

        # Build document string
        doc_text = (
            f"Email from {email['sender']} on {email['date']}\n"
            f"Subject: {email['subject']}\n\n"
            f"{email['body']}"
        )

        chunks = splitter.split_text(doc_text)
        if not chunks:
            skipped += 1
            continue

        metadata = {
            "source_type": "email",
            "source_name": email["subject"][:60],
            "sender": email["sender"],
            "date": email["date"],
            "message_id": email["message_id"],
        }

        if getattr(ai_engine, "vectorstore", None) is not None and getattr(ai_engine, "embeddings", None) is not None:
            try:
                ai_engine.vectorstore.add_texts(
                    texts=chunks,
                    metadatas=[metadata] * len(chunks),
                )
            except Exception as exc:
                # Match document uploads: if embeddings are offline, degrade to the JSON store.
                if hasattr(ai_engine, "_disable_vectorstore"):
                    ai_engine._disable_vectorstore(exc)
                ai_engine.store_memory(doc_text, metadata)
        else:
            ai_engine.store_memory(doc_text, metadata)

        synced += 1
        total_chunks += len(chunks)

    # Persist ChromaDB
    if getattr(ai_engine, "vectorstore", None) is not None:
        try:
            ai_engine.vectorstore.persist()
        except Exception:
            pass  # Newer ChromaDB versions auto-persist

    # Update sync metadata
    _save_sync_meta(synced)

    return {
        "synced": synced,
        "skipped": skipped,
        "total_chunks": total_chunks,
    }
