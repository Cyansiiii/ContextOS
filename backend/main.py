from fastapi import FastAPI, UploadFile, Form, HTTPException, Request, Header, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from ai_engine import store_memory, search_memory, get_db_stats, get_memory_metadata_summary, retrieve_memory, warmup_llm, vectorstore, llm, DB_DIR
from error_handlers import make_error
from pydantic import BaseModel
from typing import Optional, List
from collections import Counter
import json
import platform
import time
import os
import hashlib
import hmac
import requests
import secrets
from io import BytesIO
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlencode
from uuid import uuid4

# Load environment variables
from dotenv import load_dotenv
load_dotenv(Path(__file__).with_name(".env"))
load_dotenv(Path(__file__).with_name(".env.local"), override=True)

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

try:
    from docx import Document
except Exception:
    Document = None

app = FastAPI()


@app.on_event("startup")
async def warmup_services():
    warmup_llm()

# Store recent queries in memory (In production, use a database)
query_history = []
payment_requests = []
USERS_DB_PATH = Path(__file__).resolve().parent.parent / "database" / "users.json"
AVATAR_DIR = Path(__file__).resolve().parent.parent / "database" / "avatars"

# F-20: Benchmarks tracking
embed_times = []
total_queries_served = 0
server_start_time = time.time()

def _parse_csv_env(name: str):
    raw_value = os.getenv(name, "").strip()
    if not raw_value:
        return []
    return [item.strip() for item in raw_value.split(",") if item.strip()]


DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://contextos.netlify.app",
]
ALLOWED_ORIGINS = list(dict.fromkeys(DEFAULT_ALLOWED_ORIGINS + _parse_csv_env("ALLOWED_ORIGINS")))
FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", ALLOWED_ORIGINS[0]).strip().rstrip("/")

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════

class UploadRequest(BaseModel):
    content: str
    source: str
    date: str
    content_type: Optional[str] = "document"  # F-10: typed memory
    author: Optional[str] = "team"

class AskRequest(BaseModel):
    question: str

class GmailSyncRequest(BaseModel):
    max_emails: Optional[int] = 75

class SlackSyncRequest(BaseModel):
    bot_token: str
    channel_id: str
    channel_name: Optional[str] = ""

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    name: str
    email: str
    password: str | None = None

class CheckoutRequest(BaseModel):
    plan: str
    billing_cycle: str
    payment_method: str
    customer_name: str
    customer_email: str
    account_identifier: str | None = None
    reference: str | None = None

class PaymentVerificationRequest(BaseModel):
    request_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class MeetingStatusResponse(BaseModel):
    title: str
    start_time: str
    end_time: str
    starts_in: str
    meeting_url: str
    meeting_code: str
    attendees: List[str]
    platform: str = "Google Meet"
    status: str = "scheduled"

class DecisionRequest(BaseModel):
    """F-06: Decision DNA structured input."""
    title: str
    what_decided: str
    why_decided: str
    what_rejected: Optional[str] = ""
    who_decided: str
    date: str
    tags: Optional[List[str]] = []


# ═══════════════════════════════════════════
# F-10: CONTENT TYPE LABELS MAP
# ═══════════════════════════════════════════

CONTENT_TYPE_LABELS = {
    "document": "Document",
    "email": "Email",
    "meeting_notes": "Meeting Notes",
    "decision": "Decision Record",
    "slack": "Slack Message",
}

PLAN_CATALOG = {
    "starter": {"monthly": 4999, "yearly": 3749, "mode": "self_serve"},
    "growth": {"monthly": 19999, "yearly": 14999, "mode": "self_serve"},
    "enterprise": {"monthly": None, "yearly": None, "mode": "sales"},
}

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "").strip()
RAZORPAY_API_BASE = "https://api.razorpay.com/v1"
PLACEHOLDER_ENV_VALUES = {
    "rzp_test_your_key_id",
    "your_test_key_secret",
    "your_webhook_secret",
}


def _decode_text_file(file_bytes: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(status_code=400, detail="Unable to decode the uploaded text file.")


def _extract_file_text(filename: str, file_bytes: bytes) -> str:
    extension = Path(filename).suffix.lower()

    if extension in {".txt", ".md", ".csv", ".json", ".log"}:
        return _decode_text_file(file_bytes)

    if extension == ".pdf":
        if PdfReader is None:
            raise HTTPException(status_code=500, detail="PDF support is not installed on the backend.")
        reader = PdfReader(BytesIO(file_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return text.strip()

    if extension == ".docx":
        if Document is None:
            raise HTTPException(status_code=500, detail="DOCX support is not installed on the backend.")
        document = Document(BytesIO(file_bytes))
        text = "\n".join(paragraph.text for paragraph in document.paragraphs)
        return text.strip()

    raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, DOCX, TXT, MD, CSV, JSON, or LOG.")


def _ensure_users_db():
    USERS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not USERS_DB_PATH.exists():
        USERS_DB_PATH.write_text("[]", encoding="utf-8")


def _ensure_avatar_dir():
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)


def _load_users():
    _ensure_users_db()
    return json.loads(USERS_DB_PATH.read_text(encoding="utf-8"))


def _save_users(users):
    _ensure_users_db()
    USERS_DB_PATH.write_text(json.dumps(users, ensure_ascii=False, indent=2), encoding="utf-8")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_password(password: str, salt: str | None = None):
    password_salt = salt or secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        password_salt.encode("utf-8"),
        100000,
    ).hex()
    return password_salt, password_hash


def _verify_password(password: str, salt: str, expected_hash: str):
    _, password_hash = _hash_password(password, salt)
    return hmac.compare_digest(password_hash, expected_hash)


def _sanitize_user(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "created_at": user["created_at"],
        "avatar_url": user.get("avatar_url"),
    }


def _avatar_extension(content_type: str, filename: str | None):
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    if content_type in allowed_types:
        return allowed_types[content_type]

    suffix = Path(filename or "").suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        return ".jpg" if suffix == ".jpeg" else suffix

    raise HTTPException(status_code=400, detail="Unsupported image format. Use JPG, PNG, WEBP, or GIF.")


def _find_user_by_id(user_id: str):
    users = _load_users()
    user = next((entry for entry in users if entry["id"] == user_id), None)
    return users, user


def _validate_checkout_request(req: CheckoutRequest):
    if req.plan not in PLAN_CATALOG:
        raise HTTPException(status_code=400, detail="Unknown plan selected.")
    if req.billing_cycle not in {"monthly", "yearly"}:
        raise HTTPException(status_code=400, detail="Unsupported billing cycle.")
    valid_methods = {"upi", "card", "netbanking", "contact"}
    if req.payment_method not in valid_methods:
        raise HTTPException(status_code=400, detail="Unsupported payment method.")
    if PLAN_CATALOG[req.plan]["mode"] == "sales" and req.payment_method != "contact":
        raise HTTPException(status_code=400, detail="Enterprise plan requires contact/sales follow-up.")
    if not req.customer_name.strip():
        raise HTTPException(status_code=400, detail="Customer name is required.")
    if not req.customer_email.strip():
        raise HTTPException(status_code=400, detail="Customer email is required.")


def _validate_auth_fields(name: str | None, email: str, password: str):
    if name is not None and not name.strip():
        raise HTTPException(status_code=400, detail="Name is required.")
    if not email.strip():
        raise HTTPException(status_code=400, detail="Email is required.")
    if not password.strip():
        raise HTTPException(status_code=400, detail="Password is required.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")


def _razorpay_enabled():
    return (
        bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)
        and RAZORPAY_KEY_ID not in PLACEHOLDER_ENV_VALUES
        and RAZORPAY_KEY_SECRET not in PLACEHOLDER_ENV_VALUES
    )


def _find_payment_request(request_id: str):
    for payment_request in payment_requests:
        if payment_request["request_id"] == request_id:
            return payment_request
    return None


def _find_payment_request_by_provider_order(order_id: str):
    for payment_request in payment_requests:
        if payment_request.get("provider_order_id") == order_id:
            return payment_request
    return None


_ensure_avatar_dir()
app.mount("/media", StaticFiles(directory=AVATAR_DIR.parent), name="media")


# ═══════════════════════════════════════════
# CORE ENDPOINTS
# ═══════════════════════════════════════════

@app.post("/auth/signup")
async def signup(req: SignupRequest):
    _validate_auth_fields(req.name, req.email, req.password)
    users = _load_users()
    normalized_email = _normalize_email(req.email)

    if any(user["email"] == normalized_email for user in users):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    salt, password_hash = _hash_password(req.password)
    user = {
        "id": f"user_{uuid4().hex[:12]}",
        "name": req.name.strip(),
        "email": normalized_email,
        "salt": salt,
        "password_hash": password_hash,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    users.append(user)
    _save_users(users)

    return {"message": "Account created successfully.", "user": _sanitize_user(user)}


@app.post("/auth/login")
async def login(req: LoginRequest):
    _validate_auth_fields(None, req.email, req.password)
    users = _load_users()
    normalized_email = _normalize_email(req.email)
    user = next((entry for entry in users if entry["email"] == normalized_email), None)

    if user is None or not _verify_password(req.password, user["salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {"message": "Login successful.", "user": _sanitize_user(user)}


@app.get("/auth/profile/{user_id}")
async def get_profile(user_id: str):
    _, user = _find_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"user": _sanitize_user(user)}


@app.patch("/auth/profile/{user_id}")
async def update_profile(user_id: str, req: ProfileUpdateRequest):
    _validate_auth_fields(req.name, req.email, req.password or "temporary-password")
    users, user = _find_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    normalized_email = _normalize_email(req.email)
    if any(entry["id"] != user_id and entry["email"] == normalized_email for entry in users):
        raise HTTPException(status_code=409, detail="Another account already uses this email.")

    user["name"] = req.name.strip()
    user["email"] = normalized_email

    if req.password:
        if len(req.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
        salt, password_hash = _hash_password(req.password)
        user["salt"] = salt
        user["password_hash"] = password_hash

    _save_users(users)
    return {"message": "Profile updated successfully.", "user": _sanitize_user(user)}


@app.post("/auth/profile/{user_id}/avatar")
async def upload_profile_avatar(user_id: str, file: UploadFile = File(...)):
    users, user = _find_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size must be 5 MB or smaller.")

    extension = _avatar_extension(file.content_type or "", file.filename)
    _ensure_avatar_dir()

    existing_avatar = user.get("avatar_url")
    if existing_avatar:
        existing_path = AVATAR_DIR.parent / existing_avatar.removeprefix("/media/")
        if existing_path.exists():
            existing_path.unlink()

    avatar_name = f"{user_id}_{uuid4().hex[:10]}{extension}"
    avatar_path = AVATAR_DIR / avatar_name
    avatar_path.write_bytes(file_bytes)

    user["avatar_url"] = f"/media/avatars/{avatar_name}"
    _save_users(users)
    return {"message": "Profile photo updated successfully.", "user": _sanitize_user(user)}


# ROUTE 1: Upload any document/email/note — F-10 enhanced
@app.post("/upload")
async def upload_document(req: UploadRequest):
    content_type = req.content_type or "document"
    metadata = {
        "source_type": content_type,
        "source_name": req.source[:80] if req.source else "untitled",
        "date": req.date,
        "author": req.author or "team",
        "content_type_label": CONTENT_TYPE_LABELS.get(content_type, "Document"),
        "type": "company_data",
    }
    start_time = time.time()
    store_memory(req.content, metadata)
    elapsed_ms = int((time.time() - start_time) * 1000)
    embed_times.append(elapsed_ms)
    if len(embed_times) > 20:
        embed_times.pop(0)

    return {"status": "Memory stored successfully", "content_type": content_type}


@app.post("/upload-file")
async def upload_file(
    file: UploadFile,
    source: str = Form(...),
    date: str = Form(...),
    content: str = Form(default="")
):
    file_bytes = await file.read()
    extracted_text = _extract_file_text(file.filename or "upload.txt", file_bytes)
    combined_content = "\n\n".join(part for part in [content.strip(), extracted_text.strip()] if part)

    if not combined_content.strip():
        raise HTTPException(status_code=400, detail="No readable content was found in the upload.")

    source_type = source if source in CONTENT_TYPE_LABELS else "document"
    metadata = {
        "source_type": source_type,
        "source_name": file.filename or source or "uploaded_file",
        "date": date,
        "author": "team",
        "content_type_label": CONTENT_TYPE_LABELS.get(source_type, "Document"),
        "type": "company_data",
        "filename": file.filename or "uploaded_file",
    }
    store_memory(combined_content, metadata)
    return {
        "status": "Memory stored successfully",
        "filename": file.filename,
        "characters_indexed": len(combined_content),
    }


# ROUTE 2: Ask a question — F-09 enhanced with source chips + confidence
@app.post("/ask")
async def ask_question(req: AskRequest):
    start_time = time.time()

    # F-20: Track usage
    global total_queries_served
    total_queries_served += 1

    try:
        relevant_docs = retrieve_memory(req.question, limit=5)
        answer, _ = search_memory(req.question)
    except Exception as e:
        error_str = str(e).lower()
        if "connection" in error_str or "refused" in error_str:
            err = make_error("OLLAMA_OFFLINE")
            return {**err, "answer": err["user_message"], "sources": [], "confidence": "Low", "chunks_searched": 0}
        err = make_error("EMBEDDING_FAILED", str(e))
        return {**err, "answer": err["user_message"], "sources": [], "confidence": "Low", "chunks_searched": 0}

    if not relevant_docs:
        total = get_db_stats()
        if total == 0:
            err = make_error("CHROMADB_EMPTY")
            return {**err, "answer": err["user_message"], "sources": [], "confidence": "Low", "chunks_searched": 0}
        return {
            "answer": "No relevant memories found for this query. Try different keywords.",
            "sources": [],
            "confidence": "Low",
            "chunks_searched": total,
        }

    # F-09: Build deduplicated source chips
    seen_sources = set()
    source_chips = []
    for doc in relevant_docs:
        meta = doc.metadata or {}
        source_name = meta.get("source_name", meta.get("source", "unknown"))
        if source_name in seen_sources:
            continue
        seen_sources.add(source_name)
        source_chips.append({
            "source_name": source_name,
            "source_type": meta.get("source_type", meta.get("type", "document")),
            "content_type_label": meta.get("content_type_label", "Document"),
            "date": meta.get("date", ""),
            "who_decided": meta.get("who_decided", meta.get("author", "")),
            "excerpt": doc.page_content[:120] + "..." if len(doc.page_content) > 120 else doc.page_content,
        })

    confidence = "High" if source_chips else "Low"

    chunks_searched = get_db_stats()
    raw_elapsed = time.time() - start_time
    elapsed = round(raw_elapsed, 2)
    elapsed_ms = int(raw_elapsed * 1000)

    # F-13: Track query history (max 50)
    source_names = [s["source_name"] for s in source_chips[:3]]
    query_history.insert(0, {
        "query": req.question,
        "answer_preview": (answer[:120] + "...") if len(answer) > 120 else answer,
        "confidence": confidence,
        "sources": source_names,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "response_time_ms": elapsed_ms,
    })
    if len(query_history) > 50:
        query_history.pop()

    return {
        "answer": answer,
        "sources": source_chips,
        "confidence": confidence,
        "chunks_searched": chunks_searched,
        "response_time": elapsed,
    }


@app.get("/benchmarks")
def get_benchmarks():
    response_times = [item.get("response_time_ms", 0) for item in query_history if item.get("response_time_ms")]
    avg_query_ms = int(sum(response_times) / len(response_times)) if response_times else 0
    fastest_query_ms = min(response_times) if response_times else 0
    avg_embed_ms = int(sum(embed_times) / len(embed_times)) if embed_times else 0
    uptime_seconds = int(time.time() - server_start_time)

    if avg_query_ms and avg_query_ms < 1800:
        performance_grade = "A"
    elif avg_query_ms and avg_query_ms < 3500:
        performance_grade = "B"
    elif avg_query_ms:
        performance_grade = "C"
    else:
        performance_grade = "N/A"

    return {
        "avg_query_ms": avg_query_ms,
        "fastest_query_ms": fastest_query_ms,
        "avg_embed_ms": avg_embed_ms,
        "total_queries_served": total_queries_served,
        "uptime_seconds": uptime_seconds,
        "performance_grade": performance_grade if performance_grade != "N/A" else "-",
    }


def _safe_parse_timestamp(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _build_week_activity():
    today = datetime.now(timezone.utc).date()
    labels = []
    for offset in range(6, -1, -1):
        day_value = today - timedelta(days=offset)
        labels.append({
            "key": day_value.isoformat(),
            "label": day_value.strftime("%a"),
            "count": 0,
            "response_time_ms": 0,
        })

    label_map = {item["key"]: item for item in labels}
    for item in query_history:
        ts = _safe_parse_timestamp(item.get("timestamp"))
        if ts is None:
            continue
        key = ts.astimezone(timezone.utc).date().isoformat()
        if key in label_map:
            label_map[key]["count"] += 1
            label_map[key]["response_time_ms"] += item.get("response_time_ms", 0)

    max_count = max((item["count"] for item in labels), default=0)
    return [
        {
            "d": item["label"],
            "h": max(18, item["count"] * 22) if item["count"] else 8,
            "active": item["count"] == max_count and max_count > 0,
            "val": f"{item['count']} queries",
            "count": item["count"],
            "response_time_ms": item["response_time_ms"],
        }
        for item in labels
    ]


def _build_month_activity():
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=27)
    buckets = []
    for index in range(4):
        bucket_start = start + timedelta(days=index * 7)
        bucket_end = bucket_start + timedelta(days=6)
        buckets.append({
            "label": f"Wk {index + 1}",
            "start": bucket_start,
            "end": bucket_end,
            "count": 0,
        })

    for item in query_history:
        ts = _safe_parse_timestamp(item.get("timestamp"))
        if ts is None:
            continue
        day_value = ts.astimezone(timezone.utc).date()
        for bucket in buckets:
            if bucket["start"] <= day_value <= bucket["end"]:
                bucket["count"] += 1
                break

    max_count = max((bucket["count"] for bucket in buckets), default=0)
    return [
        {
            "d": bucket["label"],
            "h": max(18, bucket["count"] * 16) if bucket["count"] else 10,
            "active": bucket["count"] == max_count and max_count > 0,
            "val": f"{bucket['count']} queries",
            "count": bucket["count"],
        }
        for bucket in buckets
    ]


def _quarter_from_month(month_value):
    return ((month_value - 1) // 3) + 1


def _build_year_activity():
    current_year = datetime.now(timezone.utc).year
    buckets = [{"label": f"Q{quarter}", "quarter": quarter, "count": 0} for quarter in range(1, 5)]

    for item in query_history:
        ts = _safe_parse_timestamp(item.get("timestamp"))
        if ts is None:
            continue
        dt = ts.astimezone(timezone.utc)
        if dt.year != current_year:
            continue
        buckets[_quarter_from_month(dt.month) - 1]["count"] += 1

    max_count = max((bucket["count"] for bucket in buckets), default=0)
    return [
        {
            "d": bucket["label"],
            "h": max(18, bucket["count"] * 14) if bucket["count"] else 10,
            "active": bucket["count"] == max_count and max_count > 0,
            "val": f"{bucket['count']} queries",
            "count": bucket["count"],
        }
        for bucket in buckets
    ]


def _build_top_sources(limit=4):
    counter = Counter()
    for item in query_history:
        for source_name in item.get("sources", []):
            if source_name:
                counter[source_name] += 1
    return [
        {"source": source_name, "count": count}
        for source_name, count in counter.most_common(limit)
    ]


def _build_today_activity():
    today = datetime.now(timezone.utc).date()
    today_queries = []
    for item in query_history:
        ts = _safe_parse_timestamp(item.get("timestamp"))
        if ts is None:
            continue
        if ts.astimezone(timezone.utc).date() == today:
            today_queries.append(item)

    total_queries_today = len(today_queries)
    avg_ms = int(sum(item.get("response_time_ms", 0) for item in today_queries) / total_queries_today) if total_queries_today else 0
    high_confidence = sum(1 for item in today_queries if item.get("confidence") == "High")
    return {
        "queries": total_queries_today,
        "avg_response_ms": avg_ms,
        "high_confidence": high_confidence,
        "sources_touched": len({source for item in today_queries for source in item.get("sources", []) if source}),
    }


@app.get("/analytics/overview")
def analytics_overview():
    total_memories = get_db_stats()
    memories_by_type, last_ingested = get_memory_metadata_summary()
    response_times = [item.get("response_time_ms", 0) for item in query_history if item.get("response_time_ms")]
    avg_query_ms = int(sum(response_times) / len(response_times)) if response_times else 0
    latest_query = query_history[0] if query_history else None

    return {
        "summary": {
            "total_memories": total_memories,
            "total_queries": total_queries_served,
            "avg_query_ms": avg_query_ms,
            "avg_embed_ms": int(sum(embed_times) / len(embed_times)) if embed_times else 0,
            "total_payments": len(payment_requests),
            "last_ingested": last_ingested,
            "last_query_at": latest_query.get("timestamp") if latest_query else None,
        },
        "today": _build_today_activity(),
        "activity": {
            "week": _build_week_activity(),
            "month": _build_month_activity(),
            "year": _build_year_activity(),
        },
        "top_sources": _build_top_sources(),
        "recent_queries": query_history[:6],
        "memory_distribution": memories_by_type,
        "payment_requests": payment_requests[:5],
    }


@app.post("/checkout/session")
async def create_checkout_session(req: CheckoutRequest):
    _validate_checkout_request(req)
    plan = PLAN_CATALOG[req.plan]
    request_id = f"ctx_{uuid4().hex[:12]}"
    amount = plan[req.billing_cycle]
    created_at = datetime.utcnow().isoformat() + "Z"

    payment_record = {
        "request_id": request_id,
        "plan": req.plan,
        "billing_cycle": req.billing_cycle,
        "payment_method": req.payment_method,
        "customer_name": req.customer_name,
        "customer_email": req.customer_email,
        "account_identifier": req.account_identifier,
        "reference": req.reference,
        "amount": amount,
        "status": "sales_followup" if plan["mode"] == "sales" else "payment_method_captured",
        "created_at": created_at,
    }

    if plan["mode"] == "self_serve" and _razorpay_enabled():
        try:
            razorpay_response = requests.post(
                f"{RAZORPAY_API_BASE}/orders",
                auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
                headers={"content-type": "application/json"},
                json={
                    "amount": amount * 100,
                    "currency": "INR",
                    "receipt": request_id,
                    "notes": {
                        "plan": req.plan,
                        "billing_cycle": req.billing_cycle,
                        "payment_method": req.payment_method,
                        "customer_email": req.customer_email,
                    },
                },
                timeout=20,
            )
            if razorpay_response.status_code >= 400:
                raise RuntimeError(razorpay_response.text)

            order_data = razorpay_response.json()
            payment_record["status"] = "order_created"
            payment_record["provider"] = "razorpay"
            payment_record["provider_order_id"] = order_data["id"]
            payment_record["amount_subunits"] = order_data["amount"]
        except Exception as exc:
            payment_record["provider"] = "stub"
            payment_record["provider_error"] = str(exc)
    else:
        payment_record["provider"] = "stub"

    payment_requests.insert(0, payment_record)
    if len(payment_requests) > 25:
        payment_requests.pop()

    store_memory(
        text=(
            f"Checkout request {request_id}: plan={req.plan}, billing={req.billing_cycle}, "
            f"payment_method={req.payment_method}, customer={req.customer_name}, "
            f"email={req.customer_email}, amount={amount if amount is not None else 'custom'}."
        ),
        metadata={
            "source": "checkout",
            "date": created_at,
            "type": "payment_request",
            "request_id": request_id,
        },
    )

    response_payload = {
        "request_id": request_id,
        "status": payment_record["status"],
        "plan": req.plan,
        "billing_cycle": req.billing_cycle,
        "amount": amount,
        "message": "Sales request captured." if plan["mode"] == "sales" else "Payment method captured successfully.",
        "provider": payment_record["provider"],
    }

    if payment_record["provider"] == "razorpay":
        response_payload.update({
            "message": "Razorpay order created successfully.",
            "razorpay_key_id": RAZORPAY_KEY_ID,
            "razorpay_order_id": payment_record["provider_order_id"],
            "currency": "INR",
            "amount_subunits": payment_record["amount_subunits"],
        })

    return response_payload


@app.post("/checkout/verify")
async def verify_checkout_payment(req: PaymentVerificationRequest):
    payment_record = _find_payment_request(req.request_id)
    if payment_record is None:
        raise HTTPException(status_code=404, detail="Checkout request not found.")

    provider_order_id = payment_record.get("provider_order_id")
    if not provider_order_id or provider_order_id != req.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order mismatch for verification.")

    generated_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{provider_order_id}|{req.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if generated_signature != req.razorpay_signature:
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    payment_record["status"] = "verified"
    payment_record["razorpay_payment_id"] = req.razorpay_payment_id
    payment_record["verified_at"] = datetime.utcnow().isoformat() + "Z"

    store_memory(
        text=(
            f"Verified Razorpay payment {req.razorpay_payment_id} for request {req.request_id}. "
            f"Plan={payment_record['plan']}, billing={payment_record['billing_cycle']}."
        ),
        metadata={
            "source": "checkout",
            "date": payment_record["verified_at"],
            "type": "payment_verification",
            "request_id": req.request_id,
        },
    )

    return {
        "request_id": req.request_id,
        "status": "verified",
        "message": "Payment verified successfully.",
    }


@app.post("/checkout/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(default=None),
):
    if not RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=400, detail="Razorpay webhook secret is not configured.")

    if not x_razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing Razorpay signature header.")

    raw_body = await request.body()
    generated_signature = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(generated_signature, x_razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    payload = await request.json()
    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = entity.get("order_id")
    payment_id = entity.get("id")

    payment_record = _find_payment_request_by_provider_order(order_id) if order_id else None
    if payment_record is not None:
        payment_record["webhook_event"] = event
        payment_record["webhook_received_at"] = datetime.utcnow().isoformat() + "Z"
        if payment_id:
            payment_record["razorpay_payment_id"] = payment_id
        if event == "payment.captured":
            payment_record["status"] = "captured"

    return {"status": "ok", "event": event}


@app.get("/stats")
def get_stats():
    total = get_db_stats()

    # F-14: breakdown by source_type
    memories_by_type, last_ingested = get_memory_metadata_summary()

    # ChromaDB dir size
    chromadb_size_mb = 0.0
    try:
        for dirpath, dirnames, filenames in os.walk(DB_DIR):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                chromadb_size_mb += os.path.getsize(fp)
        chromadb_size_mb = round(chromadb_size_mb / (1024 * 1024), 1)
    except Exception:
        pass

    return {
        "total_memories": total,
        "memories_by_type": memories_by_type,
        "total_chunks": total,
        "last_ingested": last_ingested,
        "chromadb_size_mb": chromadb_size_mb,
        "collection_name": "company_knowledge_base",
        "model": "Mistral 7B (Local via Ollama)",
        "status": "operational",
        "cloud_calls": 0,
        "recent_activity": query_history,
        "payment_requests": payment_requests[:10],
    }


# ═══════════════════════════════════════════
# F-13: QUERY HISTORY ENDPOINT
# ═══════════════════════════════════════════

@app.get("/history")
def get_history():
    """Return last 20 queries, newest first."""
    return {"history": query_history[:20]}

@app.delete("/history")
def clear_history():
    query_history.clear()
    return {"cleared": True, "history": []}

@app.get("/amd-status")
def amd_status():
    """Legacy endpoint — kept for backwards compatibility."""
    return {
        "device": "AMD Ryzen AI NPU",
        "inference": "On-Device (Ollama)",
        "cloud_dependency": "ZERO",
        "privacy": "100% Local",
        "processor": platform.processor()
    }

# ROUTE 3: Health check
@app.get("/")
def home():
    return {"message": "ContextOS API running"}


@app.get("/dashboard/meeting", response_model=MeetingStatusResponse)
def dashboard_meeting():
    meeting_url = os.getenv("DASHBOARD_MEET_URL", "https://meet.google.com/nux-wq-tu")
    meeting_code = meeting_url.rstrip("/").split("/")[-1]
    return {
        "title": os.getenv("DASHBOARD_MEET_TITLE", "Meeting with Product team"),
        "start_time": "10:30",
        "end_time": "12:00",
        "starts_in": "In 30 minutes",
        "meeting_url": meeting_url,
        "meeting_code": meeting_code,
        "attendees": ["AS", "PL", "MK"],
        "platform": "Google Meet",
        "status": "scheduled",
    }


# ═══════════════════════════════════════════
# F-06: DECISION DNA ENDPOINT
# ═══════════════════════════════════════════

from decision_dna import store_decision


@app.post("/memory/decision")
async def create_decision(req: DecisionRequest):
    """
    Store a structured Decision Record into ChromaDB.
    This is the Decision DNA feature — permanent company memory.
    """
    try:
        result = store_decision({
            "title": req.title,
            "what_decided": req.what_decided,
            "why_decided": req.why_decided,
            "what_rejected": req.what_rejected,
            "who_decided": req.who_decided,
            "date": req.date,
            "tags": req.tags or [],
        })
        return result
    except ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="ChromaDB or Ollama not available. Start Ollama first.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decision store error: {str(e)}")


# ═══════════════════════════════════════════
# F-07: EXPERT FINDER
# ═══════════════════════════════════════════

@app.get("/memory/expert")
async def find_expert(topic: str):
    """
    Find the team expert on a given topic by analysing
    metadata from the top‑10 most relevant ChromaDB chunks.
    """
    try:
        results = retrieve_memory(topic, limit=10)
    except Exception:
        return {
            "topic": topic,
            "experts": [],
            "source_documents": [],
            "answer": "Search failed. Ensure Ollama is running.",
        }

    if not results:
        return {
            "topic": topic,
            "experts": [],
            "source_documents": [],
            "answer": "No relevant documents found for this topic.",
        }

    # Extract person names and source docs
    person_counter = Counter()
    person_sources = {}
    all_sources = set()

    for doc in results:
        meta = doc.metadata or {}
        source_name = meta.get("source_name", meta.get("source", ""))
        if source_name:
            all_sources.add(source_name)

        # Gather person names from multiple metadata fields
        for field in ["author", "who_decided", "sender"]:
            person = meta.get(field, "")
            if person and person.lower() not in ("team", "unknown", "", "user"):
                person_counter[person] += 1
                if person not in person_sources:
                    person_sources[person] = set()
                person_sources[person].add(source_name)

    # Build expert list sorted by frequency
    experts = []
    for name, count in person_counter.most_common(5):
        if count >= 1:
            confidence = "High" if count >= 3 else "Medium" if count >= 2 else "Low"
            experts.append({
                "name": name,
                "confidence": confidence,
                "evidence_count": count,
                "sources": list(person_sources.get(name, [])),
            })

    # Build answer text
    if experts:
        top = experts[0]
        answer = (
            f"Based on {top['evidence_count']} documents, "
            f"{top['name']} has the most knowledge about {topic}."
        )
    else:
        answer = (
            "No expert identified for this topic. "
            "Try adding more documents with author information."
        )

    return {
        "topic": topic,
        "experts": experts,
        "source_documents": list(all_sources),
        "answer": answer,
    }


# ═══════════════════════════════════════════
# F-18: Dummy Slack Integration Endpoint
# ═══════════════════════════════════════════

import asyncio

@app.post("/slack/sync")
async def sync_slack(req: SlackSyncRequest):
    await asyncio.sleep(2) # Simulate processing
    if not req.bot_token.strip() or not req.channel_id.strip():
        raise HTTPException(status_code=400, detail="Bot token and channel ID are required.")

    success = "dummy" not in req.bot_token.lower()
    return {
        "status": "success" if success else "warning",
        "channels_synced": 1 if success else 0,
        "channel_name": req.channel_name or req.channel_id,
        "message": (
            f"Connected and synced Slack channel {req.channel_name or req.channel_id}."
            if success else
            "Slack credentials were rejected by the demo connector. Update the bot token and try again."
        ),
    }


# ═══════════════════════════════════════════
# F-08: ONBOARDING CO-PILOT DEMO SETUP
# ═══════════════════════════════════════════

@app.post("/demo/setup-onboarding")
async def setup_onboarding():
    """
    Ingests 3 onboarding-specific memories into ChromaDB
    for the demo scenario flow.
    """
    if vectorstore is None:
        raise HTTPException(status_code=503, detail="ChromaDB not available.")

    onboarding_docs = [
        {
            "text": (
                "New joiner questions and answers 2026. "
                "Q: Where do I find the API keys? "
                "A: All API keys are in .env file. Ask Anandam for access. "
                "Q: Who do I talk to about the payment system? "
                "A: Anandam owns payments. Ping on Slack or check "
                "payment_integration doc in ContextOS. "
                "Q: How do I deploy to production? "
                "A: We use Railway. Run 'railway up' from project root. "
                "Anandam manages all deployment access."
            ),
            "metadata": {
                "source_type": "document",
                "source_name": "new_joiner_faq",
                "content_type_label": "Document",
                "author": "Anandam",
                "date": "2026-03-01",
            },
        },
        {
            "text": (
                "ContextOS team culture and working norms. "
                "Meetings: Async by default, Slack for quick questions. "
                "Code reviews: All PRs reviewed within 24 hours. "
                "Decisions: Logged in ContextOS Decision DNA — always check "
                "here before asking why something was built a certain way. "
                "Onboarding buddy: Anandam is the onboarding buddy for all "
                "new joiners in 2026."
            ),
            "metadata": {
                "source_type": "document",
                "source_name": "team_culture_doc",
                "content_type_label": "Document",
                "author": "Anandam",
                "date": "2026-03-01",
            },
        },
        {
            "text": (
                "Why we chose our tech stack. "
                "FastAPI over Flask: async support, automatic OpenAPI docs, "
                "Pydantic validation. Chosen by Anandam in Jan 2026. "
                "ChromaDB over Pinecone: runs locally, zero cloud dependency, "
                "free forever. Critical for DPDP compliance. "
                "Mistral 7B over GPT-4: open source, runs on AMD hardware, "
                "zero per-query cost. Decision made by Anandam Feb 2026. "
                "React over Next.js: simpler for MVP, easier for team."
            ),
            "metadata": {
                "source_type": "document",
                "source_name": "tech_stack_rationale",
                "content_type_label": "Document",
                "author": "Anandam",
                "date": "2026-02-01",
            },
        },
    ]

    count = 0
    for doc in onboarding_docs:
        store_memory(doc["text"], doc["metadata"])
        count += 1

    return {"setup": True, "memories_added": count}


# ═══════════════════════════════════════════
# AMD HARDWARE + INFERENCE MONITOR
# ═══════════════════════════════════════════

from amd_monitor import (
    get_cached_inference_status,
    get_system_metrics as amd_get_system_metrics,
)


@app.get("/amd/status")
async def amd_full_status():
    """
    Full AMD/hardware inference status.
    Includes Ollama detection, GPU/CPU info, metrics, cloud call count.
    Cached for 3 seconds to avoid hammering psutil.
    """
    return get_cached_inference_status()


@app.get("/amd/metrics")
async def amd_live_metrics():
    """
    Lightweight endpoint — just CPU/RAM metrics.
    No caching, always fresh. Used by frontend for live gauge updates.
    """
    return amd_get_system_metrics()


# ═══════════════════════════════════════════
# GMAIL INTEGRATION ENDPOINTS
# ═══════════════════════════════════════════

GMAIL_CONNECTOR_IMPORT_ERROR = None

try:
    from gmail_connector import (
        get_auth_url,
        exchange_code,
        is_connected,
        load_credentials,
        fetch_emails,
        ingest_emails_to_chromadb,
        get_sync_meta,
    )
except Exception as exc:
    GMAIL_CONNECTOR_IMPORT_ERROR = exc

    def get_auth_url():
        raise RuntimeError("Gmail connector dependencies are unavailable.")

    def exchange_code(code: str):
        raise RuntimeError("Gmail connector dependencies are unavailable.")

    def is_connected():
        return False

    def load_credentials():
        return None

    def fetch_emails(max_results: int = 75):
        raise RuntimeError("Gmail connector dependencies are unavailable.")

    def ingest_emails_to_chromadb(emails):
        raise RuntimeError("Gmail connector dependencies are unavailable.")

    def get_sync_meta():
        return {"last_sync": None, "email_count": 0}


def _gmail_unavailable_detail():
    return {
        "error": "gmail_connector_unavailable",
        "message": "Gmail integration dependencies are unavailable. Install backend requirements and restart the API.",
        "reason": str(GMAIL_CONNECTOR_IMPORT_ERROR),
    }


def _require_gmail_connector():
    if GMAIL_CONNECTOR_IMPORT_ERROR is not None:
        raise HTTPException(status_code=503, detail=_gmail_unavailable_detail())


def _gmail_frontend_redirect(status: str, message: str = ""):
    params = {"tab": "upload", "gmail": status}
    if message:
        params["gmail_message"] = message[:180]
    return RedirectResponse(url=f"{FRONTEND_APP_URL}/?{urlencode(params)}")


@app.get("/gmail/connect")
async def gmail_connect():
    """
    Returns Google OAuth consent URL.
    If already connected (valid token exists), returns status instead.
    """
    _require_gmail_connector()
    if is_connected():
        return {"status": "already_connected", "auth_url": None}

    try:
        auth_url = get_auth_url()
    except ValueError as exc:
        raise HTTPException(status_code=503, detail={
            "error": "gmail_oauth_not_configured",
            "message": str(exc),
        })
    return {"auth_url": auth_url}


@app.get("/gmail/callback")
async def gmail_callback(code: str | None = None, state: str | None = None, error: str | None = None):
    """
    Handles the OAuth redirect from Google.
    Exchanges code for token, saves to gmail_token.json,
    then redirects the user back to the frontend.
    """
    _require_gmail_connector()
    if error:
        return _gmail_frontend_redirect("error", f"Gmail authorization was not completed: {error}.")
    if not code:
        return _gmail_frontend_redirect("error", "Google did not return an authorization code.")
    try:
        exchange_code(code)
        return _gmail_frontend_redirect("connected", "Gmail connected successfully.")
    except Exception as e:
        return _gmail_frontend_redirect("error", f"OAuth exchange failed: {str(e)}")


@app.post("/gmail/sync")
async def gmail_sync(req: GmailSyncRequest):
    """
    Fetches emails from Gmail, then ingests them into ChromaDB.
    Handles token-expired, ollama-offline, and quota errors gracefully.
    """
    _require_gmail_connector()
    if not is_connected():
        try:
            auth_url = get_auth_url()
        except ValueError as exc:
            raise HTTPException(status_code=503, detail={
                "error": "gmail_oauth_not_configured",
                "message": str(exc),
            })
        return {
            "success": False,
            "error": "token_expired",
            "auth_url": auth_url,
            "message": "Gmail session expired. Please reconnect.",
        }

    try:
        emails = fetch_emails(max_results=req.max_emails)
    except PermissionError:
        try:
            auth_url = get_auth_url()
        except ValueError as exc:
            raise HTTPException(status_code=503, detail={
                "error": "gmail_oauth_not_configured",
                "message": str(exc),
            })
        return {
            "success": False,
            "error": "token_expired",
            "auth_url": auth_url,
            "message": "Gmail token expired. Please reconnect.",
        }
    except Exception as e:
        error_str = str(e).lower()
        if "quota" in error_str or "rate" in error_str:
            raise HTTPException(
                status_code=429,
                detail={"error": "quota_exceeded", "message": "Gmail API quota exceeded. Try again later."},
            )
        raise HTTPException(status_code=500, detail=f"Gmail fetch error: {str(e)}")

    try:
        result = ingest_emails_to_chromadb(emails)
    except ConnectionError:
        raise HTTPException(
            status_code=503,
            detail={"error": "ollama_offline", "message": "Ollama is not running. Start Ollama and try again."},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingest error: {str(e)}")

    return {
        "success": True,
        "synced": result["synced"],
        "skipped": result["skipped"],
        "total_chunks": result["total_chunks"],
        "message": f"Synced {result['synced']} emails from Gmail ({result['skipped']} already existed)",
    }


@app.get("/gmail/status")
async def gmail_status():
    """
    Returns Gmail connection status, last sync time, and email count.
    Used by the frontend GmailCard to poll for connection state.
    """
    if GMAIL_CONNECTOR_IMPORT_ERROR is not None:
        return {
            "available": False,
            "connected": False,
            "last_sync": None,
            "email_count": 0,
            "detail": _gmail_unavailable_detail(),
        }
    connected = is_connected()
    meta = get_sync_meta()
    return {
        "available": True,
        "connected": connected,
        "last_sync": meta.get("last_sync"),
        "email_count": meta.get("email_count", 0),
    }


@app.delete("/gmail/disconnect")
async def gmail_disconnect():
    """
    Disconnects Gmail by deleting the local token.
    """
    if GMAIL_CONNECTOR_IMPORT_ERROR is not None:
        return {"disconnected": True, "available": False}
    token_path = os.path.join(os.path.dirname(__file__), "gmail_token.json")
    sync_meta_path = os.path.join(os.path.dirname(__file__), "gmail_sync_meta.json")
    if os.path.exists(token_path):
        try:
            os.remove(token_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete token: {str(e)}")
    if os.path.exists(sync_meta_path):
        try:
            os.remove(sync_meta_path)
        except Exception:
            pass
    return {"disconnected": True}


# Run the server
# Command: uvicorn main:app --reload
