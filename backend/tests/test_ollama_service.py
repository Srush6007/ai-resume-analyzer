from unittest.mock import Mock, patch

from app.services.ollama_service import (
    analyze_resume,
    match_resume_with_job,
)


def test_analyze_resume_success():
    """Verify that resume analysis correctly processes an Ollama response."""

    mock_response = Mock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "response": '{"score": 80, "strengths": ["Python"]}'
    }

    with patch(
        "app.services.ollama_service.requests.post",
        return_value=mock_response
    ):

        result = analyze_resume(
            "Python developer with FastAPI and Docker experience."
        )

        assert result
        assert result["score"] == 80
        assert "Python" in result["strengths"]


def test_analyze_resume_connection_failure():
    """Verify that Ollama connection errors are handled correctly."""

    with patch(
        "app.services.ollama_service.requests.post",
        side_effect=Exception("Connection failed")
    ):

        try:
            analyze_resume(
                "Python developer with FastAPI and Docker experience."
            )
            assert False, "Expected an exception"
        except Exception:
            assert True


def test_match_resume_with_job_success():
    """Verify that resume-to-job matching returns structured results."""

    mock_response = Mock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "response": """
        {
            "match_score": 80,
            "matching_skills": ["Python", "FastAPI"],
            "missing_skills": ["AWS"],
            "ats_keywords": ["Python", "FastAPI", "AWS"],
            "suggestions": ["Add AWS experience"]
        }
        """
    }

    with patch(
        "app.services.ollama_service.requests.post",
        return_value=mock_response
    ):

        result = match_resume_with_job(
            "Python developer with FastAPI experience.",
            "Looking for Python developer with FastAPI and AWS."
        )

        assert result
        assert result["match_score"] == 80
        assert "Python" in result["matching_skills"]
        assert "AWS" in result["missing_skills"]