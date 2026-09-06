// Page-level layout for submitting a new creator post.
import UploadSection from "../components/UploadSection";
import type { CurrentUser } from "../types";

type UploadPageProps = {
  categories: string[];
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
  onUploaded: () => void;
};

function UploadPage({ categories, currentUser, onNavigate, onUploaded }: UploadPageProps) {
  return (
    <section className="page-content upload-page">
      <header className="upload-header">
        <button className="back-link" type="button" onClick={() => onNavigate("/")}>
          Back to feed
        </button>
        <div className="eyebrow">Share a look</div>
        <h1>New listing</h1>
        <p>Add your work, set the booking details, then check how it will appear on the feed.</p>
      </header>

      {currentUser?.accountType === "client" ? (
        <div className="login-prompt-card">
          <h2>Client account</h2>
          <p>Client accounts can discover looks and message creators about bookings. Switch to a creator account to publish your own work.</p>
          <div className="location-action-buttons">
            <button className="btn-ghost" type="button" onClick={() => onNavigate("/")}>Explore Feed</button>
          </div>
        </div>
      ) : currentUser ? (
        <UploadSection
          userName={currentUser.name}
          handle={currentUser.handle}
          categories={categories}
          onUploaded={onUploaded}
        />
      ) : (
        <div className="login-prompt-card">
          <h2>Creator portfolio access</h2>
          <p>Sign in or join Glam SA to publish your styles, pin your salon on the radar map, and receive booking inquiries.</p>
          <div className="location-action-buttons">
            <button className="btn-primary" type="button" onClick={() => onNavigate("/login")}>
              Join or Sign In
            </button>
            <button className="btn-ghost" type="button" onClick={() => onNavigate("/")}>
              Explore Feed First
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default UploadPage;
