// Handles sign-in and sign-up form state shared by the auth page.
import { useState } from "react";
import type { FormEvent } from "react";
import { IconCheck, IconPin } from "./Icons";
import { requestUserLocation, type GeolocationResult } from "../utils/geolocation";

type AuthMode = "login" | "signup";

type AuthSectionProps = {
  onSuccess?: () => void;
};

function AuthSection({ onSuccess }: AuthSectionProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"creator" | "client">("creator");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [location, setLocation] = useState<GeolocationResult | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage("");
    if (nextMode === "login") setLocation(null);
  };

  const captureLocation = async () => {
    setMessage("");
    setIsLocating(true);
    try {
      const result = await requestUserLocation();
      setLocation(result);
    } catch (error) {
      setLocation(null);
      setMessage(error instanceof Error ? error.message : "Could not get your location.");
    } finally {
      setIsLocating(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (mode === "signup" && !location) {
      setMessage("Please enable GPS location so clients and artists nearby can connect with you.");
      return;
    }

    setIsSubmitting(true);

    try {
      const body =
        mode === "signup"
          ? {
              name,
              email,
              password,
              accountType,
              whatsappNumber,
              latitude: location!.latitude,
              longitude: location!.longitude,
              locationLabel: location!.locationLabel,
            }
          : { email, password };

      const response = await fetch(`/api/auth/${mode}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Authentication failed.");
      setPassword("");
      setLocation(null);
      onSuccess?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card" aria-label="Account access">
      <div className="auth-card-header">
        <div className="eyebrow">
          <span>{mode === "login" ? "WELCOME BACK" : "JOIN THE MOVEMENT"}</span>
        </div>
        <h2>{mode === "login" ? "Sign In to Your Space" : "Create Beauty Profile"}</h2>
        <p className="auth-card-sub">
          {mode === "login"
            ? "Access your saved styles, inquiries, and creator portfolio."
            : "Connect with verified stylists, braiders, and clients across South Africa."}
        </p>
      </div>

      <div className="auth-tabs" role="tablist" aria-label="Account access">
        <button
          type="button"
          className={`auth-tab-btn ${mode === "login" ? "active" : ""}`}
          onClick={() => switchMode("login")}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`auth-tab-btn ${mode === "signup" ? "active" : ""}`}
          onClick={() => switchMode("signup")}
        >
          Join as Creator / Client
        </button>
      </div>

      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" && (
          <label className="studio-label">
            <span>Your Full Name / Salon Brand</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Naledi Sibeko or Luminous Glam Studio"
              autoComplete="name"
              required
              className="studio-input"
            />
          </label>
        )}

        <label className="studio-label">
          <span>Email Address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@domain.co.za"
            autoComplete="email"
            required
            className="studio-input"
          />
        </label>

        <label className="studio-label">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
            className="studio-input"
          />
        </label>

        {mode === "signup" && (
          <div className="account-type-choice" role="group" aria-label="Account type">
            <span className="studio-label">I am joining as</span>
            <div className="account-type-buttons">
              <button type="button" className={accountType === "creator" ? "active" : ""} onClick={() => setAccountType("creator")}>Creator</button>
              <button type="button" className={accountType === "client" ? "active" : ""} onClick={() => setAccountType("client")}>Client</button>
            </div>
          </div>
        )}

        {mode === "signup" && accountType === "creator" && (
          <label className="studio-label">
            <span>WhatsApp Number</span>
            <input type="tel" value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder="e.g. +27 82 123 4567" autoComplete="tel" required className="studio-input" />
            <small className="field-help">Clients will use this to reach you about bookings.</small>
          </label>
        )}

        {mode === "signup" && (
          <div className="auth-location-box">
            <div className="auth-loc-header">
              <IconPin size={18} className="text-gold" />
              <div>
                <strong>Location Setting</strong>
                <p>Ensures nearby users in your city see your portfolio.</p>
              </div>
            </div>

            {location ? (
              <div className="location-verified-pill">
                <div className="loc-info">
                  <span className="loc-label"><IconCheck size={14} /> {location.locationLabel}</span>
                  <small className="loc-coords">
                    {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={captureLocation}
                  disabled={isLocating}
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-location"
                onClick={captureLocation}
                disabled={isLocating}
              >
                <IconPin size={16} />
                <span>{isLocating ? "Acquiring GPS Signal..." : "Detect My City / Location"}</span>
              </button>
            )}
          </div>
        )}

        <button
          className="btn-primary auth-submit-btn"
          type="submit"
          disabled={isSubmitting || (mode === "signup" && !location)}
        >
          {isSubmitting ? "Authenticating..." : mode === "login" ? "Sign In" : "Create My Account"}
        </button>
      </form>

      {message && (
        <p className="form-message form-message-error" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}

export default AuthSection;
