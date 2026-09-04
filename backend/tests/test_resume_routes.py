from io import BytesIO
from unittest.mock import patch

from fastapi.testclient import TestClient
from pypdf import PdfWriter

from app.main import app
from app.services.ollama_service import (
    OllamaConnectionError,
    OllamaInvalidResponseError,
)


client = TestClient(app)


def create_test_pdf():
    """Create a valid single-page PDF for testing."""

    pdf_buffer = BytesIO()
    writer = PdfWriter()

    writer.add_blank_page(width=600, height=800)

    writer.write(pdf_buffer)
    pdf_buffer.seek(0)

    return pdf_buffer


def create_multi_page_pdf():
    """Create a valid multi-page PDF for testing."""

    pdf_buffer = BytesIO()
    writer = PdfWriter()

    writer.add_blank_page(width=600, height=800)
    writer.add_blank_page(width=600, height=800)
    writer.add_blank_page(width=600, height=800)

    writer.write(pdf_buffer)
    pdf_buffer.seek(0)

    return pdf_buffer


# ============================================================
# RESUME UPLOAD TESTS
# ============================================================

def test_upload_resume_invalid_file_type():
    """Verify that the upload endpoint rejects non-PDF files."""

    response = client.post(
        "/resume/upload",
        files={
            "file": (
                "resume.txt",
                b"This is not a PDF.",
                "text/plain",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only PDF files are allowed."


def test_upload_resume_empty_file():
    """Verify that the upload endpoint rejects an empty file."""

    response = client.post(
        "/resume/upload",
        files={
            "file": (
                "resume.pdf",
                b"",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "The uploaded file is empty."


def test_upload_resume_success():
    """Verify that a valid PDF is processed successfully."""

    pdf = create_test_pdf()

    with patch(
        "app.routes.resume.extract_pdf_text",
        return_value="Python developer with FastAPI and Docker experience.",
    ), patch(
        "app.routes.resume.analyze_resume",
        return_value={
            "score": 80,
            "ats_compatibility": "Good",
            "strengths": ["Python"],
            "weaknesses": [],
            "missing_skills": [],
            "ats_keywords": ["Python"],
            "suggestions": [],
        },
    ):

        response = client.post(
            "/resume/upload",
            files={
                "file": (
                    "resume.pdf",
                    pdf,
                    "application/pdf",
                )
            },
        )

    assert response.status_code == 200

    data = response.json()

    assert data["filename"] == "resume.pdf"
    assert data["content_type"] == "application/pdf"
    assert data["text"] == (
        "Python developer with FastAPI and Docker experience."
    )
    assert "sections" in data
    assert "ai_analysis" in data
    assert data["ai_analysis"]["score"] == 80
    assert data["ai_analysis"]["ats_compatibility"] == "Good"


def test_upload_resume_multi_page_pdf():
    """Verify that a multi-page PDF can be processed."""

    pdf = create_multi_page_pdf()

    with patch(
        "app.routes.resume.extract_pdf_text",
        return_value=(
            "Page one resume content.\n"
            "Page two resume content.\n"
            "Page three resume content."
        ),
    ), patch(
        "app.routes.resume.analyze_resume",
        return_value={
            "score": 85,
            "ats_compatibility": "Good",
            "strengths": ["Python"],
            "weaknesses": [],
            "missing_skills": [],
            "ats_keywords": ["Python"],
            "suggestions": [],
        },
    ):

        response = client.post(
            "/resume/upload",
            files={
                "file": (
                    "multi_page_resume.pdf",
                    pdf,
                    "application/pdf",
                )
            },
        )

    assert response.status_code == 200

    data = response.json()

    assert data["filename"] == "multi_page_resume.pdf"
    assert "Page one resume content." in data["text"]
    assert "Page two resume content." in data["text"]
    assert "Page three resume content." in data["text"]
    assert data["ai_analysis"]["score"] == 85


def test_upload_resume_ollama_unavailable():
    """Verify that Ollama connection failures return HTTP 503."""

    pdf = create_test_pdf()

    with patch(
        "app.routes.resume.extract_pdf_text",
        return_value="Python developer with FastAPI experience.",
    ), patch(
        "app.routes.resume.analyze_resume",
        side_effect=OllamaConnectionError(
            "Ollama connection failed."
        ),
    ):

        response = client.post(
            "/resume/upload",
            files={
                "file": (
                    "resume.pdf",
                    pdf,
                    "application/pdf",
                )
            },
        )

    assert response.status_code == 503
    assert "Ollama unavailable" in response.json()["detail"]


def test_upload_resume_invalid_ai_response():
    """Verify that invalid AI responses return HTTP 502."""

    pdf = create_test_pdf()

    with patch(
        "app.routes.resume.extract_pdf_text",
        return_value="Python developer with FastAPI experience.",
    ), patch(
        "app.routes.resume.analyze_resume",
        side_effect=OllamaInvalidResponseError(
            "Ollama returned invalid JSON."
        ),
    ):

        response = client.post(
            "/resume/upload",
            files={
                "file": (
                    "resume.pdf",
                    pdf,
                    "application/pdf",
                )
            },
        )

    assert response.status_code == 502
    assert "Invalid AI response" in response.json()["detail"]


# ============================================================
# RESUME + JOB MATCHING TESTS
# ============================================================

def test_match_resume_invalid_file_type():
    """Verify that the match endpoint rejects non-PDF resume files."""

    response = client.post(
        "/resume/match",
        files={
            "file": (
                "resume.txt",
                b"This is not a PDF.",
                "text/plain",
            )
        },
        data={
            "job_description": "Python developer with FastAPI experience."
        },
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Only PDF files are allowed for the resume."
    )


def test_match_resume_empty_job_description():
    """Verify that an empty job description is rejected."""

    pdf = create_test_pdf()

    response = client.post(
        "/resume/match",
        files={
            "file": (
                "resume.pdf",
                pdf,
                "application/pdf",
            )
        },
        data={
            "job_description": "   "
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Job description cannot be empty."


def test_match_resume_missing_job_description():
    """Verify that matching requires a job description."""

    pdf = create_test_pdf()

    response = client.post(
        "/resume/match",
        files={
            "file": (
                "resume.pdf",
                pdf,
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Please provide a job description as text or PDF."
    )


def test_match_resume_empty_file():
    """Verify that the match endpoint rejects an empty resume file."""

    response = client.post(
        "/resume/match",
        files={
            "file": (
                "resume.pdf",
                b"",
                "application/pdf",
            )
        },
        data={
            "job_description": "Python developer with FastAPI experience."
        },
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "The uploaded resume file is empty."
    )


def test_match_resume_success():
    """Verify that resume matching with text JD returns the expected result."""

    pdf = create_test_pdf()

    with patch(
        "app.routes.resume.extract_pdf_text",
        return_value="Python developer with FastAPI experience.",
    ), patch(
        "app.routes.resume.match_resume_with_job",
        return_value={
            "ai_analysis": {
                "score": 85,
                "ats_compatibility": "Good",
                "strengths": ["Python"],
                "weaknesses": [],
                "missing_skills": ["AWS"],
                "ats_keywords": ["Python", "FastAPI", "AWS"],
                "suggestions": ["Add AWS experience"],
            },
            "match_result": {
                "match_score": 80,
                "matching_skills": ["Python", "FastAPI"],
                "missing_skills": ["AWS"],
                "ats_keywords": ["Python", "FastAPI", "AWS"],
                "suggestions": ["Add AWS experience"],
            },
        },
    ):

        response = client.post(
            "/resume/match",
            files={
                "file": (
                    "resume.pdf",
                    pdf,
                    "application/pdf",
                )
            },
            data={
                "job_description": (
                    "Looking for a Python developer "
                    "with FastAPI and AWS."
                )
            },
        )

    assert response.status_code == 200

    data = response.json()

    assert data["filename"] == "resume.pdf"
    assert data["job_description_source"] == "text"

    assert "ai_analysis" in data
    assert "match_result" in data

    assert data["ai_analysis"]["score"] == 85
    assert data["ai_analysis"]["ats_compatibility"] == "Good"

    assert data["match_result"]["match_score"] == 80
    assert "Python" in data["match_result"]["matching_skills"]
    assert "AWS" in data["match_result"]["missing_skills"]


def test_match_resume_invalid_job_pdf():
    """Verify that a non-PDF job description file is rejected."""

    pdf = create_test_pdf()

    response = client.post(
        "/resume/match",
        files={
            "file": (
                "resume.pdf",
                pdf,
                "application/pdf",
            ),
            "job_file": (
                "job.txt",
                b"Python developer required.",
                "text/plain",
            ),
        },
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Job description file must be a PDF."
    )


def test_match_resume_empty_job_pdf():
    """Verify that an empty job description PDF is rejected."""

    pdf = create_test_pdf()

    response = client.post(
        "/resume/match",
        files={
            "file": (
                "resume.pdf",
                pdf,
                "application/pdf",
            ),
            "job_file": (
                "job.pdf",
                b"",
                "application/pdf",
            ),
        },
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "The job description PDF is empty."
    )


def test_match_resume_job_pdf_success():
    """Verify that resume matching works with a PDF job description."""

    resume_pdf = create_test_pdf()
    job_pdf = create_test_pdf()

    def mock_extract_pdf_text(contents):
        if contents == resume_pdf.getvalue():
            return "Python developer with FastAPI experience."

        return "Looking for a Python developer with FastAPI and AWS."

    with patch(
        "app.routes.resume.extract_pdf_text",
        side_effect=mock_extract_pdf_text,
    ), patch(
        "app.routes.resume.match_resume_with_job",
        return_value={
            "ai_analysis": {
                "score": 85,
                "ats_compatibility": "Good",
                "strengths": ["Python"],
                "weaknesses": [],
                "missing_skills": ["AWS"],
                "ats_keywords": ["Python", "FastAPI", "AWS"],
                "suggestions": ["Add AWS experience"],
            },
            "match_result": {
                "match_score": 85,
                "matching_skills": ["Python", "FastAPI"],
                "missing_skills": ["AWS"],
                "ats_keywords": ["Python", "FastAPI", "AWS"],
                "suggestions": ["Add AWS experience"],
            },
        },
    ):

        response = client.post(
            "/resume/match",
            files={
                "file": (
                    "resume.pdf",
                    resume_pdf,
                    "application/pdf",
                ),
                "job_file": (
                    "job.pdf",
                    job_pdf,
                    "application/pdf",
                ),
            },
        )

    assert response.status_code == 200

    data = response.json()

    assert data["filename"] == "resume.pdf"
    assert data["job_description_source"] == "pdf"

    assert "ai_analysis" in data
    assert "match_result" in data

    assert data["ai_analysis"]["score"] == 85
    assert data["ai_analysis"]["ats_compatibility"] == "Good"

    assert data["match_result"]["match_score"] == 85
    assert "Python" in data["match_result"]["matching_skills"]
    assert "AWS" in data["match_result"]["missing_skills"]