import { useState } from "react";
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
  accentBorder:"rgba(229,57,53,0.2)",
  textPrimary: "#0a0a0f",
  textSub:     "#555555",
  textMuted:   "#888888",
  textFaint:   "#aaaaaa",
};

function RBCLogo({ size = 28 }) {
  return (
    <svg viewBox="0 0 140 140" width={size} height={size} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="liG" cx="42%" cy="38%" r="55%">
          <stop offset="0%"   stopColor="#ff6b6b"/>
          <stop offset="40%"  stopColor="#e53935"/>
          <stop offset="100%" stopColor="#7b0000"/>
        </radialGradient>
        <radialGradient id="liD" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#3a0000" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#3a0000" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="liGl" cx="38%" cy="28%" r="40%">
          <stop offset="0%"   stopColor="#ffaaaa" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#ffaaaa" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#liG)"/>
      <ellipse cx="70" cy="70" rx="22" ry="22" fill="url(#liD)"/>
      <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#liGl)"/>
      <ellipse cx="70" cy="70" rx="46" ry="46" fill="none"
               stroke="#ff9090" strokeWidth="1.5" opacity="0.35"/>
    </svg>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, error, autoComplete, rightEl, onKeyDown }) {
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
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            ...BODY, width: "100%", boxSizing: "border-box",
            padding: rightEl ? "13px 40px 13px 16px" : "13px 16px",
            fontSize: 15, color: C.textPrimary,
            background: C.bg,
            border: `1px solid ${error ? C.accent : focused ? C.accent : C.borderMid}`,
            borderRadius: 11, outline: "none",
            transition: "border-color 0.2s",
          }}
        />
        {rightEl && (
          <div style={{
            position: "absolute", right: 12, top: "50%",
            transform: "translateY(-50%)", display: "flex", alignItems: "center", cursor: "pointer",
          }}>
            {rightEl}
          </div>
        )}
      </div>
      {error && <span style={{ ...BODY, fontSize: 12, color: C.accent }}>{error}</span>}
    </div>
  );
}

export default function SignIn() {
  const navigate = useNavigate();
  const [form, setForm]           = useState({ email: "", password: "" });
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake]         = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent]   = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password.trim()) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) { setShake(true); setTimeout(() => setShake(false), 500); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("email", form.email);
      fd.append("password", form.password);
      const res = await fetch("http://127.0.0.1:5000/signin", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (data.detail === "User not found") setErrors({ email: data.detail });
        else setErrors({ password: data.detail || "Login failed" });
        setShake(true); setTimeout(() => setShake(false), 500);
      } else {
        sessionStorage.setItem("user", JSON.stringify(data));
        navigate("/patients");
      }
    } catch { alert("Server error"); }
    setSubmitting(false);
  };

  const sendForgot = async () => {
    const email = forgotEmail.trim();
    if (!email) {
      setForgotError("Email is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setForgotError("Enter a valid email");
      return;
    }

    setForgotSending(true);
    setForgotError("");

    try {
      const res = await fetch("http://127.0.0.1:5000/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setForgotError(data.detail || "Failed to send reset email");
        return;
      }

      setForgotSent(true);
    } catch {
      setForgotError("Server error. Please try again.");
    } finally {
      setForgotSending(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") submit(); };

  const eyeIcon = (visible) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke={C.textMuted} strokeWidth="2">
      {visible
        ? <><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C7 19 2.73 15.11 1 12c.73-1.3 1.68-2.4 2.8-3.3"/><path d="M1 1l22 22"/></>
        : <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>
      }
    </svg>
  );

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
        }} className="left-panel-signin">

          {/* Animated cell SVG */}
          <svg viewBox="0 0 300 300" width="260" height="260"
               style={{ marginBottom: 40, overflow: "visible" }}>
            <defs>
              <radialGradient id="lpG" cx="42%" cy="38%" r="55%">
                <stop offset="0%"   stopColor="#ff6b6b" stopOpacity="0.6"/>
                <stop offset="40%"  stopColor="#e53935" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#7b0000" stopOpacity="0.2"/>
              </radialGradient>
              <radialGradient id="lpD" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#3a0000" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#3a0000" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id="lpGl" cx="38%" cy="28%" r="40%">
                <stop offset="0%"   stopColor="#ffaaaa" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#ffaaaa" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <g style={{ animation: "cellFloat 6s ease-in-out infinite", transformOrigin: "150px 150px" }}>
              <ellipse cx="150" cy="150" rx="115" ry="115" fill="url(#lpG)"/>
              <ellipse cx="150" cy="150" rx="54"  ry="54"  fill="url(#lpD)"/>
              <ellipse cx="150" cy="150" rx="115" ry="115" fill="url(#lpGl)"/>
              <ellipse cx="150" cy="150" rx="115" ry="115" fill="none" stroke="#e53935" strokeWidth="1" opacity="0.15"/>
            </g>
            <style>{`@keyframes cellFloat { 0%,100%{transform:scale(1) rotate(0deg);} 50%{transform:scale(1.06) rotate(4deg);} }`}</style>
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
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "48px 24px",
        }}>
          <motion.div
            initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22,1,0.36,1] }}
            style={{ width: "100%", maxWidth: 440 }}
          >
            {/* Mobile logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}
                 className="mobile-logo">
              <RBCLogo size={24}/>
              <span style={{ ...DISPLAY, fontSize: 20, color: C.textPrimary, letterSpacing: "0.12em" }}>
                Smart Blood Scan
              </span>
            </div>

            <div style={{ marginBottom: 36 }}>
              <div style={{ ...DISPLAY, fontSize: 52, color: C.textPrimary, letterSpacing: "0.06em", lineHeight: 0.95 }}>
                Welcome back
              </div>
              <p style={{ ...BODY, fontSize: 15, color: C.textSub, marginTop: 12, lineHeight: 1.65 }}>
                Sign in to your clinical dashboard.
              </p>
            </div>

            <motion.div animate={shake ? { x: [0,-8,8,-6,6,-3,0] } : {}} transition={{ duration: 0.45 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Field label="Email address" type="email" value={form.email}
                  onChange={set("email")} placeholder="you@hospital.org"
                  error={errors.email} autoComplete="off" onKeyDown={handleKey}/>
                <Field
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={form.password} onChange={set("password")}
                  placeholder="Your password" error={errors.password}
                  autoComplete="current-password" onKeyDown={handleKey}
                  rightEl={
                    <span onClick={() => setShowPassword(!showPassword)}>
                      {eyeIcon(showPassword)}
                    </span>
                  }
                />
                <div style={{ textAlign: "right", marginTop: -10 }}>
                  <span onClick={() => setForgotOpen(true)}
                    style={{ ...BODY, fontSize: 13, color: C.accent, cursor: "pointer" }}>
                    Forgot password?
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.button
              onClick={submit} disabled={submitting}
              whileHover={{ scale: 1.02, background: "#333" }} whileTap={{ scale: 0.97 }}
              style={{
                ...DISPLAY, width: "100%", marginTop: 32, height: 50,
                fontSize: 16, letterSpacing: "0.06em",
                color: "#ffffff", background: C.textPrimary,
                border: "none", borderRadius: 11, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: submitting ? 0.75 : 1, transition: "background 0.2s",
              }}>
              {submitting ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                     stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                    <animateTransform attributeName="transform" type="rotate"
                      from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                  </path>
                </svg>
              ) : "Sign In"}
            </motion.button>

            <p style={{ ...BODY, fontSize: 14, color: C.textMuted, textAlign: "center", marginTop: 26 }}>
              New to Smart Blood Scan?{" "}
              <span onClick={() => navigate("/signup")}
                    style={{ color: C.accent, cursor: "pointer", fontWeight: 600 }}>
                Sign Up
              </span>
            </p>
          </motion.div>
        </div>

        {/* ── Forgot Password Modal ── */}
        <AnimatePresence>
          {forgotOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setForgotOpen(false);
                  setForgotSent(false);
                  setForgotEmail("");
                  setForgotError("");
                }
              }}
              style={{
                position: "fixed", inset: 0, zIndex: 100,
                background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
              }}>
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.88, opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                style={{
                  width: "100%", maxWidth: 400, padding: "36px",
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 18, boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
                }}>
                {forgotSent ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: "50%", margin: "0 auto 20px",
                      background: "rgba(14,158,138,0.08)", border: "1px solid rgba(14,158,138,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                           stroke="#0e9e8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div style={{ ...DISPLAY, fontSize: 30, color: C.textPrimary, letterSpacing: "0.06em" }}>Link Sent</div>
                    <p style={{ ...BODY, fontSize: 14, color: C.textSub, marginTop: 10, lineHeight: 1.7 }}>
                      Check <span style={{ color: C.accent }}>{forgotEmail}</span> for a reset link.
                    </p>
                    <button onClick={() => { setForgotOpen(false); setForgotSent(false); setForgotEmail(""); setForgotError(""); }}
                      style={{ ...DISPLAY, marginTop: 24, padding: "11px 32px", fontSize: 14,
                               color: "#fff", background: C.textPrimary, border: "none", borderRadius: 9, cursor: "pointer" }}>
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ ...DISPLAY, fontSize: 32, color: C.textPrimary, letterSpacing: "0.06em", marginBottom: 8 }}>
                      Reset Password
                    </div>
                    <p style={{ ...BODY, fontSize: 14, color: C.textSub, marginBottom: 26, lineHeight: 1.65 }}>
                      Enter your registered email and we'll send a reset link.
                    </p>
                    <Field label="Email address" type="email" value={forgotEmail}
                           onChange={(e) => setForgotEmail(e.target.value)}
                           placeholder="you@hospital.org" autoComplete="email"/>
                    {forgotError && (
                      <p style={{ ...BODY, fontSize: 12, color: C.accent, marginTop: 10 }}>
                        {forgotError}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                      <button
                        onClick={() => {
                          setForgotOpen(false);
                          setForgotEmail("");
                          setForgotError("");
                        }}
                        style={{ ...DISPLAY, flex: 1, height: 46, fontSize: 14,
                                 color: C.textMuted, background: C.bgSurface,
                                 border: `1px solid ${C.border}`, borderRadius: 9, cursor: "pointer" }}>
                        Cancel
                      </button>
                      <motion.button onClick={sendForgot}
                        disabled={forgotSending}
                        whileHover={{ scale: 1.02, background: "#333" }} whileTap={{ scale: 0.97 }}
                        style={{ ...DISPLAY, flex: 1, height: 46, fontSize: 14,
                                 color: "#fff", background: C.textPrimary,
                                 border: "none", borderRadius: 9, cursor: "pointer", opacity: forgotSending ? 0.75 : 1 }}>
                        {forgotSending ? "Sending..." : "Send Link"}
                      </motion.button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          @media (min-width: 860px) {
            .left-panel-signin { display: flex !important; }
            .mobile-logo { display: none !important; }
          }
        `}</style>
      </div>
    </>
  );
}
