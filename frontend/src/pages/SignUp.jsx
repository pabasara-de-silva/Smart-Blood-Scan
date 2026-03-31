import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

const DISPLAY = { fontFamily: "'Bebas Neue', sans-serif" };
const BODY    = { fontFamily: "'Outfit', sans-serif" };

const C = {
  bg:          "#ffffff",
  bgSurface:   "#f7f7f7",
  border:      "rgba(0,0,0,0.08)",
  borderMid:   "rgba(0,0,0,0.12)",
  accent:      "#e53935",
  accentLight: "rgba(229,57,53,0.07)",
  textPrimary: "#0a0a0f",
  textSub:     "#555555",
  textMuted:   "#888888",
};

const SPECIALIZATIONS = [
  "Hematologist", "Pathologist", "Hematopathologist",
  "Clinical Laboratory Scientist", "Oncologist", "Other",
];

// ── Step indicator ────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div key={i}
          animate={{
            width: i === current ? 32 : 10,
            background: i <= current ? C.accent : C.border,
          }}
          transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
          style={{ height: 5, borderRadius: 99 }}
        />
      ))}
    </div>
  );
}

// ── Input field ──────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, error, autoComplete, rightEl }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{
        ...DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
        textTransform: "uppercase", color: C.textMuted,
      }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={type} value={value} onChange={onChange}
          placeholder={placeholder} autoComplete={autoComplete}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            ...BODY, width: "100%", boxSizing: "border-box",
            padding: rightEl ? "13px 40px 13px 16px" : "13px 16px",
            fontSize: 15, color: C.textPrimary, background: C.bg,
            border: `1px solid ${error ? C.accent : focused ? C.accent : C.borderMid}`,
            borderRadius: 11, outline: "none", transition: "border-color 0.2s",
          }}
        />
        {rightEl && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}>
            {rightEl}
          </div>
        )}
      </div>
      {error && <span style={{ ...BODY, fontSize: 12, color: C.accent }}>{error}</span>}
    </div>
  );
}

// ── Select field ─────────────────────────────────────────────
function SelectField({ label, value, onChange, options, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{
        ...DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
        textTransform: "uppercase", color: C.textMuted,
      }}>
        {label}
      </label>
      <select value={value} onChange={onChange}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              style={{
                ...BODY, width: "100%", padding: "13px 16px", fontSize: 15,
                color: value ? C.textPrimary : C.textMuted,
                background: C.bg,
                border: `1px solid ${error ? C.accent : focused ? C.accent : C.borderMid}`,
                borderRadius: 11, outline: "none", appearance: "none", cursor: "pointer",
                transition: "border-color 0.2s",
              }}>
        <option value="" disabled style={{ background: C.bg }}>Select specialization</option>
        {options.map(o => <option key={o} value={o} style={{ background: C.bg }}>{o}</option>)}
      </select>
      {error && <span style={{ ...BODY, fontSize: 12, color: C.accent }}>{error}</span>}
    </div>
  );
}

// ── Password strength ─────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)];
  const score  = checks.filter(Boolean).length;
  const colors = ["#e53935","#ff7043","#ffa726","#0e9e8a"];
  const labels = ["Weak","Fair","Good","Strong"];
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
        {[0,1,2,3].map(i => (
          <motion.div key={i}
            animate={{ background: i < score ? colors[score-1] : C.border }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, height: 4, borderRadius: 99 }}
          />
        ))}
      </div>
      <span style={{ ...BODY, fontSize: 12, color: score > 0 ? colors[score-1] : "transparent" }}>
        {score > 0 ? labels[score-1] : ""}
      </span>
    </div>
  );
}

// ── Main SignUp ───────────────────────────────────────────────
export default function SignUp() {
  const navigate = useNavigate();
  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState({
    firstName: "", lastName: "", email: "",
    specialization: "", institution: "", licenseNo: "",
    password: "", confirm: "",
  });
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [dir, setDir]               = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => navigate("/patients"), 2000);
      return () => clearTimeout(t);
    }
  }, [done, navigate]);

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setErrors(err => ({ ...err, [key]: "" }));
  };

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.firstName.trim()) e.firstName = "First name is required";
      if (!form.lastName.trim())  e.lastName  = "Last name is required";
      if (!form.email.trim())     e.email     = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    } else if (step === 1) {
      if (!form.specialization)     e.specialization = "Please select a specialization";
      if (!form.institution.trim()) e.institution    = "Institution is required";
    } else if (step === 2) {
      if (!form.password) e.password = "Password is required";
      else if (form.password.length < 8) e.password = "Minimum 8 characters";
      else if (!/[A-Z]/.test(form.password)) e.password = "Include at least one uppercase letter";
      else if (!/[0-9]/.test(form.password)) e.password = "Include at least one number";
      else if (!/[^A-Za-z0-9]/.test(form.password)) e.password = "Include at least one special character";
      if (!form.confirm) e.confirm = "Confirm your password";
      else if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const back = () => { setErrors({}); setStep(s => s - 1); };
  const goNext = () => { setDir(1);  next(); };
  const goBack = () => { setDir(-1); back(); };

  const submit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(), lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(), specialization: form.specialization,
          institution: form.institution.trim(), licenseNo: form.licenseNo, password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.detail === "License number already exists") { setErrors(p => ({ ...p, licenseNo: data.detail })); setStep(1); setDir(-1); }
        else if (data.detail === "User already exists")      { setErrors(p => ({ ...p, email: data.detail }));    setStep(0); setDir(-1); }
        else alert(data.detail);
        setSubmitting(false); return;
      }
      setDone(true);
    } catch { alert("Server error"); }
    setSubmitting(false);
  };

  const stepVariants = {
    enter:  (d) => ({ x: d > 0 ? 52 : -52, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d) => ({ x: d > 0 ? -52 : 52, opacity: 0 }),
  };

  const eyeIcon = (visible) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2">
      {visible
        ? <><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C7 19 2.73 15.11 1 12c.73-1.3 1.68-2.4 2.8-3.3"/><path d="M1 1l22 22"/></>
        : <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>
      }
    </svg>
  );

  const steps = [
    <div key={0} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="First name" value={form.firstName} onChange={set("firstName")}
               placeholder="e.g. Sarah" error={errors.firstName} autoComplete="given-name"/>
        <Field label="Last name"  value={form.lastName}  onChange={set("lastName")}
               placeholder="e.g. Chen"  error={errors.lastName}  autoComplete="family-name"/>
      </div>
      <Field label="Email address" type="email" value={form.email} onChange={set("email")}
             placeholder="you@hospital.org" error={errors.email} autoComplete="email"/>
    </div>,

    <div key={1} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SelectField label="Specialization" value={form.specialization}
                   onChange={set("specialization")} options={SPECIALIZATIONS} error={errors.specialization}/>
      <Field label="Institution / Hospital" value={form.institution} onChange={set("institution")}
             placeholder="e.g. Johns Hopkins Hospital" error={errors.institution}/>
      <Field label="Medical License No. (optional)" value={form.licenseNo} onChange={set("licenseNo")}
             placeholder="e.g. ML-123456" error={errors.licenseNo}/>
    </div>,

    <div key={2} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <Field label="Password" type={showPassword ? "text" : "password"}
               value={form.password} onChange={set("password")}
               placeholder="Min. 8 characters" error={errors.password} autoComplete="new-password"
               rightEl={<span onClick={() => setShowPassword(!showPassword)}>{eyeIcon(showPassword)}</span>}/>
        <PasswordStrength password={form.password}/>
      </div>
      <Field label="Confirm password" type={showConfirm ? "text" : "password"}
             value={form.confirm} onChange={set("confirm")}
             placeholder="Re-enter password" error={errors.confirm} autoComplete="new-password"
             rightEl={<span onClick={() => setShowConfirm(!showConfirm)}>{eyeIcon(showConfirm)}</span>}/>
    </div>,
  ];

  const stepTitles = ["Create account", "Professional profile", "Secure access"];
  const stepSubs   = [
    "Enter your personal details to get started.",
    "Help us verify your clinical credentials.",
    "Set a strong password to protect patient data.",
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{ minHeight: "100vh", display: "flex", background: C.bg }}>

        {/* ── Left decorative panel ── */}
        <div style={{
          display: "none",
          flex: "0 0 520px",
          position: "relative", overflow: "hidden",
          background: C.bgSurface,
          borderRight: `1px solid ${C.border}`,
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "64px 60px",
        }} className="left-panel">

          <svg viewBox="0 0 300 300" width="260" height="260"
               style={{ marginBottom: 40, overflow: "visible" }}>
            <defs>
              <radialGradient id="lpG2" cx="42%" cy="38%" r="55%">
                <stop offset="0%"   stopColor="#ff6b6b" stopOpacity="0.6"/>
                <stop offset="40%"  stopColor="#e53935" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#7b0000" stopOpacity="0.2"/>
              </radialGradient>
              <radialGradient id="lpD2" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#3a0000" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#3a0000" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id="lpGl2" cx="38%" cy="28%" r="40%">
                <stop offset="0%"   stopColor="#ffaaaa" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#ffaaaa" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <g style={{ animation: "cellFloat2 6s ease-in-out infinite", transformOrigin: "150px 150px" }}>
              <ellipse cx="150" cy="150" rx="115" ry="115" fill="url(#lpG2)"/>
              <ellipse cx="150" cy="150" rx="54"  ry="54"  fill="url(#lpD2)"/>
              <ellipse cx="150" cy="150" rx="115" ry="115" fill="url(#lpGl2)"/>
              <ellipse cx="150" cy="150" rx="115" ry="115" fill="none" stroke="#e53935" strokeWidth="1" opacity="0.15"/>
            </g>
            <style>{`@keyframes cellFloat2 { 0%,100%{transform:scale(1) rotate(0deg);} 50%{transform:scale(1.06) rotate(4deg);} }`}</style>
          </svg>

          <div style={{ textAlign: "center" }}>
            <div style={{ ...DISPLAY, fontSize: 48, color: C.textPrimary, letterSpacing: "0.08em", lineHeight: 0.95 }}>
              Smart<span style={{ color: C.accent }}>Blood</span><br/>Scan
            </div>
            <p style={{ ...BODY, fontSize: 14, color: C.textMuted, marginTop: 16, lineHeight: 1.8 }}>
              AI-assisted leukemia detection<br/>for clinical professionals.
            </p>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22,1,0.36,1] }}
            style={{ width: "100%", maxWidth: 460 }}
          >
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: "50%", margin: "0 auto 24px",
                    background: "rgba(14,158,138,0.08)", border: "1px solid rgba(14,158,138,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                         stroke="#0e9e8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div style={{ ...DISPLAY, fontSize: 42, color: C.textPrimary, letterSpacing: "0.08em" }}>
                    Account Created
                  </div>
                  <p style={{ ...BODY, fontSize: 14, color: C.textSub, marginTop: 12 }}>Redirecting you now…</p>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ marginBottom: 10 }}>
                    <StepIndicator current={step} total={3}/>
                  </div>
                  <div style={{ marginBottom: 32, marginTop: 18 }}>
                    <div style={{ ...DISPLAY, fontSize: 48, color: C.textPrimary, letterSpacing: "0.06em", lineHeight: 0.95 }}>
                      {stepTitles[step]}
                    </div>
                    <p style={{ ...BODY, fontSize: 15, color: C.textSub, marginTop: 10, lineHeight: 1.65 }}>
                      {stepSubs[step]}
                    </p>
                  </div>

                  <AnimatePresence mode="wait" custom={dir}>
                    <motion.div key={step} custom={dir}
                      variants={stepVariants} initial="enter" animate="center" exit="exit"
                      transition={{ duration: 0.32, ease: [0.22,1,0.36,1] }}>
                      {steps[step]}
                    </motion.div>
                  </AnimatePresence>

                  <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
                    {step > 0 && (
                      <motion.button onClick={goBack}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        style={{
                          ...DISPLAY, flex: "0 0 50px", height: 50, fontSize: 20,
                          color: C.textSub, background: C.bgSurface,
                          border: `1px solid ${C.border}`, borderRadius: 11, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                        ←
                      </motion.button>
                    )}
                    <motion.button onClick={step < 2 ? goNext : submit} disabled={submitting}
                      whileHover={{ scale: 1.02, background: "#333" }} whileTap={{ scale: 0.97 }}
                      style={{
                        ...DISPLAY, flex: 1, height: 50, fontSize: 16, letterSpacing: "0.06em",
                        color: "#fff", background: C.textPrimary,
                        border: "none", borderRadius: 11, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        opacity: submitting ? 0.7 : 1, transition: "background 0.2s",
                      }}>
                      {submitting ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                             stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                            <animateTransform attributeName="transform" type="rotate"
                              from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                          </path>
                        </svg>
                      ) : (step < 2 ? "Continue" : "Create Account")}
                    </motion.button>
                  </div>

                  <p style={{ ...BODY, fontSize: 14, color: C.textMuted, textAlign: "center", marginTop: 26 }}>
                    Already have an account?{" "}
                    <span onClick={() => navigate("/signin")}
                          style={{ color: C.accent, cursor: "pointer", fontWeight: 600 }}>
                      Sign in
                    </span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <style>{`
          @media (min-width: 860px) { .left-panel { display: flex !important; } }
        `}</style>
      </div>
    </>
  );
}
