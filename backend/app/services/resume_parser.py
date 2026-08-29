def clean_resume_text(text: str) -> str:
    """
    Clean extracted resume text by:
    - Normalizing line breaks
    - Removing unnecessary spaces
    - Removing empty lines
    """

    lines = text.splitlines()

    cleaned_lines = []

    for line in lines:
        # Remove extra spaces/tabs
        line = " ".join(line.split())

        if line:
            cleaned_lines.append(line)

    return "\n".join(cleaned_lines)


def extract_sections(text: str) -> dict:
    """
    Extract common resume sections from cleaned resume text.
    """

    sections = {
        "summary": "",
        "education": "",
        "skills": "",
        "projects": "",
        "achievements": "",
        "certifications": "",
    }

    current_section = None

    headings = {
        "SUMMARY": "summary",
        "PROFESSIONAL SUMMARY": "summary",
        "PROFILE": "summary",
        "OBJECTIVE": "summary",

        "EDUCATION": "education",
        "ACADEMIC BACKGROUND": "education",

        "SKILLS": "skills",
        "TECHNICAL SKILLS": "skills",
        "TECHNICAL SKILL": "skills",

        "PROJECTS": "projects",
        "PROJECT": "projects",
        "PERSONAL PROJECTS": "projects",

        "ACHIEVEMENTS": "achievements",
        "ACHIEVEMENT": "achievements",

        "CERTIFICATIONS": "certifications",
        "CERTIFICATION": "certifications",
        "CERTIFICATES": "certifications",
    }

    for line in text.splitlines():
        line = line.strip()

        if not line:
            continue

        # Normalize heading
        heading = line.upper().strip("•:- ")

        if heading in headings:
            current_section = headings[heading]
            continue

        # Add content to current section
        if current_section:
            sections[current_section] += line + "\n"

    # Remove trailing whitespace/newlines
    for section in sections:
        sections[section] = sections[section].strip()

    return sections