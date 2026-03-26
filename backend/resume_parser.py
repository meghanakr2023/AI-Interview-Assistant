import fitz  # PyMuPDF
import os


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF resume."""
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text.strip()


def build_resume_prompt(resume_text: str, subject: str) -> str:
    """
    Build a system prompt that instructs Gemini to ask questions
    grounded in the candidate's actual resume experience.
    """
    return f"""You are Natalie, a friendly and sharp technical interviewer at a top tech company.

You are interviewing for: {subject}

Here is the candidate's resume:
---
{resume_text}
---

IMPORTANT GUIDELINES:
1. Ask exactly 5 questions total
2. Base your questions on what you ACTUALLY see in their resume
   - Reference specific projects, tools, companies, or skills they listed
   - Don't ask generic questions — make it personal to their background
3. Keep questions SHORT and CRISP (1-2 sentences max)
4. Acknowledge their ACTUAL previous answers — never fabricate
5. Be warm, conversational, and encouraging
6. Adapt difficulty based on their seniority shown in the resume

Start with a brief personal observation about their background, then ask Q1."""