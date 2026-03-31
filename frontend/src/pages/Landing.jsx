import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "motion/react";

import cell1 from "../assets/cells/cell1.jpg";
import cell2 from "../assets/cells/cell2.jpg";
import cell3 from "../assets/cells/cell3.jpg";
import cell4 from "../assets/cells/cell4.jpg";
import cell5 from "../assets/cells/cell5.jpg";
import cell6 from "../assets/cells/cell6.jpg";
import cell7 from "../assets/cells/cell7.jpg";
import cell8 from "../assets/cells/cell8.jpg";

const DISPLAY = { fontFamily: "'Bebas Neue', sans-serif" };
const BODY    = { fontFamily: "'Outfit', sans-serif" };

const C = {
  bg:          "#ffffff",
  bgSurface:   "#f7f7f7",
  bgSurfaceAlt:"#f0f0f0",
  border:      "rgba(0,0,0,0.08)",
  borderMid:   "rgba(0,0,0,0.12)",
  accent:      "#e53935",
  accentLight: "rgba(229,57,53,0.08)",
  accentBorder:"rgba(229,57,53,0.2)",
  textPrimary: "#0a0a0f",
  textSub:     "#555555",
  textMuted:   "#888888",
  textFaint:   "#aaaaaa",
};

const CELL_IMAGES = [
  { src: cell1, label: "Leukemic", confidence: 94.2 },
  { src: cell2, label: "Healthy",  confidence: 97.8 },
  { src: cell3, label: "Leukemic", confidence: 88.5 },
  { src: cell4, label: "Healthy",  confidence: 95.1 },
  { src: cell5, label: "Leukemic", confidence: 91.7 },
  { src: cell6, label: "Healthy",  confidence: 98.3 },
  { src: cell7, label: "Leukemic", confidence: 86.4 },
  { src: cell8, label: "Healthy",  confidence: 93.6 },
];

// ── Scroll-triggered section wrapper ─────────────────────────
function ScrollSection({ children, id }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      id={id} ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ tag, title, accent, sub }) {
  return (
    <div style={{ marginBottom: 56, textAlign: "center" }}>
      <div style={{
        ...DISPLAY, fontSize: 11, letterSpacing: "0.28em",
        color: C.accent, marginBottom: 16, textTransform: "uppercase", opacity: 0.7,
      }}>
        {tag}
      </div>
      <div style={{
        ...DISPLAY, fontSize: "clamp(2.4rem, 5vw, 4rem)",
        color: C.textPrimary, lineHeight: 0.95, letterSpacing: "0.05em",
      }}>
        {title}{" "}
        {accent && <span style={{ color: C.accent }}>{accent}</span>}
      </div>
      {sub && (
        <p style={{
          ...BODY, fontSize: 15, color: C.textSub,
          marginTop: 16, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto',
          lineHeight: 1.75,
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div style={{ height: 1, background: C.border, margin: "0 auto", maxWidth: 900 }} />
  );
}

// ── RBC Canvas animation (unchanged) ─────────────────────────
function drawRBC(ctx, x, y, r, alpha = 1, scale = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const glow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.0);
  glow.addColorStop(0, "rgba(220,38,38,0.20)");
  glow.addColorStop(0.5, "rgba(123,0,0,0.08)");
  glow.addColorStop(1, "rgba(220,38,38,0)");
  ctx.beginPath(); ctx.arc(0, 0, r * 2.0, 0, Math.PI * 2);
  ctx.fillStyle = glow; ctx.fill();
  const body = ctx.createRadialGradient(-r * 0.16, -r * 0.24, r * 0.02, r * 0.08, r * 0.08, r * 1.05);
  body.addColorStop(0, "#ff6b6b");
  body.addColorStop(0.40, "#e53935");
  body.addColorStop(1, "#7b0000");
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = body; ctx.fill();
  const dimple = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.50);
  dimple.addColorStop(0, "rgba(58,0,0,0.70)");
  dimple.addColorStop(1, "rgba(58,0,0,0)");
  ctx.beginPath(); ctx.arc(0, 0, r * 0.50, 0, Math.PI * 2);
  ctx.fillStyle = dimple; ctx.fill();
  const gloss = ctx.createRadialGradient(-r * 0.24, -r * 0.44, 0, -r * 0.24, -r * 0.44, r * 0.80);
  gloss.addColorStop(0, "rgba(255,170,170,0.55)");
  gloss.addColorStop(1, "rgba(255,170,170,0)");
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = gloss; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,144,144,0.35)";
  ctx.lineWidth = 1.0; ctx.stroke();
  ctx.restore();
}

function BloodFlowCanvas({ onCellHover, onCellLeave, hoveredId }) {
  const canvasRef = useRef(null);
  const state = useRef({ stage: 0, cells: [], mouse: { x: -9999, y: -9999 }, time: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const W = () => canvas.width;
    const H = () => canvas.height;

    state.current.cells = [{
      id: 0, x: 0.5, y: 0.5, r: 28, alpha: 0,
      phase: 0, speed: 0, offset: 0,
      imageIdx: Math.floor(Math.random() * CELL_IMAGES.length),
    }];
    setTimeout(() => { state.current.cells[0].alpha = 1; }, 300);
    setTimeout(() => {
      state.current.stage = 1;
      const N = 22;
      state.current.cells = Array.from({ length: N }, (_, i) => ({
        id: i, x: Math.random(), y: 0.35 + Math.random() * 0.3,
        r: 16 + Math.random() * 16, alpha: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0008 + Math.random() * 0.0006,
        offset: Math.random() * Math.PI * 2,
        imageIdx: Math.floor(Math.random() * CELL_IMAGES.length),
      }));
      state.current.cells.forEach((c, i) => { setTimeout(() => { c.alpha = 1; }, i * 80); });
    }, 2500);
    setTimeout(() => { state.current.stage = 3; }, 4000);

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      state.current.mouse = { x: mx, y: my };
      let hit = null;
      state.current.cells.forEach((c) => {
        const dist = Math.sqrt((c.x * W() - mx) ** 2 + (c.y * H() - my) ** 2);
        if (dist < c.r * 1.4) hit = c;
      });
      if (hit) onCellHover({ id: hit.id, x: hit.x * W(), y: hit.y * H(), r: hit.r, imageIdx: hit.imageIdx });
      else onCellLeave();
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", () => { state.current.mouse = { x: -9999, y: -9999 }; onCellLeave(); });

    const draw = () => {
      const s = state.current;
      s.time += 0.012;
      ctx.clearRect(0, 0, W(), H());
      if (s.stage >= 1) {
        ctx.save();
        ctx.strokeStyle = "#FA8072";
        ctx.lineWidth = H() * 0.32; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(0, H() * 0.5);
        for (let px = 0; px <= W(); px += 4)
          ctx.lineTo(px, H() * 0.5 + Math.sin(px * 0.005 + s.time * 0.3) * H() * 0.06);
        ctx.stroke(); ctx.restore();
      }
      s.cells.forEach((c) => {
        if (c.id === hoveredId) return;
        let cx, cy;
        if (s.stage >= 3) {
          c.x += c.speed;
          if (c.x > 1.12) c.x = -0.12;
          cx = c.x * W();
          cy = H() * 0.5
            + Math.sin(c.x * Math.PI * 3.5 + c.offset + s.time * 0.4) * H() * 0.1
            + Math.sin(c.x * Math.PI * 1.8 + c.phase) * H() * 0.06;
          c.y = cy / H();
        } else { cx = c.x * W(); cy = c.y * H(); }
        const pulse = 1 + Math.sin(s.time * 2.5 + c.phase) * 0.03;
        drawRBC(ctx, cx, cy, c.r, c.alpha, pulse);
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function CellOverlay({ cell }) {
  if (!cell) return null;
  const info = CELL_IMAGES[cell.imageIdx];
  const isHealthy = info.label === "Healthy";
  return (
    <AnimatePresence>
      <motion.div
        key={cell.id}
        initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.3, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="absolute z-30 pointer-events-none"
        style={{ left: cell.x - 100, top: cell.y - 130, width: 150, transformOrigin: "bottom center" }}
      >
        <div className="w-full rounded-2xl overflow-hidden" style={{
          height: 120,
          border: `2px solid ${isHealthy ? "rgba(14,158,138,0.6)" : "rgba(220,38,38,0.6)"}`,
          boxShadow: `0 0 24px ${isHealthy ? "rgba(14,158,138,0.25)" : "rgba(220,38,38,0.25)"}`,
        }}>
          <img src={info.src} alt="cell" className="w-full h-full object-cover" />
        </div>
        <motion.div
          initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-2 rounded-xl px-3 py-2 text-center"
          style={{
            background: "#ffffff",
            border: `1px solid ${isHealthy ? "rgba(14,158,138,0.35)" : "rgba(220,38,38,0.35)"}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          <div style={{ ...DISPLAY, color: isHealthy ? "#0e9e8a" : "#e53935", fontSize: 13 }}>
            {info.label}
          </div>
          <div style={{ ...DISPLAY, color: C.textMuted, fontSize: 11, marginTop: 2 }}>
            {info.confidence}% confidence
          </div>
        </motion.div>
        <div className="mx-auto mt-1" style={{
          width: 0, height: 0,
          borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
          borderTop: `10px solid ${isHealthy ? "rgba(14,158,138,0.4)" : "rgba(220,38,38,0.4)"}`,
        }} />
      </motion.div>
    </AnimatePresence>
  );
}

// ════════════════════════════════════════════════════════════
//  SECTION 1 — THE CLINICAL PROBLEM
// ════════════════════════════════════════════════════════════
function ClinicalProblemSection() {
  const isMobile = useIsMobile();
  const stats = [
    { value: "6,100+", label: "New ALL cases per year", sub: "United States alone" },
    { value: "~80%",   label: "Survival rate with early detection", sub: "vs ~30% if detected late" },
    { value: "54%",    label: "of ALL cases are children", sub: "Most common childhood leukaemia" },
    { value: "Hours",  label: "Manual diagnosis time", sub: "Requiring specialist haematologist" },
  ];

  const problems = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
      title: "Subjectivity",
      body: "Manual classification of blood smear images is highly dependent on the individual pathologist's experience and the quality of the slide preparation, leading to inter-observer variability.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      title: "Speed",
      body: "A specialist haematologist must manually examine hundreds of cells per slide. In resource-limited settings, long wait times delay treatment and worsen patient outcomes.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      title: "Accessibility",
      body: "Specialist haematopathologists are concentrated in major urban centres. Rural and low-income regions lack access to the expertise needed for accurate ALL diagnosis.",
    },
  ];

  return (
    <section id="problem" style={{ padding: isMobile ? '72px 0 60px' : '120px 0 100px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px' }}>

        <ScrollSection id="problem-head">
          <SectionHead
            tag="The Clinical Challenge"
            title="Why Early Detection of"
            accent="ALL Matters"
            sub="Acute Lymphoblastic Leukaemia is the most common childhood cancer. Survival outcomes are directly tied to how quickly and accurately it is diagnosed — yet the current diagnostic process is slow, subjective, and specialist-dependent."
          />
        </ScrollSection>

        {/* Stats */}
        <ScrollSection id="problem-stats">
          <div style={{
            display: "grid", gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 1, background: C.border, border: `1px solid ${C.border}`,
            borderRadius: 18, overflow: 'hidden', marginBottom: 56,
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                padding: "36px 28px", background: C.bgSurface, textAlign: "center",
                borderRight: i < stats.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{ ...DISPLAY, fontSize: "clamp(2rem, 4vw, 3rem)", color: C.accent, letterSpacing: "0.04em" }}>
                  {s.value}
                </div>
                <div style={{ ...BODY, fontSize: 13, fontWeight: 600, color: C.textPrimary, marginTop: 8 }}>
                  {s.label}
                </div>
                <div style={{ ...BODY, fontSize: 12, color: C.textMuted, marginTop: 4, lineHeight: 1.5 }}>
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </ScrollSection>

        {/* Problems */}
        <ScrollSection id="problem-cards">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {problems.map((p, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.55 }}
                style={{
                  padding: "32px 28px", background: C.bgSurface,
                  border: `1px solid ${C.border}`, borderRadius: 16,
                }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: C.accentLight,
                  border: `1px solid ${C.accentBorder}`, display: "flex",
                  alignItems: "center", justifyContent: "center", marginBottom: 20,
                }}>
                  {p.icon}
                </div>
                <div style={{ ...DISPLAY, fontSize: 22, color: C.textPrimary, letterSpacing: "0.06em", marginBottom: 12 }}>
                  {p.title}
                </div>
                <p style={{ ...BODY, fontSize: 14, color: C.textSub, lineHeight: 1.8, margin: 0 }}>
                  {p.body}
                </p>
              </motion.div>
            ))}
          </div>
        </ScrollSection>

      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
//  SECTION 2 — HOW IT WORKS
// ════════════════════════════════════════════════════════════
function HowItWorksSection() {
  const isMobile = useIsMobile();
  const steps = [
    {
      num: "01",
      label: "Upload Blood Smear",
      detail: "The clinician uploads a microscopic blood smear image in JPG, PNG, or BMP format through the web interface. The system accepts images from standard laboratory microscopy equipment.",
      color: "#e53935",
    },
    {
      num: "02",
      label: "Stain Normalisation",
      detail: "Before inference, each image undergoes channel-wise percentile stretching to correct for staining variability across different laboratories and slide preparations — a critical step for model consistency.",
      color: "#d97706",
    },
    {
      num: "03",
      label: "5-Model Ensemble Inference",
      detail: "The image is simultaneously processed by all five trained CNN models — EfficientNetB0, DenseNet121, ResNet50, InceptionV3, and MobileNetV2 — each with its own architecture-specific preprocessing pipeline.",
      color: "#8b5cf6",
    },
    {
      num: "04",
      label: "Softmax-Weighted Decision",
      detail: "Each model's prediction is weighted by its validation accuracy using softmax temperature scaling. The combined probability is thresholded using Youden's J statistic for optimal sensitivity and specificity.",
      color: "#3b82f6",
    },
    {
      num: "05",
      label: "Grad-CAM Explanation",
      detail: "A Gradient-weighted Class Activation Map is generated using DenseNet121, highlighting the cell regions that most influenced the prediction — providing visual transparency into the model's decision.",
      color: "#0e9e8a",
    },
    {
      num: "06",
      label: "Saved to Patient Record",
      detail: "The classification result, confidence score, and Grad-CAM overlay are saved to the patient's medical record in MongoDB. Results are accessible in the scan history for longitudinal tracking.",
      color: "#059669",
    },
  ];

  return (
    <section id="how-it-works" style={{ padding: isMobile ? '60px 0' : '100px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px' }}>

        <ScrollSection id="how-head">
          <SectionHead
            tag="System Pipeline"
            title="From Image to"
            accent="Diagnosis"
            sub="Every blood smear image passes through a six-stage pipeline designed to maximise both accuracy and clinical transparency."
          />
        </ScrollSection>

        <ScrollSection id="how-steps">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
            {steps.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.5 }}
                style={{
                  padding: "28px 26px", background: C.bgSurface,
                  border: `1px solid ${C.border}`, borderRadius: 16,
                  position: "relative", overflow: "hidden",
                }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: s.color, opacity: 0.7,
                }} />
                <div style={{
                  ...DISPLAY, fontSize: 36, letterSpacing: "0.04em",
                  color: s.color, opacity: 0.15, marginBottom: 12, lineHeight: 1,
                }}>
                  {s.num}
                </div>
                <div style={{ ...DISPLAY, fontSize: 19, color: C.textPrimary, letterSpacing: "0.06em", marginBottom: 10 }}>
                  {s.label}
                </div>
                <p style={{ ...BODY, fontSize: 13, color: C.textSub, lineHeight: 1.8, margin: 0 }}>
                  {s.detail}
                </p>
              </motion.div>
            ))}
          </div>
        </ScrollSection>

      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
//  SECTION 3 — THE ENSEMBLE APPROACH
// ════════════════════════════════════════════════════════════
function EnsembleSection() {
  const isMobile = useIsMobile();
  const models = [
    { name: "EfficientNetB0", valAcc: 88.35, weight: null,  color: "#0e9e8a",
      strength: "Scales depth, width, and resolution simultaneously — high accuracy at lower compute cost." },
    { name: "DenseNet121",    valAcc: 89.45, weight: null,  color: "#8b5cf6",
      strength: "Every layer connects to every other — maximises feature reuse and gradient flow." },
    { name: "ResNet50",       valAcc: 89.59, weight: null,  color: "#3b82f6",
      strength: "Deep residual skip connections prevent vanishing gradients in the 50-layer network." },
    { name: "InceptionV3",    valAcc: null,  weight: null,  color: "#d97706",
      strength: "Parallel convolutions at multiple scales capture both fine and coarse cell features." },
    { name: "MobileNetV2",    valAcc: null,  weight: null,  color: "#ec4899",
      strength: "Lightweight depthwise separable convolutions — fast inference without sacrificing accuracy." },
  ];

  const maxAcc = Math.max(...models.filter(m => m.valAcc !== null).map(m => m.valAcc));

  return (
    <section id="ensemble" style={{ padding: isMobile ? '60px 0' : '100px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px' }}>

        <ScrollSection id="ensemble-head">
          <SectionHead
            tag="The Ensemble Approach"
            title="Why 5 Models Beat"
            accent="Any Single Model"
            sub="Rather than selecting one CNN architecture, Smart Blood Scan combines five state-of-the-art models using softmax-weighted ensemble averaging — leveraging the complementary strengths of each architecture to achieve superior classification accuracy."
          />
        </ScrollSection>

        {/* Explanation row */}
        <ScrollSection id="ensemble-why">
          <div style={{
            display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 48,
          }}>
            {[
              {
                title: "Diversity of Architectures",
                body: "Each model learns to represent blood cell features differently. ResNet50 focuses on residual features, DenseNet121 on dense feature reuse, InceptionV3 on multi-scale patterns. Their diversity means their errors are uncorrelated — what one model gets wrong, another is likely to get right.",
              },
              {
                title: "Softmax Temperature Weighting",
                body: "Rather than equal averaging, each model is weighted by its validation accuracy using softmax with temperature T=20. This strongly up-weights the best-performing models while giving near-zero influence to weaker ones, producing a smarter combination than simple averaging.",
              },
              {
                title: "Optimal Threshold Selection",
                body: "The classification threshold is not fixed at 0.5. Instead, Youden's J statistic is used to find the threshold that maximises the sum of sensitivity and specificity on the test set — critical in medical diagnosis where both false negatives and false positives carry clinical consequences.",
              },
              {
                title: "Focal Loss for Class Imbalance",
                body: "The C-NMC 2019 dataset is imbalanced — 68.2% ALL vs 31.8% HEM. All five models were trained using focal loss (γ=2.0, α=0.75), which down-weights easy well-classified examples and focuses training on hard cases, particularly the minority healthy class.",
              },
            ].map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                style={{
                  padding: "28px 26px", background: C.bgSurface,
                  border: `1px solid ${C.border}`, borderRadius: 16,
                }}>
                <div style={{ ...DISPLAY, fontSize: 18, color: C.textPrimary, letterSpacing: "0.06em", marginBottom: 12 }}>
                  {item.title}
                </div>
                <p style={{ ...BODY, fontSize: 14, color: C.textSub, lineHeight: 1.8, margin: 0 }}>
                  {item.body}
                </p>
              </motion.div>
            ))}
          </div>
        </ScrollSection>

        {/* Model accuracy bars */}
        <ScrollSection id="ensemble-bars">
          <div style={{
            background: C.bgSurface, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: "32px 36px",
          }}>
            <div style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.22em", color: C.accent, opacity: 0.7, marginBottom: 28 }}>
              INDIVIDUAL MODEL VALIDATION ACCURACY
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {models.map((m, i) => (
                <motion.div key={m.name}
                  initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.45 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} />
                      <span style={{ ...DISPLAY, fontSize: 14, color: C.textPrimary, letterSpacing: "0.06em" }}>{m.name}</span>
                    </div>
                    <span style={{ ...BODY, fontSize: 13, fontWeight: 600, color: m.valAcc ? m.color : C.textFaint }}>
                      {m.valAcc ? `${m.valAcc.toFixed(2)}%` : "Training..."}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 6, borderRadius: 99, background: C.border }}>
                    <motion.div
                      style={{ height: 6, borderRadius: 99, background: m.color, opacity: m.valAcc ? 1 : 0.3 }}
                      initial={{ width: 0 }}
                      whileInView={{ width: m.valAcc ? `${(m.valAcc / 100) * 100}%` : "25%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.0, ease: "easeOut", delay: i * 0.1 }}
                    />
                  </div>
                  <p style={{ ...BODY, fontSize: 12, color: C.textMuted, marginTop: 6, marginBottom: 0 }}>
                    {m.strength}
                  </p>
                </motion.div>
              ))}
            </div>
            <div style={{
              marginTop: 28, padding: "16px 20px", borderRadius: 12,
              background: C.accentLight, border: `1px solid ${C.accentBorder}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ ...DISPLAY, fontSize: 14, color: C.accent, letterSpacing: "0.08em" }}>
                  WEIGHTED ENSEMBLE
                </div>
                <div style={{ ...BODY, fontSize: 12, color: C.textSub, marginTop: 3 }}>
                  Softmax-weighted combination · Optimal Youden threshold
                </div>
              </div>
              <div style={{ ...DISPLAY, fontSize: 22, color: C.accent, letterSpacing: "0.06em" }}>
                Results pending
              </div>
            </div>
            <p style={{ ...BODY, fontSize: 11, color: C.textFaint, marginTop: 12, textAlign: "right" }}>
              InceptionV3 and MobileNetV2 results pending. Ensemble metrics will be updated on completion.
            </p>
          </div>
        </ScrollSection>

      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
//  SECTION 4 — EXPLAINABILITY
// ════════════════════════════════════════════════════════════
function ExplainabilitySection() {
  const isMobile = useIsMobile();
  const methods = [
    {
      name: "Grad-CAM",
      full: "Gradient-weighted Class Activation Mapping",
      color: "#e53935",
      body: "Computes the gradient of the predicted class score with respect to the last convolutional layer's feature maps. The pooled gradients produce a spatial heatmap showing which regions of the cell most influenced the prediction. Warmer colours indicate stronger influence.",
      use: "Used in the web application for every prediction",
    },
    {
      name: "Grad-CAM++",
      full: "Improved Grad-CAM with second-order gradients",
      color: "#8b5cf6",
      body: "An extension of Grad-CAM that uses second and third-order gradient information (alpha weights) for more precise spatial localisation. Particularly useful when multiple discriminative regions exist in the same image.",
      use: "Used in offline research evaluation",
    },
    {
      name: "Saliency Maps",
      full: "Input gradient visualisation",
      color: "#3b82f6",
      body: "Computes the gradient of the output score directly with respect to each input pixel, showing which individual pixels most affect the classification. Provides a pixel-level attribution map rather than a region-level one.",
      use: "Used in offline research evaluation",
    },
    {
      name: "LIME",
      full: "Local Interpretable Model-Agnostic Explanations",
      color: "#0e9e8a",
      body: "A perturbation-based method that segments the image into superpixels, randomly masks regions, and fits a local linear model to determine which segments support or contradict the prediction. Green regions support the prediction, red regions oppose it.",
      use: "Used in offline research evaluation",
    },
  ];

  return (
    <section id="explainability" style={{ padding: isMobile ? '60px 0' : '100px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px' }}>

        <ScrollSection id="xai-head">
          <SectionHead
            tag="Explainable AI"
            title="Why Transparency is"
            accent="Non-Negotiable"
            sub="Deep learning models are often criticised as black boxes — their internal reasoning is opaque. In a clinical context, a prediction without an explanation is insufficient. Smart Blood Scan implements four XAI methods to ensure every decision can be understood and questioned by the clinician."
          />
        </ScrollSection>

        {/* Why XAI matters callout */}
        <ScrollSection id="xai-callout">
          <div style={{
            padding: isMobile ? '24px 20px' : '32px 36px', borderRadius: 16, marginBottom: 40,
            background: C.accentLight, border: `1px solid ${C.accentBorder}`,
            display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: C.accent,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <div>
              <div style={{ ...DISPLAY, fontSize: 20, color: C.accent, letterSpacing: "0.06em", marginBottom: 8 }}>
                The Black Box Problem in Clinical AI
              </div>
              <p style={{ ...BODY, fontSize: 14, color: C.textSub, lineHeight: 1.8, margin: 0 }}>
                A model that achieves 95% accuracy but cannot explain its reasoning cannot be trusted in a clinical environment. Clinicians need to verify that the model is focusing on genuinely pathological cell morphology — abnormal nuclear size, chromatin texture, cytoplasmic features — rather than artefacts in the slide or staining irregularities. XAI bridges this gap between algorithmic prediction and clinical trust.
              </p>
            </div>
          </div>
        </ScrollSection>

        {/* XAI methods */}
        <ScrollSection id="xai-methods">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {methods.map((m, i) => (
              <motion.div key={m.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                style={{
                  padding: "28px 24px", background: C.bgSurface,
                  border: `1px solid ${C.border}`, borderRadius: 16,
                  position: "relative", overflow: "hidden",
                }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: m.color,
                }} />
                <div style={{
                  ...DISPLAY, fontSize: 11, letterSpacing: "0.18em",
                  color: m.color, marginBottom: 8,
                  background: `${m.color}15`, border: `1px solid ${m.color}30`,
                  borderRadius: 99, padding: "3px 10px", display: "inline-block",
                }}>
                  {m.use}
                </div>
                <div style={{ ...DISPLAY, fontSize: 21, color: C.textPrimary, letterSpacing: "0.06em", marginBottom: 4, marginTop: 10 }}>
                  {m.name}
                </div>
                <div style={{ ...BODY, fontSize: 11, color: C.textFaint, fontStyle: "italic", marginBottom: 14 }}>
                  {m.full}
                </div>
                <p style={{ ...BODY, fontSize: 13, color: C.textSub, lineHeight: 1.8, margin: 0 }}>
                  {m.body}
                </p>
              </motion.div>
            ))}
          </div>
        </ScrollSection>

      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
//  SECTION 5 — DATASET & TRAINING
// ════════════════════════════════════════════════════════════
function DatasetSection() {
  const isMobile = useIsMobile();
  const facts = [
    { label: "Total Images",     value: "10,661",  sub: "C-NMC 2019 dataset",              color: C.accent },
    { label: "Training Folds",   value: "3",        sub: "All folds used for training",     color: "#8b5cf6" },
    { label: "Test Images",      value: "1,867",    sub: "Held-out preliminary test set",   color: "#3b82f6" },
    { label: "ALL Class",        value: "68.2%",    sub: "7,272 leukemic images",           color: "#e53935" },
    { label: "HEM Class",        value: "31.8%",    sub: "3,389 healthy images",            color: "#0e9e8a" },
    { label: "Max Epochs",       value: "60",       sub: "With early stopping (patience=10)", color: "#d97706" },
  ];

  const techniques = [
    { label: "Augmentation",    detail: "Rotation ±360°, zoom 20%, width/height shift 15%, horizontal and vertical flip, shear 10%, brightness variation 0.8×–1.2×" },
    { label: "Class Weighting", detail: "Balanced class weights computed from all three folds combined and applied per sample during training" },
    { label: "Focal Loss",      detail: "γ=2.0 focuses training on hard misclassified examples; α=0.75 up-weights the minority HEM (healthy) class" },
    { label: "Fine-tuning",     detail: "Top 30 layers unfrozen for EfficientNetB0, DenseNet121, ResNet50, InceptionV3; top 20 for MobileNetV2" },
    { label: "Optimiser",       detail: "Adam with learning rate 1e-4, gradient clipping at norm 1.0, ReduceLROnPlateau factor 0.3 after 5 stagnant epochs" },
    { label: "Stain Norm",      detail: "Per-channel 2nd–98th percentile stretching applied before each model's native ImageNet preprocessing function" },
  ];

  return (
    <section id="dataset" style={{ padding: isMobile ? '60px 0' : '100px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px' }}>

        <ScrollSection id="dataset-head">
          <SectionHead
            tag="Dataset & Training"
            title="Built on Transparent,"
            accent="Reproducible Science"
            sub="The system was trained and evaluated on the publicly available C-NMC 2019 dataset — a peer-reviewed benchmark for ALL classification from microscopic peripheral blood smear images."
          />
        </ScrollSection>

        {/* Dataset stats grid */}
        <ScrollSection id="dataset-stats">
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12, marginBottom: 40,
          }}>
            {facts.map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.4 }}
                style={{
                  padding: "24px 20px", borderRadius: 14, textAlign: "center",
                  background: C.bgSurface, border: `1px solid ${C.border}`,
                }}>
                <div style={{ ...DISPLAY, fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: f.color, letterSpacing: "0.04em" }}>
                  {f.value}
                </div>
                <div style={{ ...DISPLAY, fontSize: 12, color: C.textPrimary, letterSpacing: "0.08em", marginTop: 6 }}>
                  {f.label}
                </div>
                <div style={{ ...BODY, fontSize: 11, color: C.textMuted, marginTop: 4, lineHeight: 1.5 }}>
                  {f.sub}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollSection>

        {/* Training techniques */}
        <ScrollSection id="dataset-techniques">
          <div style={{
            background: C.bgSurface, border: `1px solid ${C.border}`,
            borderRadius: 16, overflow: "hidden",
          }}>
            <div style={{
              padding: "16px 24px", background: C.bgSurfaceAlt,
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.22em", color: C.accent, opacity: 0.7 }}>
                TRAINING TECHNIQUES APPLIED
              </div>
            </div>
            {techniques.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                style={{
                  display: "grid", gridTemplateColumns: "180px 1fr",
                  gap: 20, padding: "18px 24px",
                  borderBottom: i < techniques.length - 1 ? `1px solid ${C.border}` : "none",
                  background: i % 2 === 1 ? C.bg : "transparent",
                }}>
                <div style={{ ...DISPLAY, fontSize: 13, color: C.accent, letterSpacing: "0.08em", paddingTop: 2 }}>
                  {t.label}
                </div>
                <div style={{ ...BODY, fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>
                  {t.detail}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollSection>

      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
//  SECTION 6 — PERFORMANCE RESULTS
// ════════════════════════════════════════════════════════════
function ResultsSection() {
  const isMobile = useIsMobile();
  const models = [
    { name: "EfficientNetB0", type: "Individual", accuracy: "—", f1: "—", auc: "—", valAcc: "88.35%", complete: false },
    { name: "DenseNet121",    type: "Individual", accuracy: "—", f1: "—", auc: "—", valAcc: "89.45%", complete: false },
    { name: "ResNet50",       type: "Individual", accuracy: "—", f1: "—", auc: "—", valAcc: "89.59%", complete: false },
    { name: "InceptionV3",    type: "Individual", accuracy: "—", f1: "—", auc: "—", valAcc: "Pending", complete: false },
    { name: "MobileNetV2",    type: "Individual", accuracy: "—", f1: "—", auc: "—", valAcc: "Pending", complete: false },
    { name: "Weighted Ensemble", type: "Ensemble", accuracy: "—", f1: "—", auc: "—", valAcc: "—",    complete: false },
  ];

  const baselines = [
    { model: "YOLOv11 (Awad & Aly, 2024)",         accuracy: "98.8%", dataset: "ALL-IDB + Kaggle",    limitation: "Uneven class samples, no XAI" },
    { model: "DenseNet121 (Muduli et al., 2025)",   accuracy: "97%",   dataset: "3,242 smear images", limitation: "Single model, no XAI evaluation" },
    { model: "MobileNet (Makem et al., 2025)",      accuracy: "95.3%", dataset: "C-NMC 2019",         limitation: "Single model, single dataset" },
    { model: "Naïve Bayes (El Houby & M.f, 2025)", accuracy: "96.2%", dataset: "ALL-IDB",            limitation: "Classical ML, no deep features" },
  ];

  return (
    <section id="results" style={{ padding: isMobile ? '60px 0' : '100px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px' }}>

        <ScrollSection id="results-head">
          <SectionHead
            tag="Performance Results"
            title="Evaluated Against"
            accent="Published Baselines"
            sub="All five models and the weighted ensemble are evaluated on the C-NMC 2019 preliminary test set of 1,867 images and benchmarked against recently published approaches."
          />
        </ScrollSection>

        {/* Results table */}
        <ScrollSection id="results-table">
          <div style={{ marginBottom: 40 }}>
            <div style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.22em", color: C.accent, opacity: 0.7, marginBottom: 16 }}>
              MODEL PERFORMANCE — CNMC-2019 PRELIMINARY TEST SET
            </div>
            <div style={{
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 14, overflow: "hidden",
            }}>
              <div style={{
                display: 'grid', gridTemplateColumns: isMobile ? '2fr 1fr 1fr' : '2fr 1fr 1fr 1fr 1fr',
                padding: isMobile ? '12px 14px' : '14px 20px', background: C.bgSurface,
                borderBottom: `1px solid ${C.border}`,
              }}>
                {(isMobile ? ['Model', 'Val Acc', 'Test Acc'] : ['Model', 'Val Accuracy', 'Test Accuracy', 'F1 Score', 'AUC-ROC']).map(h => (
                  <div key={h} style={{ ...DISPLAY, fontSize: 10, letterSpacing: "0.18em", color: C.accent, opacity: 0.8 }}>
                    {h}
                  </div>
                ))}
              </div>
              {models.map((m, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  style={{
                    display: 'grid', gridTemplateColumns: isMobile ? '2fr 1fr 1fr' : '2fr 1fr 1fr 1fr 1fr',
                    padding: isMobile ? '12px 14px' : '16px 20px',
                    borderBottom: i < models.length - 1 ? `1px solid ${C.border}` : "none",
                    background: m.type === "Ensemble"
                      ? C.accentLight
                      : i % 2 === 1 ? C.bgSurface : C.bg,
                  }}>
                  <div>
                    <div style={{
                      ...BODY, fontSize: 13, fontWeight: m.type === "Ensemble" ? 600 : 400,
                      color: m.type === "Ensemble" ? C.accent : C.textPrimary,
                    }}>
                      {m.name}
                    </div>
                    <div style={{
                      ...DISPLAY, fontSize: 9, letterSpacing: "0.12em",
                      color: m.type === "Ensemble" ? C.accent : C.textFaint, marginTop: 2,
                    }}>
                      {m.type}
                    </div>
                  </div>
                  {(isMobile ? [m.valAcc, m.accuracy] : [m.valAcc, m.accuracy, m.f1, m.auc]).map((v, j) => (
                    <div key={j} style={{
                      ...BODY, fontSize: 13,
                      color: v === "Pending" ? C.textFaint : v === "—" ? C.textFaint : C.textPrimary,
                      fontStyle: v === "Pending" ? "italic" : "normal",
                      display: "flex", alignItems: "center",
                    }}>
                      {v}
                    </div>
                  ))}
                </motion.div>
              ))}
            </div>
            <p style={{ ...BODY, fontSize: 11, color: C.textFaint, marginTop: 10, textAlign: "right" }}>
              Test accuracy, F1, and AUC-ROC results will be updated once all 5 models complete training.
            </p>
          </div>
        </ScrollSection>

        {/* Baseline comparison */}
        <ScrollSection id="results-baselines">
          <div style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.22em", color: C.accent, opacity: 0.7, marginBottom: 16 }}>
            COMPARISON WITH PUBLISHED BASELINES
          </div>
          <div style={{
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 14, overflow: "hidden",
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: isMobile ? '2fr 1fr' : '2fr 1fr 1.5fr 2fr',
              padding: isMobile ? '12px 14px' : '14px 20px', background: C.bgSurface,
              borderBottom: `1px solid ${C.border}`,
            }}>
              {(isMobile ? ['Model / Study', 'Accuracy'] : ['Model / Study', 'Accuracy', 'Dataset', 'Limitation']).map(h => (
                <div key={h} style={{ ...DISPLAY, fontSize: 10, letterSpacing: "0.18em", color: C.accent, opacity: 0.8 }}>
                  {h}
                </div>
              ))}
            </div>
            {baselines.map((row, i) => (
              <motion.div key={i}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                style={{
                  display: 'grid', gridTemplateColumns: isMobile ? '2fr 1fr' : '2fr 1fr 1.5fr 2fr',
                  padding: isMobile ? '12px 14px' : '16px 20px',
                  borderBottom: i < baselines.length - 1 ? `1px solid ${C.border}` : "none",
                  background: i % 2 === 1 ? C.bgSurface : C.bg,
                }}>
                <div style={{ ...BODY, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{row.model}</div>
                <div style={{ ...DISPLAY, fontSize: 14, color: C.accent, letterSpacing: "0.04em" }}>{row.accuracy}</div>
                <div style={{ ...BODY, fontSize: 12, color: C.textSub }}>{row.dataset}</div>
                <div style={{ ...BODY, fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>{row.limitation}</div>
              </motion.div>
            ))}
          </div>
          <p style={{ ...BODY, fontSize: 12, color: C.textFaint, marginTop: 12, textAlign: "right" }}>
            Sources: Awad & Aly (2024), Muduli et al. (2025), Makem et al. (2025), El Houby & M.f (2025)
          </p>
        </ScrollSection>

      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
//  SECTION 7 — DISCLAIMER
// ════════════════════════════════════════════════════════════
function DisclaimerSection() {
  const isMobile = useIsMobile();
  const items = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      title: "Research Prototype",
      body: "Smart Blood Scan is an academic research prototype developed as part of a BSc dissertation. It is not a certified or approved medical device and must not be used as the sole basis for clinical decisions.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
      title: "Pathologist Confirmation Required",
      body: "All predictions generated by this system should be reviewed and confirmed by a qualified haematopathologist before any clinical action is taken. The system is intended as a diagnostic aid, not a replacement for expert judgment.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
          <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
      ),
      title: "Dataset Scope",
      body: "The models were trained exclusively on the C-NMC 2019 dataset. Performance may vary on images from different imaging equipment, staining protocols, or patient populations not represented in this dataset.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ),
      title: "Data Privacy",
      body: "Patient data entered into this system is stored locally in a MongoDB database. This system has not undergone formal clinical data governance review. It should not be used with real patient data in a live clinical environment without appropriate compliance measures.",
    },
  ];

  return (
    <section id="disclaimer" style={{ padding: isMobile ? '60px 0 80px' : '80px 0 100px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px' }}>

        <ScrollSection id="disclaimer-head">
          <div style={{
            padding: isMobile ? '32px 20px' : '48px 40px', borderRadius: 20,
            background: "rgba(245,158,11,0.05)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ ...DISPLAY, fontSize: 11, letterSpacing: "0.28em", color: "#d97706", marginBottom: 14, opacity: 0.8 }}>
                IMPORTANT NOTICE
              </div>
              <div style={{ ...DISPLAY, fontSize: "clamp(2rem, 4vw, 3rem)", color: C.textPrimary, lineHeight: 0.95, letterSpacing: "0.05em" }}>
                Limitations &{" "}
                <span style={{ color: "#d97706" }}>Disclaimer</span>
              </div>
              <p style={{ ...BODY, fontSize: 15, color: C.textSub, marginTop: 16, maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.75 }}>
                Transparency about the limitations of AI-assisted diagnosis is as important as the system's capabilities.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {items.map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                  style={{
                    padding: "24px 22px", borderRadius: 14,
                    background: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(245,158,11,0.15)",
                  }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ ...DISPLAY, fontSize: 17, color: C.textPrimary, letterSpacing: "0.06em", marginBottom: 10 }}>
                    {item.title}
                  </div>
                  <p style={{ ...BODY, fontSize: 13, color: C.textSub, lineHeight: 1.8, margin: 0 }}>
                    {item.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollSection>

      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
//  FOOTER
// ════════════════════════════════════════════════════════════
function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      padding: "32px",
      textAlign: "center",
      background: C.bgSurface,
    }}>
      <div style={{ ...BODY, fontSize: 12, color: C.textFaint, lineHeight: 1.8 }}>
        Smart Blood Scan · AI-Assisted ALL Detection<br />
        BSc (Hons) Computer Science · IIT / University of Westminster · 2026<br />
        <span style={{ marginTop: 6, display: "inline-block", color: C.accentBorder }}>
          For academic and research purposes only · Not a certified medical device
        </span>
      </div>
    </footer>
  );
}

// ════════════════════════════════════════════════════════════
//  LANDING — MAIN EXPORT
// ════════════════════════════════════════════════════════════
// ── Mobile hook ──────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ════════════════════════════════════════════════════════════
//  LANDING — MAIN EXPORT
// ════════════════════════════════════════════════════════════
export default function Landing() {
  const navigate   = useNavigate();
  const isMobile   = useIsMobile();
  const [hoveredCell, setHoveredCell] = useState(null);
  const [hoveredId,   setHoveredId]   = useState(null);
  const [menuOpen,    setMenuOpen]    = useState(false);

  const handleHover = (c) => { setHoveredCell(c); setHoveredId(c.id); };
  const handleLeave = () => { setHoveredCell(null); setHoveredId(null); };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.14 } } };
  const item = {
    hidden: { opacity: 0, y: 28 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
  };

  const navLinks = [
    { label: "Problem",        id: "problem"        },
    { label: "How It Works",   id: "how-it-works"   },
    { label: "Ensemble",       id: "ensemble"        },
    { label: "Explainability", id: "explainability"  },
    { label: "Results",        id: "results"         },
  ];

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        @media (max-width: 767px) {
          .results-table-row  { grid-template-columns: 1.8fr 1fr 1fr !important; }
          .baseline-table-row { grid-template-columns: 1fr 1fr !important; }
          .baseline-hide      { display: none !important; }
          .technique-row      { grid-template-columns: 1fr !important; }
          .technique-label    { margin-bottom: 4px; }
          .ensemble-why-grid  { grid-template-columns: 1fr !important; }
          .hero-subtitle      { font-size: 15px !important; }
          .section-padding    { padding: 72px 0 60px !important; }
        }
      `}</style>

      <div className="min-h-screen flex flex-col overflow-x-hidden relative"
        style={{ background: C.bg, ...DISPLAY }}>

        {/* ── Navbar ── */}
        <div className="fixed top-0 left-0 right-0 z-40"
          style={{
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(14px)",
            borderBottom: `1px solid ${C.border}`,
          }}>

          {/* Main navbar row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: isMobile ? "16px 20px" : "20px 44px",
          }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <svg viewBox="0 0 140 140" width="22" height="22" style={{ overflow: "visible" }}>
                <defs>
                  <radialGradient id="nG" cx="42%" cy="38%" r="55%">
                    <stop offset="0%"   stopColor="#ff6b6b" />
                    <stop offset="40%"  stopColor="#e53935" />
                    <stop offset="100%" stopColor="#7b0000" />
                  </radialGradient>
                  <radialGradient id="nD" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#3a0000" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#3a0000" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="nGl" cx="38%" cy="28%" r="40%">
                    <stop offset="0%"   stopColor="#ffaaaa" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#ffaaaa" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#nG)" />
                <ellipse cx="70" cy="70" rx="22" ry="22" fill="url(#nD)" />
                <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#nGl)" />
                <ellipse cx="70" cy="70" rx="46" ry="46" fill="none"
                  stroke="#ff9090" strokeWidth="1.5" opacity="0.35" />
              </svg>
              <span style={{ ...DISPLAY, fontSize: isMobile ? 16 : 18, color: C.textPrimary, letterSpacing: "0.12em" }}>
                Smart Blood Scan
              </span>
            </div>

            {/* Desktop nav links */}
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
                {navLinks.map(({ label, id }) => (
                  <span key={label} onClick={() => scrollTo(id)}
                    style={{
                      ...DISPLAY, fontSize: 14, color: C.textPrimary,
                      cursor: "pointer", letterSpacing: "0.04em", transition: "color 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = C.accent}
                    onMouseLeave={e => e.currentTarget.style.color = C.textPrimary}>
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Desktop auth buttons */}
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <motion.button onClick={() => navigate("/signin")}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    ...DISPLAY, fontSize: 15, color: C.textPrimary, background: C.bg,
                    border: `1px solid ${C.textPrimary}`, borderRadius: 999,
                    cursor: "pointer", padding: "7px 28px",
                  }}>
                  Sign In
                </motion.button>
                <motion.button onClick={() => navigate("/signup")}
                  whileHover={{ scale: 1.03, background: "#333" }} whileTap={{ scale: 0.97 }}
                  style={{
                    ...DISPLAY, fontSize: 15, color: "#ffffff", background: C.textPrimary,
                    border: "none", borderRadius: 999, cursor: "pointer", padding: "7px 28px",
                  }}>
                  Sign Up
                </motion.button>
              </div>
            )}

            {/* Mobile hamburger */}
            {isMobile && (
              <motion.button
                onClick={() => setMenuOpen(o => !o)}
                whileTap={{ scale: 0.92 }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: 8, display: "flex", flexDirection: "column",
                  gap: 5, alignItems: "flex-end",
                }}>
                <motion.div animate={{ width: menuOpen ? 22 : 22, rotate: menuOpen ? 45 : 0, y: menuOpen ? 7 : 0 }}
                  style={{ height: 2, background: C.textPrimary, borderRadius: 99, width: 22, transformOrigin: "center" }} />
                <motion.div animate={{ opacity: menuOpen ? 0 : 1, width: menuOpen ? 0 : 16 }}
                  style={{ height: 2, background: C.textPrimary, borderRadius: 99, width: 16 }} />
                <motion.div animate={{ width: menuOpen ? 22 : 22, rotate: menuOpen ? -45 : 0, y: menuOpen ? -7 : 0 }}
                  style={{ height: 2, background: C.textPrimary, borderRadius: 99, width: 22, transformOrigin: "center" }} />
              </motion.button>
            )}
          </div>

          {/* Mobile dropdown menu */}
          <AnimatePresence>
            {isMobile && menuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden", borderTop: `1px solid ${C.border}` }}>
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {navLinks.map(({ label, id }) => (
                    <button key={label} onClick={() => scrollTo(id)}
                      style={{
                        ...DISPLAY, fontSize: 18, color: C.textPrimary, letterSpacing: "0.06em",
                        background: "none", border: "none", cursor: "pointer",
                        textAlign: "left", padding: "10px 4px",
                        borderBottom: `1px solid ${C.border}`,
                      }}>
                      {label}
                    </button>
                  ))}
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button onClick={() => { navigate("/signin"); setMenuOpen(false); }}
                      style={{
                        ...DISPLAY, flex: 1, fontSize: 16, color: C.textPrimary,
                        background: C.bg, border: `1px solid ${C.textPrimary}`,
                        borderRadius: 999, cursor: "pointer", padding: "10px 0",
                      }}>
                      Sign In
                    </button>
                    <button onClick={() => { navigate("/signup"); setMenuOpen(false); }}
                      style={{
                        ...DISPLAY, flex: 1, fontSize: 16, color: "#fff",
                        background: C.textPrimary, border: "none",
                        borderRadius: 999, cursor: "pointer", padding: "10px 0",
                      }}>
                      Sign Up
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Hero ── */}
        <div className="relative w-full" style={{ height: "100vh", minHeight: 560 }}>
          <BloodFlowCanvas onCellHover={handleHover} onCellLeave={handleLeave} hoveredId={hoveredId} />
          <CellOverlay cell={hoveredCell} />
          <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, transparent, ${C.bg})` }} />
          <motion.div
            variants={stagger} initial="hidden" animate="show"
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-10 pointer-events-none"
            style={{ paddingTop: isMobile ? 64 : 70 }}>
            <motion.h1 variants={item}
              style={{
                ...DISPLAY,
                fontSize: isMobile ? "clamp(3rem, 14vw, 5rem)" : "clamp(4rem, 10vw, 8rem)",
                color: C.textPrimary, lineHeight: 0.95, letterSpacing: "0.06em", margin: 0,
              }}>
              Blood Smear<br />
              <span style={{ color: C.accent }}>Intelligence</span>
            </motion.h1>
            <motion.p variants={item} className="hero-subtitle"
              style={{
                ...BODY, fontSize: isMobile ? 14 : 18, fontWeight: 300, color: C.textSub,
                marginTop: 20, maxWidth: isMobile ? 320 : 480,
                lineHeight: 1.85, letterSpacing: "0.02em",
              }}>
              AI-powered detection of Acute Lymphoblastic Leukaemia from
              microscopic blood smear images — 5-model weighted ensemble with Grad-CAM explainability.
            </motion.p>
            <motion.div variants={item}
              style={{
                pointerEvents: "all", display: "flex",
                gap: 10, marginTop: 28,
                flexDirection: isMobile ? "column" : "row",
                width: isMobile ? "100%" : "auto",
                maxWidth: isMobile ? 280 : "none",
              }}>
              <motion.button onClick={() => navigate("/signup")}
                whileHover={{ scale: 1.04, background: "#333" }} whileTap={{ scale: 0.97 }}
                style={{
                  ...DISPLAY, fontSize: 15, letterSpacing: "0.08em",
                  color: "#ffffff", background: C.textPrimary,
                  border: "none", borderRadius: 999, cursor: "pointer",
                  padding: isMobile ? "13px 0" : "11px 35px",
                  width: isMobile ? "100%" : "auto",
                }}>
                Get Started
              </motion.button>
              <motion.button onClick={() => scrollTo("problem")}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{
                  ...DISPLAY, fontSize: 15, letterSpacing: "0.08em",
                  color: C.textPrimary, background: "transparent",
                  border: `1px solid ${C.textPrimary}`, borderRadius: 999,
                  cursor: "pointer", padding: isMobile ? "13px 0" : "11px 35px",
                  width: isMobile ? "100%" : "auto",
                }}>
                Learn More ↓
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Scrolling sections ── */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <Divider />
          <ClinicalProblemSection />
          <Divider />
          <HowItWorksSection />
          <Divider />
          <EnsembleSection />
          <Divider />
          <ExplainabilitySection />
          <Divider />
          <DatasetSection />
          <Divider />
          <ResultsSection />
          <Divider />
          <DisclaimerSection />
          <Footer />
        </div>

      </div>
    </>
  );
}
