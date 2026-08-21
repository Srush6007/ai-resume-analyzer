from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pypdf import PdfReader
from io import BytesIO

from app.services.resume_parser import (
    clean_resume_text,
    extract_sections
)

from app.services.ollama_service import (
    analyze_resume,
    match_resume_with_job
)


router = APIRouter()


def extract_pdf_text(contents: bytes):
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

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text was found in the PDF."
        )

    return clean_resume_text(text)


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty."
        )

    text = extract_pdf_text(contents)

    sections = extract_sections(text)

    try:
        ai_analysis = analyze_resume(text)

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {error}"
        )

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "text": text,
        "sections": sections,
        "ai_analysis": ai_analysis
    }


@router.post("/match")
async def match_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...)
):

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    if not job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Job description cannot be empty."
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty."
        )

    resume_text = extract_pdf_text(contents)

    try:
        match_result = match_resume_with_job(
            resume_text,
            job_description
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Job matching failed: {error}"
        )

    return {
        "filename": file.filename,
        "match_result": match_result
    }