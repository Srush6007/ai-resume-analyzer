import requests
import json
import re


OLLAMA_URL = "http://host.docker.internal:11434/api/generate"
MODEL_NAME = "qwen3:8b"


def analyze_resume(resume_text: str):
    prompt = f"""
You are an AI Resume Analyzer.

Analyze the following resume.

Resume:
{resume_text}

Return ONLY valid JSON in exactly this format:

{{
  "score": 0,
  "strengths": [],
  "weaknesses": [],
  "missing_skills": [],
  "ats_keywords": [],
  "suggestions": []
}}

Rules:
- score must be an integer from 0 to 100.
- strengths must contain 3 to 5 items.
- weaknesses must contain 3 to 5 items.
- missing_skills must contain 3 to 5 items.
- ats_keywords must contain 5 to 10 relevant keywords.
- suggestions must contain 3 to 5 practical suggestions.
- Do not use markdown.
- Return JSON only.
"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "think": False,
            },
            timeout=600,
        )

        response.raise_for_status()

        data = response.json()
        result = data.get("response", "").strip()

        return _parse_json_response(result)

    except requests.exceptions.RequestException as error:
        raise RuntimeError(f"Ollama connection failed: {error}")


def match_resume_with_job(resume_text: str, job_description: str):
    prompt = f"""
You are an AI Resume and Job Description Matching System.

Compare the resume with the job description.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Return ONLY valid JSON in exactly this format:

{{
  "match_score": 0,
  "matching_skills": [],
  "missing_skills": [],
  "ats_keywords": [],
  "suggestions": []
}}

Rules:
- match_score must be an integer from 0 to 100.
- matching_skills should contain skills present in both the resume and job description.
- missing_skills should contain important job requirements missing from the resume.
- ats_keywords should contain important keywords from the job description that are relevant for the candidate.
- suggestions should explain how the resume could better match the job.
- Use 3 to 8 items for each list.
- Do not invent experience that is not present in the resume.
- Do not use markdown.
- Return JSON only.
"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "think": False,
            },
            timeout=600,
        )

        response.raise_for_status()

        data = response.json()
        result = data.get("response", "").strip()

        return _parse_json_response(result)

    except requests.exceptions.RequestException as error:
        raise RuntimeError(f"Ollama connection failed: {error}")


def _parse_json_response(result: str):
    result = result.strip()

    # Remove markdown code fences if Ollama adds them
    result = re.sub(r"^```json\s*", "", result, flags=re.IGNORECASE)
    result = re.sub(r"^```\s*", "", result)
    result = re.sub(r"\s*```$", "", result)

    try:
        return json.loads(result)
    except json.JSONDecodeError:
        # Try to find the JSON object inside the response
        start = result.find("{")
        end = result.rfind("}")

        if start != -1 and end != -1:
            try:
                return json.loads(result[start:end + 1])
            except json.JSONDecodeError:
                pass

        raise RuntimeError(
            f"Ollama returned invalid JSON: {result}"
        )