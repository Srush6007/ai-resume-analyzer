from app.services.resume_parser import clean_resume_text, extract_sections


def test_clean_resume_text():
    """Verify that resume text is cleaned correctly."""
    text = "  John   Doe\n\nPython   Developer  "

    result = clean_resume_text(text)

    assert result
    assert "John Doe" in result
    assert "Python Developer" in result


def test_extract_resume_sections():
    """Verify that common resume sections are detected."""
    text = """
    SUMMARY
    Python developer with backend experience.

    EDUCATION
    BE Computer Science

    SKILLS
    Python, FastAPI, Docker

    PROJECTS
    Resume Analyzer
    """

    sections = extract_sections(text)

    assert "summary" in sections
    assert "education" in sections
    assert "skills" in sections
    assert "projects" in sections
