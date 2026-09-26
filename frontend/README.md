AI-Powered Resume Analyzer

A locally hosted AI web application that analyzes resumes, evaluates ATS-oriented compatibility, identifies skill gaps, and optionally compares a resume with a job description.

📌 Project Overview

The AI-Powered Resume Analyzer is a full-stack web application built to provide structured, AI-generated feedback on resumes.

The user uploads a resume in PDF format. The backend extracts the resume text using PyMuPDF and sends the extracted content to a locally hosted Qwen3:0.6B model through Ollama.

The application provides:

Overall resume score

ATS compatibility assessment

Resume strengths

Resume weaknesses

Missing skills

ATS keywords

Improvement suggestions

A job description can also be supplied either by pasting text or uploading a PDF. In that case, the application additionally provides:

Job match score

Matching skills

Missing job skills

Job-specific keywords

Job-specific suggestions

The AI runs locally through Ollama, so resume content does not need to be sent to a cloud AI API.

📋 Table of Contents

Features

Technologies Used

System Architecture

Application Workflow

Resume Analysis

API

Docker Setup

Running the Project

Testing

Error Handling

Limitations

Screenshots

Project Structure

✨ Features

Category

Details

Resume Input

Upload resume as PDF

PDF Processing

Extract resume text using PyMuPDF

AI Analysis

Local Qwen3:0.6B model through Ollama

Resume Score

AI-generated score from 0–100

ATS Review

ATS-oriented compatibility assessment

Strengths

Identifies strong areas in the resume

Weaknesses

Identifies areas that need improvement

Missing Skills

Finds skills that may need stronger evidence

ATS Keywords

Identifies relevant resume keywords

Suggestions

Generates practical improvement suggestions

Job Matching

Compares resume with a job description

JD Input

Paste JD text or upload JD PDF

REST API

FastAPI-based backend

Frontend

React + Vite

Containerization

Docker + Docker Compose

Testing

Pytest backend test suite

Data Storage

No permanent resume database

🛠️ Technologies Used

Layer

Technology

Frontend

React, JavaScript, HTML, CSS

Build Tool

Vite

Backend

Python, FastAPI, Uvicorn

PDF Processing

PyMuPDF

AI Runtime

Ollama

AI Model

Qwen3:0.6B

API

REST / HTTP

Testing

Pytest, HTTPX

Containerization

Docker, Docker Compose

🏗️ System Architecture

Application Architecture

User
  |
  v
React Frontend
  |
  | HTTP / REST API
  v
FastAPI Backend
  |
  +----> PyMuPDF
  |        |
  |        v
  |    PDF Text
  |
  v
Ollama
  |
  v
Qwen3:0.6B
  |
  v
Structured JSON
  |
  v
FastAPI Response
  |
  v
React Results UI

Docker Architecture

Windows Host
|
├── Ollama
|   └── Qwen3:0.6B
|
└── Docker Desktop
    ├── Frontend Container :5173
    └── Backend Container  :8000

Ollama runs directly on the Windows host because the local LLM needs access to the host's CPU resources.

The backend Docker container communicates with Ollama through:

host.docker.internal:11434

🔄 Application Workflow

Resume-only Analysis

The user selects a resume PDF in the React frontend.

React validates the selected file.

The frontend sends the PDF as multipart/form-data to POST /resume/upload.

FastAPI receives the uploaded file.

The backend validates the PDF.

PyMuPDF extracts the text from the resume.

The extracted content is prepared for analysis.

The backend sends the content to Qwen3:0.6B through Ollama.

Ollama returns structured JSON.

FastAPI returns the analysis to React.

React displays the score, ATS review, strengths, weaknesses, missing skills, keywords, and suggestions.

Resume + Job Description

Resume PDF + JD text/PDF
          |
          v
    POST /resume/match
          |
          v
 Extract Resume + JD Text
          |
          v
       Ollama
          |
          v
     Qwen3:0.6B
          |
          v
Resume Analysis + Job Match
          |
          v
      React UI

The job description can be provided as either:

Pasted text

PDF upload

📊 Resume Analysis

The application generates an AI-based resume assessment.

Main Output

Result

Description

Resume Score

Overall AI-generated score from 0–100

ATS Compatibility

ATS-oriented compatibility category

Strengths

Strong points identified in the resume

Weaknesses

Areas that could be improved

Missing Skills

Skills that may be missing or insufficiently demonstrated

ATS Keywords

Relevant keywords identified by the model

Suggestions

Practical improvements for the resume

Important Note

The resume score and ATS assessment are AI-generated assessments based on the analysis prompt.

They are not official scores from a commercial ATS platform.

🔌 API

GET /health

Checks whether the backend is running.

Example:

{
  "status": "ok"
}

POST /resume/upload

Performs resume-only analysis.

Form field

file = Resume PDF

Returns

Uploaded filename

Content type

Extracted resume content

Detected sections

AI-generated analysis

POST /resume/match

Compares a resume against a job description.

Form fields

file = Resume PDF
job_description = Optional pasted JD text
job_file = Optional JD PDF

The job description must be supplied either as pasted text or as a PDF.

Returns

Resume score

ATS compatibility

Strengths

Weaknesses

Missing skills

ATS keywords

Suggestions

Job match score

Matching skills

Job-specific missing skills

Job-specific suggestions

🐳 Docker Setup

The project uses separate containers for the frontend and backend.

Docker Desktop
|
├── Frontend
|   └── Port 5173
|
└── Backend
    └── Port 8000

Ollama is intentionally kept outside Docker:

Windows Host
└── Ollama
    └── Qwen3:0.6B

The backend connects to the host Ollama instance through:

host.docker.internal:11434

Docker Compose starts the frontend and backend together.

🚀 Running the Project

Prerequisites

Install:

Python 3.10+

Node.js 20+

npm

Docker Desktop

Ollama

Pull the AI Model

ollama pull qwen3:0.6b

Verify:

ollama list

You should see:

qwen3:0.6b

Start Ollama

Make sure Ollama is running before performing an analysis.

For the current CPU-based setup:

$env:OLLAMA_LLM_LIBRARY="cpu_avx2"
ollama serve

Keep this terminal running.

Start the Application

Open another terminal in the project root:

docker compose up -d --build

Check containers:

docker compose ps

Open the frontend:

http://localhost:5173

Backend health check:

http://127.0.0.1:8000/health

Stop the Application

docker compose down

🧪 Testing

The backend contains automated tests for the main application components.

The test suite covers areas including:

Backend health endpoint

PDF text extraction

Multi-page PDF extraction

Resume upload handling

Job description handling

Resume and JD matching

Response structure

Invalid file types

Empty files

Invalid PDFs

Ollama connection errors

Invalid AI responses

Run tests from the backend directory:

cd backend
python -m pytest -v

⚠️ Error Handling

The application handles common failure cases such as:

Missing resume

Non-PDF uploads

Empty files

Invalid PDFs

Missing job description when matching is requested

Ollama unavailable

Invalid AI responses

Unexpected backend errors

The frontend displays user-friendly messages instead of exposing raw backend errors.

🔒 Data & Privacy

The current application does not use a database to permanently store uploaded resumes.

The resume is processed during the request:

Resume PDF
   |
   v
FastAPI
   |
   v
PyMuPDF
   |
   v
Local Ollama
   |
   v
AI Result

The AI inference is performed locally using Ollama and Qwen3:0.6B.

⚙️ Limitations

The resume score is AI-generated and is not an official ATS score.

Qwen3:0.6B is a lightweight local model and may provide less detailed reasoning than larger models.

CPU inference is slower than GPU inference.

Analysis quality depends on the quality of extracted PDF text.

Scanned/image-only PDFs may not provide usable text without OCR.

AI-generated suggestions may occasionally be imperfect.

There is no integration with commercial ATS platforms.

Job matching is based on the local LLM rather than a deterministic recruitment scoring engine.

## 📸 Screenshots

### Home Page

The main screen allows the user to upload a resume PDF and optionally provide a job description.

![AI-Powered Resume Analyzer - Home Page](frontend/screenshots/homepage.png)

### Resume Analysis

After processing, the application displays the resume score, ATS compatibility, strengths, areas to improve, missing skills, ATS keywords, job matching, and recommended changes.

![AI-Powered Resume Analyzer - Resume Analysis](frontend/screenshots/resume%20analysis1.png)


📁 Project Structure

ai-resume-analyzer/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   └── resume.py
│   │   └── services/
│   │       ├── ollama_service.py
│   │       └── resume_parser.py
│   │
│   ├── tests/
│   │   ├── test_health.py
│   │   ├── test_ollama_service.py
│   │   ├── test_resume_parser.py
│   │   └── test_resume_routes.py
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── docker-compose.yml
├── README.md
└── .gitignore

🧩 Main Components

frontend/src/App.jsx

Handles:

Resume PDF selection

Job description text/PDF input

Frontend validation

API requests

Loading state

Error messages

Theme switching

Analysis result display

backend/app/main.py

Creates the FastAPI application, configures CORS, and registers the application routes.

backend/app/routes/health.py

Provides the backend health endpoint:

GET /health

backend/app/routes/resume.py

Controls the resume processing flow:

Validates uploaded files

Reads PDF data

Extracts resume/JD text

Calls the AI service

Returns structured results

Handles API errors

backend/app/services/resume_parser.py

Handles PDF text extraction and resume text processing.

backend/app/services/ollama_service.py

Handles communication with the locally hosted Ollama API and requests structured JSON analysis from Qwen3:0.6B.

🎯 Future Scope

Possible future improvements include:

Resume section rewriting

Downloadable analysis reports

Multiple resume versions

LinkedIn profile parsing

Job-board integration

Interview question generation

Skill-gap learning recommendations

OCR support for scanned resumes

More advanced ATS parsing

Cloud deployment with optional remote models

📄 License

This project was developed as an academic/final-year project.