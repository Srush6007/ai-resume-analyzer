import { useEffect, useState } from "react";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");

  // Resume Analyzer
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [sections, setSections] = useState({});
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [message, setMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  // Job Matching
  const [jobDescription, setJobDescription] = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const [matching, setMatching] = useState(false);
  const [matchMessage, setMatchMessage] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/health")
      .then((response) => response.json())
      .then((data) => {
        setBackendStatus(data.status);
      })
      .catch(() => {
        setBackendStatus("Backend connection failed");
      });
  }, []);

  const uploadResume = async () => {
    if (!file) {
      setMessage("Please select a PDF first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setAnalyzing(true);
      setMessage("Analyzing resume...");
      setResumeText("");
      setSections({});
      setAiAnalysis(null);

      const response = await fetch(
        "http://127.0.0.1:8000/resume/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setMessage("Resume analyzed successfully!");
      setResumeText(data.text);
      setSections(data.sections);
      setAiAnalysis(data.ai_analysis);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const matchResume = async () => {
    if (!file) {
      setMatchMessage("Please select your resume PDF first.");
      return;
    }

    if (!jobDescription.trim()) {
      setMatchMessage("Please enter a job description.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_description", jobDescription);

    try {
      setMatching(true);
      setMatchMessage("Matching resume with job description...");
      setMatchResult(null);

      const response = await fetch(
        "http://127.0.0.1:8000/resume/match",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Job matching failed");
      }

      setMatchResult(data.match_result);
      setMatchMessage("Resume matched successfully!");
    } catch (error) {
      setMatchMessage(error.message);
    } finally {
      setMatching(false);
    }
  };

  const sectionNames = {
    summary: "Summary",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    achievements: "Achievements",
    certifications: "Certifications",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1120",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
        color: "#f8fafc",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >

        {/* HEADER */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "35px",
          }}
        >
          <h1
            style={{
              fontSize: "36px",
              marginBottom: "10px",
              color: "#f8fafc",
            }}
          >
            AI Resume Analyzer
          </h1>

          <p
            style={{
              color: "#94a3b8",
              fontSize: "16px",
            }}
          >
            Analyze your resume and check how well it matches a job.
          </p>
        </div>

        {/* RESUME UPLOAD */}
        <div
          style={{
            background: "#111827",
            padding: "28px",
            borderRadius: "14px",
            border: "1px solid #1e293b",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            marginBottom: "25px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#f8fafc",
            }}
          >
            Upload Resume
          </h2>

          <p style={{ color: "#cbd5e1" }}>
            Backend status:{" "}
            <strong
              style={{
                color:
                  backendStatus === "ok"
                    ? "#4ade80"
                    : "#facc15",
              }}
            >
              {backendStatus}
            </strong>
          </p>

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={(event) => {
                setFile(event.target.files[0]);
                setMatchResult(null);
              }}
              style={{
                color: "#cbd5e1",
                background: "#0f172a",
                padding: "10px",
                borderRadius: "7px",
                border: "1px solid #334155",
              }}
            />

            <button
              onClick={uploadResume}
              disabled={analyzing}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: "7px",
                background: analyzing
                  ? "#475569"
                  : "#2563eb",
                color: "white",
                cursor: analyzing
                  ? "not-allowed"
                  : "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              {analyzing
                ? "Analyzing..."
                : "Analyze Resume"}
            </button>
          </div>

          {message && (
            <p
              style={{
                marginTop: "18px",
                color: message.includes("successfully")
                  ? "#4ade80"
                  : "#facc15",
              }}
            >
              {message}
            </p>
          )}
        </div>

        {/* AI ANALYSIS */}
        {aiAnalysis && (
          <div
            style={{
              background: "#111827",
              padding: "28px",
              borderRadius: "14px",
              border: "1px solid #1e293b",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              marginBottom: "25px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              AI Resume Analysis
            </h2>

            {/* SCORE */}
            <div
              style={{
                textAlign: "center",
                padding: "25px",
                background: "#0f172a",
                borderRadius: "12px",
                marginBottom: "20px",
              }}
            >
              <p
                style={{
                  color: "#94a3b8",
                  marginBottom: "5px",
                }}
              >
                Resume Score
              </p>

              <div
                style={{
                  fontSize: "48px",
                  fontWeight: "bold",
                  color: "#4ade80",
                }}
              >
                {aiAnalysis.score}/100
              </div>
            </div>

            {/* ANALYSIS CARDS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "18px",
              }}
            >
              <AnalysisCard
                title="Strengths"
                items={aiAnalysis.strengths}
              />

              <AnalysisCard
                title="Weaknesses"
                items={aiAnalysis.weaknesses}
              />

              <AnalysisCard
                title="Missing Skills"
                items={aiAnalysis.missing_skills}
              />

              <AnalysisCard
                title="ATS Keywords"
                items={aiAnalysis.ats_keywords}
              />

              <AnalysisCard
                title="Suggestions"
                items={aiAnalysis.suggestions}
              />
            </div>
          </div>
        )}

        {/* JOB DESCRIPTION MATCHING */}
        <div
          style={{
            background: "#111827",
            padding: "28px",
            borderRadius: "14px",
            border: "1px solid #1e293b",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            marginBottom: "25px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#f8fafc",
            }}
          >
            Job Description Matching
          </h2>

          <p
            style={{
              color: "#94a3b8",
              lineHeight: "1.6",
            }}
          >
            Paste a job description below to see how well your
            resume matches the job requirements.
          </p>

          <textarea
            value={jobDescription}
            onChange={(event) =>
              setJobDescription(event.target.value)
            }
            placeholder="Paste the job description here..."
            rows={10}
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: "15px",
              padding: "15px",
              background: "#0f172a",
              color: "#e2e8f0",
              border: "1px solid #334155",
              borderRadius: "8px",
              resize: "vertical",
              fontSize: "14px",
              lineHeight: "1.6",
              fontFamily: "Arial, sans-serif",
            }}
          />

          <button
            onClick={matchResume}
            disabled={matching}
            style={{
              marginTop: "15px",
              padding: "12px 24px",
              border: "none",
              borderRadius: "7px",
              background: matching
                ? "#475569"
                : "#7c3aed",
              color: "white",
              cursor: matching
                ? "not-allowed"
                : "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {matching
              ? "Matching..."
              : "Match Resume With Job"}
          </button>

          {matchMessage && (
            <p
              style={{
                marginTop: "15px",
                color: matchMessage.includes("successfully")
                  ? "#4ade80"
                  : "#facc15",
              }}
            >
              {matchMessage}
            </p>
          )}
        </div>

        {/* MATCH RESULTS */}
        {matchResult && (
          <div
            style={{
              background: "#111827",
              padding: "28px",
              borderRadius: "14px",
              border: "1px solid #1e293b",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              marginBottom: "25px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              Job Match Results
            </h2>

            {/* MATCH SCORE */}
            <div
              style={{
                textAlign: "center",
                padding: "25px",
                background: "#0f172a",
                borderRadius: "12px",
                marginBottom: "20px",
              }}
            >
              <p
                style={{
                  color: "#94a3b8",
                  marginBottom: "5px",
                }}
              >
                Resume–Job Match
              </p>

              <div
                style={{
                  fontSize: "48px",
                  fontWeight: "bold",
                  color: "#a78bfa",
                }}
              >
                {matchResult.match_score}%
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "18px",
              }}
            >
              <AnalysisCard
                title="Matching Skills"
                items={matchResult.matching_skills}
              />

              <AnalysisCard
                title="Missing Skills"
                items={matchResult.missing_skills}
              />

              <AnalysisCard
                title="ATS Keywords"
                items={matchResult.ats_keywords}
              />

              <AnalysisCard
                title="Suggestions"
                items={matchResult.suggestions}
              />
            </div>
          </div>
        )}

        {/* RESUME SECTIONS */}
        {Object.keys(sections).length > 0 && (
          <div
            style={{
              background: "#111827",
              padding: "28px",
              borderRadius: "14px",
              border: "1px solid #1e293b",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              marginBottom: "25px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#f8fafc",
              }}
            >
              Resume Sections
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "15px",
                marginBottom: "28px",
              }}
            >
              {Object.entries(sections).map(
                ([section, content]) => (
                  <div
                    key={section}
                    style={{
                      border: "1px solid #334155",
                      borderRadius: "10px",
                      padding: "16px",
                      textAlign: "center",
                      background: "#0f172a",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 8px",
                        color: "#e2e8f0",
                        fontSize: "16px",
                      }}
                    >
                      {sectionNames[section] || section}
                    </h3>

                    <strong
                      style={{
                        color: content
                          ? "#4ade80"
                          : "#f87171",
                        fontSize: "14px",
                      }}
                    >
                      {content
                        ? "Detected ✓"
                        : "Not detected"}
                    </strong>
                  </div>
                )
              )}
            </div>

            {Object.entries(sections).map(
              ([section, content]) => (
                <div
                  key={section}
                  style={{
                    marginBottom: "20px",
                    padding: "20px",
                    background: "#0f172a",
                    borderRadius: "10px",
                    border: "1px solid #1e293b",
                  }}
                >
                  <h3
                    style={{
                      color: "#60a5fa",
                      marginTop: 0,
                    }}
                  >
                    {sectionNames[section] || section}
                  </h3>

                  <p
                    style={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "break-word",
                      lineHeight: "1.7",
                      margin: 0,
                      color: "#cbd5e1",
                    }}
                  >
                    {content || "No information detected."}
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* EXTRACTED TEXT */}
        {resumeText && (
          <details
            style={{
              background: "#111827",
              padding: "22px",
              borderRadius: "14px",
              border: "1px solid #1e293b",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                color: "#e2e8f0",
              }}
            >
              View Extracted Resume Text
            </summary>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
                lineHeight: "1.6",
                marginTop: "20px",
                color: "#94a3b8",
                background: "#0f172a",
                padding: "18px",
                borderRadius: "8px",
                border: "1px solid #1e293b",
              }}
            >
              {resumeText}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}


function AnalysisCard({ title, items }) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "10px",
        padding: "18px",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          color: "#60a5fa",
        }}
      >
        {title}
      </h3>

      {Array.isArray(items) && items.length > 0 ? (
        <ul
          style={{
            margin: 0,
            paddingLeft: "20px",
            color: "#cbd5e1",
            lineHeight: "1.7",
          }}
        >
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#94a3b8" }}>
          None identified.
        </p>
      )}
    </div>
  );
}


export default App;