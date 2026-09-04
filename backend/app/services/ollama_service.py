import json
import requests


OLLAMA_URL = "http://host.docker.internal:11434/api/generate"
MODEL_NAME = "qwen3:4b"


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

        raise OllamaConnectionError(
            f"Ollama connection failed: {error}"
        )


# ============================================================
# RESUME ANALYSIS
# ============================================================

def analyze_resume(resume_text: str):
    """
    Analyze a resume using the local Ollama model.
    """

    prompt = f"""
You are an AI Resume Analyzer.

Analyze the following resume carefully.

RESUME:
{resume_text}

Return ONLY one valid JSON object.

Do not return markdown.
Do not return code fences.
Do not return explanations.
Do not return text before or after the JSON.

Use exactly this structure:

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

- score must be an integer from 0 to 100
- score must reflect the actual quality of the resume
- do not give 100 unless the resume is exceptionally complete

- ats_compatibility must be exactly one of:
  "Excellent"
  "Good"
  "Needs Improvement"
  "Poor"

- strengths must contain genuine strengths found in the resume
- weaknesses must contain genuine weaknesses found in the resume

- missing_skills should contain useful skills that appear absent
  from the resume

- ats_keywords should contain relevant keywords supported by
  the resume

- suggestions must be practical and specific

- analyze only information present in the resume

Never invent:
- experience
- education
- projects
- skills
- achievements

- all arrays must contain strings
- never return null
- all required fields must be present
- output must be valid JSON
"""

    result = _call_ollama(prompt)

    # --------------------------------------------------------
    # Ensure required fields exist
    # --------------------------------------------------------

    result.setdefault("score", 0)

    result.setdefault(
        "ats_compatibility",
        "Needs Improvement"
    )

    result.setdefault(
        "strengths",
        []
    )

    result.setdefault(
        "weaknesses",
        []
    )

    result.setdefault(
        "missing_skills",
        []
    )

    result.setdefault(
        "ats_keywords",
        []
    )

    result.setdefault(
        "suggestions",
        []
    )

    return result


# ============================================================
# RESUME + JOB DESCRIPTION MATCHING
# ============================================================

def match_resume_with_job(
    resume_text: str,
    job_description: str
):
    """
    Analyze the resume overall AND compare it against
    a supplied job description.
    """

    prompt = f"""
You are an expert AI Resume Analyzer and Job Matching System.

Analyze the resume overall AND compare it against the supplied
job description.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Return ONLY one valid JSON object.

Do not return markdown.
Do not return code fences.
Do not return explanations.
Do not return text before or after the JSON.

Use exactly this structure:

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

========================
OVERALL RESUME ANALYSIS
========================

For ai_analysis:

- score must be an integer from 0 to 100
- score measures the overall quality of the resume

Consider:

- structure
- clarity
- formatting
- readability
- skills
- projects
- experience
- ATS friendliness

Do not give 100 unless the resume is exceptionally complete.

ats_compatibility must be exactly one of:

"Excellent"
"Good"
"Needs Improvement"
"Poor"

strengths must contain genuine strengths found in the resume.

weaknesses must contain genuine weaknesses found in the resume.

missing_skills should contain useful skills that appear absent
from the resume.

ats_keywords should contain relevant keywords supported by
the resume.

suggestions must be practical and specific.

Never invent:

- experience
- education
- projects
- skills
- achievements

========================
JOB MATCH ANALYSIS
========================

For match_result:

match_score must be an integer from 0 to 100.

Compare the resume ONLY against the supplied job description.

matching_skills must contain skills clearly supported by BOTH
the resume and the job description.

missing_skills must contain important skills required or
preferred by the job description that are not supported
by the resume.

ats_keywords must contain important keywords from the job
description that are relevant for ATS matching.

suggestions must explain practical ways to improve the resume
for this specific job.

========================
MATCH SCORE RULES
========================

The match score must be realistic.

Do NOT give 100 if important job requirements are missing.

If several required skills are missing,
the score must be significantly below 100.

If the resume contains most required skills but misses
several preferred skills, the score should generally be
between 70 and 90.

If the resume contains only some required skills,
the score should generally be between 40 and 70.

If the resume contains very few relevant skills,
the score should generally be below 40.

Do not treat every keyword as an exact skill match.

Only mark a skill as matching when there is evidence
in the resume.

Consider required skills more important than preferred skills.

Do not inflate the score simply because the resume contains
many general software or programming keywords.

========================
OUTPUT RULES
========================

Both "ai_analysis" and "match_result" are mandatory.

All fields must always be present.

Never return null.

These fields must always be arrays of strings:

- strengths
- weaknesses
- missing_skills
- ats_keywords
- suggestions
- matching_skills

Output ONLY valid JSON.
"""

    result = _call_ollama(prompt)

    # --------------------------------------------------------
    # Get the two main objects
    # --------------------------------------------------------

    ai_analysis = result.get(
        "ai_analysis",
        {}
    )

    match_result = result.get(
        "match_result",
        {}
    )

    if not isinstance(ai_analysis, dict):
        ai_analysis = {}

    if not isinstance(match_result, dict):
        match_result = {}

    # --------------------------------------------------------
    # AI ANALYSIS DEFAULTS
    # --------------------------------------------------------

    ai_analysis.setdefault(
        "score",
        0
    )

    ai_analysis.setdefault(
        "ats_compatibility",
        "Needs Improvement"
    )

    ai_analysis.setdefault(
        "strengths",
        []
    )

    ai_analysis.setdefault(
        "weaknesses",
        []
    )

    ai_analysis.setdefault(
        "missing_skills",
        []
    )

    ai_analysis.setdefault(
        "ats_keywords",
        []
    )

    ai_analysis.setdefault(
        "suggestions",
        []
    )

    # --------------------------------------------------------
    # MATCH RESULT DEFAULTS
    # --------------------------------------------------------

    match_result.setdefault(
        "match_score",
        0
    )

    match_result.setdefault(
        "matching_skills",
        []
    )

    match_result.setdefault(
        "missing_skills",
        []
    )

    match_result.setdefault(
        "ats_keywords",
        []
    )

    match_result.setdefault(
        "suggestions",
        []
    )

    # --------------------------------------------------------
    # FINAL RESPONSE
    # --------------------------------------------------------

    return {
        "ai_analysis": ai_analysis,
        "match_result": match_result
    }