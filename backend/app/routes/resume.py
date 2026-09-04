from fastapi import APIRouter, UploadFile, File, HTTPException, Form
import fitz

from app.services.resume_parser import (
    clean_resume_text,
    extract_sections
)

from app.services.ollama_service import (
    analyze_resume,
    match_resume_with_job,
    OllamaConnectionError,
    OllamaInvalidResponseError
)


router = APIRouter()


# ============================================================
# PDF TEXT EXTRACTION
# ============================================================

def extract_pdf_text(contents: bytes):
    """Extract and clean readable text from a PDF file."""

    try:
        # Open PDF directly from bytes using PyMuPDF
        pdf_document = fitz.open(
            stream=contents,
            filetype="pdf"
        )

        text = ""

        for page in pdf_document:
            text += page.get_text() or ""

        pdf_document.close()

    except Exception as error:
        print(f"PDF extraction error: {error}")

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


# ============================================================
# RESUME UPLOAD + ANALYSIS
# ============================================================

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...)
):
    """Upload and analyze a resume PDF."""

    # --------------------------------------------------------
    # Validate resume file type
    # --------------------------------------------------------

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    # --------------------------------------------------------
    # Read uploaded resume
    # --------------------------------------------------------

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty."
        )

    # --------------------------------------------------------
    # Extract resume text
    # --------------------------------------------------------

    text = extract_pdf_text(contents)

    # --------------------------------------------------------
    # Extract resume sections
    # --------------------------------------------------------

    sections = extract_sections(text)

    # --------------------------------------------------------
    # Analyze resume using AI
    # --------------------------------------------------------

    try:

        ai_analysis = analyze_resume(text)

    except OllamaConnectionError as error:

        print(f"Ollama connection error: {error}")

        raise HTTPException(
            status_code=503,
            detail=f"Ollama unavailable: {error}"
        )

    except OllamaInvalidResponseError as error:

        print(f"Invalid AI response: {error}")

        raise HTTPException(
            status_code=502,
            detail=f"Invalid AI response: {error}"
        )

    except Exception as error:

        print(f"AI analysis error: {error}")

        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {error}"
        )

    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "text": text,
        "sections": sections,
        "ai_analysis": ai_analysis
    }


# ============================================================
# RESUME + JOB DESCRIPTION MATCHING
# ============================================================

@router.post("/match")
async def match_resume(
    file: UploadFile = File(...),
    job_description: str | None = Form(None),
    job_file: UploadFile | None = File(None)
):
    """
    Compare a resume against a job description.

    Job description can be provided either:
    1. As text
    2. As a PDF file
    """

    # --------------------------------------------------------
    # Validate resume
    # --------------------------------------------------------

    if file.content_type != "application/pdf":

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed for the resume."
        )

    # --------------------------------------------------------
    # Read uploaded resume
    # --------------------------------------------------------

    contents = await file.read()

    if not contents:

        raise HTTPException(
            status_code=400,
            detail="The uploaded resume file is empty."
        )

    # --------------------------------------------------------
    # Validate job description
    # --------------------------------------------------------

    if not job_description and not job_file:

        raise HTTPException(
            status_code=400,
            detail="Please provide a job description as text or PDF."
        )

    # --------------------------------------------------------
    # Job description PDF
    # --------------------------------------------------------

    if job_file:

        if job_file.content_type != "application/pdf":

            raise HTTPException(
                status_code=400,
                detail="Job description file must be a PDF."
            )

        job_contents = await job_file.read()

        if not job_contents:

            raise HTTPException(
                status_code=400,
                detail="The job description PDF is empty."
            )

        job_description = extract_pdf_text(job_contents)

    # --------------------------------------------------------
    # Validate job description text
    # --------------------------------------------------------

    if not job_description or not job_description.strip():

        raise HTTPException(
            status_code=400,
            detail="Job description cannot be empty."
        )

    # --------------------------------------------------------
    # Extract resume text
    # --------------------------------------------------------

    resume_text = extract_pdf_text(contents)

    # --------------------------------------------------------
    # Analyze resume + match with job
    #
    # This makes ONE Ollama request that returns:
    #
    # 1. Overall resume analysis
    # 2. Job matching analysis
    # --------------------------------------------------------

    try:

        result = match_resume_with_job(
            resume_text,
            job_description
        )

    except OllamaConnectionError as error:

        print(f"Ollama connection error: {error}")

        raise HTTPException(
            status_code=503,
            detail=f"Ollama unavailable: {error}"
        )

    except OllamaInvalidResponseError as error:

        print(f"Invalid AI response: {error}")

        raise HTTPException(
            status_code=502,
            detail=f"Invalid AI response: {error}"
        )

    except Exception as error:

        print(f"Job matching error: {error}")

        raise HTTPException(
            status_code=500,
            detail=f"Job matching failed: {error}"
        )

    # --------------------------------------------------------
    # Return both analyses
    # --------------------------------------------------------

    return {
        "filename": file.filename,
        "job_description_source": (
            "pdf" if job_file else "text"
        ),
        "ai_analysis": result["ai_analysis"],
        "match_result": result["match_result"]
    }