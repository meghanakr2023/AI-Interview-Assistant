# 🤖 AI Interview Assistant

An AI-powered mock interview web app that conducts real voice-based interviews, transcribes your answers, and gives detailed feedback — powered by Gemini, AssemblyAI, and Murf AI.

---

## ✨ Features

- 🎙️ **Voice-based interviews** — speak your answers naturally
- 🔊 **AI voice responses** — Natalie (your interviewer) speaks back to you in real-time streaming audio
- 🧠 **Adaptive questioning** — follow-up questions are based on what you actually said
- 📊 **Scored feedback** — get a 1–5 score with detailed strengths and areas of improvement
- 💬 **6 interview topics** — Self Introduction, Generative AI, Python, English, HTML, CSS

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, Tailwind CSS, Vanilla JavaScript |
| Backend | Python, Flask |
| AI Model | Google Gemini 2.5 Flash (via LangChain) |
| Speech-to-Text | AssemblyAI |
| Text-to-Speech | Murf AI (`en-US-natalie` voice) |
| Memory | LangGraph `InMemorySaver` |

---

## 📁 Project Structure

```
├── backend/
│   └── app.py          # Flask server — API endpoints, AI logic, audio streaming
├── frontend/
│   ├── index.html      # UI — sidebar, interview panel, feedback display
│   └── index.js        # JS — recording, audio streaming, API calls
├── .env                # API keys (not committed)
├── .gitignore
└── README.md
```

---

## ⚙️ Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ai-interview-assistant.git
cd ai-interview-assistant
```

### 2. Install Backend Dependencies

```bash
cd backend
pip install flask flask-cors python-dotenv langchain langgraph assemblyai requests
pip install langchain-google-genai
```

### 3. Configure Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
GOOGLE_API_KEY=your_google_api_key
MURF_API_KEY=your_murf_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

> Get your keys from:
> - [Google AI Studio](https://aistudio.google.com/) — Gemini API key
> - [Murf AI](https://murf.ai/) — Text-to-speech API key
> - [AssemblyAI](https://www.assemblyai.com/) — Speech-to-text API key

### 4. Run the Backend

```bash
cd backend
python app.py
```

The Flask server starts at `http://127.0.0.1:5000`

### 5. Open the Frontend

Open `frontend/index.html` directly in your browser, or serve it with a simple HTTP server:

```bash
cd frontend
python -m http.server 8080
```

Then visit `http://localhost:8080`

---

## 🚀 How to Use

1. **Select a topic** from the left sidebar (e.g., Python, Generative AI)
2. Click **Start Interview** — Natalie greets you and asks the first question
3. Click the **microphone button** to start recording your answer
4. Click again to **stop recording**, then click **Submit Answer**
5. Natalie listens, acknowledges your response, and asks the next question
6. After 5 questions, click **End Interview** or wait for it to complete
7. Click **Get Feedback** to receive your score and detailed feedback

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/start-interview` | Starts a new session, returns streaming audio of Q1 |
| `POST` | `/submit-answer` | Accepts audio file, transcribes it, returns next question as audio |
| `POST` | `/get-feedback` | Returns JSON feedback with score, strengths, and improvements |

---

## 📝 Notes

- The backend uses **in-memory conversation history** — sessions reset on server restart
- Audio is streamed in real-time using `MediaSource` API in the browser
- Each interview session consists of exactly **5 questions**
- Answers are recorded in **WebM/Opus** format and sent to AssemblyAI for transcription

---

## 🔮 Future Improvements

- [ ] Persistent session storage (database)
- [ ] Custom topic input by the user
- [ ] Downloadable feedback report (PDF)
- [ ] Interview history and progress tracking
- [ ] Support for multiple languages

---

## 📄 License

MIT License — feel free to use, modify, and distribute.
