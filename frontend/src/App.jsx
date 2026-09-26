import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

const isPdf = (file) =>
  file &&
  (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

const list = (value) =>
  Array.isArray(value) ? value.filter((x) => x !== null && x !== undefined && x !== "") : [];

const score = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
};

function Icon({ type }) {
  const p = {
    file: <><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v6h5M9 13h6M9 17h4"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>,
    sparkle: <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/>
  };
  return <svg className="icon" viewBox="0 0 24 24">{p[type]}</svg>;
}

function Header({ dark, setDark }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-mark"><Icon type="file" /></div>
          <div>
            <b>AI-Powered Resume Analyzer</b>
            <span>AI resume review & job matching</span>
          </div>
        </div>
        <button className="theme" onClick={() => setDark(!dark)} aria-label="Toggle theme">
          <Icon type={dark ? "sun" : "moon"} />
        </button>
      </div>
    </header>
  );
}

function Picker({ file, setFile, title, subtitle, large = false }) {
  const [drag, setDrag] = useState(false);

  const choose = (f) => {
    if (!f) return;
    setFile(f);
  };

  return (
    <div
      className={`picker ${large ? "picker-large" : ""} ${drag ? "drag" : ""} ${file ? "selected" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        choose(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        id={large ? "resume-file" : "jd-file"}
        type="file"
        accept=".pdf,application/pdf"
        hidden
        onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }}
      />
      {file ? (
        <div className="chosen">
          <div className="file-icon"><Icon type="file" /></div>
          <div className="chosen-info">
            <b>{file.name}</b>
            <span>{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</span>
          </div>
          <label htmlFor={large ? "resume-file" : "jd-file"} className="small-btn">Replace</label>
          <button className="remove" onClick={() => setFile(null)}>Remove</button>
        </div>
      ) : large ? (
        <label htmlFor="resume-file" className="drop-content">
          <div className="upload-circle"><Icon type="upload" /></div>
          <b>{title}</b>
          <span>{subtitle}</span>
          <small>Drag & drop here, or browse your files</small>
        </label>
      ) : (
        <div className="compact">
          <div className="file-icon"><Icon type="file" /></div>
          <div><b>{title}</b><span>{subtitle}</span></div>
          <label htmlFor="jd-file" className="small-btn">Choose PDF</label>
        </div>
      )}
    </div>
  );
}

function Bar({ value }) {
  return <div className="bar"><span style={{ width: `${value ?? 0}%` }} /></div>;
}

function Results({ data, reset }) {
  const a = data.ai_analysis || {};
  const m = data.match_result || {};
  const overall = score(a.score);
  const ats = score(a.ats_score ?? a.ats_compatibility_score);
  const match = score(m.match_score);
  const atsLabel = typeof a.ats_compatibility === "string" ? a.ats_compatibility : "Not available";

  const strengths = list(a.strengths);
  const weaknesses = list(a.weaknesses);
  const missing = list(a.missing_skills);
  const keywords = list(a.ats_keywords);
  const suggestions = list(a.suggestions);
  const matching = list(m.matching_skills);
  const jobMissing = list(m.missing_skills);
  const jobSuggestions = list(m.suggestions);

  const atsFeedback = a.ats_feedback || a.ats_summary || a.ats_explanation || "";
  const matchFeedback = m.summary || m.feedback || m.explanation || m.match_summary || "";
  const hasMatch = Boolean(data.match_result) || match !== null || matching.length || jobMissing.length;
  const allSuggestions = [...suggestions, ...jobSuggestions].filter((x, i, arr) => arr.indexOf(x) === i);

  return (
    <div className="results">
      <button className="back" onClick={reset}>← Analyze another resume</button>

      <div className="results-title">
        <span className="eyebrow">ANALYSIS COMPLETE</span>
        <h1>Resume analysis</h1>
        <p>Here is the AI-generated review of your resume.</p>
        {data.filename && <span className="filename"><Icon type="file" /> {data.filename}</span>}
      </div>

      <section className="results-panel">
        <div className="panel-head">
          <div><small>01</small><h2>AI assessment</h2></div>
          <span>Qwen3 · Ollama</span>
        </div>

        <div className="scores">
          <article className="score-card main-score">
            <div className="score-top">
              <div><small>Overall resume score</small><strong>{overall ?? "—"}/100</strong><em>{overall >= 80 ? "Strong profile" : overall >= 65 ? "Good foundation" : "Needs improvement"}</em></div>
              <div className="ring"><b>{overall ?? "—"}</b><small>/100</small></div>
            </div>
            <Bar value={overall} />
          </article>

          <article className="score-card">
            <small>ATS compatibility</small>
            <strong>{ats !== null ? `${ats}/100` : atsLabel}</strong>
            <em>{atsLabel}</em>
            {ats !== null && <Bar value={ats} />}
          </article>

          {hasMatch && (
            <article className="score-card">
              <small>Job match</small>
              <strong>{match !== null ? `${match}/100` : "—"}</strong>
              <em>{match >= 70 ? "Good role alignment" : "Review skill gaps"}</em>
              {match !== null && <Bar value={match} />}
            </article>
          )}
        </div>

        {atsFeedback && (
          <section className="result-card feedback">
            <div className="card-title"><span>A</span><div><h3>ATS feedback</h3><p>How the resume performs against ATS-oriented criteria.</p></div></div>
            <p>{atsFeedback}</p>
          </section>
        )}

        <div className="two-cards">
          {strengths.length > 0 && (
            <section className="result-card strengths">
              <h3><i>✓</i> Strengths</h3>
              <ul>{strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          )}
          {weaknesses.length > 0 && (
            <section className="result-card weaknesses">
              <h3><i>!</i> Areas to improve</h3>
              <ul>{weaknesses.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          )}
        </div>

        {missing.length > 0 && (
          <section className="result-card">
            <div className="card-title"><span>+</span><div><h3>Missing skills</h3><p>Skills that may need stronger evidence or inclusion.</p></div></div>
            <div className="chips">{missing.map((x, i) => <span key={i}>{x}</span>)}</div>
          </section>
        )}

        {keywords.length > 0 && (
          <section className="result-card">
            <div className="card-title"><span>#</span><div><h3>ATS keywords</h3><p>Relevant keywords identified by the analysis.</p></div></div>
            <div className="chips blue">{keywords.map((x, i) => <span key={i}>{x}</span>)}</div>
          </section>
        )}

        {hasMatch && (
          <section className="result-card match-card">
            <div className="card-title"><span>02</span><div><h3>Job description match</h3><p>How your resume aligns with the role you selected.</p></div></div>
            {matchFeedback && <p className="copy">{matchFeedback}</p>}
            {matching.length > 0 && <div className="match-block"><h4>Matching skills</h4><div className="chips">{matching.map((x, i) => <span key={i}>{x}</span>)}</div></div>}
            {jobMissing.length > 0 && <div className="match-block"><h4>Missing job skills</h4><div className="chips red">{jobMissing.map((x, i) => <span key={i}>{x}</span>)}</div></div>}
          </section>
        )}

        {allSuggestions.length > 0 && (
          <section className="result-card">
            <div className="card-title"><span>03</span><div><h3>Recommended changes</h3><p>Practical actions to improve the resume.</p></div></div>
            <div className="actions">
              {allSuggestions.map((x, i) => <div key={i}><b>{String(i + 1).padStart(2, "0")}</b><p>{x}</p></div>)}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [resume, setResume] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [jd, setJd] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const setPdf = (setter) => (file) => {
    setError("");
    if (file && !isPdf(file)) {
      setError("Please select a PDF file.");
      return;
    }
    setter(file);
  };

  const analyze = async () => {
    setError("");
    if (!resume) {
      setError("Please upload your resume PDF first.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", resume);

      const hasJD = jd.trim() || jdFile;
      const endpoint = hasJD ? "/resume/match" : "/resume/upload";

      if (jd.trim()) form.append("job_description", jd.trim());
      if (jdFile) form.append("job_file", jdFile);

      let response;
      try {
        response = await fetch(`${API_URL}${endpoint}`, { method: "POST", body: form });
      } catch {
        throw new Error("Cannot connect to the backend. Make sure Docker is running.");
      }

      let data;
      try { data = await response.json(); }
      catch { throw new Error("The backend returned an invalid response."); }

      if (!response.ok) {
        if (response.status === 503) throw new Error("Ollama is unavailable. Please make sure Ollama is running.");
        if (response.status === 502) throw new Error("The AI returned an invalid response. Please try again.");
        throw new Error(typeof data?.detail === "string" ? data.detail : "Analysis failed. Please try again.");
      }

      if (!data.ai_analysis) throw new Error("The analysis response was incomplete.");
      if (hasJD && !data.match_result) throw new Error("The job matching response was incomplete.");

      setResults({ ...data, filename: resume.name });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResults(null);
    setResume(null);
    setJdFile(null);
    setJd("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app">
      <Header dark={dark} setDark={setDark} />
      <main className="page">
        {results ? <Results data={results} reset={reset} /> : (
          <>
            <section className="hero">
              <span className="eyebrow">SMART RESUME REVIEW</span>
              <h1>Make your resume<br /><span>work smarter.</span></h1>
              <p>Upload your resume and get an AI-powered score, ATS review, skill gaps, and useful improvements.</p>
            </section>

            <section className="analyzer">
              <div className="analyzer-head">
                <div><small>01 / RESUME</small><h2>Upload your resume</h2><p>We'll turn your PDF into an actionable review.</p></div>
                <b>Required</b>
              </div>

              <Picker file={resume} setFile={setPdf(setResume)} title="Choose your resume" subtitle="PDF files only" large />

              <div className="divider"><span>OPTIONAL</span></div>

              <div className="analyzer-head">
                <div><small>02 / JOB</small><h2>Job description</h2><p>Add a role to see how closely your resume matches it.</p></div>
                <b className="optional">Optional</b>
              </div>

              <textarea value={jd} onChange={(e) => { setJd(e.target.value); setError(""); }} placeholder="Paste the job description here..." />

              <div className="or"><span>OR</span></div>

              <Picker file={jdFile} setFile={setPdf(setJdFile)} title="Upload job description" subtitle="PDF file" />

              {error && <div className="error">{error}</div>}

              <div className="analyze">
                <button onClick={analyze} disabled={loading}>
                  <Icon type="sparkle" /> {loading ? "Analyzing resume..." : "Analyze Resume"}
                </button>
                <p>{jd.trim() || jdFile ? "Score, ATS review and job matching will be generated." : "You'll receive a score and ATS review."}</p>
              </div>
            </section>

            <p className="local-note">● Resume analysis runs through your local AI setup.</p>
          </>
        )}
      </main>
    </div>
  );
}
