// Multi-step onboarding walkthrough for newly signed-up users.
import { useEffect, useState } from "react";
import type { CurrentUser } from "../types";

type OnboardingWalkthroughProps = {
  currentUser: CurrentUser;
  onNavigate: (path: string) => void;
  onDismiss: () => void;
};

type Step = {
  id: string;
  emoji: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaPath?: string;
  illustration: "feed" | "discover" | "upload" | "assistant" | "messages" | "welcome";
};

const creatorSteps: Step[] = [
  {
    id: "welcome",
    emoji: "✨",
    eyebrow: "Welcome to Glam SA",
    title: "Your beauty journey starts here",
    description:
      "Glam SA is South Africa's home for hair artists, nail technicians, makeup artists, barbers, and beauty clients. Let us show you around — it only takes a minute.",
    illustration: "welcome",
  },
  {
    id: "feed",
    emoji: "🏠",
    eyebrow: "The Home Feed",
    title: "Discover stunning looks every day",
    description:
      "Your home feed surfaces fresh portfolio work from creators across South Africa. Filter by category — Hair, Nails, Barbering, Makeup — or search by style, price, and city using the smart search bar at the top.",
    ctaLabel: "Explore the feed",
    ctaPath: "/",
    illustration: "feed",
  },
  {
    id: "upload",
    emoji: "📸",
    eyebrow: "Share Your Work",
    title: "Post your first look",
    description:
      "Tap \"Share Your Look\" in the sidebar to upload a photo or video of your latest work. Add a service name, caption, location, and price so clients can find and book you easily.",
    ctaLabel: "Share a look",
    ctaPath: "/upload",
    illustration: "upload",
  },
  {
    id: "discover",
    emoji: "📍",
    eyebrow: "Discover Page",
    title: "Get found by clients near you",
    description:
      "The Discover page shows your profile on a live map to clients searching in your area. Make sure your location is saved so you appear in local searches. Clients can contact you directly on WhatsApp from the map.",
    ctaLabel: "Open Discover",
    ctaPath: "/discover",
    illustration: "discover",
  },
  {
    id: "assistant",
    emoji: "🤖",
    eyebrow: "Glam Assistant",
    title: "Your AI beauty concierge",
    description:
      "Tap the sparkle button (✦) at the bottom-right of any page to open the Glam Assistant. Ask it to find hair stylists under R300, book an appointment, or recommend nail artists in your city — it handles it all in chat.",
    illustration: "assistant",
  },
  {
    id: "messages",
    emoji: "💬",
    eyebrow: "Messages & Bookings",
    title: "Manage inquiries and bookings",
    description:
      "Head to Messages to view client conversations and manage booking requests. Confirmed bookings show date, time, service, and price at a glance — keeping your schedule organised.",
    ctaLabel: "Go to Messages",
    ctaPath: "/messages",
    illustration: "messages",
  },
];

const clientSteps: Step[] = [
  {
    id: "welcome",
    emoji: "✨",
    eyebrow: "Welcome to Glam SA",
    title: "Your beauty journey starts here",
    description:
      "Glam SA connects you with talented hair artists, nail techs, barbers, and makeup artists across South Africa. Let us show you how to find your next look.",
    illustration: "welcome",
  },
  {
    id: "feed",
    emoji: "🏠",
    eyebrow: "The Home Feed",
    title: "Browse stunning looks",
    description:
      "Scroll through the home feed to see the latest portfolio work from verified artists. Filter by Hair, Nails, Makeup, and more — or use the search bar to find a specific style, location, or price range.",
    ctaLabel: "Browse the feed",
    ctaPath: "/",
    illustration: "feed",
  },
  {
    id: "discover",
    emoji: "📍",
    eyebrow: "Discover Nearby Artists",
    title: "Find artists close to you",
    description:
      "The Discover page shows a live map of beauty creators in your area. Enable your location to see who is nearest, check their distance, and contact them on WhatsApp or request directions instantly.",
    ctaLabel: "Open Discover",
    ctaPath: "/discover",
    illustration: "discover",
  },
  {
    id: "assistant",
    emoji: "🤖",
    eyebrow: "Glam Assistant",
    title: "Ask your AI beauty concierge",
    description:
      "Tap the sparkle button (✦) at any time to chat with the Glam Assistant. Ask it things like \"Find a braider near Polokwane under R400\" and it will surface matching artists and even help you book a slot.",
    illustration: "assistant",
  },
  {
    id: "messages",
    emoji: "💬",
    eyebrow: "Messages & Bookings",
    title: "Chat and track your appointments",
    description:
      "Your Messages inbox keeps all conversations with artists in one place. Booking requests you send appear here too, so you always know what is confirmed, pending, or upcoming.",
    ctaLabel: "Go to Messages",
    ctaPath: "/messages",
    illustration: "messages",
  },
];

// Illustration SVGs rendered inline to avoid external assets.
function Illustration({ type }: { type: Step["illustration"] }) {
  switch (type) {
    case "welcome":
      return (
        <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="280" height="180" rx="16" fill="#f5e3d8" />
          <circle cx="140" cy="75" r="38" fill="#c26f3e" opacity="0.18" />
          <circle cx="140" cy="75" r="26" fill="#c26f3e" opacity="0.28" />
          <text x="140" y="83" textAnchor="middle" fontSize="28" fill="#c26f3e">✦</text>
          <rect x="60" y="125" width="160" height="10" rx="5" fill="#c26f3e" opacity="0.22" />
          <rect x="90" y="143" width="100" height="8" rx="4" fill="#c26f3e" opacity="0.13" />
          {/* Floating sparkles */}
          <text x="54" y="54" fontSize="14" fill="#c26f3e" opacity="0.7">✦</text>
          <text x="210" y="48" fontSize="10" fill="#c26f3e" opacity="0.5">✦</text>
          <text x="228" y="112" fontSize="16" fill="#7c4b3a" opacity="0.35">✦</text>
          <text x="42" y="120" fontSize="10" fill="#7c4b3a" opacity="0.4">✦</text>
        </svg>
      );
    case "feed":
      return (
        <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="280" height="180" rx="16" fill="#f8fafc" />
          {/* Post cards */}
          <rect x="24" y="22" width="108" height="136" rx="10" fill="#e8e9e1" />
          <rect x="24" y="22" width="108" height="78" rx="10" fill="#dedfd6" />
          <rect x="33" y="110" width="60" height="7" rx="3.5" fill="#7e8379" />
          <rect x="33" y="123" width="80" height="6" rx="3" fill="#a9ada3" />
          <rect x="33" y="136" width="44" height="6" rx="3" fill="#c26f3e" opacity="0.6" />
          <rect x="148" y="22" width="108" height="136" rx="10" fill="#e8e9e1" />
          <rect x="148" y="22" width="108" height="78" rx="10" fill="#d8d9d1" />
          <rect x="157" y="110" width="60" height="7" rx="3.5" fill="#7e8379" />
          <rect x="157" y="123" width="80" height="6" rx="3" fill="#a9ada3" />
          <rect x="157" y="136" width="44" height="6" rx="3" fill="#c26f3e" opacity="0.6" />
          {/* Category pill */}
          <rect x="86" y="30" width="46" height="16" rx="8" fill="#c26f3e" opacity="0.85" />
          <rect x="210" y="30" width="37" height="16" rx="8" fill="#24271f" opacity="0.8" />
        </svg>
      );
    case "upload":
      return (
        <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="280" height="180" rx="16" fill="#f5e3d8" />
          <rect x="60" y="30" width="160" height="120" rx="12" fill="#fff" stroke="#c26f3e" strokeWidth="1.5" strokeDasharray="6 4" />
          {/* Upload arrow */}
          <path d="M140 95 L140 65" stroke="#c26f3e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M128 77 L140 65 L152 77" stroke="#c26f3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="112" y="100" width="56" height="8" rx="4" fill="#c26f3e" opacity="0.25" />
          <rect x="122" y="114" width="36" height="7" rx="3.5" fill="#c26f3e" opacity="0.16" />
          {/* Tags */}
          <rect x="68" y="122" width="38" height="14" rx="7" fill="#c26f3e" />
          <rect x="112" y="122" width="52" height="14" rx="7" fill="#24271f" opacity="0.7" />
          <rect x="170" y="122" width="36" height="14" rx="7" fill="#7c4b3a" opacity="0.6" />
        </svg>
      );
    case "discover":
      return (
        <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="280" height="180" rx="16" fill="#e8f4ec" />
          {/* Map grid lines */}
          <line x1="0" y1="60" x2="280" y2="60" stroke="#b2d8bc" strokeWidth="0.8" />
          <line x1="0" y1="120" x2="280" y2="120" stroke="#b2d8bc" strokeWidth="0.8" />
          <line x1="70" y1="0" x2="70" y2="180" stroke="#b2d8bc" strokeWidth="0.8" />
          <line x1="140" y1="0" x2="140" y2="180" stroke="#b2d8bc" strokeWidth="0.8" />
          <line x1="210" y1="0" x2="210" y2="180" stroke="#b2d8bc" strokeWidth="0.8" />
          {/* Artist pins */}
          <circle cx="140" cy="90" r="18" fill="#c26f3e" opacity="0.18" />
          <circle cx="140" cy="90" r="10" fill="#c26f3e" />
          <text x="140" y="95" textAnchor="middle" fontSize="10" fill="#fff">📍</text>
          <circle cx="88" cy="58" r="7" fill="#24271f" />
          <circle cx="196" cy="112" r="7" fill="#7c4b3a" />
          <circle cx="62" cy="128" r="6" fill="#c26f3e" opacity="0.7" />
          {/* Distance lines */}
          <line x1="140" y1="90" x2="88" y2="58" stroke="#c26f3e" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
          <line x1="140" y1="90" x2="196" y2="112" stroke="#c26f3e" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
        </svg>
      );
    case "assistant":
      return (
        <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="280" height="180" rx="16" fill="#f8fafc" />
          {/* Chat bubbles */}
          <rect x="24" y="28" width="148" height="38" rx="12" fill="#e8e9e1" />
          <rect x="33" y="38" width="100" height="8" rx="4" fill="#7e8379" />
          <rect x="33" y="51" width="68" height="7" rx="3.5" fill="#a9ada3" />
          {/* Assistant bubble */}
          <rect x="108" y="82" width="148" height="54" rx="12" fill="#24271f" />
          <rect x="118" y="92" width="88" height="7" rx="3.5" fill="#fff" opacity="0.8" />
          <rect x="118" y="106" width="110" height="6" rx="3" fill="#fff" opacity="0.5" />
          <rect x="118" y="118" width="76" height="6" rx="3" fill="#fff" opacity="0.35" />
          {/* Sparkle badge */}
          <circle cx="240" cy="154" r="18" fill="#c26f3e" />
          <text x="240" y="160" textAnchor="middle" fontSize="14" fill="#fff">✦</text>
          {/* User bubble */}
          <rect x="24" y="148" width="120" height="24" rx="12" fill="#f5e3d8" />
          <rect x="34" y="155" width="72" height="7" rx="3.5" fill="#c26f3e" opacity="0.7" />
        </svg>
      );
    case "messages":
      return (
        <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="280" height="180" rx="16" fill="#f8fafc" />
          {/* Conversation rows */}
          {[24, 76, 128].map((y, i) => (
            <g key={y}>
              <circle cx="50" cy={y + 20} r="16" fill={i === 0 ? "#c26f3e" : i === 1 ? "#24271f" : "#7c4b3a"} opacity={i === 0 ? 1 : 0.7} />
              <rect x="74" y={y + 10} width="80" height="7" rx="3.5" fill="#24271f" />
              <rect x="74" y={y + 23} width="120" height="6" rx="3" fill="#a9ada3" />
              {i === 0 && <rect x="230" y={y + 12} width="28" height="16" rx="8" fill="#c26f3e" />}
            </g>
          ))}
          {/* Dividers */}
          <line x1="74" y1="66" x2="256" y2="66" stroke="#e8e9e1" strokeWidth="1" />
          <line x1="74" y1="118" x2="256" y2="118" stroke="#e8e9e1" strokeWidth="1" />
          {/* Booking badge */}
          <rect x="24" y="156" width="232" height="16" rx="8" fill="#f5e3d8" />
          <rect x="34" y="160" width="90" height="6" rx="3" fill="#c26f3e" opacity="0.6" />
          <rect x="140" y="160" width="60" height="6" rx="3" fill="#a9ada3" opacity="0.8" />
        </svg>
      );
    default:
      return null;
  }
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="onboarding-dots" role="tablist" aria-label="Walkthrough progress">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          role="tab"
          aria-selected={i === current}
          aria-label={`Step ${i + 1}`}
          className={`onboarding-dot${i === current ? " active" : i < current ? " done" : ""}`}
        />
      ))}
    </div>
  );
}

const STORAGE_KEY = "glamsa_onboarding_done";

function OnboardingWalkthrough({ currentUser, onNavigate, onDismiss }: OnboardingWalkthroughProps) {
  const isCreator = currentUser.accountType === "creator";
  const steps = isCreator ? creatorSteps : clientSteps;
  const [stepIndex, setStepIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // Keyboard navigation.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") advance();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goBack();
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [stepIndex]);

  const advance = () => {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
  };

  const goBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const handleDismiss = () => {
    setExiting(true);
    localStorage.setItem(STORAGE_KEY, "1");
    setTimeout(onDismiss, 320);
  };

  const handleCta = (path?: string) => {
    handleDismiss();
    if (path) setTimeout(() => onNavigate(path), 340);
  };

  const handleFinish = () => {
    handleDismiss();
    onNavigate("/upload");
  };

  return (
    <div
      className={`onboarding-overlay${exiting ? " exiting" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome walkthrough"
      onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
    >
      <div className={`onboarding-card${exiting ? " exiting" : ""}`}>
        {/* Close */}
        <button
          type="button"
          className="onboarding-close"
          onClick={handleDismiss}
          aria-label="Skip walkthrough"
        >
          ✕
        </button>

        {/* Illustration */}
        <div className="onboarding-illustration">
          <Illustration type={step.illustration} />
        </div>

        {/* Content */}
        <div className="onboarding-body" key={step.id}>
          <div className="onboarding-eyebrow">
            <span className="onboarding-emoji">{step.emoji}</span>
            <span>{step.eyebrow}</span>
          </div>
          <h2 className="onboarding-title">{step.title}</h2>
          <p className="onboarding-desc">{step.description}</p>
        </div>

        {/* Progress */}
        <ProgressDots total={steps.length} current={stepIndex} />

        {/* Actions */}
        <div className="onboarding-actions">
          {!isFirst && (
            <button type="button" className="btn-ghost onboarding-back-btn" onClick={goBack}>
              ← Back
            </button>
          )}

          <div className="onboarding-primary-actions">
            {isLast ? (
              <>
                {isCreator && (
                  <button type="button" className="btn-primary onboarding-finish-btn" onClick={handleFinish}>
                    📸 Share your first look
                  </button>
                )}
                {!isCreator && (
                  <button type="button" className="btn-primary onboarding-finish-btn" onClick={() => handleCta("/discover")}>
                    📍 Discover artists near me
                  </button>
                )}
                <button type="button" className="btn-ghost onboarding-skip" onClick={handleDismiss}>
                  Explore on my own
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-primary onboarding-next-btn" onClick={advance}>
                  Next →
                </button>
                {step.ctaLabel && step.ctaPath && (
                  <button
                    type="button"
                    className="btn-ghost onboarding-cta-btn"
                    onClick={() => handleCta(step.ctaPath)}
                  >
                    {step.ctaLabel}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Step counter */}
        <p className="onboarding-step-counter">
          {stepIndex + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}

export { STORAGE_KEY };
export default OnboardingWalkthrough;
