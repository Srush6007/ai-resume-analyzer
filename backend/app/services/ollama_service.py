import json
import requests


OLLAMA_URL = "http://host.docker.internal:11434/api/generate"
MODEL_NAME = "qwen3:4b"


def _call_ollama(prompt: str):
    """Send a prompt to Ollama and return the parsed JSON response."""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
            },
            timeout=600,
        )

        response.raise_for_status()

        data = response.json()
        result = data.get("response", "").strip()

        if not result:
            raise RuntimeError("Ollama returned an empty response.")

        if result.startswith("```"):
            result = result.replace("```json", "", 1)
            result = result.replace("```", "")
            result = result.strip()

        return json.loads(result)

    except requests.exceptions.RequestException as error:
        raise RuntimeError(f"Ollama connection failed: {error}")

    except json.JSONDecodeError as error:
        raise RuntimeError(f"Ollama returned invalid JSON: {error}")


def analyze_resume(resume_text: str):
    """Analyze a resume using the local Ollama AI model."""

    prompt = f"""
You are an AI Resume Analyzer.

Analyze the following resume carefully.

RESUME:
{resume_text}

Return ONLY valid JSON.

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
- score must be an integer between 0 and 100
- ats_compatibility must be exactly one of:
  "Excellent", "Good", "Needs Improvement", "Poor"
- strengths, weaknesses, missing_skills, ats_keywords and suggestions
  must all be arrays of strings
- assess ATS compatibility based on resume structure,
  clarity, relevant keywords, formatting and readability
- analyze the actual resume
- do not invent experience or skills
- provide practical suggestions
- do not use markdown
- do not add explanations outside the JSON
"""

    return _call_ollama(prompt)


def match_resume_with_job(resume_text: str, job_description: str):
    """Compare a resume with a job description using Ollama."""

    prompt = f"""
You are an AI Resume and Job Matching Analyzer.

Compare the resume against the job description.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Return ONLY valid JSON.

Use exactly this structure:

{{
  "match_score": 0,
  "matching_skills": [],
  "missing_skills": [],
  "ats_keywords": [],
  "suggestions": []
}}

Rules:
- match_score must be an integer between 0 and 100
- matching_skills must contain skills found in both
  the resume and job description
- missing_skills must contain important job skills missing
  from the resume
- ats_keywords must contain important job description keywords
- suggestions must be practical
- all arrays must contain strings
- do not invent experience
- do not use markdown
- do not add explanations outside the JSON
"""

    return _call_ollama(prompt)