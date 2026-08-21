# AI Resume Analyzer

An AI-powered resume analysis application that evaluates resumes, identifies strengths and weaknesses, detects missing skills and ATS keywords, extracts resume sections, and compares a resume against a job description.

The application uses a local Ollama AI model to perform resume analysis and job matching.

---

## Overview

The AI Resume Analyzer helps users understand how effectively their resume presents their skills and experience.

Users can upload a PDF resume and receive an AI-generated analysis containing:

- Resume score
- Strengths
- Weaknesses
- Missing skills
- ATS keywords
- Improvement suggestions
- Detected resume sections
- Extracted resume content

The application also allows users to paste a job description and compare it against their resume to identify matching and missing skills.

---

## Key Features

### Resume Analysis

- Upload resumes in PDF format
- Extract readable text from the uploaded resume
- Clean and process extracted text
- Detect common resume sections
- Analyze the resume using AI
- Generate a resume score from 0–100
- Identify strengths and weaknesses
- Identify missing skills
- Extract relevant ATS keywords
- Generate resume improvement suggestions

### Job Description Matching

Users can provide a job description to compare it with their resume.

The system provides:

- Job match score
- Matching skills
- Missing skills
- Important ATS keywords
- Practical suggestions for improving the resume

### Resume Section Detection

The application detects common sections such as:

- Summary
- Education
- Skills
- Projects
- Experience
- Achievements
- Certifications

### AI-Powered Analysis

The backend uses the local Ollama model:

- **Model:** Qwen3 8B
- **AI Runtime:** Ollama

Using a local model keeps the AI processing independent of external AI APIs.

---

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS

### Backend

- Python
- FastAPI
- Uvicorn
- pypdf
- Requests

### AI

- Ollama
- Qwen3 8B

### Testing

- pytest
- httpx

### Deployment / Development

- Docker
- Docker Compose

---

## Project Structure

```text
ai-resume-analyzer/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   └── resume.py
│   │   │
│   │   └── services/
│   │       ├── ollama_service.py
│   │       └── resume_parser.py
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_health.py
│   │   ├── test_ollama_service.py
│   │   └── test_resume_parser.py
│   │
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml
├── README.md
└── .gitignore