import { useState } from "react";
import type { FormEvent } from "react";
import { updateProfile } from "../api";
import { IconPin, IconUser } from "../components/Icons";
import type { CurrentUser } from "../types";

type SettingsPageProps = {
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
  onSaved: (updatedUser: CurrentUser) => void;
};

function SettingsPage({ currentUser, onNavigate, onSaved }: SettingsPageProps) {
  const [name, setName] = useState(currentUser?.name || "");
  const [whatsappNumber, setWhatsappNumber] = useState(currentUser?.whatsappNumber || "");
  const [locationLabel, setLocationLabel] = useState(currentUser?.locationLabel || "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!currentUser) {
    return (
      <section className="page-content settings-page">
        <div className="profile-login-state">
          <IconUser size={34} />
          <h1>Sign in to edit your profile</h1>
          <p>Update your public details, contact number, and location from one place.</p>
          <button className="btn-primary" type="button" onClick={() => onNavigate("/login")}>Sign in to continue</button>
        </div>
      </section>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    try {
      const updatedUser = await updateProfile({
        name: name.trim(),
        whatsappNumber: whatsappNumber.trim(),
        locationLabel: locationLabel.trim(),
      });
      onSaved(updatedUser);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="page-content settings-page">
      <header className="settings-heading">
        <div>
          <div className="eyebrow"><IconUser size={13} /> Account settings</div>
          <h1>Edit your profile</h1>
          <p>Keep your public details current so the right people can find you.</p>
        </div>
        <button className="btn-ghost" type="button" onClick={() => onNavigate("/profile")}>View profile</button>
      </header>

      <form className="settings-form" onSubmit={submit}>
        <div className="settings-avatar" aria-hidden="true">{name.charAt(0).toUpperCase() || "G"}</div>
        <div className="settings-form-fields">
          <label className="studio-label">
            <span>Name or brand name</span>
            <input className="studio-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={150} autoComplete="name" required />
          </label>
          <label className="studio-label">
            <span>Handle</span>
            <input className="studio-input settings-readonly" value={currentUser.handle} readOnly aria-describedby="handle-note" />
            <small id="handle-note" className="settings-note">Your handle is linked to your sign-in email.</small>
          </label>
          <label className="studio-label">
            <span>WhatsApp number</span>
            <input className="studio-input" value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} maxLength={30} autoComplete="tel" placeholder="e.g. +27 82 123 4567" />
          </label>
          <label className="studio-label">
            <span><IconPin size={14} /> Location</span>
            <input className="studio-input" value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} maxLength={120} autoComplete="address-level2" placeholder="e.g. Gauteng, Johannesburg, Sandton" />
          </label>
        </div>
        {message && <div className="profile-error" role="alert">{message}</div>}
        <div className="settings-actions">
          <button className="btn-ghost" type="button" onClick={() => onNavigate("/profile")}>Cancel</button>
          <button className="btn-primary" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</button>
        </div>
      </form>
    </section>
  );
}

export default SettingsPage;
