from fastapi import FastAPI, UploadFile, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from ai_engine import store_memory, search_memory, get_db_stats, vectorstore, llm
from pydantic import BaseModel
from typing import Optional, List
import json
import platform
import time
from datetime import datetime

# Load environment variables
from dotenv import load_dotenv
import os
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI()

# Store recent queries in memory (In production, use a database)
query_history = []

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000", 
        "https://contextos.netlify.app"
    ],
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


# ═══════════════════════════════════════════
# CORE ENDPOINTS
# ═══════════════════════════════════════════

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
    store_memory(req.content, metadata)
    return {"status": "Memory stored successfully", "content_type": content_type}


# ROUTE 2: Ask a question — F-09 enhanced with source chips + confidence
@app.post("/ask")
async def ask_question(req: AskRequest):
    if vectorstore is None or llm is None:
        return {
            "answer": "ContextOS is not ready. Please ensure Ollama is running.",
            "sources": [],
            "confidence": "Low",
            "chunks_searched": 0,
        }

    start_time = time.time()

    # Get relevant docs with scores
    try:
        scored_results = vectorstore.similarity_search_with_relevance_scores(
            req.question, k=5
        )
    except Exception:
        # Fallback if similarity_search_with_relevance_scores is not available
        scored_results = []
        try:
            docs = vectorstore.similarity_search(req.question, k=5)
            scored_results = [(doc, 0.75) for doc in docs]  # default medium confidence
        except Exception:
            pass

    if not scored_results:
        return {
            "answer": "No relevant memories found. Try adding some documents first.",
            "sources": [],
            "confidence": "Low",
            "chunks_searched": 0,
        }

    # Extract docs and scores
    relevant_docs = [doc for doc, score in scored_results]
    scores = [score for doc, score in scored_results]

    # Build context
    context = "\n".join([doc.page_content for doc in relevant_docs])

    # Ask LLM
    prompt = f"""
    You are ContextOS, a company memory assistant.
    Based on this company data: {context}
    Answer this question: {req.question}
    Give specific details about decisions, people involved, and dates.
    """
    answer = llm.invoke(prompt)

    # Track query history
    query_history.insert(0, {
        "q": req.question,
        "time": "Just now",
        "author": "User"
    })
    if len(query_history) > 10:
        query_history.pop()

    # F-09: Build deduplicated source chips
    seen_sources = set()
    source_chips = []
    for i, (doc, score) in enumerate(scored_results):
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

    # Confidence logic based on top score
    top_score = scores[0] if scores else 0
    if top_score > 0.80:
        confidence = "High"
    elif top_score > 0.65:
        confidence = "Medium"
    else:
        confidence = "Low"

    # Total chunks in DB
    chunks_searched = get_db_stats()

    elapsed = round(time.time() - start_time, 2)

    return {
        "answer": answer,
        "sources": source_chips,
        "confidence": confidence,
        "chunks_searched": chunks_searched,
        "response_time": elapsed,
    }


@app.get("/stats")
def get_stats():
    return {
        "total_memories": get_db_stats(),
        "model": "Phi-3 Mini (Local CPU/NPU)",
        "status": "operational",
        "cloud_calls": 0,
        "recent_activity": query_history
    }

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
    return {"status": "ContextOS is running"}


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
    if vectorstore is None:
        return {
            "topic": topic,
            "experts": [],
            "source_documents": [],
            "answer": "ChromaDB not available.",
        }

    try:
        results = vectorstore.similarity_search(topic, k=10)
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
    from collections import Counter
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

from gmail_connector import (
    get_auth_url,
    exchange_code,
    is_connected,
    load_credentials,
    fetch_emails,
    ingest_emails_to_chromadb,
    get_sync_meta,
)


@app.get("/gmail/connect")
async def gmail_connect():
    """
    Returns Google OAuth consent URL.
    If already connected (valid token exists), returns status instead.
    """
    if is_connected():
        return {"status": "already_connected", "auth_url": None}

    auth_url = get_auth_url()
    return {"auth_url": auth_url}


@app.get("/gmail/callback")
async def gmail_callback(code: str, state: str = None):
    """
    Handles the OAuth redirect from Google.
    Exchanges code for token, saves to gmail_token.json,
    then redirects the user back to the frontend.
    """
    try:
        exchange_code(code)
        return RedirectResponse(
            url="http://localhost:5173/memory?gmail=connected"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth exchange failed: {str(e)}")


@app.post("/gmail/sync")
async def gmail_sync(req: GmailSyncRequest):
    """
    Fetches emails from Gmail, then ingests them into ChromaDB.
    Handles token-expired, ollama-offline, and quota errors gracefully.
    """
    if not is_connected():
        auth_url = get_auth_url()
        return {
            "success": False,
            "error": "token_expired",
            "auth_url": auth_url,
            "message": "Gmail session expired. Please reconnect.",
        }

    try:
        emails = fetch_emails(max_results=req.max_emails)
    except PermissionError:
        auth_url = get_auth_url()
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
    connected = is_connected()
    meta = get_sync_meta()
    return {
        "connected": connected,
        "last_sync": meta.get("last_sync"),
        "email_count": meta.get("email_count", 0),
    }


# Run the server
# Command: uvicorn main:app --reload
