import { useState } from "react";
import type { FormEvent } from "react";
import { changePassword, deleteAccount, updateProfile } from "../api";
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
  const [emailNotifications, setEmailNotifications] = useState(currentUser?.emailNotifications ?? true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(currentUser?.whatsappNotifications ?? true);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [deleteMessage, setDeleteMessage] = useState("");

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
        emailNotifications,
        whatsappNotifications,
      });
      onSaved(updatedUser);
      setMessage("Profile saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage("");
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    setDeleteMessage("");
    try {
      await deleteAccount();
      onNavigate("/");
      window.location.reload();
    } catch (error) {
      setDeleteMessage(error instanceof Error ? error.message : "Unable to delete account.");
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
          
          <div className="settings-section-heading" style={{ marginTop: '2rem' }}>
            <h3>Notification Preferences</h3>
          </div>
          
          <label className="studio-label" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
            <span style={{ margin: 0, fontWeight: 'normal' }}>Receive email notifications</span>
          </label>
          <label className="studio-label" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={whatsappNotifications} onChange={(e) => setWhatsappNotifications(e.target.checked)} />
            <span style={{ margin: 0, fontWeight: 'normal' }}>Receive WhatsApp notifications</span>
          </label>
        </div>
        {message && <div className="profile-error" role="alert" style={{ color: message.includes('success') ? 'green' : undefined }}>{message}</div>}
        <div className="settings-actions">
          <button className="btn-ghost" type="button" onClick={() => onNavigate("/profile")}>Cancel</button>
          <button className="btn-primary" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</button>
        </div>
      </form>

      <section className="settings-scheduling">
        <div className="settings-section-heading">
          <div>
            <div className="eyebrow">Security</div>
            <h2>Account Management</h2>
          </div>
          <p>Update your password or permanently delete your account.</p>
        </div>

        <div className="settings-booking-grid">
          <form className="settings-subform" onSubmit={handlePasswordSubmit}>
            <h3>Change Password</h3>
            <label className="studio-label">
              <span>Current Password</span>
              <input className="studio-input" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            </label>
            <label className="studio-label">
              <span>New Password</span>
              <input className="studio-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
            </label>
            {passwordMessage && <div className="profile-error" role="alert" style={{ color: passwordMessage.includes('success') ? 'green' : undefined }}>{passwordMessage}</div>}
            <button className="btn-primary" type="submit" disabled={isChangingPassword}>{isChangingPassword ? "Updating..." : "Update Password"}</button>
          </form>

          <div className="settings-subform" style={{ borderColor: 'var(--danger-color, #ff4444)' }}>
            <h3 style={{ color: 'var(--danger-color, #ff4444)' }}>Delete Account</h3>
            <p className="settings-note" style={{ marginBottom: '1rem' }}>
              Once you delete your account, there is no going back. Please be certain.
            </p>
            {deleteMessage && <div className="profile-error" role="alert">{deleteMessage}</div>}
            <button className="btn-outline-sm danger-action" type="button" onClick={handleDeleteAccount}>Permanently Delete Account</button>
          </div>
        </div>
      </section>
    </section>
  );
}

export default SettingsPage;
