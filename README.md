# 🤖 AI Interview Assistant

A full-stack AI-powered mock interview web app that conducts real voice-based interviews, detects body language via webcam, analyzes confidence from speech, supports live coding challenges, and delivers detailed feedback — all powered by Gemini, AssemblyAI, Murf AI, MediaPipe, and MongoDB.

---

## ✨ Features

### 🎙️ Voice Interview Mode
- Speak your answers naturally via microphone
- AI interviewer **Natalie** asks 5 adaptive questions based on your actual responses
- Real-time audio streaming — Natalie's voice plays instantly

### 📄 Resume-Based Personalized Questions
- Upload your PDF resume via drag & drop
- Gemini reads your actual experience, projects, and skills
- Questions are tailored specifically to your background — not generic

### 💻 Coding Interview Mode
- Embedded **Monaco Editor** (same editor as VS Code) in the browser
- 5 rotating coding problems (Reverse String, FizzBuzz, Palindrome, etc.)
- Code is executed safely on the backend with a 10-second timeout
- Natalie reviews your code output and asks follow-up questions via voice

### 🧠 Confidence & Emotion Analysis
- Detects **filler words** (um, uh, like, basically...)
- Measures **words per minute** (speaking pace)
- Scores **answer length** (too short / brief / good / detailed)
- Shows **confidence score (0–100)** with tips after every answer

### 🎥 Webcam + Body Language Detection
- Small **Picture-in-Picture webcam** in the bottom-right corner during interview
- **MediaPipe Face Mesh** runs 100% in the browser — no backend needed
- Detects **eye contact**, **posture**, **facial expression**, and **face visibility**
- Live green/yellow dot shows real-time eye contact status
- Full **body language report** shown in final feedback with animated bars

### 📊 Detailed Feedback Report
- **1–5 score** with animated circular progress indicator
- Detailed strengths referencing your actual answers
- Constructive improvement suggestions
- Body language breakdown with per-metric scores and actionable tips

### 🍃 MongoDB Persistence
- Every interview session saved automatically
- Every answer, transcript, emotion score, and code submission stored
- Full history available via REST API

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, Tailwind CSS, Vanilla JavaScript |
| Code Editor | Monaco Editor (VS Code engine) |
| Body Language | MediaPipe Face Mesh (runs in browser) |
| Backend | Python, Flask, Flask-CORS |
| AI Model | Google Gemini 2.5 Flash (via LangChain + LangGraph) |
| Speech-to-Text | AssemblyAI |
| Text-to-Speech | Murf AI (`en-US-natalie` voice, streaming) |
| Resume Parsing | PyMuPDF |
| Code Execution | Python subprocess (sandboxed, timeout) |
| Database | MongoDB (via PyMongo) |

---

## 📁 Project Structure

```
Mock_Interview/
├── start.bat                  ← One-click startup script (Windows)
├── .env                       ← API keys (never commit this)
├── .gitignore
├── README.md
│
├── backend/
│   ├── app.py                 ← Flask server — all API routes
│   ├── db.py                  ← MongoDB connection & helper functions
│   ├── resume_parser.py       ← PDF text extraction + prompt builder
│   ├── code_executor.py       ← Safe code execution (Python/JS)
│   ├── emotion_analyzer.py    ← Filler words, WPM, confidence scoring
│   └── venv/                  ← Python virtual environment
│
└── frontend/
    ├── index.html             ← Full UI (sidebar, interview, feedback)
    └── index.js               ← All JS logic (recording, streaming, MediaPipe)
```

---

## ⚙️ Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ai-interview-assistant.git
cd ai-interview-assistant
```

### 2. Create & Activate Virtual Environment

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
```

### 3. Install Python Dependencies

```bash
pip install flask flask-cors python-dotenv langchain langgraph assemblyai requests langchain-google-genai PyMuPDF pymongo
```

### 4. Configure Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
GOOGLE_API_KEY=your_google_gemini_api_key
MURF_API_KEY=your_murf_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
MONGO_URI=mongodb://localhost:27017
```

> **Where to get API keys:**
> - [Google AI Studio](https://aistudio.google.com/) → Gemini API key
> - [Murf AI](https://murf.ai/) → Text-to-speech API key
> - [AssemblyAI](https://www.assemblyai.com/) → Speech-to-text API key
> - MongoDB runs locally — no key needed

### 5. Install & Start MongoDB

**Windows:**
```bash
# Download from https://www.mongodb.com/try/download/community
# Install with "Install MongoD as a Service" checked
net start MongoDB
```

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt install mongodb
sudo systemctl start mongodb
```

---

## 🚀 Running the App

### Option A — One Click (Windows)

Double-click **`start.bat`** in the project root. It automatically starts MongoDB, the Flask backend, and the frontend server.

Then open Chrome and go to:
```
http://localhost:8080
```

### Option B — Manual Start

Open **3 separate terminals**:

**Terminal 1 — MongoDB:**
```bash
net start MongoDB
```

**Terminal 2 — Backend:**
```bash
cd backend
venv\Scripts\activate
python app.py
```
You should see: `* Running on http://127.0.0.1:5000`

**Terminal 3 — Frontend:**
```bash
cd frontend
python -m http.server 8080
```

Then open: `http://localhost:8080`

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/start-interview` | Start session, stream first question as audio |
| `POST` | `/upload-resume` | Parse PDF resume, return extracted text |
| `POST` | `/submit-answer` | Transcribe audio answer, return next question |
| `POST` | `/submit-code` | Execute code, return Natalie's review as audio |
| `POST` | `/get-feedback` | Generate final JSON feedback with score |
| `GET` | `/history` | Return all past interview sessions |
| `GET` | `/history/<session_id>` | Return all answers for a session |

---

## 🎮 How to Use

### Voice Interview
1. Select a topic from the sidebar (Python, HTML, CSS, etc.)
2. Optionally drag & drop your **PDF resume** for personalized questions
3. Click **Start Interview** — allow microphone and camera permissions
4. Wait for Natalie to ask a question (speaking bubble + audio plays)
5. Click the **red microphone button** to record your answer
6. Click again to stop → click **Submit Answer**
7. Repeat for 5 questions
8. Click **End Interview** → **Get Feedback**

### Coding Interview
1. Click **💻 Coding** mode button in the sidebar
2. Select a topic and click **Start Coding Interview**
3. A coding problem appears — write your solution in the Monaco editor
4. Click **▶ Run & Submit** — your code runs and output appears
5. Natalie reviews your solution via voice and asks follow-ups
6. Complete 5 problems → get feedback

---

## 🧠 Body Language Detection (How It Works)

MediaPipe Face Mesh tracks **468 facial landmarks** in real time via your webcam:

| Signal | Landmarks Used | What's Detected |
|--------|---------------|-----------------|
| 👁️ Eye Contact | Iris (468, 473) vs eye corners | Are you looking at the camera? |
| 🧍 Posture | Nose tip (1), eye level difference | Are you centered and upright? |
| 🙂 Expression | Mouth corners (61, 291) vs center | Are you smiling / positive? |
| 📷 Face Visibility | All landmarks present | Is your face clearly in frame? |

Final body language score = weighted average (Eye 40% + Posture 30% + Expression 15% + Visibility 15%)

---

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | ✅ | Gemini 2.5 Flash API key |
| `MURF_API_KEY` | ✅ | Murf AI text-to-speech key |
| `ASSEMBLYAI_API_KEY` | ✅ | AssemblyAI transcription key |
| `MONGO_URI` | ✅ | MongoDB connection string |

---

## 🗄️ MongoDB Collections

### `sessions` collection
```json
{
  "_id": "ObjectId",
  "subject": "Python",
  "mode": "voice",
  "resume_used": true,
  "started_at": "2024-01-01T10:00:00Z",
  "ended_at": "2024-01-01T10:15:00Z",
  "feedback": { "candidate_score": 4, "feedback": "..." },
  "final_score": 4
}
```

### `answers` collection
```json
{
  "_id": "ObjectId",
  "session_id": "abc123",
  "question_num": 2,
  "question": "Tell me about decorators in Python",
  "transcript": "A decorator is a function that wraps another function...",
  "emotion_data": {
    "confidence_score": 78,
    "filler_words_found": ["um", "like"],
    "words_per_minute": 134
  },
  "code": null,
  "answered_at": "2024-01-01T10:05:00Z"
}
```

---

## 🐛 Troubleshooting

| Error | Fix |
|-------|-----|
| `ModuleNotFoundError: flask` | Run `pip install flask` inside activated venv |
| `pymongo ServerSelectionTimeoutError` | Start MongoDB: `net start MongoDB` |
| `500 Internal Server Error` | Check backend terminal for full error message |
| Audio not playing | Use Chrome or Edge — Firefox blocks MediaSource API |
| Webcam PiP not showing | Allow camera permission in browser address bar |
| `CORS error` in browser console | Make sure Flask backend is running on port 5000 |
| Code execution error | Make sure Python is in system PATH |

---

## 🔮 Planned Features

- [ ] Interview history dashboard with radar charts
- [ ] Downloadable PDF report card
- [ ] Leaderboard and shareable results
- [ ] Custom topic input by user
- [ ] Multi-language support
- [ ] Docker containerization

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Built With

- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI interviewer brain
- [AssemblyAI](https://www.assemblyai.com/) — Speech-to-text transcription
- [Murf AI](https://murf.ai/) — Natural AI voice (Natalie)
- [MediaPipe](https://mediapipe.dev/) — Real-time face & body landmark detection
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — VS Code's editor in the browser
- [LangChain](https://langchain.com/) + [LangGraph](https://langchain-ai.github.io/langgraph/) — AI agent with conversation memory
- [MongoDB](https://www.mongodb.com/) — Session and answer persistence
