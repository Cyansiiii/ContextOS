from fastapi import FastAPI, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from ai_engine import store_memory, search_memory, get_db_stats
from pydantic import BaseModel
import json
import platform
import time
from datetime import datetime

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

class UploadRequest(BaseModel):
    content: str
    source: str
    date: str

class AskRequest(BaseModel):
    question: str

# ROUTE 1: Upload any document/email/note
@app.post("/upload")
async def upload_document(req: UploadRequest):
    metadata = {
        "source": req.source,
        "date": req.date,
        "type": "company_data"
    }
    store_memory(req.content, metadata)
    return {"status": "Memory stored successfully"}

# ROUTE 2: Ask a question
@app.post("/ask")
async def ask_question(req: AskRequest):
    answer, sources = search_memory(req.question)
    
    # Track query history
    query_history.insert(0, {
        "q": req.question,
        "time": "Just now", # Frontend can format based on real timestamp if needed
        "author": "User" # hardcoded for demo, could be dynamic
    })
    # Keep only last 10
    if len(query_history) > 10:
        query_history.pop()
        
    return {
        "answer": answer,
        "sources": [doc.metadata for doc in sources]
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

# Run the server
# Command: uvicorn main:app --reload
