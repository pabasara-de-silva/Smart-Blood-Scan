import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

const DISPLAY = { fontFamily: "'Bebas Neue', sans-serif" };
const BODY    = { fontFamily: "'Outfit', sans-serif" };
const API     = "http://127.0.0.1:5000";

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

function RBCLogo({ size = 22 }) {
  return (
    <svg viewBox="0 0 140 140" width={size} height={size} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="hG" cx="42%" cy="38%" r="55%">
          <stop offset="0%"   stopColor="#ff6b6b"/>
          <stop offset="40%"  stopColor="#e53935"/>
          <stop offset="100%" stopColor="#7b0000"/>
        </radialGradient>
        <radialGradient id="hD" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#3a0000" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#3a0000" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="hGl" cx="38%" cy="28%" r="40%">
          <stop offset="0%"   stopColor="#ffaaaa" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#ffaaaa" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#hG)"/>
      <ellipse cx="70" cy="70" rx="22" ry="22" fill="url(#hD)"/>
      <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#hGl)"/>
      <ellipse cx="70" cy="70" rx="46" ry="46" fill="none" stroke="#ff9090" strokeWidth="1.5" opacity="0.35"/>
    </svg>
  );
}

function Card({ children, style = {}, ...props }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, ...style }} {...props}>
      {children}
    </div>
  );
}

export default function History() {
  const navigate = useNavigate();

  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchScans = async () => {
      setLoading(true); setError("");
      try {
        const storedUser = sessionStorage.getItem("user");
        let doctorId = "";
        if (storedUser) {
          try { const u = JSON.parse(storedUser); doctorId = u?.user?.id ?? u?.id ?? ""; } catch (_) {}
        }
        const url = doctorId ? `${API}/scans?doctorId=${doctorId}&limit=100` : `${API}/scans?limit=100`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        setHistory(await res.json());
      } catch (e) { setError(`Could not load history: ${e.message}`); }
      finally { setLoading(false); }
    };
    fetchScans();
  }, []);

  const deleteScan = async (scanId) => {
    setDeletingId(scanId);
    try {
      const res = await fetch(`${API}/scans/${scanId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setHistory(prev => prev.filter(s => s.id !== scanId));
      if (expandedId === scanId) setExpandedId(null);
    } catch (e) { alert(`Could not delete scan: ${e.message}`); }
    finally { setDeletingId(null); }
  };

  const parseConf = (c) => { if (c == null) return null; return Number(c) > 1 ? Number(c) : Number(c) * 100; };
  const confColor = (c) => { if (c == null) return C.textFaint; return c >= 90 ? "#0e9e8a" : c >= 70 ? "#d97706" : C.accent; };
  const formatDate = (iso) => { try { return new Date(iso).toLocaleString(); } catch (_) { return iso || "—"; } };

  const filteredHistory = history.filter(item => {
    const label = (item.label || "").toLowerCase();
    const matchFilter =
      filter === "all" ||
      (filter === "healthy"  && label.includes("healthy")) ||
      (filter === "leukemic" && !label.includes("healthy"));
    const matchSearch = !search.trim() ||
      (item.filename    || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.patientName || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.model       || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const healthyCount  = history.filter(i => (i.label || "").toLowerCase().includes("healthy")).length;
  const leukemicCount = history.length - healthyCount;

  const stagger = { show: { transition: { staggerChildren: 0.05 } } };
  const rowAnim = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.35 } } };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{ minHeight: "100vh", background: C.bg, ...BODY }}>

        {/* ── Navbar ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 40,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 44px", background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`,
        }}>
          <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <RBCLogo/>
            <span style={{ ...DISPLAY, fontSize: 18, color: C.textPrimary, letterSpacing: "0.12em" }}>Smart Blood Scan</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <motion.button onClick={() => navigate("/patients")}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ ...DISPLAY, fontSize: 13, letterSpacing: "0.08em",
                       color: C.textSub, background: "transparent", border: `1px solid ${C.borderMid}`,
                       borderRadius: 999, cursor: "pointer", padding: "7px 22px" }}>
              Patients
            </motion.button>
            <motion.button onClick={() => navigate("/patients")}
              whileHover={{ scale: 1.03, background: "#333" }} whileTap={{ scale: 0.97 }}
              style={{ ...DISPLAY, fontSize: 13, letterSpacing: "0.08em",
                       color: "#fff", background: C.textPrimary, border: "none",
                       borderRadius: 999, cursor: "pointer", padding: "7px 22px" }}>
              New Scan
            </motion.button>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>

          {/* Page header */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }} style={{ marginBottom: 36 }}>
            <div style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.22em", color: C.accent, opacity: 0.7, marginBottom: 10 }}>
              ANALYSIS RECORDS
            </div>
            <h1 style={{ ...DISPLAY, fontSize: "clamp(2.2rem, 5vw, 3.4rem)", color: C.textPrimary,
                         letterSpacing: "0.06em", lineHeight: 1.0, margin: 0 }}>
              Scan<br/><span style={{ color: C.accent }}>History</span>
            </h1>
          </motion.div>

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                </path>
              </svg>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <Card style={{ padding: "24px", marginBottom: 24, background: C.accentLight, border: `1px solid ${C.accentBorder}` }}>
              <div style={{ ...DISPLAY, fontSize: 14, color: C.accent, letterSpacing: "0.06em", marginBottom: 4 }}>Error</div>
              <div style={{ ...BODY, fontSize: 13, color: C.textSub }}>{error}</div>
            </Card>
          )}

          {/* Stats */}
          {!loading && !error && history.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
              {[
                { label: "Total Scans", value: history.length, color: C.textPrimary,
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textFaint} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> },
                { label: "Healthy", value: healthyCount, color: "#0e9e8a",
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(14,158,138,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
                { label: "Leukemic", value: leukemicCount, color: C.accent,
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accentBorder} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg> },
              ].map(({ label, value, color, icon }) => (
                <Card key={label} style={{ padding: "18px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ ...DISPLAY, fontSize: 10, letterSpacing: "0.18em", color: C.textFaint, marginBottom: 6 }}>{label.toUpperCase()}</div>
                      <div style={{ ...DISPLAY, fontSize: 34, letterSpacing: "0.04em", color }}>{value}</div>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.bgSurface,
                                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {icon}
                    </div>
                  </div>
                </Card>
              ))}
            </motion.div>
          )}

          {/* Toolbar */}
          {!loading && !error && history.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                       gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              {/* Search */}
              <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 380 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke={C.textFaint} strokeWidth="2" strokeLinecap="round"
                     style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by file, patient or model…"
                  style={{
                    ...BODY, width: "100%", boxSizing: "border-box",
                    padding: "11px 16px 11px 38px", fontSize: 13,
                    color: C.textPrimary, background: C.bg,
                    border: `1px solid ${C.borderMid}`, borderRadius: 10, outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.borderMid}
                />
              </div>

              {/* Filter tabs */}
              <div style={{ display: "flex", gap: 4, background: C.bgSurface,
                            border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }}>
                {[{ key: "all", label: "All" }, { key: "healthy", label: "Healthy" }, { key: "leukemic", label: "Leukemic" }].map(({ key, label }) => (
                  <motion.button key={key} onClick={() => setFilter(key)} whileTap={{ scale: 0.95 }}
                    style={{
                      ...DISPLAY, fontSize: 12, letterSpacing: "0.07em",
                      padding: "6px 16px", borderRadius: 7, cursor: "pointer",
                      border: "none", transition: "all 0.15s",
                      background: filter === key
                        ? key === "healthy" ? "rgba(14,158,138,0.12)" : key === "leukemic" ? C.accentLight : C.bg
                        : "transparent",
                      color: filter === key
                        ? key === "healthy" ? "#0e9e8a" : key === "leukemic" ? C.accent : C.textPrimary
                        : C.textFaint,
                      outline: filter === key
                        ? `1px solid ${key === "healthy" ? "rgba(14,158,138,0.25)" : key === "leukemic" ? C.accentBorder : C.border}`
                        : "none",
                    }}>
                    {label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Table / empty states */}
          <AnimatePresence mode="wait">
            {!loading && !error && history.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card style={{ padding: "64px 24px", textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.accentLight,
                                border: `1px solid ${C.accentBorder}`, display: "flex", alignItems: "center",
                                justifyContent: "center", margin: "0 auto 20px" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                         stroke={C.accent} strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </svg>
                  </div>
                  <div style={{ ...DISPLAY, fontSize: 28, color: C.textPrimary, letterSpacing: "0.06em", marginBottom: 8 }}>No Scans Yet</div>
                  <p style={{ ...BODY, fontSize: 14, color: C.textSub, marginBottom: 28, lineHeight: 1.7 }}>
                    Select a patient and upload a blood smear image to get started
                  </p>
                  <motion.button onClick={() => navigate("/patients")}
                    whileHover={{ scale: 1.04, background: "#333" }} whileTap={{ scale: 0.97 }}
                    style={{ ...DISPLAY, fontSize: 15, letterSpacing: "0.08em", padding: "11px 36px",
                             borderRadius: 999, color: "#fff", background: C.textPrimary, border: "none", cursor: "pointer" }}>
                    Select Patient
                  </motion.button>
                </Card>
              </motion.div>
            )}

            {!loading && !error && history.length > 0 && filteredHistory.length === 0 && (
              <motion.div key="no-results" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card style={{ padding: "40px 24px", textAlign: "center" }}>
                  <div style={{ ...BODY, fontSize: 14, color: C.textFaint }}>No records match your filters</div>
                </Card>
              </motion.div>
            )}

            {!loading && !error && filteredHistory.length > 0 && (
              <motion.div key="table" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card style={{ overflow: "hidden" }}>
                  {/* Table head */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1.4fr 60px",
                    gap: 12, padding: "12px 22px",
                    background: C.bgSurface, borderBottom: `1px solid ${C.border}`,
                  }}>
                    {["File", "Patient", "Model", "Result", "Confidence", "Date", ""].map((h, i) => (
                      <div key={i} style={{ ...DISPLAY, fontSize: 10, letterSpacing: "0.16em",
                                            color: C.textFaint, textTransform: "uppercase" }}>
                        {h}
                      </div>
                    ))}
                  </div>

                  <motion.div variants={stagger} initial="hidden" animate="show">
                    {filteredHistory.map((item) => {
                      const isH        = (item.label || "").toLowerCase().includes("healthy");
                      const conf       = parseConf(item.confidence);
                      const isExpanded = expandedId === item.id;
                      const isDeleting = deletingId === item.id;

                      return (
                        <motion.div key={item.id} variants={rowAnim}>
                          <div
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            style={{
                              display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1.4fr 60px",
                              gap: 12, padding: "15px 22px", cursor: "pointer", transition: "background 0.15s",
                              borderBottom: `1px solid ${C.border}`,
                              background: isExpanded ? C.bgSurface : "transparent",
                            }}
                            onMouseEnter={e => !isExpanded && (e.currentTarget.style.background = C.bgSurface)}
                            onMouseLeave={e => !isExpanded && (e.currentTarget.style.background = "transparent")}
                          >
                            {/* Filename */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                   stroke={C.textFaint} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                              </svg>
                              <span style={{ ...BODY, fontSize: 13, fontWeight: 500, color: C.textPrimary,
                                             overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.filename || "—"}
                              </span>
                            </div>
                            {/* Patient */}
                            <div style={{ ...BODY, fontSize: 12,
                                          color: item.patientName ? C.accent : C.textFaint,
                                          display: "flex", alignItems: "center",
                                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.patientName || "Quick mode"}
                            </div>
                            {/* Model */}
                            <div style={{ ...BODY, fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center" }}>
                              {item.model}
                            </div>
                            {/* Label badge */}
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <span style={{
                                ...DISPLAY, fontSize: 10, letterSpacing: "0.08em",
                                padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap",
                                background: isH ? "rgba(14,158,138,0.08)"   : C.accentLight,
                                border:     isH ? "1px solid rgba(14,158,138,0.25)" : `1px solid ${C.accentBorder}`,
                                color:      isH ? "#0e9e8a" : C.accent,
                              }}>
                                {item.label}
                              </span>
                            </div>
                            {/* Confidence */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {conf != null ? (
                                <>
                                  <div style={{ flex: 1, height: 3, borderRadius: 99, background: C.border, overflow: "hidden" }}>
                                    <div style={{ width: `${conf}%`, height: "100%", background: confColor(conf), borderRadius: 99 }}/>
                                  </div>
                                  <span style={{ ...BODY, fontSize: 12, fontWeight: 600, color: confColor(conf), flexShrink: 0 }}>
                                    {conf.toFixed(0)}%
                                  </span>
                                </>
                              ) : <span style={{ ...BODY, fontSize: 12, color: C.textFaint }}>—</span>}
                            </div>
                            {/* Date */}
                            <div style={{ ...BODY, fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center" }}>
                              {formatDate(item.date)}
                            </div>
                            {/* Actions */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                              <motion.button
                                onClick={e => { e.stopPropagation(); deleteScan(item.id); }}
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                disabled={isDeleting}
                                style={{ background: "none", border: "none", cursor: "pointer",
                                         padding: 4, opacity: isDeleting ? 0.4 : 0.6,
                                         display: "flex", alignItems: "center" }}
                                title="Delete scan">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                     stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                  <path d="M10 11v6M14 11v6"/>
                                </svg>
                              </motion.button>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                                            transition: "transform 0.25s",
                                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                     stroke={C.textFaint} strokeWidth="2" strokeLinecap="round">
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Expanded detail */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                                style={{ overflow: "hidden" }}>
                                <div style={{
                                  padding: "16px 22px 20px", background: C.bgSurface,
                                  borderBottom: `1px solid ${C.border}`,
                                  display: "flex", gap: 32, flexWrap: "wrap",
                                }}>
                                  {[
                                    { label: "Full Filename", value: item.filename },
                                    { label: "Patient ID",   value: item.patientId || "N/A" },
                                    { label: "Patient",      value: item.patientName || "Quick mode" },
                                    { label: "Model Used",   value: item.model },
                                    { label: "Scan Date",    value: formatDate(item.date) },
                                    { label: "Confidence",   value: conf != null ? `${conf.toFixed(2)}%` : "—" },
                                    { label: "Scan ID",      value: item.id },
                                  ].map(({ label, value }) => (
                                    <div key={label}>
                                      <div style={{ ...DISPLAY, fontSize: 9, letterSpacing: "0.16em",
                                                    color: C.accent, opacity: 0.7, marginBottom: 4 }}>
                                        {label.toUpperCase()}
                                      </div>
                                      <div style={{ ...BODY, fontSize: 13, color: C.textSub, maxWidth: 200, wordBreak: "break-all" }}>
                                        {value}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </Card>

                <p style={{ ...BODY, fontSize: 12, textAlign: "center", color: C.textFaint, marginTop: 18 }}>
                  {filteredHistory.length} of {history.length} record{history.length !== 1 ? "s" : ""} shown · Stored in MongoDB · Not a clinical tool
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
