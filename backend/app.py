from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
import json
import base64
import tempfile
import requests
import assemblyai as aai

from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import InMemorySaver
from langchain.agents import create_agent
from flask_cors import CORS

from db import (
    create_session, save_answer, close_session,
    get_all_sessions, get_session_answers
)
from resume_parser import extract_text_from_pdf, build_resume_prompt
from code_executor import execute_code, build_code_review_prompt
from emotion_analyzer import analyze_transcript

load_dotenv()

GOOGLE_API_KEY    = os.getenv("GOOGLE_API_KEY")
MURF_API_KEY      = os.getenv("MURF_API_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")


aai.settings.api_key = ASSEMBLYAI_API_KEY

app = Flask(__name__)
CORS(app, expose_headers=["X-Question-Number", "X-Emotion-Data"])

# ── LLM setup ────────────────────────────────────────────────────────────────
model = init_chat_model("google_genai:gemini-2.5-flash", api_key=GOOGLE_API_KEY)

checkpointer = InMemorySaver()
agent = create_agent(model=model, tools=[], checkpointer=checkpointer)

# ── Session state ─────────────────────────────────────────────────────────────
question_count   = 0
current_subject  = ""
current_session_id = ""
current_mode     = "voice"          # "voice" | "coding"
current_question_text = ""          # store last question for DB save
thread_id        = "interview_session_1"

# Coding interview: rotating problem set
CODING_PROBLEMS = [
    {
        "title":       "Reverse a String",
        "description": "Write a function that reverses a string without using built-in reverse methods.",
        "example":     "Input: 'hello' → Output: 'olleh'",
    },
    {
        "title":       "FizzBuzz",
        "description": "Print numbers 1–20. For multiples of 3 print 'Fizz', multiples of 5 print 'Buzz', both print 'FizzBuzz'.",
        "example":     "1, 2, Fizz, 4, Buzz, Fizz, 7 ...",
    },
    {
        "title":       "Find Duplicates",
        "description": "Given a list of integers, return a list of all duplicate values.",
        "example":     "Input: [1,2,3,2,4,3] → Output: [2,3]",
    },
    {
        "title":       "Palindrome Check",
        "description": "Write a function that returns True if a string is a palindrome, False otherwise.",
        "example":     "Input: 'racecar' → True, 'hello' → False",
    },
    {
        "title":       "Sum of Digits",
        "description": "Write a function that returns the sum of all digits in an integer.",
        "example":     "Input: 1234 → Output: 10",
    },
]

# ── Prompts ───────────────────────────────────────────────────────────────────
INTERVIEW_PROMPT = """You are Natalie, a friendly and conversational interviewer conducting a natural {subject} interview.

IMPORTANT GUIDELINES:
1. Ask exactly 5 questions total throughout the interview
2. Keep questions SHORT and CRISP (1-2 sentences maximum)
3. ALWAYS reference what the candidate ACTUALLY said in their previous answer
4. Show genuine interest with brief acknowledgments based on their REAL responses
5. Adapt questions based on their ACTUAL responses
6. Be warm and conversational but CONCISE
7. No lengthy explanations — just ask clear, direct questions

Keep it short, conversational, and adaptive!"""

FEEDBACK_PROMPT = """Based on our complete interview conversation, provide detailed feedback.
IMPORTANT: Respond with ONLY a valid JSON object. No other text.
Address the candidate directly using "you" and "your".
{{
    "subject": "{subject}",
    "candidate_score": <1-5>,
    "feedback": "<detailed strengths with specific examples>",
    "areas_of_improvement": "<constructive suggestions>"
}}"""


# ── Audio helpers ─────────────────────────────────────────────────────────────
def stream_audio(text):
    BASE_URL = "https://global.api.murf.ai/v1/speech/stream"
    payload = {
        "text":             text,
        "voiceId":          "en-US-natalie",
        "model":            "FALCON",
        "multiNativeLocale":"en-US",
        "sampleRate":       24000,
        "format":           "MP3",
    }
    headers = {"Content-Type": "application/json", "api-key": MURF_API_KEY}
    response = requests.post(BASE_URL, headers=headers,
                             data=json.dumps(payload), stream=True)
    for chunk in response.iter_content(chunk_size=4096):
        if chunk:
            yield base64.b64encode(chunk).decode("utf-8") + "\n"


def speech_to_text(audio_path: str) -> str:
    transcriber = aai.Transcriber()
    config = aai.TranscriptionConfig(
        speech_models=["universal-3-pro", "universal-2"],
        language_detection=True,
        speaker_labels=True,
    )
    transcript = transcriber.transcribe(audio_path, config=config)
    return transcript.text if transcript.text else ""


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/start-interview", methods=["POST"])
def start_interview():
    global question_count, current_subject, checkpointer, agent
    global current_session_id, current_mode, current_question_text

    data           = request.get_json()
    current_subject = data.get("subject", "Python")
    current_mode   = data.get("mode", "voice")      # "voice" or "coding"
    resume_text    = data.get("resume_text", "")    # pre-parsed on upload
    question_count = 1

    # Fresh agent + session
    checkpointer = InMemorySaver()
    agent = create_agent(model=model, tools=[], checkpointer=checkpointer)
    current_session_id = create_session(
        subject=current_subject,
        resume_used=bool(resume_text),
        mode=current_mode,
    )

    # Build system prompt
    if resume_text:
        from resume_parser import build_resume_prompt
        system_prompt = build_resume_prompt(resume_text, current_subject)
    else:
        system_prompt = INTERVIEW_PROMPT.format(subject=current_subject)

    config = {"configurable": {"thread_id": thread_id}}
    response = agent.invoke({
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content":
                f"Start the interview with a warm greeting and ask the first question "
                f"about {current_subject}. Keep it SHORT (1-2 sentences)."}
        ]
    }, config=config)

    question = response["messages"][-1].content
    current_question_text = question
    print(f"\n[Q{question_count}] {question}")
    return stream_audio(question), {"Content-Type": "text/plain"}


@app.route("/upload-resume", methods=["POST"])
def upload_resume():
    """Parse resume PDF and return extracted text to the frontend."""
    if "resume" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    file = request.files["resume"]
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        file.save(tmp.name)
        temp_path = tmp.name

    try:
        text = extract_text_from_pdf(temp_path)
        os.unlink(temp_path)
        return jsonify({"success": True, "resume_text": text,
                        "char_count": len(text)})
    except Exception as e:
        os.unlink(temp_path)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/submit-answer", methods=["POST"])
def submit_answer():
    global question_count, current_question_text

    audio_file = request.files["audio"]
    question_count += 1

    # Save audio temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        audio_file.save(tmp.name)
        temp_path = tmp.name

    # Transcribe
    answer = speech_to_text(temp_path)
    os.unlink(temp_path)
    if not answer:
        answer = "Empty response received"

    # Emotion analysis
    emotion_data = analyze_transcript(answer)

    # Persist answer to MongoDB
    save_answer(
        session_id=current_session_id,
        question_num=question_count - 1,
        question=current_question_text,
        transcript=answer,
        emotion_data=emotion_data,
    )

    # Get next question from agent
    config = {"configurable": {"thread_id": thread_id}}
    agent.invoke({"messages": [{"role": "user", "content": answer}]}, config=config)

    prompt = f"""The candidate just answered question {question_count - 1}.
Look at their ACTUAL answer. Do NOT assume anything they didn't say.

Now ask question {question_count} of 5:
1. Briefly acknowledge what they ACTUALLY said (1 sentence)
2. Ask your next question that builds on their REAL response (1-2 sentences)
3. If they said "I don't know", acknowledge and ask something simpler
4. Keep total response under 3 sentences."""

    response = agent.invoke(
        {"messages": [{"role": "user", "content": prompt}]}, config=config
    )
    question = response["messages"][-1].content
    current_question_text = question

    # Serialize emotion data for header
    emotion_header = json.dumps({
        "confidence_score": emotion_data["confidence_score"],
        "confidence_label": emotion_data["confidence_label"],
        "filler_words":     emotion_data["filler_words_found"],
        "wpm":              emotion_data["words_per_minute"],
        "tips":             emotion_data["tips"],
    })

    return (
        stream_audio(question),
        {
            "Content-Type":     "text/plain",
            "X-Question-Number": str(question_count),
            "X-Emotion-Data":   base64.b64encode(
                                    emotion_header.encode()).decode(),
        }
    )


@app.route("/submit-code", methods=["POST"])
def submit_code():
    """Execute candidate's code and have Natalie review it."""
    global question_count, current_question_text

    data     = request.get_json()
    code     = data.get("code", "")
    language = data.get("language", "python")
    problem  = data.get("problem", "")
    question_count += 1

    # Execute the code
    exec_result = execute_code(code, language)

    # Save to MongoDB
    save_answer(
        session_id=current_session_id,
        question_num=question_count - 1,
        question=problem,
        transcript=f"[Code submission in {language}]",
        code=code,
        emotion_data={},
    )

    # Build review prompt
    review_prompt = build_code_review_prompt(problem, code, language, exec_result)
    config = {"configurable": {"thread_id": thread_id}}
    response = agent.invoke(
        {"messages": [{"role": "user", "content": review_prompt}]}, config=config
    )
    natalie_review = response["messages"][-1].content
    current_question_text = natalie_review

    return (
        stream_audio(natalie_review),
        {
            "Content-Type":      "text/plain",
            "X-Question-Number": str(question_count),
            "X-Exec-Success":    str(exec_result["success"]).lower(),
            "X-Exec-Output":     base64.b64encode(
                                     json.dumps(exec_result).encode()).decode(),
        }
    )


@app.route("/get-feedback", methods=["POST"])
def get_feedback():
    config = {"configurable": {"thread_id": thread_id}}
    response = agent.invoke({
        "messages": [{
            "role":    "user",
            "content": f"{FEEDBACK_PROMPT.format(subject=current_subject)}\n\n"
                       f"Review our complete {current_subject} interview."
        }]
    }, config=config)

    text = response["messages"][-1].content.strip()
    if "```" in text:
        text = text.split("```")[1]
    if text.startswith("json"):
        text = text[4:].strip()

    feedback = json.loads(text)

    # Persist to MongoDB
    close_session(current_session_id, feedback, feedback.get("candidate_score", 0))

    return jsonify({"success": True, "feedback": feedback})


@app.route("/history", methods=["GET"])
def history():
    """Return all past interview sessions."""
    sessions = get_all_sessions()
    return jsonify({"success": True, "sessions": sessions})


@app.route("/history/<session_id>", methods=["GET"])
def session_detail(session_id):
    """Return all answers for a specific session."""
    answers = get_session_answers(session_id)
    return jsonify({"success": True, "answers": answers})


if __name__ == "__main__":
    CORS(app, resources={r"/*": {"origins": "*"}})
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)