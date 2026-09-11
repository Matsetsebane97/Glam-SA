// Account settings also owns creator availability and the public address fields.
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  batchCreateAvailability,
  changePassword,
  deleteAccount,
  deleteAvailability,
  getAvailability,
  updateProfile,
} from "../api";
import {
  IconCalendar,
  IconClock,
  IconPin,
  IconSparkles,
  IconTrash,
  IconUser,
  IconZap,
} from "../components/Icons";
import type { AvailabilitySlot, CurrentUser } from "../types";
import { citiesByProvince, southAfricanProvinces } from "../constants";

type SettingsPageProps = {
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
  onSaved: (updatedUser: CurrentUser) => void;
};

const escapeIcsText = (value: string) => value.replace(/[\\;,]/g, (character) => `\\${character}`).replace(/\r?\n/g, "\\n");
const toIcsDate = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function SettingsPage({ currentUser, onNavigate, onSaved }: SettingsPageProps) {
  const [name, setName] = useState(currentUser?.name || "");
  const [whatsappNumber, setWhatsappNumber] = useState(
    currentUser?.whatsappNumber || "",
  );
  const [province, setProvince] = useState(currentUser?.province || "");
  const [city, setCity] = useState(currentUser?.city || "");
  const [suburb, setSuburb] = useState(currentUser?.suburb || "");
  const [accountType, setAccountType] = useState<"creator" | "client">(
    currentUser?.accountType || "creator",
  );
  const [emailNotifications, setEmailNotifications] = useState(
    currentUser?.emailNotifications ?? true,
  );
  const [whatsappNotifications, setWhatsappNotifications] = useState(
    currentUser?.whatsappNotifications ?? true,
  );
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [deleteMessage, setDeleteMessage] = useState("");

  // Creator Availability Schedule Generator state
  const isCreator = accountType === "creator";
  const todayIso = new Date().toISOString().split("T")[0];
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [generatorStartDate, setGeneratorStartDate] = useState(todayIso);
  const [generatorDays, setGeneratorDays] = useState(7);
  const [generatorStartTime, setGeneratorStartTime] = useState("09:00");
  const [generatorEndTime, setGeneratorEndTime] = useState("17:00");
  const [generatorDuration, setGeneratorDuration] = useState(60);
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState("");

  useEffect(() => {
    if (!currentUser || !isCreator) return;
    setIsLoadingSlots(true);
    getAvailability()
      .then(setSlots)
      .catch(() => {})
      .finally(() => setIsLoadingSlots(false));
  }, [currentUser, isCreator]);

  if (!currentUser) {
    return (
      <section className="page-content settings-page">
        <div className="profile-login-state">
          <IconUser size={34} />
          <h1>Sign in to edit your profile</h1>
          <p>
            Update your public details, contact number, and location from one
            place.
          </p>
          <button
            className="btn-primary"
            type="button"
            onClick={() => onNavigate("/login")}
          >
            Sign in to continue
          </button>
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
        locationLabel: [province, city, suburb].filter(Boolean).join(", "),
        province: province.trim(),
        city: city.trim(),
        suburb: suburb.trim(),
        accountType,
        emailNotifications,
        whatsappNotifications,
      });
      onSaved(updatedUser);
      setMessage("Profile saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your profile.",
      );
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
      setPasswordMessage(
        error instanceof Error ? error.message : "Unable to change password.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete your account? This cannot be undone.",
      )
    ) {
      return;
    }
    setDeleteMessage("");
    try {
      await deleteAccount();
      onNavigate("/");
      window.location.reload();
    } catch (error) {
      setDeleteMessage(
        error instanceof Error ? error.message : "Unable to delete account.",
      );
    }
  };

  const handleGenerateSlots = async (e: FormEvent) => {
    e.preventDefault();
    setIsGeneratingSlots(true);
    setSlotMessage("");

    try {
      const generated: { startsAt: string; endsAt: string }[] = [];
      const [startH, startM] = generatorStartTime.split(":").map(Number);
      const [endH, endM] = generatorEndTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let day = 0; day < generatorDays; day++) {
        // Parse as LOCAL midnight (appending T00:00:00 avoids UTC-midnight parsing)
        const currentDate = new Date(`${generatorStartDate}T00:00:00`);
        currentDate.setDate(currentDate.getDate() + day);

        for (
          let m = startMinutes;
          m + generatorDuration <= endMinutes;
          m += generatorDuration
        ) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);

          const slotEnd = new Date(currentDate);
          slotEnd.setHours(
            Math.floor((m + generatorDuration) / 60),
            (m + generatorDuration) % 60,
            0,
            0,
          );

          if (slotStart.getTime() > Date.now()) {
            generated.push({
              startsAt: slotStart.toISOString(),
              endsAt: slotEnd.toISOString(),
            });
          }
        }
      }

      if (generated.length === 0) {
        setSlotMessage(
          "No upcoming slots generated. Ensure the chosen start time and date are in the future.",
        );
        return;
      }

      const created = await batchCreateAvailability(generated);
      setSlotMessage(`Success: Created ${created.length} new booking slot(s)!`);
      const refreshed = await getAvailability();
      setSlots(refreshed);
    } catch (err) {
      setSlotMessage(
        err instanceof Error
          ? err.message
          : "Failed to generate availability slots.",
      );
    } finally {
      setIsGeneratingSlots(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    try {
      await deleteAvailability(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err) {
      setSlotMessage(
        err instanceof Error ? err.message : "Failed to remove slot.",
      );
    }
  };

  const exportAvailabilityCalendar = () => {
    const events = slots.map((slot) => [
      "BEGIN:VEVENT",
      `UID:glam-sa-availability-${slot.id}@glamsa`,
      `DTSTAMP:${toIcsDate(new Date().toISOString())}Z`,
      `DTSTART:${toIcsDate(slot.startsAt)}Z`,
      `DTEND:${toIcsDate(slot.endsAt)}Z`,
      `SUMMARY:${escapeIcsText(slot.isAvailable ? "Glam SA availability" : "Glam SA booked appointment")}`,
      `DESCRIPTION:${escapeIcsText(slot.isAvailable ? "Available booking slot on Glam SA" : "This Glam SA slot is already booked")}`,
      "END:VEVENT",
    ].join("\r\n"));

    if (events.length === 0) {
      setSlotMessage("Generate at least one future slot before exporting your calendar.");
      return;
    }

    const calendar = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Glam SA//Availability//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "glam-sa-availability.ics";
    link.click();
    URL.revokeObjectURL(url);
    setSlotMessage(`Exported ${events.length} calendar event(s).`);
  };

  return (
    <section className="page-content settings-page">
      <div className="settings-header">
        <div>
          <div className="eyebrow">Studio controls</div>
          <h1>Profile & Account Settings</h1>
        </div>
        <p>
          Keep your profile up to date, set your working hours, and manage your
          account.
        </p>
      </div>

      <form className="settings-form" onSubmit={submit}>
        {/* Account Role Switcher */}
        <div className="account-role-selector-card">
          <div className="role-selector-label-group">
            <span className="studio-label-text">Account Purpose / Role</span>
            <p className="role-selector-sub">
              Choose how you want to experience Glam SA. You can switch between
              roles at any time.
            </p>
          </div>

          <div className="account-role-toggle-group">
            <button
              type="button"
              className={`account-role-toggle-btn ${accountType === "creator" ? "active" : ""}`}
              onClick={() => setAccountType("creator")}
            >
              <div className="role-btn-title">
                <IconSparkles size={16} />
                <span>Stylist / Creator</span>
              </div>
              <div className="role-btn-desc">
                Publish portfolio styles, appear on the radar map, set working
                hours, and receive client bookings.
              </div>
            </button>

            <button
              type="button"
              className={`account-role-toggle-btn ${accountType === "client" ? "active" : ""}`}
              onClick={() => setAccountType("client")}
            >
              <div className="role-btn-title">
                <IconUser size={16} />
                <span>Client / Customer</span>
              </div>
              <div className="role-btn-desc">
                Discover styles, find nearby artists on the map, book
                appointments, and chat directly with stylists.
              </div>
            </button>
          </div>
        </div>

        <div className="settings-grid">
          <label className="studio-label">
            <span>Your Name or Salon</span>
            <input
              className="studio-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              autoComplete="name"
            />
          </label>

          <label className="studio-label">
            <span>WhatsApp Number</span>
            <input
              className="studio-input"
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              maxLength={30}
              autoComplete="tel"
              placeholder="+27..."
            />
          </label>

          <div className="studio-label settings-address-fields">
            <span><IconPin size={14} /> Public location</span>
            <div className="settings-address-grid">
              <select className="studio-input" value={province} onChange={(event) => { setProvince(event.target.value); setCity(""); }} autoComplete="address-level1">
                <option value="">Select province</option>
                {southAfricanProvinces.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {/* Suggestions guide users without preventing less common towns. */}
              <input
                className="studio-input"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                autoComplete="address-level2"
                list="settings-city-options"
                placeholder={province ? "City or town" : "Select province first"}
                disabled={!province}
              />
              <datalist id="settings-city-options">
                {(citiesByProvince[province] || []).map((item) => <option key={item} value={item} />)}
              </datalist>
              <input className="studio-input" value={suburb} onChange={(event) => setSuburb(event.target.value)} maxLength={100} autoComplete="address-line2" placeholder="Suburb" />
            </div>
            <small className="field-help">Displayed as Province, City, Suburb. Coordinates are used separately for distance calculations.</small>
          </div>

          <div
            className="settings-section-heading"
            data-settings-section="preferences"
          >
            <h3>Notification Preferences</h3>
          </div>

          <label
            className="studio-label settings-checkbox-row"
          >
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
            />
            <span className="settings-checkbox-label">
              Receive email notifications
            </span>
          </label>
          <label
            className="studio-label settings-checkbox-row"
          >
            <input
              type="checkbox"
              checked={whatsappNotifications}
              onChange={(e) => setWhatsappNotifications(e.target.checked)}
            />
            <span className="settings-checkbox-label">
              Receive WhatsApp notifications
            </span>
          </label>
        </div>

        {message && (
          <div
            className="profile-error"
            role="alert"
            style={{
              color: message.includes("success") ? "#4ade80" : undefined,
            }}
          >
            {message}
          </div>
        )}

        <div className="settings-actions">
          <button
            className="btn-ghost"
            type="button"
            onClick={() => onNavigate("/profile")}
          >
            Cancel
          </button>
          <button className="btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>

      {/* ─── CREATOR WORKING HOURS & AVAILABILITY ──────────────────────────────── */}
      {isCreator && (
        <section className="settings-scheduling" id="availability">
          <div className="settings-section-heading">
            <div>
              <div className="eyebrow">
                <IconCalendar size={13} /> Booking Schedule
              </div>
              <h2>Working Hours & Availability</h2>
            </div>
            <div className="settings-scheduling-actions">
              <button className="btn-outline-sm" type="button" onClick={exportAvailabilityCalendar}>
                <IconCalendar size={15} /> Export calendar
              </button>
              <p>
              Clients can only request bookings during your active available
              slots. Generate recurring weekly hours below.
              </p>
            </div>
          </div>

          <div className="availability-generator-card">
            <form
              onSubmit={handleGenerateSlots}
              className="availability-gen-form"
            >
              <h3>
                <IconZap size={18} />
                <span>Quick Schedule Generator</span>
              </h3>
              <p className="availability-gen-desc">
                Select your working window and we'll automatically generate
                booking slots for clients on your profile.
              </p>

              <div className="availability-fields-grid">
                <label className="studio-label">
                  <span>Start Date</span>
                  <input
                    className="studio-input"
                    type="date"
                    min={todayIso}
                    value={generatorStartDate}
                    onChange={(e) => setGeneratorStartDate(e.target.value)}
                    required
                  />
                </label>

                <label className="studio-label">
                  <span>Days Ahead</span>
                  <select
                    className="studio-input"
                    value={generatorDays}
                    onChange={(e) => setGeneratorDays(Number(e.target.value))}
                  >
                    <option value={1}>1 Day (Today only)</option>
                    <option value={3}>3 Days</option>
                    <option value={5}>5 Days (Work week)</option>
                    <option value={7}>7 Days (Full week)</option>
                    <option value={14}>14 Days (2 Weeks)</option>
                    <option value={30}>30 Days (Full Month)</option>
                  </select>
                </label>

                <label className="studio-label">
                  <span>Daily Start Time</span>
                  <input
                    className="studio-input"
                    type="time"
                    value={generatorStartTime}
                    onChange={(e) => setGeneratorStartTime(e.target.value)}
                    required
                  />
                </label>

                <label className="studio-label">
                  <span>Daily End Time</span>
                  <input
                    className="studio-input"
                    type="time"
                    value={generatorEndTime}
                    onChange={(e) => setGeneratorEndTime(e.target.value)}
                    required
                  />
                </label>

                <label className="studio-label">
                  <span>Slot Duration</span>
                  <select
                    className="studio-input"
                    value={generatorDuration}
                    onChange={(e) =>
                      setGeneratorDuration(Number(e.target.value))
                    }
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes (1 hour)</option>
                    <option value={90}>90 minutes (1.5 hours)</option>
                    <option value={120}>120 minutes (2 hours)</option>
                    <option value={180}>180 minutes (3 hours)</option>
                  </select>
                </label>
              </div>

              {slotMessage && (
                <div
                  className="profile-error"
                  role="status"
                  style={{
                    color: slotMessage.includes("Success")
                      ? "#4ade80"
                      : undefined,
                  }}
                >
                  {slotMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isGeneratingSlots}
                className="btn-primary settings-generate-btn"
              >
                <IconClock size={16} />
                {isGeneratingSlots
                  ? "Generating slots..."
                  : "Generate Available Slots"}
              </button>
            </form>

            {/* Active Upcoming Slots Preview */}
            <div className="active-slots-preview">
              <div className="active-slots-header">
                <h3>
                  Upcoming Active Slots (
                  {slots.filter((s) => s.isAvailable).length})
                </h3>
                <small>Slots booked by clients are locked automatically.</small>
              </div>

              {isLoadingSlots ? (
                <p>Loading slots...</p>
              ) : slots.length === 0 ? (
                <p className="no-slots-note">
                  No active availability slots yet. Use the generator above to
                  create slots.
                </p>
              ) : (
                <div className="slots-chips-container">
                  {slots.map((slot) => {
                    const start = new Date(slot.startsAt);
                    const end = new Date(slot.endsAt);
                    const dateStr = start.toLocaleDateString("en-ZA", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    });
                    const timeStr = `${start.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;

                    return (
                      <div
                        key={slot.id}
                        className={`slot-chip ${slot.isAvailable ? "available" : "booked"}`}
                      >
                        <div>
                          <strong>{dateStr}</strong>
                          <span>{timeStr}</span>
                          {!slot.isAvailable && (
                            <span className="slot-booked-tag">Booked</span>
                          )}
                        </div>
                        {slot.isAvailable && (
                          <button
                            type="button"
                            className="slot-delete-btn"
                            title="Remove this slot"
                            onClick={() => handleDeleteSlot(slot.id)}
                          >
                            <IconTrash size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── SECURITY / ACCOUNT MANAGEMENT ───────────────────────────────────── */}
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
              <input
                className="studio-input"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </label>
            <label className="studio-label">
              <span>New Password</span>
              <input
                className="studio-input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
            {passwordMessage && (
              <div
                className="profile-error"
                role="alert"
                style={{
                  color: passwordMessage.includes("success")
                    ? "#4ade80"
                    : undefined,
                }}
              >
                {passwordMessage}
              </div>
            )}
            <button
              className="btn-primary"
              type="submit"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>

          <div className="settings-subform settings-danger-subform">
            <h3>
              Delete Account
            </h3>
            <p className="settings-note settings-danger-copy">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            {deleteMessage && (
              <div className="profile-error" role="alert">
                {deleteMessage}
              </div>
            )}
            <button
              className="btn-outline-sm danger-action"
              type="button"
              onClick={handleDeleteAccount}
            >
              Permanently Delete Account
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}

export default SettingsPage;
