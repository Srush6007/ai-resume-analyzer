from fastapi import APIRouter, UploadFile, File
from pypdf import PdfReader
from io import BytesIO

router = APIRouter()


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    contents = await file.read()

    reader = PdfReader(BytesIO(contents))

    text = ""

    for page in reader.pages:
        text += page.extract_text() or ""

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "text": text
    }