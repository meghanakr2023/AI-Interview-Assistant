import wave
import struct
import math
import re


# Common filler words to detect
FILLER_WORDS = [
    "um", "uh", "like", "you know", "basically", "literally",
    "actually", "so", "right", "okay", "hmm", "er", "ah"
]


def analyze_transcript(transcript: str, audio_duration_seconds: float = 0) -> dict:
    """
    Analyze a transcript for communication confidence signals.
    Returns a structured emotion/confidence report.
    """
    if not transcript:
        return _empty_result()

    words = transcript.lower().split()
    word_count = len(words)

    # --- Filler word detection ---
    filler_count = 0
    filler_found = []
    text_lower = transcript.lower()
    for filler in FILLER_WORDS:
        pattern = r'\b' + re.escape(filler) + r'\b'
        matches = re.findall(pattern, text_lower)
        if matches:
            filler_count += len(matches)
            filler_found.append(filler)

    filler_ratio = filler_count / word_count if word_count > 0 else 0

    # --- Speaking pace (words per minute) ---
    if audio_duration_seconds > 0:
        wpm = (word_count / audio_duration_seconds) * 60
    else:
        # Estimate: average speaking pace ~130 wpm
        wpm = 130

    # --- Answer length assessment ---
    if word_count < 20:
        length_label = "too_short"
    elif word_count < 60:
        length_label = "brief"
    elif word_count < 150:
        length_label = "good"
    else:
        length_label = "detailed"

    # --- Confidence score (0-100) ---
    # Start at 80, penalize for fillers, reward for pace and length
    score = 80

    # Penalize filler words
    if filler_ratio > 0.15:
        score -= 25
    elif filler_ratio > 0.08:
        score -= 15
    elif filler_ratio > 0.04:
        score -= 8

    # Penalize very short answers
    if length_label == "too_short":
        score -= 20
    elif length_label == "brief":
        score -= 10

    # Reward detailed answers
    if length_label in ("good", "detailed"):
        score += 10

    # Penalize unusually fast or slow pace
    if wpm < 80 or wpm > 200:
        score -= 10

    score = max(0, min(100, score))

    # --- Confidence label ---
    if score >= 75:
        confidence_label = "High"
    elif score >= 50:
        confidence_label = "Moderate"
    else:
        confidence_label = "Low"

    return {
        "confidence_score":  score,
        "confidence_label":  confidence_label,
        "word_count":        word_count,
        "filler_words_found": list(set(filler_found)),
        "filler_count":      filler_count,
        "filler_ratio":      round(filler_ratio * 100, 1),   # as %
        "words_per_minute":  round(wpm, 1),
        "answer_length":     length_label,
        "tips": _generate_tips(filler_ratio, wpm, length_label),
    }


def _generate_tips(filler_ratio, wpm, length_label):
    tips = []
    if filler_ratio > 0.08:
        tips.append("Try to reduce filler words like 'um' and 'uh' — pause silently instead.")
    if wpm > 180:
        tips.append("You're speaking a bit fast. Slow down to sound more confident.")
    if wpm < 90:
        tips.append("Try to pick up your pace slightly to keep the interviewer engaged.")
    if length_label == "too_short":
        tips.append("Your answer was very short. Try to elaborate more with examples.")
    if length_label == "brief":
        tips.append("Good start — try adding a specific example to strengthen your answer.")
    if not tips:
        tips.append("Great delivery! Keep it up.")
    return tips


def _empty_result():
    return {
        "confidence_score":  0,
        "confidence_label":  "N/A",
        "word_count":        0,
        "filler_words_found": [],
        "filler_count":      0,
        "filler_ratio":      0,
        "words_per_minute":  0,
        "answer_length":     "no_answer",
        "tips":              ["No answer was detected."],
    }