# ContextOS: Your AI Source of Truth

ContextOS is a comprehensive, local AI-powered company memory engine. It acts as a highly secure, privacy-first knowledge base where you can upload documents, emails, meeting notes, and internal decisions into a Vector Database. The system uses local LLMs to intelligently retrieve and answer questions based solely on your verified company knowledge.

Website -Link -https://contextos-du1q.vercel.app/

## 🚀 Key Features

- **Local AI Engine**: Powered by **Ollama** running `Mistral 7B` and `Nomic Embed Text`. Completely offline, ensuring zero data retention and maximum privacy.
- **RAG Architecture**: Implements Retrieval-Augmented Generation using **LangChain** and **ChromaDB** to provide accurate, citable answers based on your data.
- **Premium GetGuru-Inspired UI/UX**:
  - Entirely redesigned React frontend with modern "Glassmorphism" aesthetics, floating mock chat bubbles, hover 3D card effects, and a signature mint radial gradient.
  - Interactive *Dashboard* summarizing system statuses and AI memory usage.
  - Smooth *Ask* Hub with a refined floating search bar and cleanly formatted markdown AI responses.
  - Interactive *Add Memory* Hub to ingest raw documents right into the Vector Database.
- **Highly Extensible API**: Built on **FastAPI**, creating a robust backend that easily communicates with the frontend.

## 🛠️ Technology Stack

**Backend**
- Python 3
- FastAPI & Uvicorn (Server)
- LangChain (AI Orchestration)
- ChromaDB (Vector Database)
- Ollama (Local LLM Execution)

**Frontend**
- React 18 + Vite
- Tailwind CSS v3 (Styling & Animations)
- Lucide React (Icons)
- Axios (HTTP Client)
- Google Fonts (Outfit)

## 💻 How to Run Locally

### 1. Prerequisites
- **Python 3.9+** installed.
- **Node.js 18+** installed.
- **Ollama** installed on your machine.

### 2. Start Ollama Core Services
First, ensure you have pulled the necessary local AI models:
```bash
ollama pull mistral
ollama pull nomic-embed-text
```
Ensure the Ollama application is running in the background.

### 3. Start the Backend API (FastAPI)
Navigate to the `backend` folder, create a virtual environment, install requirements, and run the server:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
*The backend API will run on `http://localhost:8000`*

### 3.5 Load Demo Data (Important!)
With the backend running, open a new terminal and run:
` ` `bash
cd backend
source venv/bin/activate
python demo_data.py
` ` `
This pre-loads 15 realistic company memories so ContextOS can answer questions immediately.

### 4. Start the Frontend App (React/Vite)
Open a new terminal session, navigate to the `frontend` folder, install JS dependencies, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
*The web app will be available on `http://localhost:5173`*

## 🔒 Security & Privacy (Local Model Advantage)
Since ContextOS runs `Mistral` via Ollama directly on your hardware, your proprietary company data NEVER leaves your internal network. ContextOS boasts:
- Zero external data retention.
- No third-party API keys required for core conversational flows.
- 100% data masking compatibility.
