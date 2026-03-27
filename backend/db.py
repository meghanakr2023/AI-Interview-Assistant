from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["ai_interview"]

sessions_col = db["sessions"]
answers_col  = db["answers"]


def create_session(subject: str, resume_used: bool = False, mode: str = "voice"):
    """Create a new interview session and return its ID."""
    doc = {
        "subject":     subject,
        "mode":        mode,          # "voice" | "coding"
        "resume_used": resume_used,
        "started_at":  datetime.utcnow(),
        "ended_at":    None,
        "feedback":    None,
        "final_score": None,
    }
    result = sessions_col.insert_one(doc)
    return str(result.inserted_id)


def save_answer(session_id: str, question_num: int, question: str,
                transcript: str, emotion_data: dict = None, code: str = None):
    """Save one Q&A turn to the answers collection."""
    doc = {
        "session_id":   session_id,
        "question_num": question_num,
        "question":     question,
        "transcript":   transcript,
        "emotion_data": emotion_data or {},
        "code":         code,
        "answered_at":  datetime.utcnow(),
    }
    answers_col.insert_one(doc)


def close_session(session_id: str, feedback: dict, final_score: float):
    """Mark session as ended and store final feedback."""
    from bson import ObjectId
    sessions_col.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {
            "ended_at":    datetime.utcnow(),
            "feedback":    feedback,
            "final_score": final_score,
        }}
    )


def get_all_sessions():
    """Return all past sessions for the history dashboard."""
    sessions = list(sessions_col.find().sort("started_at", -1))
    for s in sessions:
        s["_id"] = str(s["_id"])
        if s.get("started_at"):
            s["started_at"] = s["started_at"].isoformat()
        if s.get("ended_at"):
            s["ended_at"] = s["ended_at"].isoformat()
    return sessions


def get_session_answers(session_id: str):
    """Return all answers for a given session."""
    answers = list(answers_col.find({"session_id": session_id}))
    for a in answers:
        a["_id"] = str(a["_id"])
    return answers