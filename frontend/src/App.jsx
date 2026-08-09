import { useEffect, useState } from "react";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");

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

  return (
    <div>
      <h1>AI Resume Analyzer</h1>
      <p>Frontend is working!</p>
      <p>Backend status: {backendStatus}</p>
    </div>
  );
}

export default App;