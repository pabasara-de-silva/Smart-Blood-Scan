import { useEffect, useState } from "react";


export default function LoadingScreen({
  message = "Initialising system",
  isLoading = true,
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    setProgress(0);
    const start = performance.now();
    const duration = 3600; // ms — matches CSS animation cycle

    const tick = (now) => {
      const elapsed = now - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(Math.round(pct));
      if (pct < 100) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,_#1a0505_0%,_#0a0a0f_70%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-7">
        {/* ── RBC SVG ── */}
        <svg
          viewBox="0 0 140 140"
          className="w-36 h-36"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: "visible" }}
        >
          <defs>
            <radialGradient id="rbcGrad" cx="42%" cy="38%" r="55%">
              <stop offset="0%" stopColor="#ff6b6b" />
              <stop offset="40%" stopColor="#e53935" />
              <stop offset="100%" stopColor="#7b0000" />
            </radialGradient>
            <radialGradient id="dimpleGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3a0000" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#3a0000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="gloss" cx="38%" cy="28%" r="40%">
              <stop offset="0%" stopColor="#ffaaaa" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ffaaaa" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Cell body — pulses then vanishes */}
          <g style={{ animation: "cellPulse 3.6s ease-in-out infinite", transformOrigin: "70px 70px" }}>
            <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#rbcGrad)" />
            <ellipse cx="70" cy="70" rx="22" ry="22" fill="url(#dimpleGrad)" />
            <ellipse cx="70" cy="70" rx="46" ry="46" fill="url(#gloss)" />
            <ellipse cx="70" cy="70" rx="46" ry="46" fill="none" stroke="#ff9090" strokeWidth="1.5" opacity="0.35" />
          </g>

          {/* Burst ring */}
          <g style={{ animation: "burstAnim 3.6s ease-in-out infinite", transformOrigin: "70px 70px" }}>
            <circle cx="70" cy="22" r="5"  fill="#e53935" opacity="0.9" />
            <circle cx="110" cy="40" r="4" fill="#c62828" opacity="0.85" />
            <circle cx="118" cy="80" r="6" fill="#e53935" opacity="0.9" />
            <circle cx="100" cy="115" r="4" fill="#ff5252" opacity="0.8" />
            <circle cx="60" cy="122" r="5" fill="#c62828" opacity="0.85" />
            <circle cx="24" cy="105" r="4" fill="#e53935" opacity="0.8" />
            <circle cx="16" cy="65"  r="6" fill="#ff5252" opacity="0.9" />
            <circle cx="32" cy="28"  r="4" fill="#c62828" opacity="0.8" />
            <circle cx="70"  cy="36" r="3" fill="#ff8a80" />
            <circle cx="100" cy="55" r="3" fill="#ff8a80" />
            <circle cx="104" cy="88" r="2.5" fill="#ff8a80" />
            <circle cx="70" cy="108" r="3" fill="#ff8a80" />
            <circle cx="38" cy="90"  r="2.5" fill="#ff8a80" />
            <circle cx="34" cy="55"  r="3" fill="#ff8a80" />
          </g>

          {/* Irregular splatter droplets */}
          <g style={{ animation: "splatAnim 3.6s ease-in-out infinite" }}>
            <ellipse cx="56"  cy="14"  rx="3"   ry="5"   fill="#c62828" opacity="0.7"  transform="rotate(-20,56,14)" />
            <ellipse cx="115" cy="58"  rx="2.5" ry="4"   fill="#e53935" opacity="0.65" transform="rotate(30,115,58)" />
            <ellipse cx="108" cy="108" rx="3"   ry="2"   fill="#ff5252" opacity="0.6" />
            <ellipse cx="28"  cy="118" rx="2"   ry="3.5" fill="#c62828" opacity="0.65" transform="rotate(15,28,118)" />
            <ellipse cx="12"  cy="42"  rx="2.5" ry="4"   fill="#e53935" opacity="0.6"  transform="rotate(-10,12,42)" />
          </g>

          <style>{`
            @keyframes cellPulse {
              0%   { transform: scale(0.6); opacity: 0; }
              15%  { transform: scale(1.0); opacity: 1; }
              70%  { transform: scale(1.15); opacity: 1; }
              82%  { transform: scale(1.35); opacity: 1; }
              88%  { transform: scale(1.5);  opacity: 1; }
              92%  { transform: scale(0.01); opacity: 0; }
              100% { transform: scale(0.01); opacity: 0; }
            }
            @keyframes burstAnim {
              0%   { opacity: 0; transform: scale(0); }
              88%  { opacity: 0; transform: scale(0); }
              90%  { opacity: 1; transform: scale(0.6); }
              96%  { opacity: 0.9; transform: scale(1.4); }
              100% { opacity: 0; transform: scale(1.8); }
            }
            @keyframes splatAnim {
              0%,87% { opacity: 0; }
              91%    { opacity: 1; }
              100%   { opacity: 0; }
            }
          `}</style>
        </svg>

        {/* Label */}
        <p
          className="text-[11px] tracking-[0.22em] uppercase text-red-500 opacity-85"
          style={{ fontFamily: "Consolas, monospace" }}
        >
          {message}
        </p>

        {/* Progress bar */}
        <div className="w-44 h-[3px] bg-[#1e0a0a] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-900 to-red-500 rounded-full transition-none"
            style={{ width: `${progress}%`, animation: "barFill 3.6s ease-in-out infinite" }}
          />
        </div>

        <style>{`
          @keyframes barFill {
            0%   { width: 0% }
            85%  { width: 100% }
            100% { width: 100% }
          }
        `}</style>
      </div>
    </div>
  );
}
