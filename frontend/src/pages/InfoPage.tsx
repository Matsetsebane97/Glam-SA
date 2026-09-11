// Public information pages explain how Glam SA works and set clear expectations for members.
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
      "Glam SA connects clients with beauty creators across South Africa, making it easier to discover work, compare services, ask questions, and arrange appointments.",
  },
  terms: {
    eyebrow: "Terms of use",
    title: "A clear space for sharing beauty work.",
    intro:
      "By using Glam SA, you agree to use the service lawfully and respectfully, and to share only content and information you have the right to publish.",
  },
  privacy: {
    eyebrow: "Privacy",
    title: "Your profile should work for you.",
    intro:
      "We collect and use information to help you discover creators, publish work, manage your profile, arrange bookings, and communicate with other members.",
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
          <InfoSection
            icon={<IconVerified size={20} />}
            title="For clients and creators"
            text="Clients can save inspiration, contact creators, request appointments, and manage their booking activity. Creators can showcase their work, list services, share availability, and respond to enquiries."
          />
          <InfoSection
            icon={<IconHeart size={20} />}
            title="A community built on trust"
            text="Use accurate profile information, communicate clearly, and report content or behaviour that feels unsafe, misleading, abusive, or inappropriate."
          />
        </div>
      )}

      {page === "terms" && (
        <div className="info-copy">
          <h2>Using the service</h2>
          <p>
            You must provide accurate account information, keep your login details private, and be old enough to use the service under the laws that apply to you. Do not use Glam SA to harass, threaten, mislead, spam, scam, impersonate, or unlawfully contact another person.
          </p>
          <h2>Content you publish</h2>
          <p>
            You keep ownership of your photos, videos, descriptions, and other work. You give Glam SA permission to host, display, resize, and distribute that content as needed to operate the service. You are responsible for having permission to publish people, locations, music, brands, and other materials shown in your content.
          </p>
          <h2>Bookings and payments</h2>
          <p>
            Glam SA helps people discover creators, exchange messages, and request appointments. A booking, price, payment, cancellation, refund, service result, and safety arrangement is agreed between the client and creator unless Glam SA explicitly states otherwise. Creators are responsible for accurate service descriptions, prices, availability, and professional conduct.
          </p>
          <h2>Location and communication</h2>
          <p>
            You control whether you grant device location access. Profile location details and contact methods may be visible to other members when you add them or use a feature that requires them. Do not use another member's information for harassment, unsolicited marketing, or unlawful activity.
          </p>
          <h2>Moderation and account action</h2>
          <p>
            We may review reports, remove content, limit visibility, suspend, or delete accounts that violate these terms, create safety risks, misuse the platform, or expose Glam SA or its members to harm. We may update features, rules, or availability as the service develops.
          </p>
          <h2>Service limits</h2>
          <p>
            Glam SA is provided to help people connect. We do not guarantee that a creator will be available, that a service will meet expectations, or that the platform will always be uninterrupted or error-free. Use your own judgement before sharing personal information, visiting a location, or paying for a service.
          </p>
        </div>
      )}

      {page === "privacy" && (
        <div className="info-copy">
          <h2>Information you provide</h2>
          <p>
            Depending on how you use Glam SA, we may receive your name, email address, account role, profile photo, biography, service categories, phone or WhatsApp number, province, city, suburb, portfolio content, service details, messages, booking details, reviews, and notification preferences.
          </p>
          <h2>Device location and coordinates</h2>
          <p>
            If you grant permission, we may use your device coordinates to improve nearby discovery and distance calculations. Your public profile uses the location details you choose to save, such as Province, City/Town, and Suburb. Exact coordinates should not be displayed publicly unless a specific feature clearly tells you otherwise.
          </p>
          <h2>How we use information</h2>
          <p>
            We use information to create and secure accounts, show profiles and portfolio work, calculate nearby results, support bookings and messaging, send requested reminders or notifications, prevent abuse, troubleshoot the service, and improve Glam SA. We do not need your device location to provide every feature.
          </p>
          <h2>What other people can see</h2>
          <p>
            Public profile information, portfolio posts, selected location details, service information, reviews, and creator contact options may be visible to other visitors. We do not display your password. Booking and message details are shared with the members involved in that interaction and with service providers needed to operate the feature.
          </p>
          <h2>Storage and security</h2>
          <p>
            We use reasonable technical and organisational safeguards to protect account information. No online service can promise absolute security. Some preferences and saved items may be stored locally on your device, so clearing browser or app data can remove them from that device.
          </p>
          <h2>Retention and deletion</h2>
          <p>
            We keep information for as long as needed to provide the service, meet legal obligations, resolve disputes, prevent abuse, and maintain appropriate records. You can update your profile, remove portfolio posts, or request account assistance through the available account and support channels.
          </p>
          <h2>Your choices and rights</h2>
          <p>
            You can manage profile details, notification preferences, saved content, device location permissions, and uploaded posts. You may also ask for access, correction, or deletion of personal information, subject to legal and operational requirements. We may need to verify your identity before completing a request.
          </p>
        </div>
      )}

      <p className="info-updated">Last updated: 11 September 2026</p>
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
