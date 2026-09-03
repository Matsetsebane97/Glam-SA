// Auth page wrapper for switching between sign-in and sign-up states.
import AuthSection from "../components/AuthSection";
import { IconCompass, IconHeart, IconUpload } from "../components/Icons";
import { brandLogoUrl } from "../constants";

type LoginPageProps = {
  onNavigate: (path: string) => void;
};

function LoginPage({ onNavigate }: LoginPageProps) {
  return (
    <main className="auth-page">
      <button className="btn-ghost back-link auth-back" type="button" onClick={() => onNavigate("/")}>
        ← Back to Feed
      </button>

      <div className="auth-page-grid">
        <section className="auth-hero">
          <div className="auth-brand-badge">
            <img className="auth-hero-logo" src={brandLogoUrl} alt="Glam SA logo" />
            <span className="brand-badge-name">Glam SA</span>
          </div>

          <div className="eyebrow">
            <span>SOUTH AFRICA'S BEAUTY SANCTUARY</span>
          </div>

          <h1>
            Your beauty world, <em>curated for you</em>
          </h1>

          <p className="auth-hero-desc">
            Save the looks that stop you mid-scroll, find verified braiders and artists near you, and showcase your artistry to South Africa.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feat-icon"><IconCompass size={18} /></div>
              <div>
                <strong>Local Radar Discovery</strong>
                <p>Find top-rated hair stylists, nail technicians, and barbers in your radius.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feat-icon"><IconUpload size={18} /></div>
              <div>
                <strong>Creator Portfolio</strong>
                <p>Upload photos and videos with zero compression to build your client pipeline.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feat-icon"><IconHeart size={18} /></div>
              <div>
                <strong>Moodboards & Direct Booking</strong>
                <p>Organize inspiration collections and message artists via WhatsApp.</p>
              </div>
            </div>
          </div>
        </section>

        <AuthSection onSuccess={() => onNavigate("/")} />
      </div>
    </main>
  );
}

export default LoginPage;
