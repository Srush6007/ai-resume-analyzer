import { useEffect, useState } from "react";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [sections, setSections] = useState({});
  const [message, setMessage] = useState("");

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
      setMessage("Uploading...");
      setResumeText("");
      setSections({});

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
    } catch (error) {
      setMessage(error.message);
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
        background: "#f5f7fb",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
        color: "#1f2937",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "8px" }}>
          AI Resume Analyzer
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            marginBottom: "30px",
          }}
        >
          Upload your resume and extract important information automatically.
        </p>

        <div
          style={{
            background: "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            marginBottom: "25px",
          }}
        >
          <h2>Upload Resume</h2>

          <p>
            Backend status:{" "}
            <strong>
              {backendStatus}
            </strong>
          </p>

          <input
            type="file"
            accept=".pdf"
            onChange={(event) => setFile(event.target.files[0])}
          />

          <button
            onClick={uploadResume}
            style={{
              marginLeft: "10px",
              padding: "9px 18px",
              border: "none",
              borderRadius: "6px",
              background: "#2563eb",
              color: "white",
              cursor: "pointer",
            }}
          >
            Analyze Resume
          </button>

          <p style={{ marginTop: "15px" }}>{message}</p>
        </div>

        {Object.keys(sections).length > 0 && (
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              marginBottom: "25px",
            }}
          >
            <h2>Resume Analysis</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "15px",
                marginBottom: "25px",
              }}
            >
              {Object.entries(sections).map(([section, content]) => (
                <div
                  key={section}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "15px",
                    textAlign: "center",
                  }}
                >
                  <h3 style={{ margin: "0 0 8px" }}>
                    {sectionNames[section]}
                  </h3>

                  <strong>
                    {content ? "Detected ✓" : "Not detected"}
                  </strong>
                </div>
              ))}
            </div>

            {Object.entries(sections).map(([section, content]) => (
              <div
                key={section}
                style={{
                  marginBottom: "20px",
                  padding: "18px",
                  background: "#f9fafb",
                  borderRadius: "8px",
                }}
              >
                <h3>{sectionNames[section]}</h3>

                <p
                  style={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "break-word",
                    lineHeight: "1.6",
                    margin: 0,
                  }}
                >
                  {content || "No information detected."}
                </p>
              </div>
            ))}
          </div>
        )}

        {resumeText && (
          <details
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              View Extracted Resume Text
            </summary>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
                lineHeight: "1.5",
                marginTop: "20px",
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

export default App;