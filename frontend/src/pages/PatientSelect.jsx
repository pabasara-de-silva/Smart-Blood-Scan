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
        <radialGradient id="psG" cx="42%" cy="38%" r="55%">
          <stop offset="0%"   stopColor="#ff6b6b"/>
          <stop offset="40%"  stopColor="#e53935"/>
          <stop offset="100%" stopColor="#7b0000"/>
        </radialGradient>
        <radialGradient id="psD" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#3a0000" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#3a0000" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="psGl" cx="38%" cy="28%" r="40%">
          <stop offset="0%"   stopColor="#ffaaaa" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#ffaaaa" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#psG)"/>
      <ellipse cx="70" cy="70" rx="22" ry="22" fill="url(#psD)"/>
      <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#psGl)"/>
      <ellipse cx="70" cy="70" rx="46" ry="46" fill="none" stroke="#ff9090" strokeWidth="1.5" opacity="0.35"/>
    </svg>
  );
}

function Card({ children, style = {}, ...props }) {
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 16, ...style,
    }} {...props}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      ...DISPLAY, fontSize: 11, letterSpacing: "0.18em",
      color: C.accent, opacity: 0.7, textTransform: "uppercase", marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, error, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{ ...DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
                      textTransform: "uppercase", color: C.textMuted }}>
        {label}
      </label>
      <input type={type} value={value} onChange={onChange}
        placeholder={placeholder} autoComplete={autoComplete || "off"}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          ...BODY, width: "100%", padding: "13px 16px", fontSize: 15, boxSizing: "border-box",
          color: C.textPrimary, background: C.bg,
          border: `1px solid ${error ? C.accent : focused ? C.accent : C.borderMid}`,
          borderRadius: 11, outline: "none", transition: "border-color 0.2s",
        }}
      />
      {error && <span style={{ ...BODY, fontSize: 12, color: C.accent }}>{error}</span>}
    </div>
  );
}

const GENDERS     = ["Male", "Female", "Other", "Prefer not to say"];
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

export default function PatientSelect() {
  const navigate = useNavigate();

  const [mode,            setMode]            = useState("select");
  const [search,          setSearch]          = useState("");
  const [patients,        setPatients]        = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError,   setPatientsError]   = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [confirmOpen,     setConfirmOpen]     = useState(false);
  const [quickOpen,       setQuickOpen]       = useState(false);
  const [createLoading,   setCreateLoading]   = useState(false);
  const [doctorId,        setDoctorId]        = useState("");
  const [newPt, setNewPt]   = useState({ name: "", dob: "", gender: "", bloodType: "", notes: "" });
  const [newErrors, setNewErrors] = useState({});

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try { const u = JSON.parse(storedUser); setDoctorId(u?.user?.id ?? u?.id ?? ""); } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    const fetch_ = async () => {
      setPatientsLoading(true); setPatientsError("");
      try {
        const res = await fetch(`${API}/patients?doctorId=${doctorId}`);
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        setPatients(await res.json());
      } catch (e) { setPatientsError(`Could not load patients: ${e.message}`); }
      finally { setPatientsLoading(false); }
    };
    fetch_();
  }, [doctorId]);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.patientIdStr || "").toLowerCase().includes(search.toLowerCase())
  );

  const setNP = (key) => (e) => setNewPt(f => ({ ...f, [key]: e.target.value }));

  const validateNew = () => {
    const e = {};
    if (!newPt.name.trim()) e.name   = "Full name is required";
    if (!newPt.dob.trim())  e.dob    = "Date of birth is required";
    if (!newPt.gender)      e.gender = "Please select gender";
    setNewErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreatePatient = async () => {
    if (!validateNew()) return;
    setCreateLoading(true);
    try {
      const res = await fetch(`${API}/patients`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPt.name.trim(), dob: newPt.dob, gender: newPt.gender,
                               bloodType: newPt.bloodType || "Unknown", notes: newPt.notes, doctorId }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      const created = await res.json();
      setPatients(prev => [created, ...prev]);
      setSelectedPatient(created);
      setConfirmOpen(true);
    } catch (e) { alert(`Error: ${e.message}`); }
    finally { setCreateLoading(false); }
  };

  const handleSelectPatient = (pt) => { setSelectedPatient(pt); setConfirmOpen(true); };
  const proceedToClassifier = () => { sessionStorage.setItem("activePatient", JSON.stringify(selectedPatient)); navigate("/classify"); };
  const proceedQuick        = () => { sessionStorage.removeItem("activePatient"); navigate("/classify?mode=quick"); };

  const fadeUp  = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22,1,0.36,1] } } };
  const stagger = { show: { transition: { staggerChildren: 0.06 } } };

  // ── Shared modal overlay style ────────────────────────────
  const overlayStyle = {
    position: "fixed", inset: 0, zIndex: 100,
    background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  };
  const modalStyle = {
    width: "100%", maxWidth: 440, padding: "36px",
    background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 18, boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
  };

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
            <span style={{ ...DISPLAY, fontSize: 18, color: C.textPrimary, letterSpacing: "0.12em" }}>
              Smart Blood Scan
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <motion.button onClick={() => setQuickOpen(true)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                ...DISPLAY, fontSize: 13, letterSpacing: "0.08em",
                color: C.accent, background: C.accentLight,
                border: `1px solid ${C.accentBorder}`,
                borderRadius: 999, cursor: "pointer", padding: "7px 22px",
              }}>
              Quick Analysis
            </motion.button>
            <motion.button onClick={() => navigate("/history")}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                ...DISPLAY, fontSize: 13, letterSpacing: "0.08em",
                color: C.textSub, background: "transparent",
                border: `1px solid ${C.borderMid}`,
                borderRadius: 999, cursor: "pointer", padding: "7px 22px",
              }}>
              History
            </motion.button>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>

          {/* Page header */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }} style={{ marginBottom: 40 }}>
            <div style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.22em",
                          color: C.accent, opacity: 0.7, marginBottom: 10 }}>
              PATIENT MANAGEMENT
            </div>
            <h1 style={{ ...DISPLAY, fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
                         color: C.textPrimary, letterSpacing: "0.06em", lineHeight: 1.0, margin: 0 }}>
              Select or Create<br/><span style={{ color: C.accent }}>Patient</span>
            </h1>
            <p style={{ ...BODY, fontSize: 15, color: C.textSub, marginTop: 14, maxWidth: 480, lineHeight: 1.75 }}>
              All analysis results are saved under the selected patient's profile for complete medical record tracking.
            </p>
          </motion.div>

          {/* Mode tabs */}
          <div style={{
            display: "flex", gap: 4, background: C.bgSurface,
            border: `1px solid ${C.border}`, borderRadius: 12, padding: 4,
            width: "fit-content", marginBottom: 32,
          }}>
            {[{ key: "select", label: "Select Existing" }, { key: "create", label: "Create New" }].map(({ key, label }) => (
              <motion.button key={key} onClick={() => setMode(key)} whileTap={{ scale: 0.97 }}
                style={{
                  ...DISPLAY, fontSize: 14, letterSpacing: "0.08em",
                  padding: "9px 28px", borderRadius: 9, cursor: "pointer",
                  border: "none", transition: "all 0.2s",
                  background: mode === key ? C.accentLight : "transparent",
                  color:      mode === key ? C.accent       : C.textMuted,
                  outline:    mode === key ? `1px solid ${C.accentBorder}` : "none",
                }}>
                {label}
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── SELECT panel ── */}
            {mode === "select" && (
              <motion.div key="select"
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>

                {/* Search bar */}
                <div style={{ position: "relative", marginBottom: 20, maxWidth: 440 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke={C.textFaint} strokeWidth="2" strokeLinecap="round"
                       style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or ID…"
                    style={{
                      ...BODY, width: "100%", boxSizing: "border-box",
                      padding: "13px 16px 13px 42px", fontSize: 14,
                      color: C.textPrimary, background: C.bg,
                      border: `1px solid ${C.borderMid}`, borderRadius: 11, outline: "none",
                    }}
                    onFocus={e => e.target.style.borderColor = C.accent}
                    onBlur={e => e.target.style.borderColor = C.borderMid}
                  />
                </div>

                <Card>
                  {/* Table header */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1.6fr 0.6fr 0.8fr 1fr 0.8fr 100px",
                    gap: 12, padding: "12px 20px", borderBottom: `1px solid ${C.border}`,
                    background: C.bgSurface, borderRadius: "16px 16px 0 0",
                  }}>
                    {["Patient", "Age", "Blood Type", "Last Scan", "Scans", ""].map((h, i) => (
                      <div key={i} style={{ ...DISPLAY, fontSize: 10, letterSpacing: "0.16em",
                                            color: C.textFaint, textTransform: "uppercase" }}>
                        {h}
                      </div>
                    ))}
                  </div>

                  {patientsLoading && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                           stroke={C.accent} strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                          <animateTransform attributeName="transform" type="rotate"
                            from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                        </path>
                      </svg>
                    </div>
                  )}

                  {!patientsLoading && patientsError && (
                    <div style={{ padding: "24px 20px", ...BODY, fontSize: 13, color: C.accent }}>{patientsError}</div>
                  )}

                  {!patientsLoading && !patientsError && filteredPatients.length === 0 && (
                    <div style={{ padding: "40px 20px", textAlign: "center", ...BODY, fontSize: 14, color: C.textFaint }}>
                      {patients.length === 0 ? "No patients yet — create your first patient" : "No patients match your search"}
                    </div>
                  )}

                  {!patientsLoading && !patientsError && filteredPatients.length > 0 && (
                    <motion.div variants={stagger} initial="hidden" animate="show">
                      {filteredPatients.map((pt, i) => (
                        <motion.div key={pt.id} variants={fadeUp}
                          onClick={() => handleSelectPatient(pt)}
                          style={{
                            display: "grid", gridTemplateColumns: "1.6fr 0.6fr 0.8fr 1fr 0.8fr 100px",
                            gap: 12, padding: "16px 20px", cursor: "pointer", transition: "background 0.15s",
                            borderBottom: i < filteredPatients.length - 1 ? `1px solid ${C.border}` : "none",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = C.bgSurface}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div>
                            <div style={{ ...BODY, fontSize: 14, fontWeight: 500, color: C.textPrimary }}>{pt.name}</div>
                            <div style={{ ...DISPLAY, fontSize: 10, letterSpacing: "0.1em", color: C.accent, opacity: 0.7, marginTop: 3 }}>
                              {pt.patientIdStr}
                            </div>
                          </div>
                          <div style={{ ...BODY, fontSize: 14, color: C.textSub, display: "flex", alignItems: "center" }}>{pt.age}</div>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <span style={{
                              ...DISPLAY, fontSize: 11, letterSpacing: "0.1em",
                              padding: "3px 10px", borderRadius: 999,
                              background: C.accentLight, border: `1px solid ${C.accentBorder}`,
                              color: C.accent,
                            }}>
                              {pt.bloodType}
                            </span>
                          </div>
                          <div style={{ ...BODY, fontSize: 13, color: C.textMuted, display: "flex", alignItems: "center" }}>{pt.lastScan}</div>
                          <div style={{ ...BODY, fontSize: 13, color: C.textMuted, display: "flex", alignItems: "center" }}>
                            {pt.scanCount} scan{pt.scanCount !== 1 ? "s" : ""}
                          </div>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <motion.div whileHover={{ scale: 1.05 }}
                              style={{
                                ...DISPLAY, fontSize: 12, letterSpacing: "0.08em",
                                padding: "7px 16px", borderRadius: 8,
                                background: C.bgSurface, border: `1px solid ${C.borderMid}`,
                                color: C.textSub, cursor: "pointer",
                              }}>
                              Select
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </Card>

                <p style={{ ...BODY, fontSize: 12, color: C.textFaint, marginTop: 14, textAlign: "center" }}>
                  {filteredPatients.length} patient{filteredPatients.length !== 1 ? "s" : ""} found
                </p>
              </motion.div>
            )}

            {/* ── CREATE panel ── */}
            {mode === "create" && (
              <motion.div key="create"
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}
                style={{ maxWidth: 640 }}>
                <Card style={{ padding: 32 }}>
                  <Label>New Patient Record</Label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <Field label="Full Name" value={newPt.name} onChange={setNP("name")}
                           placeholder="e.g. Kamal Perera" error={newErrors.name}/>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <Field label="Date of Birth" type="date" value={newPt.dob}
                             onChange={setNP("dob")} error={newErrors.dob}/>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        <label style={{ ...DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
                                        textTransform: "uppercase", color: C.textMuted }}>
                          Gender
                        </label>
                        <select value={newPt.gender} onChange={setNP("gender")}
                          style={{
                            ...BODY, padding: "13px 16px", fontSize: 15,
                            color: newPt.gender ? C.textPrimary : C.textFaint,
                            background: C.bg,
                            border: `1px solid ${newErrors.gender ? C.accent : C.borderMid}`,
                            borderRadius: 11, outline: "none", cursor: "pointer", appearance: "none",
                          }}
                          onFocus={e => e.target.style.borderColor = C.accent}
                          onBlur={e => e.target.style.borderColor = newErrors.gender ? C.accent : C.borderMid}
                        >
                          <option value="" disabled>Select…</option>
                          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        {newErrors.gender && <span style={{ ...BODY, fontSize: 12, color: C.accent }}>{newErrors.gender}</span>}
                      </div>
                    </div>

                    {/* Blood type pills */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      <label style={{ ...DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
                                      textTransform: "uppercase", color: C.textMuted }}>
                        Blood Type
                      </label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {BLOOD_TYPES.map(bt => (
                          <motion.button key={bt}
                            onClick={() => setNewPt(f => ({ ...f, bloodType: f.bloodType === bt ? "" : bt }))}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              ...DISPLAY, fontSize: 13, letterSpacing: "0.08em",
                              padding: "7px 16px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                              border:     newPt.bloodType === bt ? `1px solid ${C.accentBorder}` : `1px solid ${C.border}`,
                              background: newPt.bloodType === bt ? C.accentLight                  : C.bgSurface,
                              color:      newPt.bloodType === bt ? C.accent                       : C.textSub,
                            }}>
                            {bt}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <Field label="Clinical Notes (Optional)" value={newPt.notes} onChange={setNP("notes")}
                           placeholder="Relevant medical history, symptoms…"/>
                  </div>

                  <motion.button onClick={handleCreatePatient} disabled={createLoading}
                    whileHover={!createLoading ? { scale: 1.02, background: "#333" } : {}}
                    whileTap={!createLoading ? { scale: 0.97 } : {}}
                    style={{
                      ...DISPLAY, width: "100%", marginTop: 32, height: 50,
                      fontSize: 16, letterSpacing: "0.08em",
                      color: "#fff", background: C.textPrimary,
                      border: "none", borderRadius: 11, cursor: createLoading ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: createLoading ? 0.75 : 1, transition: "background 0.2s",
                    }}>
                    {createLoading ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                           stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                          <animateTransform attributeName="transform" type="rotate"
                            from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                        </path>
                      </svg>
                    ) : "Create Patient & Continue"}
                  </motion.button>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Confirm patient modal ── */}
        <AnimatePresence>
          {confirmOpen && selectedPatient && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={e => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
              style={overlayStyle}>
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.88, opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                style={modalStyle}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
                  background: C.accentLight, border: `1px solid ${C.accentBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                       stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div style={{ ...DISPLAY, fontSize: 28, color: C.textPrimary, letterSpacing: "0.06em", textAlign: "center", marginBottom: 6 }}>
                  Patient Selected
                </div>
                <p style={{ ...BODY, fontSize: 14, color: C.textSub, textAlign: "center", marginBottom: 26, lineHeight: 1.65 }}>
                  Analysis results will be saved under this patient's profile.
                </p>
                <div style={{ background: C.bgSurface, border: `1px solid ${C.border}`,
                              borderRadius: 12, padding: "16px 20px", marginBottom: 26 }}>
                  <div style={{ ...BODY, fontSize: 16, fontWeight: 600, color: C.textPrimary, marginBottom: 8 }}>
                    {selectedPatient.name}
                  </div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {[
                      { label: "ID",    value: selectedPatient.patientIdStr },
                      { label: "Age",   value: selectedPatient.age ? `${selectedPatient.age} yrs` : "—" },
                      { label: "Blood", value: selectedPatient.bloodType },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ ...DISPLAY, fontSize: 9, letterSpacing: "0.16em", color: C.accent, opacity: 0.7, marginBottom: 2 }}>{label}</div>
                        <div style={{ ...BODY, fontSize: 13, color: C.textSub }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setConfirmOpen(false)}
                    style={{ ...DISPLAY, flex: 1, height: 46, fontSize: 14, letterSpacing: "0.06em",
                             color: C.textMuted, background: C.bgSurface, border: `1px solid ${C.border}`,
                             borderRadius: 9, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <motion.button onClick={proceedToClassifier}
                    whileHover={{ scale: 1.02, background: "#333" }} whileTap={{ scale: 0.97 }}
                    style={{ ...DISPLAY, flex: 2, height: 46, fontSize: 14, letterSpacing: "0.06em",
                             color: "#fff", background: C.textPrimary, border: "none", borderRadius: 9, cursor: "pointer" }}>
                    Proceed to Classifier
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Quick analysis modal ── */}
        <AnimatePresence>
          {quickOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={e => { if (e.target === e.currentTarget) setQuickOpen(false); }}
              style={overlayStyle}>
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.88, opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                style={{ ...modalStyle, maxWidth: 420, border: "1px solid rgba(245,158,11,0.25)" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                       stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div style={{ ...DISPLAY, fontSize: 28, color: C.textPrimary, letterSpacing: "0.06em", textAlign: "center", marginBottom: 8 }}>
                  Quick Analysis Mode
                </div>
                <p style={{ ...BODY, fontSize: 14, color: C.textSub, textAlign: "center", marginBottom: 8, lineHeight: 1.7 }}>
                  Results will <span style={{ color: "#f59e0b", fontWeight: 600 }}>not be saved</span> to any patient record.
                </p>
                <p style={{ ...BODY, fontSize: 13, color: C.textMuted, textAlign: "center", marginBottom: 28, lineHeight: 1.65 }}>
                  For temporary testing or educational purposes only.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setQuickOpen(false)}
                    style={{ ...DISPLAY, flex: 1, height: 46, fontSize: 14, letterSpacing: "0.06em",
                             color: C.textMuted, background: C.bgSurface, border: `1px solid ${C.border}`,
                             borderRadius: 9, cursor: "pointer" }}>
                    Go Back
                  </button>
                  <motion.button onClick={proceedQuick}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    style={{ ...DISPLAY, flex: 2, height: 46, fontSize: 14, letterSpacing: "0.06em",
                             color: "#0a0a0f", background: "#f59e0b",
                             border: "none", borderRadius: 9, cursor: "pointer" }}>
                    Continue Without Saving
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
