import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

// ============================================================
// SCORE RING
// ============================================================

function ScoreRing({ value, label, tone }) {
  const safeValue = Number.isFinite(Number(value))
    ? Math.max(0, Math.min(100, Number(value)))
    : 0;

  return (
    <div className="score-ring-wrap">
      <div
        className={`score-ring tone-${tone}`}
        style={{
          background: `conic-gradient(var(--ring-color) ${
            safeValue * 3.6
          }deg, var(--ring-track) 0deg)`,
        }}
      >
        <div className="score-ring-inner">
          <span className="score-ring-value">{safeValue}%</span>
        </div>
      </div>

      <span className="score-ring-label">{label}</span>
    </div>
  );
}


// ============================================================
// APP
// ============================================================

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");

  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobFile, setJobFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // File input references so the same file can be selected again
  const resumeInputRef = useRef(null);
  const jobInputRef = useRef(null);


  // ==========================================================
  // BACKEND CHECK
  // ==========================================================

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Backend unavailable");
        }

        setBackendStatus("Connected");
      })
      .catch(() => {
        setBackendStatus("Backend connection failed");
      });
  }, []);


  // ==========================================================
  // RESUME FILE
  // ==========================================================

  const handleResumeChange = (event) => {
    const selectedFile = event.target.files?.[0];

    setError("");

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file for your resume.");

      setResumeFile(null);

      if (resumeInputRef.current) {
        resumeInputRef.current.value = "";
      }

      return;
    }

    setResumeFile(selectedFile);
  };


  // ==========================================================
  // REMOVE RESUME
  // ==========================================================

  const removeResume = () => {
    setResumeFile(null);
    setError("");

    if (resumeInputRef.current) {
      resumeInputRef.current.value = "";
    }
  };


  // ==========================================================
  // JOB DESCRIPTION FILE
  // ==========================================================

  const handleJobFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    setError("");

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Job description must be a PDF file.");

      setJobFile(null);

      if (jobInputRef.current) {
        jobInputRef.current.value = "";
      }

      return;
    }

    // If JD PDF is selected, clear pasted JD text
    setJobDescription("");

    setJobFile(selectedFile);
  };


  // ==========================================================
  // REMOVE JOB DESCRIPTION FILE
  // ==========================================================

  const removeJobFile = () => {
    setJobFile(null);
    setError("");

    if (jobInputRef.current) {
      jobInputRef.current.value = "";
    }
  };


  // ==========================================================
  // JOB DESCRIPTION TEXT
  // ==========================================================

  const handleJobDescriptionChange = (event) => {
    setJobDescription(event.target.value);
    setError("");

    // If user starts typing, remove uploaded JD PDF
    if (jobFile) {
      setJobFile(null);

      if (jobInputRef.current) {
        jobInputRef.current.value = "";
      }
    }
  };


  // ==========================================================
  // ANALYZE
  // ==========================================================

  const handleAnalyze = async () => {
    setError("");

    // ------------------------------------------
    // Validate resume
    // ------------------------------------------

    if (!resumeFile) {
      setError("Please upload your resume PDF first.");
      return;
    }

    // ------------------------------------------
    // Validate JD
    // ------------------------------------------

    if (jobDescription.trim() && jobFile) {
      setError(
        "Please provide the job description either as text OR as a PDF, not both."
      );
      return;
    }

    // ------------------------------------------
    // Backend status
    // ------------------------------------------

    if (backendStatus !== "Connected") {
      setError(
        "The backend is not connected. Please make sure the backend server is running."
      );
      return;
    }

    setLoading(true);

    try {
      let response;

      // ======================================================
      // RESUME + JOB DESCRIPTION
      // ======================================================

      if (jobDescription.trim() || jobFile) {
        const formData = new FormData();

        formData.append("file", resumeFile);

        if (jobDescription.trim()) {
          formData.append(
            "job_description",
            jobDescription.trim()
          );
        }

        if (jobFile) {
          formData.append("job_file", jobFile);
        }

        response = await fetch(
          `${API_URL}/resume/match`,
          {
            method: "POST",
            body: formData,
          }
        );
      }

      // ======================================================
      // RESUME ONLY
      // ======================================================

      else {
        const formData = new FormData();

        formData.append("file", resumeFile);

        response = await fetch(
          `${API_URL}/resume/upload`,
          {
            method: "POST",
            body: formData,
          }
        );
      }

      // ======================================================
      // READ RESPONSE
      // ======================================================

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      // ======================================================
      // HANDLE ERRORS
      // ======================================================

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error(
            "Ollama is unavailable. Please make sure Ollama is running."
          );
        }

        if (response.status === 502) {
          throw new Error(
            "The AI returned an invalid response. Please try again."
          );
        }

        throw new Error(
          data.detail || "Something went wrong while analyzing your resume."
        );
      }

      // ======================================================
      // VALIDATE RESULT
      // ======================================================

      if (!data.ai_analysis) {
        throw new Error(
          "The analysis response was incomplete. Please try again."
        );
      }

      if (jobDescription.trim() || jobFile) {
        if (!data.match_result) {
          throw new Error(
            "The job matching result was incomplete. Please try again."
          );
        }
      }

      // ======================================================
      // SHOW RESULTS
      // ======================================================

      setResults(data);
      setShowResults(true);

      // Scroll to top of results
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error("Analysis error:", err);

      setError(
        err.message ||
          "Could not connect to the backend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };


  // ==========================================================
  // RESET / BACK
  // ==========================================================

  const handleBack = () => {
    setShowResults(false);
    setResults(null);
    setError("");

    // Clear selected files
    setResumeFile(null);
    setJobFile(null);
    setJobDescription("");

    if (resumeInputRef.current) {
      resumeInputRef.current.value = "";
    }

    if (jobInputRef.current) {
      jobInputRef.current.value = "";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  // ==========================================================
  // RESULTS PAGE
  // ==========================================================

  if (showResults && results) {
    const match = results.match_result;
    const analysis = results.ai_analysis;

    const atsValue =
      analysis?.ats_compatibility || "Needs Improvement";

    const atsClass = atsValue
      .toLowerCase()
      .replace(/\s+/g, "-");


    return (
      <div className="app">

        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="header">
          <div className="header-content">

            <div className="logo">
              ▧
            </div>

            <div className="header-title">
              AI-Powered Resume Analyzer
            </div>

          </div>
        </header>


        {/* ====================================================
            MAIN
            ==================================================== */}

        <main className="main">

          <div className="results-page">

            {/* RESULTS HEADING */}

            <div className="results-heading">

              <h1>
                Analysis results
              </h1>

              <p>
                Here's what the AI found in your resume.
              </p>

            </div>


            {/* =================================================
                SCORE OVERVIEW
                ================================================= */}

            <div
              className={`score-overview ${
                match ? "has-match" : "resume-only"
              }`}
            >

              {/* RESUME SCORE */}

              <div className="overview-card overview-resume">

                <div className="overview-card-top">

                  <span className="overview-eyebrow">
                    RESUME
                  </span>

                  <span className="overview-icon">
                    ✦
                  </span>

                </div>

                <div className="overview-main">

                  <div className="overview-score">
                    {analysis?.score ?? 0}
                    <span>%</span>
                  </div>

                  <div className="overview-label">
                    Resume score
                  </div>

                </div>

                <div className="overview-progress">
                  <span
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          Number(analysis?.score) || 0
                        )
                      )}%`,
                    }}
                  />
                </div>

              </div>


              {/* JOB MATCH */}

              {match && (
                <div className="overview-card overview-match">

                  <div className="overview-card-top">

                    <span className="overview-eyebrow">
                      JOB MATCH
                    </span>

                    <span className="overview-icon">
                      ↗
                    </span>

                  </div>

                  <div className="overview-main">

                    <div className="overview-score">
                      {match.match_score ?? 0}
                      <span>%</span>
                    </div>

                    <div className="overview-label">
                      Role match
                    </div>

                  </div>

                  <div className="overview-progress">
                    <span
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            Number(match.match_score) || 0
                          )
                        )}%`,
                      }}
                    />
                  </div>

                </div>
              )}


              {/* ATS */}

              <div className="overview-card overview-ats">

                <div className="overview-card-top">

                  <span className="overview-eyebrow">
                    ATS CHECK
                  </span>

                  <span className="overview-icon">
                    ✓
                  </span>

                </div>

                <div className="overview-main ats-overview-main">

                  <span
                    className={`ats-badge overview-ats-badge ${atsClass}`}
                  >
                    {atsValue}
                  </span>

                  <div className="overview-label">
                    Compatibility
                  </div>

                </div>

              </div>

            </div>


            {/* =================================================
                RESUME FILE CARD
                ================================================= */}

            <div className="results-card resume-card">

              <div className="result-header">

                <div className="result-icon tone-neutral">
                  📄
                </div>

                <div>

                  <h2>
                    Resume
                  </h2>

                  <p className="filename">
                    {results.filename}
                  </p>

                </div>

              </div>

            </div>


            {/* =================================================
                JOB MATCH RESULTS
                ================================================= */}

            {match && (

              <div className="results-card">

                <div className="card-heading">

                  <span className="card-icon tone-blue">
                    ⇄
                  </span>

                  <h2>
                    Resume–job match
                  </h2>

                </div>


                {/* MATCH SCORE */}

                <div className="match-section score-section">

                  <ScoreRing
                    value={match.match_score}
                    label="Match score"
                    tone="blue"
                  />

                </div>


                {/* MATCHING SKILLS */}

                {Array.isArray(match.matching_skills) &&
                  match.matching_skills.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Matching skills
                      </h3>

                      <div className="result-list">

                        {match.matching_skills.map(
                          (skill, index) => (

                            <span
                              className="result-tag matching-tag"
                              key={index}
                            >
                              {skill}
                            </span>

                          )
                        )}

                      </div>

                    </div>
                  )}


                {/* MISSING SKILLS */}

                {Array.isArray(match.missing_skills) &&
                  match.missing_skills.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Missing skills
                      </h3>

                      <div className="result-list">

                        {match.missing_skills.map(
                          (skill, index) => (

                            <span
                              className="result-tag missing-tag"
                              key={index}
                            >
                              {skill}
                            </span>

                          )
                        )}

                      </div>

                    </div>
                  )}


                {/* ATS KEYWORDS */}

                {Array.isArray(match.ats_keywords) &&
                  match.ats_keywords.length > 0 && (

                    <div className="match-section">

                      <h3>
                        ATS keywords
                      </h3>

                      <div className="result-list">

                        {match.ats_keywords.map(
                          (keyword, index) => (

                            <span
                              className="result-tag keyword-tag"
                              key={index}
                            >
                              {keyword}
                            </span>

                          )
                        )}

                      </div>

                    </div>
                  )}


                {/* SUGGESTIONS */}

                {Array.isArray(match.suggestions) &&
                  match.suggestions.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Suggestions for improvement
                      </h3>

                      <div className="suggestion-list">

                        {match.suggestions.map(
                          (suggestion, index) => (

                            <div
                              className="suggestion-item"
                              key={index}
                            >

                              <div className="suggestion-number">
                                {index + 1}
                              </div>

                              <div className="suggestion-text">
                                {suggestion}
                              </div>

                            </div>

                          )
                        )}

                      </div>

                    </div>
                  )}

              </div>
            )}


            {/* =================================================
                AI RESUME ANALYSIS
                ================================================= */}

            {analysis && (

              <div className="results-card">

                <div className="card-heading">

                  <span className="card-icon tone-violet">
                    ✦
                  </span>

                  <h2>
                    AI resume analysis
                  </h2>

                </div>


                {/* RESUME SCORE */}

                <div className="match-section score-section">

                  <ScoreRing
                    value={analysis.score}
                    label="Resume score"
                    tone="violet"
                  />

                </div>


                {/* ATS COMPATIBILITY */}

                <div className="match-section ats-section">

                  <h3>
                    ATS compatibility
                  </h3>

                  <span
                    className={`ats-badge ${atsClass}`}
                  >
                    {atsValue}
                  </span>

                </div>


                {/* STRENGTHS */}

                {Array.isArray(analysis.strengths) &&
                  analysis.strengths.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Strengths
                      </h3>

                      <div className="result-list">

                        {analysis.strengths.map(
                          (item, index) => (

                            <span
                              className="result-tag strength-tag"
                              key={index}
                            >
                              {item}
                            </span>

                          )
                        )}

                      </div>

                    </div>
                  )}


                {/* WEAKNESSES */}

                {Array.isArray(analysis.weaknesses) &&
                  analysis.weaknesses.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Weaknesses
                      </h3>

                      <div className="result-list">

                        {analysis.weaknesses.map(
                          (item, index) => (

                            <span
                              className="result-tag weakness-tag"
                              key={index}
                            >
                              {item}
                            </span>

                          )
                        )}

                      </div>

                    </div>
                  )}


                {/* MISSING SKILLS */}

                {Array.isArray(analysis.missing_skills) &&
                  analysis.missing_skills.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Missing skills
                      </h3>

                      <div className="result-list">

                        {analysis.missing_skills.map(
                          (item, index) => (

                            <span
                              className="result-tag missing-tag"
                              key={index}
                            >
                              {item}
                            </span>

                          )
                        )}

                      </div>

                    </div>
                  )}


                {/* ATS KEYWORDS */}

                {Array.isArray(analysis.ats_keywords) &&
                  analysis.ats_keywords.length > 0 && (

                    <div className="match-section">

                      <h3>
                        ATS keywords
                      </h3>

                      <div className="result-list">

                        {analysis.ats_keywords.map(
                          (item, index) => (

                            <span
                              className="result-tag keyword-tag"
                              key={index}
                            >
                              {item}
                            </span>

                          )
                        )}

                      </div>

                    </div>
                  )}


                {/* SUGGESTIONS */}

                {Array.isArray(analysis.suggestions) &&
                  analysis.suggestions.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Suggestions for improvement
                      </h3>

                      <div className="suggestion-list">

                        {analysis.suggestions.map(
                          (suggestion, index) => (

                            <div
                              className="suggestion-item"
                              key={index}
                            >

                              <div className="suggestion-number">
                                {index + 1}
                              </div>

                              <div className="suggestion-text">
                                {suggestion}
                              </div>

                            </div>

                          )
                        )}

                      </div>

                    </div>
                  )}

              </div>
            )}


            {/* =================================================
                BACK BUTTON
                ================================================= */}

            <button
              className="back-button"
              onClick={handleBack}
            >
              ← Analyze another resume
            </button>

          </div>

        </main>

      </div>
    );
  }


  // ============================================================
  // UPLOAD PAGE
  // ============================================================

  return (
    <div className="app">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="header">

        <div className="header-content">

          <div className="logo">
            ▧
          </div>

          <div className="header-title">
            AI-Powered Resume Analyzer
          </div>

        </div>

      </header>


      {/* ======================================================
          MAIN
          ====================================================== */}

      <main className="main">

        {/* HERO */}

        <section className="hero">

          <div className="hero-badge">

            <span className="hero-badge-dot" />

            AI resume intelligence

          </div>

          <h1>
            Know exactly what to fix
            <br />
            before a recruiter sees it
          </h1>

          <p>
            Upload your resume for an instant score, ATS check,
            and — if you add a job description — a match report.
          </p>

        </section>


        {/* ====================================================
            ANALYZER CARD
            ==================================================== */}

        <section className="analyzer-card">

          {/* ==================================================
              RESUME
              ================================================== */}

          <div className="section">

            <div className="section-icon">
              ▧
            </div>

            <h2 className="section-title">
              Upload resume
            </h2>

            <p className="section-subtitle">
              PDF format only.
            </p>


            <div className="upload-box">

              <div className="upload-icon">
                ↑
              </div>

              <div className="upload-title">
                Choose your resume
              </div>

              <div className="upload-hint">
                PDF files only, up to a few MB
              </div>

              <input
                ref={resumeInputRef}
                className="file-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleResumeChange}
              />


              {/* SELECTED RESUME */}

              {resumeFile && (

                <div className="selected-file">

                  <span className="selected-file-check">
                    ✓
                  </span>

                  <span className="selected-file-name">
                    {resumeFile.name}
                  </span>

                  <button
                    type="button"
                    className="remove-file-button"
                    onClick={removeResume}
                  >
                    Remove
                  </button>

                </div>

              )}

            </div>

          </div>


          {/* ==================================================
              DIVIDER
              ================================================== */}

          <div className="divider">

            <span>
              Optional
            </span>

          </div>


          {/* ==================================================
              JOB DESCRIPTION
              ================================================== */}

          <section className="jd-section">

            <h2 className="jd-title">

              Job description

              <span className="jd-optional">
                Optional
              </span>

            </h2>

            <p className="jd-description">
              Add the role you're applying for to see how well
              your resume matches it.
            </p>


            {/* JD TEXT */}

            <textarea
              className="jd-textarea"
              placeholder="Paste the job description here…"
              value={jobDescription}
              onChange={handleJobDescriptionChange}
            />


            {/* OR */}

            <div className="divider">

              <span>
                Or
              </span>

            </div>


            {/* JD PDF */}

            <div className="jd-file-box">

              <div className="jd-file-info">

                <div className="jd-file-icon">
                  📄
                </div>

                <div>

                  <div className="jd-file-title">
                    Upload job description
                  </div>

                  <div className="jd-file-hint">
                    PDF file
                  </div>

                </div>

              </div>

              <input
                ref={jobInputRef}
                className="file-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleJobFileChange}
              />

            </div>


            {/* SELECTED JD */}

            {jobFile && (

              <div className="selected-jd-file">

                <span className="selected-file-check">
                  ✓
                </span>

                <span className="selected-file-name">
                  {jobFile.name}
                </span>

                <button
                  type="button"
                  className="remove-file-button"
                  onClick={removeJobFile}
                >
                  Remove
                </button>

              </div>

            )}

          </section>


          {/* ==================================================
              ANALYZE BUTTON
              ================================================== */}

          <button
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={loading}
          >

            {loading ? (
              <>
                <span className="button-spinner" />
                Analyzing…
              </>
            ) : (
              "✦ Analyze resume"
            )}

          </button>


          {/* ==================================================
              BACKEND STATUS
              ================================================== */}

          <div
            className={
              backendStatus === "Connected"
                ? "backend-status connected"
                : backendStatus === "Checking..."
                ? "backend-status"
                : "backend-status error"
            }
          >

            <span className="status-dot" />

            Backend status: {backendStatus}

          </div>


          {/* ==================================================
              ERROR
              ================================================== */}

          {error && (

            <div className="error-message">

              <span className="error-icon">
                !
              </span>

              <span>
                {error}
              </span>

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default App;