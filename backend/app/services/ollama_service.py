import json
import requests


# ============================================================
# OLLAMA CONFIGURATION
# ============================================================

OLLAMA_URL = "http://host.docker.internal:11434/api/generate"
MODEL_NAME = "qwen3:0.6b"


# ============================================================
# CUSTOM ERRORS
# ============================================================

class OllamaConnectionError(RuntimeError):
    """Raised when Ollama cannot be reached."""
    pass


class OllamaInvalidResponseError(RuntimeError):
    """Raised when Ollama returns an invalid or unusable response."""
    pass


# ============================================================
# JSON EXTRACTION
# ============================================================

def _extract_json(text: str):
    """
    Extract and parse a JSON object from Ollama's response.

    Handles:
    - Normal JSON
    - Markdown code fences
    - Extra text before/after JSON
    """

    text = (text or "").strip()

    if not text:
        raise OllamaInvalidResponseError(
            "Ollama returned an empty response."
        )

    # --------------------------------------------------------
    # Remove markdown code fences
    # --------------------------------------------------------

    if text.startswith("```"):
        text = text.replace("```json", "", 1)
        text = text.replace("```", "")
        text = text.strip()

    # --------------------------------------------------------
    # Find JSON object inside the response
    # --------------------------------------------------------

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1 or end <= start:

        print("\n========== OLLAMA INVALID RESPONSE ==========")
        print(text[:5000])
        print("==============================================\n")

        raise OllamaInvalidResponseError(
            "Ollama did not return a valid JSON object."
        )

    json_text = text[start:end + 1]

    # --------------------------------------------------------
    # Parse JSON
    # --------------------------------------------------------

    try:

        result = json.loads(json_text)

    except json.JSONDecodeError as error:

        print("\n========== OLLAMA RAW RESPONSE ==========")
        print(text[:5000])
        print("==========================================\n")

        raise OllamaInvalidResponseError(
            f"Ollama returned invalid JSON: {error}"
        )

    # --------------------------------------------------------
    # Ensure JSON is an object
    # --------------------------------------------------------

    if not isinstance(result, dict):

        raise OllamaInvalidResponseError(
            "Ollama returned JSON, but the result was not an object."
        )

    return result


# ============================================================
# OLLAMA API CALL
# ============================================================

def _call_ollama(prompt: str):
    """
    Send a prompt to Ollama and return parsed JSON.
    """

    try:

        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,

                # Force structured JSON output
                "format": "json",

                # Disable Qwen thinking
                "think": False,

                # More deterministic output
                "options": {
                    "temperature": 0.1
                },

                # Keep model loaded
                "keep_alive": "10m",
            },
            timeout=600,
        )

        response.raise_for_status()

        data = response.json()

        result = data.get("response", "")

        # DEBUG: print exactly what Ollama returned
        print("\n========== OLLAMA RAW RESPONSE ==========")
        print(result[:5000])
        print("==========================================\n")

        if not result:
            raise OllamaInvalidResponseError(
                "Ollama returned an empty response."
            )

        return _extract_json(result)

    except requests.exceptions.RequestException as error:

        # DEBUG: show the actual error returned by Ollama
        if hasattr(error, "response") and error.response is not None:

            print("\n========== OLLAMA ERROR RESPONSE ==========")
            print(error.response.text)
            print("===========================================\n")

        raise OllamaConnectionError(
            f"Ollama connection failed: {error}"
        )


# ============================================================
# RESUME ANALYSIS
# ============================================================

def analyze_resume(resume_text: str):
    """Analyze a resume using the local Ollama model."""

    prompt = f"""You are an AI Resume Analyzer.

Analyze the resume below and return ONLY valid JSON.

RESUME:
{resume_text}

Use exactly:
{{
  "score": 0,
  "ats_compatibility": "",
  "strengths": [],
  "weaknesses": [],
  "missing_skills": [],
  "ats_keywords": [],
  "suggestions": []
}}

Rules:
- score: integer 0-100 based on actual resume quality.
- ats_compatibility: exactly "Excellent", "Good", "Needs Improvement", or "Poor".
- Return at most 3 concise items in each array.
- Use only information present in the resume.
- Never invent experience, education, projects, skills, or achievements.
- Strengths/weaknesses must be supported by the resume.
- missing_skills should be useful skills that appear absent.
- ats_keywords should be relevant keywords supported by the resume.
- suggestions must be practical and specific.
- All fields must be present; arrays contain strings; never use null.
- No markdown, code fences, or text outside the JSON.
"""

    result = _call_ollama(prompt)

    result.setdefault("score", 0)
    result.setdefault("ats_compatibility", "Needs Improvement")
    result.setdefault("strengths", [])
    result.setdefault("weaknesses", [])
    result.setdefault("missing_skills", [])
    result.setdefault("ats_keywords", [])
    result.setdefault("suggestions", [])

    return result


def match_resume_with_job(
    resume_text: str,
    job_description: str
):
    """Analyze the resume overall and compare it against a job description."""

    prompt = f"""You are an AI Resume Analyzer and Job Matching System.

Analyze the resume overall AND compare it with the job description.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Return ONLY valid JSON using exactly:
{{
  "ai_analysis": {{
    "score": 0,
    "ats_compatibility": "",
    "strengths": [],
    "weaknesses": [],
    "missing_skills": [],
    "ats_keywords": [],
    "suggestions": []
  }},
  "match_result": {{
    "match_score": 0,
    "matching_skills": [],
    "missing_skills": [],
    "ats_keywords": [],
    "suggestions": []
  }}
}}

Rules:
- ai_analysis.score: integer 0-100 based on structure, clarity, readability, skills,
  projects, experience, formatting, and ATS friendliness.
- ats_compatibility: exactly "Excellent", "Good", "Needs Improvement", or "Poor".
-- At most 3 concise items per array.
- strengths: provide 2-3 genuine strengths when supported by the resume.
- weaknesses: provide 2-3 genuine weaknesses whenever the resume has identifiable limitations, missing evidence, weak formatting, limited experience, or areas for improvement.
- Do not return an empty weaknesses array unless the resume is genuinely exceptional and there is no meaningful weakness to identify.
- Use only evidence from the resume. Never invent anything.
- match_score: integer 0-100 based only on resume vs job description.
- matching_skills: clearly supported by BOTH.
- missing_skills: important job requirements not supported by the resume.
- ats_keywords: important job-description keywords relevant to matching.
- suggestions: practical, job-specific improvements.
- Required skills matter more than preferred skills.
- Do not treat every keyword as an exact skill match or inflate the score with generic keywords.
- All fields must be present; arrays contain strings; never use null.
- No markdown, code fences, explanations, or text outside the JSON.
"""

    result = _call_ollama(prompt)

    ai_analysis = result.get("ai_analysis", {})
    match_result = result.get("match_result", {})

    if not isinstance(ai_analysis, dict):
        ai_analysis = {}

    if not isinstance(match_result, dict):
        match_result = {}

    ai_analysis.setdefault("score", 0)
    ai_analysis.setdefault("ats_compatibility", "Needs Improvement")
    ai_analysis.setdefault("strengths", [])
    ai_analysis.setdefault("weaknesses", [])
    ai_analysis.setdefault("missing_skills", [])
    ai_analysis.setdefault("ats_keywords", [])
    ai_analysis.setdefault("suggestions", [])

    match_result.setdefault("match_score", 0)
    match_result.setdefault("matching_skills", [])
    match_result.setdefault("missing_skills", [])
    match_result.setdefault("ats_keywords", [])
    match_result.setdefault("suggestions", [])

    return {
        "ai_analysis": ai_analysis,
        "match_result": match_result
    }
