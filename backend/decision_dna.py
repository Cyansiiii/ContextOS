"""
decision_dna.py — Structured decision memory type for ContextOS.

"Any decision ever made at this company — who made it, why, what
was rejected — lives here forever. Even after the person leaves."

Stores decisions as rich text with full metadata in ChromaDB.
"""

from ai_engine import vectorstore, embeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


def store_decision(decision: dict) -> dict:
    """
    Store a structured Decision Record into ChromaDB.

    Args:
        decision: dict with keys:
            title, what_decided, why_decided, what_rejected,
            who_decided, date, tags (list[str])

    Returns:
        { "stored": True, "chunks": N, "title": title }
    """
    if vectorstore is None:
        raise ConnectionError("ChromaDB / Ollama not available")

    title = decision.get("title", "Untitled Decision")
    what_decided = decision.get("what_decided", "")
    why_decided = decision.get("why_decided", "")
    what_rejected = decision.get("what_rejected", "")
    who_decided = decision.get("who_decided", "Unknown")
    date = decision.get("date", "")
    tags = decision.get("tags", [])

    # Build rich text document — this is what the LLM will see when RAG searches
    document = (
        f"DECISION: {title}\n"
        f"Date: {date} | Decided by: {who_decided}\n"
        f"\n"
        f"WHAT WAS DECIDED:\n"
        f"{what_decided}\n"
        f"\n"
        f"WHY THIS DECISION WAS MADE:\n"
        f"{why_decided}\n"
        f"\n"
        f"WHAT WAS REJECTED:\n"
        f"{what_rejected}\n"
        f"\n"
        f"Tags: {', '.join(tags) if tags else 'none'}"
    )

    # Chunk
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
    )
    chunks = splitter.split_text(document)

    # Metadata — consistent with F-10 schema
    metadata = {
        "source_type": "decision",
        "source_name": title[:60],
        "content_type_label": "Decision Record",
        "who_decided": who_decided,
        "author": who_decided,
        "date": date,
        "what_decided": what_decided[:200],
        "what_rejected": what_rejected[:200],
        "tags": ", ".join(tags) if tags else "",
    }

    # Store each chunk with chunk_index and total_chunks
    metadatas = []
    for i in range(len(chunks)):
        chunk_meta = {
            **metadata,
            "chunk_index": i,
            "total_chunks": len(chunks),
        }
        metadatas.append(chunk_meta)

    vectorstore.add_texts(texts=chunks, metadatas=metadatas)

    # Persist (some ChromaDB versions auto-persist)
    try:
        vectorstore.persist()
    except Exception:
        pass

    return {
        "stored": True,
        "chunks": len(chunks),
        "title": title,
    }
