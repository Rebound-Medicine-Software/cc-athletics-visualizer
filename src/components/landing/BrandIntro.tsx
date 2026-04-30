import { useEffect, useState } from "react";

/**
 * Compact, skippable NEXUS HUB brand intro.
 * - Auto-completes after `duration` ms (default 3500ms — under the 4s spec).
 * - Skip button + Esc key both call `onComplete`.
 * - Caller is responsible for only mounting it when it should be shown
 *   (typically: once per browser session, gated via sessionStorage).
 */
interface BrandIntroProps {
  onComplete: () => void;
  duration?: number;
}

const STYLES = `
  @keyframes bi-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bi-pulse { 0%,100% { filter: drop-shadow(0 0 0 rgba(255,255,255,0)); } 50% { filter: drop-shadow(0 0 22px rgba(255,255,255,0.45)); } }
  @keyframes bi-load { to { width: 100%; } }
  @keyframes bi-fadeOut { to { opacity: 0; } }
  .bi-stripe { fill: white; opacity: 0; transform: translateY(14px); animation: bi-fadeIn 0.45s forwards; }
`;

const NexusHubSVG = () => (
  <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <g fill="white">
      {Array.from({ length: 19 }).map((_, i) => (
        <rect
          key={i}
          className="bi-stripe"
          x={6 + i * 4.6}
          y={20}
          width={3}
          height={60}
          rx={1}
          style={{ animationDelay: `${i * 35}ms` }}
        />
      ))}
    </g>
  </svg>
);

export const BrandIntro = ({ onComplete, duration = 3500 }: BrandIntroProps) => {
  const [exiting, setExiting] = useState(false);

  const finish = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onComplete, 450);
  };

  useEffect(() => {
    const t = setTimeout(finish, duration);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  // Honour reduced motion: skip immediately.
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: "#1e3a6e",
        fontFamily: "Circular, Arial, sans-serif",
        transition: "opacity 400ms ease",
        opacity: exiting ? 0 : 1,
        pointerEvents: exiting ? "none" : "auto",
      }}
      aria-label="NEXUS HUB intro"
    >
      <style>{STYLES}</style>

      <button
        type="button"
        onClick={finish}
        className="absolute top-5 right-5 text-xs uppercase tracking-[0.25em] text-white/70 hover:text-white border border-white/20 hover:border-white/60 rounded-full px-4 py-2 transition-colors"
        aria-label="Skip intro"
      >
        Skip ›
      </button>

      <div className="text-center px-6 w-full max-w-md">
        <div
          className="mx-auto mb-5"
          style={{ width: 160, animation: "bi-pulse 2.4s ease-in-out infinite" }}
        >
          <NexusHubSVG />
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: "bold",
            letterSpacing: 4,
            color: "#fff",
            opacity: 0,
            animation: "bi-fadeIn 0.7s forwards",
            animationDelay: "0.6s",
          }}
        >
          NEXUSHUB
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)",
            opacity: 0,
            animation: "bi-fadeIn 0.7s forwards",
            animationDelay: "1s",
            marginTop: 12,
          }}
        >
          O N E&nbsp; H U B .&nbsp; A L L&nbsp; D A T A .&nbsp; M A D E&nbsp; S I M P L E
        </div>

        <div
          style={{
            width: 200,
            height: 2,
            background: "rgba(255,255,255,0.15)",
            margin: "28px auto 0",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: 0,
              background: "#fff",
              animation: `bi-load ${duration}ms linear forwards`,
            }}
          />
        </div>

        <div className="mt-6 text-[10px] tracking-[0.2em] uppercase text-white/50">
          Press Esc to skip
        </div>
      </div>
    </div>
  );
};

const SESSION_KEY = "nh:intro-seen";

/** Has the intro been shown in this browser session? */
export const hasSeenIntro = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return true;
  }
};

export const markIntroSeen = () => {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* no-op */
  }
};
