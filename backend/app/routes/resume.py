from fastapi import APIRouter, UploadFile, File, HTTPException
from pypdf import PdfReader
from io import BytesIO

from app.services.resume_parser import (
    clean_resume_text,
    extract_sections
)

from app.services.resume_analyzer import analyze_resume
from app.services.skill_analyzer import analyze_skills


router = APIRouter()


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):

    # Check file type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    # Read file
    contents = await file.read()

    # Check if file is empty
    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty."
        )

    # Extract text from PDF
    try:
        reader = PdfReader(BytesIO(contents))

        text = ""

        for page in reader.pages:
            text += page.extract_text() or ""

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read the PDF file."
        )

    # Check if PDF contains readable text
    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text was found in the PDF."
        )

    # Clean extracted text
    text = clean_resume_text(text)

    # Extract resume sections
    sections = extract_sections(text)

    # Analyze resume sections
    analysis = analyze_resume(sections)

    # Analyze technical skills
    skill_analysis = analyze_skills(text)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "text": text,
        "sections": sections,
        "analysis": analysis,
        "skill_analysis": skill_analysis
    }