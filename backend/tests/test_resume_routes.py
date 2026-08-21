from io import BytesIO
from unittest.mock import patch

from fastapi.testclient import TestClient
from pypdf import PdfWriter

from app.main import app


client = TestClient(app)


def create_test_pdf():
    """Create a valid PDF containing readable resume text for testing."""

    pdf_buffer = BytesIO()
    writer = PdfWriter()

    page = writer.add_blank_page(width=600, height=800)

    page.merge_page(page)

    writer.write(pdf_buffer)
    pdf_buffer.seek(0)

    return pdf_buffer


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


def test_match_resume_invalid_file_type():
    """Verify that the match endpoint rejects non-PDF files."""

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
    assert response.json()["detail"] == "Only PDF files are allowed."


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


def test_match_resume_empty_file():
    """Verify that the match endpoint rejects an empty file."""

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
    assert response.json()["detail"] == "The uploaded file is empty."


def test_match_resume_success():
    """Verify that resume matching returns the expected result."""

    pdf = create_test_pdf()

    with patch(
        "app.routes.resume.extract_pdf_text",
        return_value="Python developer with FastAPI experience.",
    ), patch(
        "app.routes.resume.match_resume_with_job",
        return_value={
            "match_score": 80,
            "matching_skills": ["Python", "FastAPI"],
            "missing_skills": ["AWS"],
            "ats_keywords": ["Python", "FastAPI", "AWS"],
            "suggestions": ["Add AWS experience"],
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
    assert "match_result" in data

    assert data["match_result"]["match_score"] == 80
    assert "Python" in data["match_result"]["matching_skills"]
    assert "AWS" in data["match_result"]["missing_skills"]