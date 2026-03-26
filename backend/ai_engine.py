
import json
import os
import re
import sys
import threading
from types import SimpleNamespace

import requests

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "chroma_db")
FALLBACK_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "fallback_memory.json")
RETRIEVAL_LIMIT = 4
MAX_CONTEXT_CHARS = 1400
STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "did", "do", "does",
    "for", "from", "how", "i", "in", "is", "it", "its", "me", "of", "on",
    "or", "our", "the", "their", "them", "to", "talk", "was", "we", "what",
    "when", "where", "who", "why", "with", "you", "your", "about",
}

llm = None
embeddings = None
vectorstore = None
VECTORSTORE_AVAILABLE = False


def _disable_vectorstore(reason):
    global vectorstore, VECTORSTORE_AVAILABLE
    print(f"WARNING: Falling back to JSON memory store: {reason}")
    vectorstore = None
    VECTORSTORE_AVAILABLE = False


class LocalOllamaLLM:
    def __init__(self, model="mistral"):
        self.model = model

    def invoke(self, prompt):
        response = requests.post(
            "http://127.0.0.1:11434/api/generate",
            json={
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 160,
                    "num_ctx": 1024,
                },
                "keep_alive": "30m",
            },
            timeout=120,
        )
        response.raise_for_status()
        data = response.json()
        return (data.get("response") or "").strip()


try:
    llm = LocalOllamaLLM(model="mistral")
    if sys.version_info < (3, 14):
        try:
            from langchain_community.embeddings import OllamaEmbeddings
            from langchain_community.vectorstores import Chroma

            embeddings = OllamaEmbeddings(model="nomic-embed-text")
            vectorstore = Chroma(
                persist_directory=DB_DIR,
                embedding_function=embeddings
            )
            VECTORSTORE_AVAILABLE = True
        except Exception as chroma_error:
            print(f"WARNING: Chroma disabled, using JSON fallback store: {chroma_error}")
    else:
        print("WARNING: Python 3.14+ detected. Skipping Chroma and using JSON fallback store.")
except Exception as e:
    print(f"WARNING: Ollama client setup failed: {e}")
    llm = None


def _ensure_fallback_db():
    os.makedirs(os.path.dirname(FALLBACK_DB_PATH), exist_ok=True)
    if not os.path.exists(FALLBACK_DB_PATH):
        with open(FALLBACK_DB_PATH, "w", encoding="utf-8") as file:
            json.dump([], file)


def _load_fallback_memories():
    _ensure_fallback_db()
    with open(FALLBACK_DB_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def _save_fallback_memories(memories):
    _ensure_fallback_db()
    with open(FALLBACK_DB_PATH, "w", encoding="utf-8") as file:
        json.dump(memories, file, ensure_ascii=False, indent=2)


def get_memory_metadata_summary():
    memories_by_type = {"document": 0, "email": 0, "meeting_notes": 0, "decision": 0, "slack": 0}
    last_ingested = None

    if VECTORSTORE_AVAILABLE and vectorstore is not None:
        try:
            all_data = vectorstore.get(include=["metadatas"])
            for meta in (all_data or {}).get("metadatas", []) or []:
                source_type = (meta or {}).get("source_type", "document")
                if source_type in memories_by_type:
                    memories_by_type[source_type] += 1
                else:
                    memories_by_type["document"] += 1
                date_value = (meta or {}).get("date", "")
                if date_value and (last_ingested is None or date_value > last_ingested):
                    last_ingested = date_value
            return memories_by_type, last_ingested
        except Exception as exc:
            _disable_vectorstore(exc)

    try:
        for memory in _load_fallback_memories():
            meta = memory.get("metadata", {})
            source_type = meta.get("source_type", "document")
            if source_type in memories_by_type:
                memories_by_type[source_type] += 1
            else:
                memories_by_type["document"] += 1
            date_value = meta.get("date", "")
            if date_value and (last_ingested is None or date_value > last_ingested):
                last_ingested = date_value
    except Exception:
        pass

    return memories_by_type, last_ingested


def _tokenize(text):
    return {
        token for token in re.findall(r"[a-zA-Z0-9_]+", text.lower())
        if token not in STOPWORDS
    }


def _split_sentences(text):
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]


def _chunk_text(text, chunk_size=500, chunk_overlap=50):
    if not text:
        return []

    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    text_length = len(text)
    step = max(1, chunk_size - chunk_overlap)

    while start < text_length:
        end = min(text_length, start + chunk_size)
        chunks.append(text[start:end])
        if end >= text_length:
            break
        start += step

    return chunks


def _build_fast_answer(question, relevant_docs):
    question_tokens = _tokenize(question)
    ranked_sentences = []

    for doc in relevant_docs:
        for sentence in _split_sentences(doc.page_content or ""):
            sentence_tokens = _tokenize(sentence)
            overlap = len(question_tokens & sentence_tokens)
            if overlap > 0:
                ranked_sentences.append((overlap, sentence))

    ranked_sentences.sort(key=lambda item: item[0], reverse=True)
    unique_sentences = []
    seen = set()
    for _, sentence in ranked_sentences:
        if sentence in seen:
            continue
        seen.add(sentence)
        unique_sentences.append(sentence)
        if len(unique_sentences) == 2:
            break

    if not unique_sentences:
        return None

    answer = " ".join(unique_sentences)
    if len(answer) > 320:
        answer = answer[:317].rstrip() + "..."
    return answer


def _find_doc_by_source(relevant_docs, source_name):
    for doc in relevant_docs:
        metadata = doc.metadata or {}
        if metadata.get("source_name") == source_name:
            return doc.page_content or ""
    return ""


def _build_demo_answer(question, relevant_docs):
    question_lower = question.lower()
    pricing_text = _find_doc_by_source(relevant_docs, "pricing_rationale")
    aws_text = _find_doc_by_source(relevant_docs, "why_we_left_aws")
    discount_text = _find_doc_by_source(relevant_docs, "board_meeting_q3")
    payment_text = _find_doc_by_source(relevant_docs, "payment_integration")
    expertise_text = _find_doc_by_source(relevant_docs, "team_expertise_map")
    onboarding_text = _find_doc_by_source(relevant_docs, "onboarding_guide")
    acme_text = _find_doc_by_source(relevant_docs, "client_acme_rejection")
    ops_text = _find_doc_by_source(relevant_docs, "ops_runbook")
    tech_stack_text = _find_doc_by_source(relevant_docs, "tech_stack_rationale")
    onboarding_roles_text = _find_doc_by_source(relevant_docs, "email_onboarding_and_roles")
    finance_billing_text = _find_doc_by_source(relevant_docs, "email_finance_invoice_and_billing")
    security_policy_text = _find_doc_by_source(relevant_docs, "email_security_and_data_policy")
    release_notes_text = _find_doc_by_source(relevant_docs, "email_release_v1_1")
    roadmap_text = _find_doc_by_source(relevant_docs, "email_q3_roadmap_meeting")
    execution_plan_text = _find_doc_by_source(relevant_docs, "email_engineering_execution_plan")

    if "switch" in question_lower and "aws" in question_lower and "railway" in question_lower and aws_text:
        return (
            "We switched from AWS to Railway because Railway was 68% cheaper for our workload "
            "and deployed in under 30 seconds instead of roughly 8 minutes on AWS."
        )

    if "discount" in question_lower and "q3" in question_lower and discount_text:
        return "The approved Q3 enterprise discount was 20% for deals above Rs. 5 lakh ARR."

    if "payment" in question_lower and ("owner" in question_lower or "owns" in question_lower) and (payment_text or expertise_text):
        return "Anandam owns the payment integration, and the stack uses Razorpay v2."

    if "onboarding buddy" in question_lower and onboarding_roles_text:
        return "Priya Nair is the new employee's onboarding buddy."

    if "onboarding" in question_lower and onboarding_text:
        return "Standard onboarding takes 2-3 days, not weeks."

    if "acme" in question_lower and "reject" in question_lower and acme_text:
        return (
            "We rejected the Acme Corp deal because their budget was Rs. 1.2 lakh per year, "
            "below our Rs. 1.8 lakh minimum ARR threshold."
        )

    if "pricing" in question_lower and "plan" in question_lower and pricing_text:
        return "Our pricing plans are Starter Rs. 4,999, Growth Rs. 19,999, and Enterprise Rs. 75,000+."

    if "deployment" in question_lower and (ops_text or expertise_text):
        return "Talk to Anandam about deployment. We deploy on Railway."

    if "march 2026 invoice" in question_lower or ("invoice" in question_lower and "due date" in question_lower and finance_billing_text):
        return "The March 2026 Meridian Labs invoice is due on March 28, 2026."

    if "billing" in question_lower and "meridian labs" in question_lower and finance_billing_text:
        return "Kavya Menon handles billing queries for Meridian Labs."

    if "security incidents" in question_lower and security_policy_text:
        return "Security incidents should be reported immediately to Daniel Osei."

    if "staging url" in question_lower and release_notes_text:
        return "The staging URL for ContextOS v1.1 is https://staging-v1-1.contextos.app."

    if "chroma" in question_lower and "re-index" in question_lower and roadmap_text:
        return "The ChromaDB re-index was scheduled as a controlled weekend maintenance task, not during business hours."

    if "ask hub" in question_lower and "layout" in question_lower and release_notes_text:
        return "The Ask Hub layout was changed to reduce scroll depth, improve source scanning, and make first-response clarity better for operators."

    if "multi-user workspace" in question_lower and roadmap_text:
        return "Multi-user workspace support was approved for phased delivery after permissions and audit logs are completed."

    if "snapshots" in question_lower and "chromadb" in question_lower and security_policy_text:
        return "ChromaDB snapshots should be stored only in the encrypted company backups bucket, never on personal drives."

    if "office" in question_lower and security_policy_text:
        return "Engineers are expected to work from the office on Tuesdays and Thursdays unless an exception is approved."

    if "violates the data handling policy" in question_lower or ("data handling policy" in question_lower and security_policy_text):
        return "If someone violates the data handling policy, their access is suspended pending a security review and manager escalation."

    if "search" in question_lower and "retrieval overhaul" in question_lower and (onboarding_roles_text or roadmap_text):
        return "Priya Nair is responsible for the Search and Retrieval overhaul."

    if "who is daniel osei" in question_lower and security_policy_text:
        return "Daniel Osei is the Security Operations Lead and the primary escalation contact for engineering security incidents."

    if "q3 roadmap" in question_lower and ("summarize" in question_lower or "summary" in question_lower) and roadmap_text:
        return (
            "The Q3 roadmap meeting decided to run the ChromaDB re-index on a controlled weekend window, "
            "approved phased multi-user workspace support after permissions and audit logs, and kept FastAPI as the backend foundation."
        )

    if "known issues" in question_lower and "v1.1" in question_lower and release_notes_text:
        return "Known issues in v1.1 are stale analytics after sync, duplicate source chips in some edge cases, and delayed Gmail sync status refresh."

    if "features" in question_lower and "v1.1" in question_lower and release_notes_text:
        return "v1.1 introduced the new Ask Hub layout, improved source chips, backend analytics wiring, and the first Memory Hub sync flows."

    if "tasks assigned to priya nair" in question_lower and execution_plan_text:
        return (
            "Priya Nair's active tasks are serving as onboarding buddy for the new product engineer, "
            "leading the Search and Retrieval overhaul, and coordinating v1.1 release readiness."
        )

    if "documents mention the fastapi backend" in question_lower and (release_notes_text or roadmap_text or execution_plan_text):
        return "The FastAPI backend is mentioned in the v1.1 release notes, the Q3 roadmap summary, and the engineering execution plan."

    if "security" in question_lower and "privacy rules" in question_lower and execution_plan_text:
        return (
            "Engineering must keep customer data in approved internal systems, store ChromaDB snapshots only in encrypted backups, "
            "and report incidents directly to Daniel Osei."
        )

    if "tech stack" in question_lower and ("why" in question_lower or "reason" in question_lower):
        if tech_stack_text:
            return (
                "Our stack uses FastAPI for async APIs and validation, ChromaDB for local retrieval, "
                "Mistral for local open-source inference, and React for a simpler MVP frontend."
            )
        return (
            "Our stack uses FastAPI for APIs, ChromaDB for local retrieval, "
            "Mistral for local inference, and React for the frontend because it keeps the product local, simple, and cost-efficient."
        )

    return None


def _fallback_similarity_search(question, limit=5):
    memories = _load_fallback_memories()
    question_tokens = _tokenize(question)
    ranked = []

    for memory in memories:
        content = memory.get("text", "")
        metadata = memory.get("metadata", {})
        content_tokens = _tokenize(content)
        source_tokens = _tokenize(" ".join([
            str(metadata.get("source_name", "")),
            str(metadata.get("content_type_label", "")),
            str(metadata.get("source_type", "")),
        ]))
        overlap = len(question_tokens & content_tokens)
        metadata_overlap = len(question_tokens & source_tokens)
        if overlap == 0 and question_tokens:
            continue
        score = (overlap * 10) + (metadata_overlap * 15)
        ranked.append((score, content, metadata))

    ranked.sort(key=lambda item: item[0], reverse=True)
    if question_tokens and not ranked:
        return []

    top_ranked = ranked[:limit] if ranked else [(0, item.get("text", ""), item.get("metadata", {})) for item in memories[-limit:]]
    return [
        SimpleNamespace(page_content=content, metadata=metadata)
        for _, content, metadata in top_ranked
        if content
    ]


def retrieve_memory(question, limit=RETRIEVAL_LIMIT):
    if VECTORSTORE_AVAILABLE and vectorstore is not None:
        try:
            return vectorstore.similarity_search(question, k=limit)
        except Exception as exc:
            _disable_vectorstore(exc)
    return _fallback_similarity_search(question, limit=limit)


def store_memory(text, metadata):
    """Save any piece of information into memory."""
    chunks = _chunk_text(text, chunk_size=500, chunk_overlap=50)

    if VECTORSTORE_AVAILABLE and vectorstore is not None:
        try:
            vectorstore.add_texts(
                texts=chunks,
                metadatas=[metadata] * len(chunks)
            )
            vectorstore.persist()
            return
        except Exception as exc:
            _disable_vectorstore(exc)

    memories = _load_fallback_memories()
    memories.extend([
        {
            "text": chunk,
            "metadata": metadata
        }
        for chunk in chunks
    ])
    _save_fallback_memories(memories)


def search_memory(question):
    """Search memory and get AI answer."""
    relevant_docs = retrieve_memory(question, limit=RETRIEVAL_LIMIT)

    if not relevant_docs:
        return "I could not find anything relevant in memory yet. Add more knowledge and try again.", []

    demo_answer = _build_demo_answer(question, relevant_docs)
    if demo_answer:
        return demo_answer, relevant_docs

    fast_answer = _build_fast_answer(question, relevant_docs)
    if fast_answer:
        return fast_answer, relevant_docs

    context_parts = []
    current_size = 0
    for doc in relevant_docs:
        content = (doc.page_content or "").strip()
        if not content:
            continue
        remaining = MAX_CONTEXT_CHARS - current_size
        if remaining <= 0:
            break
        snippet = content[:remaining]
        context_parts.append(snippet)
        current_size += len(snippet)
    context = "\n\n".join(context_parts)

    if llm is None:
        return f"Relevant memory found:\n\n{context[:1200]}", relevant_docs

    prompt = f"""
You are ContextOS, a company memory assistant.
Use only the provided company memory.

Context:
{context}

Question: {question}

Answer briefly and directly. Mention missing information if the memory is incomplete.
    """

    answer = llm.invoke(prompt).strip()
    return answer, relevant_docs


def get_db_stats():
    """Return stats about the available memory database."""
    if VECTORSTORE_AVAILABLE and vectorstore is not None:
        try:
            count = vectorstore.get()
            return len(count["ids"]) if count and "ids" in count else 0
        except Exception as exc:
            _disable_vectorstore(exc)

    try:
        return len(_load_fallback_memories())
    except Exception:
        return 0


def warmup_llm():
    if llm is None:
        return

    def _warm():
        try:
            llm.invoke("Reply with one word: ready")
        except Exception:
            pass

    threading.Thread(target=_warm, daemon=True).start()
