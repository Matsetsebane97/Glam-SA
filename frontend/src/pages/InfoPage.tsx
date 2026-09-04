import type { ReactNode } from "react";
import { IconCompass, IconHeart, IconPin, IconVerified } from "../components/Icons";

type InfoPageProps = {
  page: "about" | "terms" | "privacy";
  onNavigate: (path: string) => void;
};

const pageContent = {
  about: {
    eyebrow: "About Glam SA",
    title: "A more local way to find your next look.",
    intro:
      "Glam SA connects people across South Africa with the beauty artists, styles, and creative work they are looking for.",
  },
  terms: {
    eyebrow: "Terms of use",
    title: "A clear space for sharing beauty work.",
    intro:
      "By using Glam SA, you agree to use the service respectfully and to share content and information you have the right to publish.",
  },
  privacy: {
    eyebrow: "Privacy",
    title: "Your profile should work for you.",
    intro:
      "We collect only the information needed to help you discover artists, publish work, manage your profile, and start conversations.",
  },
} as const;

function InfoPage({ page, onNavigate }: InfoPageProps) {
  const content = pageContent[page];

  return (
    <section className="page-content info-page">
      <button className="btn-ghost info-back" type="button" onClick={() => onNavigate("/")}>
        Back to feed
      </button>
      <header className="info-hero">
        <div className="eyebrow">
          <IconVerified size={13} /> {content.eyebrow}
        </div>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
      </header>

      {page === "about" && (
        <div className="info-sections">
          <InfoSection
            icon={<IconCompass size={20} />}
            title="Discover nearby talent"
            text="Browse hair, nails, makeup, barbering, skincare, and tattoo work from artists around you."
          />
          <InfoSection
            icon={<IconHeart size={20} />}
            title="Find inspiration"
            text="Explore real community looks, save the ideas that speak to you, and return when you are ready to book."
          />
          <InfoSection
            icon={<IconPin size={20} />}
            title="Keep it local"
            text="Location-aware discovery helps clients and artists make meaningful connections in their own communities."
          />
        </div>
      )}

      {page === "terms" && (
        <div className="info-copy">
          <h2>Using the service</h2>
          <p>
            Keep your account details accurate, respect other members, and do not use Glam SA to harass, mislead, spam, or impersonate someone else.
          </p>
          <h2>Content and bookings</h2>
          <p>
            You keep ownership of the work you upload. You are responsible for having permission to publish it. Glam SA helps people discover and contact each other, but bookings, prices, payments, and services are agreed directly between the people involved.
          </p>
          <h2>Keeping the community healthy</h2>
          <p>
            We may remove content or restrict accounts that break these rules, threaten the safety of others, or misuse the platform.
          </p>
        </div>
      )}

      {page === "privacy" && (
        <div className="info-copy">
          <h2>What we use</h2>
          <p>
            Your name, account details, profile location, portfolio posts, and messages are used to provide the features you request. Location is used to show nearby artists and posts when you enable it.
          </p>
          <h2>What we share</h2>
          <p>
            Your public profile and portfolio details are visible to other Glam SA visitors. We do not display your private sign-in credentials. Contact details you add for bookings may be visible where the product makes them available to clients.
          </p>
          <h2>Your choices</h2>
          <p>
            You can update your profile from Settings, remove portfolio posts from your profile, or contact the Glam SA team about an account or privacy request.
          </p>
        </div>
      )}

      <p className="info-updated">Last updated: 4 September 2026</p>
    </section>
  );
}

type InfoSectionProps = {
  icon: ReactNode;
  title: string;
  text: string;
};

function InfoSection({ icon, title, text }: InfoSectionProps) {
  return (
    <article className="info-section">
      <div className="info-section-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

export default InfoPage;
