import { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";

const DISPLAY = { fontFamily: "'Bebas Neue', sans-serif" };
const BODY    = { fontFamily: "'Outfit', sans-serif" };

const API = "http://127.0.0.1:5000";

const C = {
  bg:          "#ffffff",
  bgSurface:   "#f7f7f7",
  border:      "rgba(0,0,0,0.08)",
  borderMid:   "rgba(0,0,0,0.12)",
  accent:      "#e53935",
  accentLight: "rgba(229,57,53,0.07)",
  accentBorder:"rgba(229,57,53,0.2)",
  textPrimary: "#0a0a0f",
  textSub:     "#555555",
  textMuted:   "#888888",
  textFaint:   "#aaaaaa",
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show  : { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22,1,0.36,1] } },
  exit  : { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

// ── Mobile hook ───────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function Logo({ onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <svg viewBox="0 0 140 140" width="22" height="22" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="cG" cx="42%" cy="38%" r="55%">
            <stop offset="0%"   stopColor="#ff6b6b"/>
            <stop offset="40%"  stopColor="#e53935"/>
            <stop offset="100%" stopColor="#7b0000"/>
          </radialGradient>
          <radialGradient id="cD" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#3a0000" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#3a0000" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="cGl" cx="38%" cy="28%" r="40%">
            <stop offset="0%"   stopColor="#ffaaaa" stopOpacity="0.55"/>
            <stop offset="100%" stopColor="#ffaaaa" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#cG)"/>
        <ellipse cx="70" cy="70" rx="22" ry="22" fill="url(#cD)"/>
        <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#cGl)"/>
        <ellipse cx="70" cy="70" rx="46" ry="46" fill="none" stroke="#ff9090" strokeWidth="1.5" opacity="0.35"/>
      </svg>
      <span style={{ ...DISPLAY, fontSize: 18, color: C.textPrimary, letterSpacing: "0.12em" }}>
        Smart Blood Scan
      </span>
    </div>
  );
}

function Card({ children, style = {}, ...props }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, ...style }} {...props}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.18em", color: C.accent, opacity: 0.7,
                  textTransform: "uppercase", marginBottom: 12 }}>
      {children}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size = 18, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
        <animateTransform attributeName="transform" type="rotate"
          from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
      </path>
    </svg>
  );
}

export default function Classifier() {
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const fileRef      = useRef(null);
  const isMobile     = useIsMobile();

  const isQuickMode = searchParams.get("mode") === "quick";
  const [activePatient, setActivePatient] = useState(null);
  const [doctorId,      setDoctorId]      = useState("");

  useEffect(() => {
    // Read user from either sessionStorage or localStorage
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setDoctorId(u?.user?.id ?? u?.id ?? "");
      } catch (_) {}
    }
    if (!isQuickMode) {
      const stored = sessionStorage.getItem("activePatient");
      if (stored) setActivePatient(JSON.parse(stored));
      else navigate("/patients");
    }
  }, [isQuickMode, navigate]);

  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [gradcamUrl,  setGradcamUrl]  = useState(null);
  const [dragging,    setDragging]    = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const onPick = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setResult({ error: "Please upload an image file." });
      return;
    }
    setFile(f);
    setResult(null);
    setGradcamUrl(null);
    setSavedBanner(false);
    setPreview(URL.createObjectURL(f));
  };

  const onUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setGradcamUrl(null);
    setSavedBanner(false);
    try {
      const fd = new FormData();
      fd.append("image",     file);
      fd.append("patientId", isQuickMode ? "quick" : (activePatient?.id ?? ""));
      fd.append("doctorId",  doctorId);
      // Always uses the ensemble endpoint — no model selection
      const res = await axios.post(`${API}/predict`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      if (res.data.saved) {
        setSavedBanner(true);
        setTimeout(() => setSavedBanner(false), 4000);
      }
      if (res.data.gradcam_url) setGradcamUrl(`${API}${res.data.gradcam_url}`);
    } catch (err) {
      setResult({ error: err?.response?.data?.detail || `Backend not reachable at ${API}` });
    } finally {
      setLoading(false);
    }
  };

  // Label helpers — matches backend output "HEM (Healthy)" / "ALL (Leukemia)"
  const isHealthy  = (result?.label || "").includes("HEM") || (result?.label || "").toLowerCase().includes("healthy");
  const confidence = result?.confidence != null
    ? Number(result.confidence) > 1
      ? Number(result.confidence)
      : Number(result.confidence) * 100
    : null;
  const confLevel = confidence == null ? null
    : confidence >= 90 ? "high"
    : confidence >= 70 ? "medium"
    : "low";
  const confMap = {
    high  : { color: "#0e9e8a", msg: "High confidence — reliable result." },
    medium: { color: "#d97706", msg: "Moderate confidence — consider review." },
    low   : { color: C.accent,  msg: "Low confidence — consult a specialist." },
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{ minHeight: "100vh", background: C.bg, ...BODY }}>

        {/* ── Navbar ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 40,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: isMobile ? "14px 16px" : "16px 40px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <Logo onClick={() => navigate("/")}/>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10 }}>
            {[
              { label: isMobile ? "Hist." : "History",  path: "/history" },
              { label: isMobile ? "Pts."  : "Patients", path: "/patients" },
            ].map(({ label, path }) => (
              <motion.button key={label} onClick={() => navigate(path)}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{
                  ...DISPLAY, fontSize: isMobile ? 12 : 13, letterSpacing: "0.08em",
                  color: C.textSub, background: "transparent",
                  border: `1px solid ${C.borderMid}`,
                  borderRadius: 999, cursor: "pointer",
                  padding: isMobile ? "6px 14px" : "7px 22px",
                }}>
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Patient / quick-mode banner ── */}
        <AnimatePresence>
          {(isQuickMode || activePatient) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: isMobile ? "10px 16px" : "10px 40px",
                flexWrap: "wrap", gap: 8,
                background:   isQuickMode ? "rgba(245,158,11,0.07)"  : C.accentLight,
                borderBottom: isQuickMode ? "1px solid rgba(245,158,11,0.2)" : `1px solid ${C.accentBorder}`,
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isQuickMode ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span style={{ ...BODY, fontSize: isMobile ? 12 : 13, color: "#92611a" }}>
                      <strong>Quick Mode</strong>{!isMobile && " — Results will not be saved to any patient record"}
                    </span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span style={{ ...BODY, fontSize: isMobile ? 12 : 13, color: C.textSub }}>
                      Patient:{" "}
                      <span style={{ color: C.textPrimary, fontWeight: 600 }}>{activePatient?.name}</span>
                      {!isMobile && (
                        <span style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.1em", color: C.accent, opacity: 0.7, marginLeft: 10 }}>
                          {activePatient?.patientIdStr}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </div>
              <motion.button onClick={() => navigate("/patients")}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{
                  ...DISPLAY, fontSize: 12, letterSpacing: "0.08em",
                  color: C.textMuted, background: C.bgSurface,
                  border: `1px solid ${C.border}`, borderRadius: 7,
                  cursor: "pointer", padding: "5px 14px",
                }}>
                Change Patient
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Saved banner ── */}
        <AnimatePresence>
          {savedBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: isMobile ? "10px 16px" : "10px 40px",
                background: "rgba(14,158,138,0.07)", borderBottom: "1px solid rgba(14,158,138,0.2)",
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="#0e9e8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ ...BODY, fontSize: 13, color: "#0e9e8a" }}>
                Result saved to <strong>{activePatient?.name}'s</strong> medical record
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content ── */}
        <div style={{
          maxWidth: 1120, margin: "0 auto",
          padding: isMobile ? "24px 16px 60px" : "36px 24px 80px",
        }}>

          {/* Page title */}
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }} style={{ marginBottom: isMobile ? 20 : 32 }}>
            <div style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.22em",
                          color: C.accent, opacity: 0.7, marginBottom: 8 }}>
              {isQuickMode ? "QUICK ANALYSIS" : "CELL CLASSIFIER"}
            </div>
            <h1 style={{ ...DISPLAY, fontSize: isMobile ? "clamp(2rem, 10vw, 2.6rem)" : "clamp(2rem, 4vw, 3rem)",
                         color: C.textPrimary, letterSpacing: "0.06em", lineHeight: 1.0, margin: 0 }}>
              Blood Smear<br/><span style={{ color: C.accent }}>Analysis</span>
            </h1>

            {/* Ensemble badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12,
              padding: "5px 14px", borderRadius: 999,
              background: C.accentLight, border: `1px solid ${C.accentBorder}`,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                   stroke={C.accent} strokeWidth="2.5" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.14em", color: C.accent }}>
                5-MODEL WEIGHTED ENSEMBLE
              </span>
            </div>
          </motion.div>

          {/* ── 2-column layout (stacks on mobile) ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? 14 : 20,
          }}>

            {/* ── Left: upload ── */}
            <motion.div initial={{ opacity: 0, x: isMobile ? 0 : -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Upload zone */}
              <Card style={{ padding: isMobile ? 16 : 22 }}>
                <Label>Upload Image</Label>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files[0]); }}
                  style={{
                    height: isMobile ? 150 : 180, borderRadius: 12, cursor: "pointer",
                    border: `1.5px dashed ${dragging ? C.accent : preview ? "rgba(14,158,138,0.4)" : C.borderMid}`,
                    background: dragging ? C.accentLight : C.bgSurface,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s", overflow: "hidden", position: "relative",
                  }}>
                  <AnimatePresence mode="wait">
                    {preview ? (
                      <motion.img key="preview" src={preview} alt="preview"
                        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35 }}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }} style={{ textAlign: "center", padding: isMobile ? 16 : 24 }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                             stroke={C.accentBorder} strokeWidth="1.5" strokeLinecap="round"
                             style={{ margin: "0 auto 10px", display: "block" }}>
                          <rect x="3" y="3" width="18" height="18" rx="3"/>
                          <circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>
                        </svg>
                        <div style={{ ...BODY, fontSize: 13, color: C.textMuted }}>
                          {isMobile ? "Tap to upload" : "Drag & drop or click to upload"}
                        </div>
                        <div style={{ ...BODY, fontSize: 11, color: C.textFaint, marginTop: 5 }}>
                          JPG, PNG, BMP supported
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => onPick(e.target.files[0])}/>

                {file && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: 10, display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px", borderRadius: 8,
                      background: C.bgSurface, border: `1px solid ${C.border}`,
                    }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke={C.textFaint} strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span style={{ ...BODY, fontSize: 12, color: C.textSub, flex: 1,
                                   overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.name}
                    </span>
                    <span style={{ ...BODY, fontSize: 11, color: C.textFaint, flexShrink: 0 }}>
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                  </motion.div>
                )}
              </Card>

              {/* Ensemble info card — replaces model selector */}
              <Card style={{ padding: isMobile ? 16 : 20 }}>
                <Label>Analysis Method</Label>
                <div style={{
                  padding: "14px 16px", borderRadius: 12,
                  background: C.accentLight, border: `1px solid ${C.accentBorder}`,
                  marginBottom: 12,
                }}>
                  <div style={{ ...DISPLAY, fontSize: 15, color: C.accent, letterSpacing: "0.08em", marginBottom: 4 }}>
                    Weighted Ensemble
                  </div>
                  <div style={{ ...BODY, fontSize: 12, color: C.textSub, lineHeight: 1.65 }}>
                    All 5 models run simultaneously. Their predictions are combined using softmax-weighted averaging based on each model's validation accuracy.
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["EfficientNetB0", "DenseNet121", "ResNet50", "InceptionV3", "MobileNetV2"].map(m => (
                    <div key={m} style={{
                      ...DISPLAY, fontSize: 10, letterSpacing: "0.07em",
                      padding: "4px 10px", borderRadius: 6,
                      border: `1px solid ${C.border}`,
                      background: C.bgSurface, color: C.textMuted,
                    }}>
                      {m}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Analyse button */}
              <motion.button onClick={onUpload} disabled={!file || loading}
                whileHover={file && !loading ? { scale: 1.02, background: "#333" } : {}}
                whileTap={file && !loading ? { scale: 0.97 } : {}}
                style={{
                  ...DISPLAY, width: "100%", height: 52, fontSize: 16, letterSpacing: "0.1em",
                  color: "#fff", background: file && !loading ? C.textPrimary : C.borderMid,
                  border: "none", borderRadius: 12,
                  cursor: file && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: !file ? 0.5 : 1, transition: "all 0.2s",
                }}>
                {loading ? (
                  <><Spinner size={18} color="#fff"/> Analysing…</>
                ) : "Analyse Image"}
              </motion.button>
            </motion.div>

            {/* ── Right: results ── */}
            <motion.div initial={{ opacity: 0, x: isMobile ? 0 : 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: isMobile ? 0.05 : 0.15 }}>
              <Card style={{ padding: isMobile ? 16 : 22, minHeight: isMobile ? "auto" : 380 }}>
                <Label>Results</Label>
                <AnimatePresence mode="wait">

                  {/* Error state */}
                  {result?.error ? (
                    <motion.div key="err" variants={fadeUp} initial="hidden" animate="show" exit="exit"
                      style={{ padding: "14px 16px", borderRadius: 11,
                               background: C.accentLight, border: `1px solid ${C.accentBorder}` }}>
                      <div style={{ ...DISPLAY, fontSize: 14, color: C.accent, letterSpacing: "0.06em" }}>Error</div>
                      <div style={{ ...BODY, fontSize: 12, color: C.textSub, marginTop: 4 }}>{result.error}</div>
                    </motion.div>

                  ) : result ? (
                    <motion.div key="res" variants={fadeUp} initial="hidden" animate="show" exit="exit"
                      style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                      {/* Prediction */}
                      <div style={{
                        padding: "16px", borderRadius: 11, textAlign: "center",
                        background: isHealthy ? "rgba(14,158,138,0.07)" : C.accentLight,
                        border: isHealthy ? "1px solid rgba(14,158,138,0.25)" : `1px solid ${C.accentBorder}`,
                      }}>
                        <div style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.18em",
                                      color: C.textFaint, marginBottom: 6 }}>PREDICTION</div>
                        <motion.div
                          initial={{ scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 280, damping: 18 }}
                          style={{ ...DISPLAY, fontSize: isMobile ? 26 : 32, letterSpacing: "0.06em",
                                   color: isHealthy ? "#0e9e8a" : C.accent }}>
                          {result.label}
                        </motion.div>
                        <div style={{ ...BODY, fontSize: 12, color: C.textFaint, marginTop: 4 }}>
                          via 5-model weighted ensemble
                        </div>
                      </div>

                      {/* Confidence bar */}
                      {confidence != null && confLevel && (
                        <div style={{ padding: "14px 16px", borderRadius: 11,
                                      background: C.bgSurface, border: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.15em", color: C.textFaint }}>
                              CONFIDENCE
                            </span>
                            <span style={{ ...BODY, fontSize: 14, fontWeight: 600, color: confMap[confLevel].color }}>
                              {confidence.toFixed(1)}%
                            </span>
                          </div>
                          <div style={{ width: "100%", height: 4, borderRadius: 99, background: C.border }}>
                            <motion.div
                              style={{ height: 4, borderRadius: 99, background: confMap[confLevel].color }}
                              initial={{ width: 0 }} animate={{ width: `${confidence}%` }}
                              transition={{ duration: 1.0, ease: "easeOut" }}/>
                          </div>
                          <div style={{ ...BODY, fontSize: 11, marginTop: 8, color: confMap[confLevel].color }}>
                            {confMap[confLevel].msg}
                          </div>
                        </div>
                      )}

                      {/* Storage status */}
                      <div style={{
                        padding: "10px 14px", borderRadius: 11, display: "flex", alignItems: "center", gap: 8,
                        background: isQuickMode ? "rgba(245,158,11,0.07)" : "rgba(14,158,138,0.07)",
                        border: isQuickMode ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(14,158,138,0.2)",
                      }}>
                        {isQuickMode ? (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                 stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round">
                              <line x1="1" y1="1" x2="23" y2="23"/>
                              <path d="M17.73 17.73A10.94 10.94 0 0 1 12 19C7 19 2.73 15.11 1 12"/>
                            </svg>
                            <span style={{ ...BODY, fontSize: 12, color: "#92611a" }}>Not saved — quick analysis mode</span>
                          </>
                        ) : (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                 stroke="#0e9e8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span style={{ ...BODY, fontSize: 12, color: "#0e9e8a" }}>
                              {result.saved
                                ? <><strong>{activePatient?.name}</strong>'s record updated</>
                                : "Saving…"}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Clinical note */}
                      <div style={{ padding: "12px 14px", borderRadius: 11,
                                    background: C.bgSurface, border: `1px solid ${C.border}` }}>
                        <div style={{ ...BODY, fontSize: 12, lineHeight: 1.7, color: C.textMuted }}>
                          {isHealthy
                            ? "Normal B-lymphoid precursor identified. No leukemic blast features detected."
                            : "Potential leukemic blast features detected. This may indicate ALL. Confirm with a qualified pathologist."}
                        </div>
                      </div>

                      {/* Disclaimer pill */}
                      <div style={{ ...BODY, fontSize: 11, color: C.textFaint, textAlign: "center", lineHeight: 1.5 }}>
                        For research purposes only · Not a certified diagnostic tool
                      </div>
                    </motion.div>

                  ) : (
                    /* Idle state */
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center",
                               justifyContent: "center", padding: isMobile ? "32px 0" : "48px 0", gap: 12 }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                           stroke={C.border} strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                      </svg>
                      <div style={{ ...BODY, fontSize: 13, textAlign: "center", color: C.textFaint }}>
                        Upload an image and click Analyse
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          </div>

          {/* ── Grad-CAM section ── */}
          <AnimatePresence>
            {result && !result.error && (
              <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }} style={{ marginTop: isMobile ? 14 : 20 }}>
                <Card style={{ padding: isMobile ? "16px" : "22px" }}>
                  <Label>Grad-CAM Explanation</Label>
                  <p style={{ ...BODY, fontSize: 13, color: C.textMuted, marginBottom: 16,
                               lineHeight: 1.65, marginTop: -4 }}>
                    Warmer colours highlight the cell regions that most influenced the prediction.
                    Generated using DenseNet121.
                  </p>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: isMobile ? 12 : 16,
                  }}>
                    {[
                      { label: "Original Image",   src: preview,    fallback: null },
                      { label: "Grad-CAM Overlay", src: gradcamUrl, fallback: "Heatmap will appear here once the backend returns it." },
                    ].map(({ label, src, fallback }) => (
                      <div key={label}>
                        <div style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.15em",
                                      color: C.textFaint, marginBottom: 8 }}>
                          {label}
                        </div>
                        <div style={{
                          height: isMobile ? 180 : 220, borderRadius: 12, overflow: "hidden",
                          background: C.bgSurface, border: `1px solid ${C.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {src
                            ? <motion.img src={src} alt={label}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                transition={{ duration: 0.45 }}/>
                            : <div style={{ ...BODY, fontSize: 12, textAlign: "center",
                                            padding: 16, color: C.textFaint }}>
                                {fallback}
                              </div>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {isQuickMode && (
            <p style={{ ...BODY, fontSize: 12, textAlign: "center", marginTop: 24, color: C.textFaint }}>
              Quick Analysis Mode · Results are temporary and not stored
            </p>
          )}
        </div>
      </div>
    </>
  );
}
