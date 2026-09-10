// Login page — full-bleed cinematic split: editorial left, glass auth card right.
import AuthSection from "../components/AuthSection";
import { IconCompass, IconHeart, IconUpload } from "../components/Icons";
import { brandLogoUrl } from "../constants";

type LoginPageProps = {
  onNavigate: (path: string) => void;
};

function LoginPage({ onNavigate }: LoginPageProps) {
  return (
    <main className="auth-page">
      {/* Subtle back link */}
      <button className="auth-back-link" type="button" onClick={() => onNavigate("/")}>
        ← Back to Feed
      </button>

      <div className="auth-split">
        {/* Left — editorial hero */}
        <section className="auth-hero">
          {/* Decorative background orbs */}
          <div className="auth-hero-orb auth-hero-orb-1" aria-hidden="true" />
          <div className="auth-hero-orb auth-hero-orb-2" aria-hidden="true" />

          {/* Brand badge */}
          <div className="auth-brand-badge">
            <img className="auth-hero-logo" src={brandLogoUrl} alt="Glam SA logo" />
            <span>Glam SA</span>
          </div>

          <div className="eyebrow accent">South Africa's Beauty Sanctuary</div>

          <h1 className="auth-hero-headline">
            Your beauty world,{" "}
            <em>curated for you</em>
          </h1>

          <p className="auth-hero-desc">
            Save the looks that stop you mid-scroll, find verified braiders and artists near you,
            and showcase your artistry to South Africa.
          </p>

          <div className="auth-feature-grid">
            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <IconCompass size={18} />
              </div>
              <div>
                <strong>Local Radar</strong>
                <p>Find top-rated stylists, nail techs, and barbers in your radius.</p>
              </div>
            </div>

            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <IconUpload size={18} />
              </div>
              <div>
                <strong>Creator Portfolio</strong>
                <p>Upload photos and videos with zero compression to grow your clientele.</p>
              </div>
            </div>

            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <IconHeart size={18} />
              </div>
              <div>
                <strong>Direct Booking</strong>
                <p>Organise inspiration and message artists directly via WhatsApp.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right — auth card */}
        <div className="auth-card-wrap">
          <AuthSection onSuccess={() => onNavigate("/")} />
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
