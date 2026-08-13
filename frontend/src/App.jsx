import { useEffect, useState } from "react";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
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

      setMessage("Resume uploaded successfully!");
      setResumeText(data.text);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div>
      <h1>AI Resume Analyzer</h1>

      <p>Frontend is working!</p>
      <p>Backend status: {backendStatus}</p>

      <hr />

      <h2>Upload Resume</h2>

      <input
        type="file"
        accept=".pdf"
        onChange={(event) => setFile(event.target.files[0])}
      />

      <button onClick={uploadResume}>
        Upload Resume
      </button>

      <p>{message}</p>

      {resumeText && (
        <div>
          <h2>Extracted Resume Text</h2>
          <pre>{resumeText}</pre>
        </div>
      )}
    </div>
  );
}

export default App;