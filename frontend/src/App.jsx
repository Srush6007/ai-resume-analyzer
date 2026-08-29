import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");

  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobFile, setJobFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // ---------------- BACKEND CHECK ----------------

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error();
        }

        setBackendStatus("Connected");
      })
      .catch(() => {
        setBackendStatus("Backend connection failed");
      });
  }, []);

  // ---------------- RESUME FILE ----------------

  const handleResumeChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      setResumeFile(null);
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setError("Please select a PDF file for your resume.");
      setResumeFile(null);
      return;
    }

    setError("");
    setResumeFile(selectedFile);
  };

  // ---------------- JD FILE ----------------

  const handleJobFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      setJobFile(null);
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setError("Job description must be a PDF file.");
      setJobFile(null);
      return;
    }

    setError("");
    setJobFile(selectedFile);
  };

  // ---------------- ANALYZE ----------------

  const handleAnalyze = async () => {
    setError("");

    if (!resumeFile) {
      setError("Please upload your resume PDF first.");
      return;
    }

    if (jobDescription.trim() && jobFile) {
      setError(
        "Please provide the job description either as text OR as a PDF, not both."
      );
      return;
    }

    setLoading(true);

    try {
      let response;

      // -------- RESUME + JD MATCH --------

      if (jobDescription.trim() || jobFile) {
        const formData = new FormData();

        formData.append("file", resumeFile);

        if (jobDescription.trim()) {
          formData.append("job_description", jobDescription);
        }

        if (jobFile) {
          formData.append("job_file", jobFile);
        }

        response = await fetch(`${API_URL}/resume/match`, {
          method: "POST",
          body: formData,
        });
      }

      // -------- NORMAL RESUME ANALYSIS --------

      else {
        const formData = new FormData();

        formData.append("file", resumeFile);

        response = await fetch(`${API_URL}/resume/upload`, {
          method: "POST",
          body: formData,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Something went wrong.");
      }

      setResults(data);
      setShowResults(true);
    } catch (err) {
      setError(
        err.message || "Could not connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------- BACK ----------------

  const handleBack = () => {
    setShowResults(false);
    setResults(null);
    setError("");
  };

  // =========================================================
  // RESULTS PAGE
  // =========================================================

  if (showResults && results) {
    const match = results.match_result;

    return (
      <div className="app">

        {/* HEADER */}

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


        {/* MAIN */}

        <main className="main">

          <div className="results-page">

            {/* RESULTS HEADING */}

            <div className="results-heading">

              <h1>
                Analysis Results
              </h1>

              <p>
                Here is the AI-powered analysis of your resume.
              </p>

            </div>


            {/* RESUME CARD */}

            <div className="results-card">

              <div className="result-header">

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

                <h2>
                  Resume–Job Match
                </h2>


                {/* MATCH SCORE */}

                <div className="match-section score-section">

                  <span className="score-label">
                    Match Score
                  </span>

                  <div className="score-value">
                    {match.match_score}%
                  </div>

                  <div className="score-bar">

                    <div
                      className="score-fill"
                      style={{
                        width: `${match.match_score}%`,
                      }}
                    />

                  </div>

                </div>


                {/* MATCHING SKILLS */}

                {Array.isArray(match.matching_skills) &&
                  match.matching_skills.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Matching Skills
                      </h3>

                      <div className="result-list">

                        {match.matching_skills.map(
                          (skill, index) => (

                            <span
                              className="result-tag"
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
                        Missing Skills
                      </h3>

                      <div className="result-list">

                        {match.missing_skills.map(
                          (skill, index) => (

                            <span
                              className="result-tag"
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
                        ATS Keywords
                      </h3>

                      <div className="result-list">

                        {match.ats_keywords.map(
                          (keyword, index) => (

                            <span
                              className="result-tag"
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
                        Suggestions for Improvement
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
                NORMAL AI RESUME ANALYSIS
               ================================================= */}

            {results.ai_analysis && !match && (

              <div className="results-card">

                <h2>
                  AI Resume Analysis
                </h2>

                <div className="match-section">

                  <h3>
                    Score
                  </h3>

                  <div className="score-value">
                    {results.ai_analysis.score}%
                  </div>

                </div>


                <div className="match-section">

                  <h3>
                    ATS Compatibility
                  </h3>

                  <p className="suggestion-text">
                    {results.ai_analysis.ats_compatibility}
                  </p>

                </div>


                {Array.isArray(results.ai_analysis.strengths) &&
                  results.ai_analysis.strengths.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Strengths
                      </h3>

                      <div className="result-list">

                        {results.ai_analysis.strengths.map(
                          (item, index) => (

                            <span
                              className="result-tag"
                              key={index}
                            >
                              {item}
                            </span>

                          )
                        )}

                      </div>

                    </div>
                  )}


                {Array.isArray(results.ai_analysis.weaknesses) &&
                  results.ai_analysis.weaknesses.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Weaknesses
                      </h3>

                      <div className="result-list">

                        {results.ai_analysis.weaknesses.map(
                          (item, index) => (

                            <span
                              className="result-tag"
                              key={index}
                            >
                              {item}
                            </span>

                          )
                        )}

                      </div>

                    </div>
                  )}


                {Array.isArray(results.ai_analysis.missing_skills) &&
                  results.ai_analysis.missing_skills.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Missing Skills
                      </h3>

                      <div className="result-list">

                        {results.ai_analysis.missing_skills.map(
                          (item, index) => (

                            <span
                              className="result-tag"
                              key={index}
                            >
                              {item}
                            </span>

                          )
                        )}

                      </div>

                    </div>
                  )}


                {Array.isArray(results.ai_analysis.ats_keywords) &&
                  results.ai_analysis.ats_keywords.length > 0 && (

                    <div className="match-section">

                      <h3>
                        ATS Keywords
                      </h3>

                      <div className="result-list">

                        {results.ai_analysis.ats_keywords.map(
                          (item, index) => (

                            <span
                              className="result-tag"
                              key={index}
                            >
                              {item}
                            </span>

                          )
                        )}

                      </div>

                    </div>
                  )}


                {Array.isArray(results.ai_analysis.suggestions) &&
                  results.ai_analysis.suggestions.length > 0 && (

                    <div className="match-section">

                      <h3>
                        Suggestions for Improvement
                      </h3>

                      <div className="suggestion-list">

                        {results.ai_analysis.suggestions.map(
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


            {/* BACK BUTTON */}

            <button
              className="back-button"
              onClick={handleBack}
            >
              ← Analyze Another Resume
            </button>

          </div>

        </main>

      </div>
    );
  }


  // =========================================================
  // UPLOAD PAGE
  // =========================================================

  return (
    <div className="app">

      {/* HEADER */}

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


      {/* MAIN */}

      <main className="main">

        {/* HERO */}

        <section className="hero">

          <h1>
            AI-Powered Resume Analyzer
          </h1>

          <p>
            Analyze your resume and get useful feedback using AI.
          </p>

        </section>


        {/* ANALYZER CARD */}

        <section className="analyzer-card">


          {/* RESUME */}

          <div className="section">

            <h2 className="section-title">
              ▧ Upload Resume
            </h2>

            <p className="section-subtitle">
              Upload your resume in PDF format.
            </p>


            <div className="upload-box">

              <div className="upload-icon">
                ↑
              </div>

              <div className="upload-title">
                Choose your resume
              </div>

              <div className="upload-hint">
                PDF files only
              </div>

              <input
                className="file-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleResumeChange}
              />


              {resumeFile && (

                <div className="selected-file">
                  ✓ {resumeFile.name}
                </div>

              )}

            </div>

          </div>


          {/* DIVIDER */}

          <div className="divider">
            <span>
              Optional
            </span>
          </div>


          {/* JOB DESCRIPTION */}

          <section className="jd-section">

            <h2 className="jd-title">
              ▣ Job Description{" "}
              <span className="jd-optional">
                (Optional)
              </span>
            </h2>


            <p className="jd-description">
              Add a job description to see how well your resume matches the role.
            </p>


            <textarea
              className="jd-textarea"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(event) =>
                setJobDescription(event.target.value)
              }
            />


            {/* OR */}

            <div className="divider">
              <span>
                OR
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
                    Upload Job Description
                  </div>

                  <div className="jd-file-hint">
                    PDF file
                  </div>

                </div>

              </div>


              <input
                className="file-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleJobFileChange}
              />

            </div>


            {jobFile && (

              <div className="selected-jd-file">
                ✓ {jobFile.name}
              </div>

            )}

          </section>


          {/* ANALYZE BUTTON */}

          <button
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading
              ? "Analyzing..."
              : "✦ Analyze Resume"}
          </button>


          {/* BACKEND STATUS */}

          <div
            className={
              backendStatus === "Connected"
                ? "backend-status connected"
                : "backend-status"
            }
          >
            Backend status: {backendStatus}
          </div>


          {/* ERROR */}

          {error && (

            <div className="error-message">
              {error}
            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default App;