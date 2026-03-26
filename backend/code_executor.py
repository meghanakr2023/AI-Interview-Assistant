import subprocess
import tempfile
import os
import sys


LANGUAGE_CONFIG = {
    "python": {
        "extension": ".py",
        "command":   lambda path: [sys.executable, path],
    },
    "javascript": {
        "extension": ".js",
        "command":   lambda path: ["node", path],
    },
    "java": {
        "extension": ".java",
        "command":   lambda path: ["java", path],
    },
}


def execute_code(code: str, language: str = "python", timeout: int = 10) -> dict:
    """
    Safely execute code in a subprocess with a timeout.
    Returns stdout, stderr, and success flag.
    """
    language = language.lower()
    config = LANGUAGE_CONFIG.get(language)

    if not config:
        return {
            "success": False,
            "stdout":  "",
            "stderr":  f"Unsupported language: {language}",
            "timed_out": False,
        }

    suffix = config["extension"]
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=suffix, delete=False, encoding="utf-8"
    ) as f:
        f.write(code)
        temp_path = f.name

    try:
        result = subprocess.run(
            config["command"](temp_path),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "success":   result.returncode == 0,
            "stdout":    result.stdout[:2000],   # cap output
            "stderr":    result.stderr[:1000],
            "timed_out": False,
        }
    except subprocess.TimeoutExpired:
        return {
            "success":   False,
            "stdout":    "",
            "stderr":    "Execution timed out (10s limit)",
            "timed_out": True,
        }
    except FileNotFoundError:
        return {
            "success":   False,
            "stdout":    "",
            "stderr":    f"Runtime not found for {language}. Is it installed?",
            "timed_out": False,
        }
    finally:
        os.unlink(temp_path)


def build_code_review_prompt(problem: str, code: str,
                              language: str, exec_result: dict) -> str:
    """Build a prompt for Natalie to review the candidate's code."""
    status = "ran successfully" if exec_result["success"] else "had errors"
    output_section = (
        f"Output:\n{exec_result['stdout']}"
        if exec_result["stdout"]
        else f"Error:\n{exec_result['stderr']}"
    )

    return f"""The candidate just submitted code for this problem:
Problem: {problem}

Their {language} code:
```
{code}
```

Execution result: {status}
{output_section}

Review their solution in 2-3 sentences:
1. Is the logic correct? Does the output look right?
2. One specific thing they did well OR one specific improvement
3. Ask a short follow-up question about their approach or edge cases

Be encouraging but honest. Keep it concise."""