def clean_resume_text(text: str) -> str:
    # Normalize line breaks
    lines = text.splitlines()

    cleaned_lines = []

    for line in lines:
        line = " ".join(line.split())

        if line:
            cleaned_lines.append(line)

    return "\n".join(cleaned_lines)


def extract_sections(text: str) -> dict:
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
        "EDUCATION": "education",
        "SKILLS": "skills",
        "PROJECTS": "projects",
        "ACHIEVEMENTS": "achievements",
        "CERTIFICATIONS": "certifications",
    }

    for line in text.splitlines():
        line = line.strip()

        if not line:
            continue

        heading = line.upper().strip("•:- ")

        if heading in headings:
            current_section = headings[heading]
            continue

        if current_section:
            sections[current_section] += line + "\n"

    for section in sections:
        sections[section] = sections[section].strip()

    return sections