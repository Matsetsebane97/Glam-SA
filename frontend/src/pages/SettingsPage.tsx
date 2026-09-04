import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { addAvailability, deleteAvailability, deleteService, getAvailability, getServices, saveService, updateProfile } from "../api";
import { IconPin, IconUser } from "../components/Icons";
import type { AvailabilitySlot, CurrentUser, ServiceOffering } from "../types";

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
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    void Promise.all([getServices(), getAvailability()])
      .then(([nextServices, nextSlots]) => {
        setServices(nextServices);
        setSlots(nextSlots);
      })
      .catch(() => setScheduleMessage("We could not load your services and availability."));
  }, [currentUser]);

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

  const addService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScheduleMessage("");
    try {
      const service = await saveService({
        name: serviceName.trim(),
        price: servicePrice,
        durationMinutes: Number(serviceDuration),
      });
      setServices((current) => [...current, service].sort((left, right) => left.name.localeCompare(right.name)));
      setServiceName("");
      setServicePrice("");
    } catch (error) {
      setScheduleMessage(error instanceof Error ? error.message : "Unable to save service.");
    }
  };

  const addSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScheduleMessage("");
    try {
      const slot = await addAvailability(new Date(slotStart).toISOString(), new Date(slotEnd).toISOString());
      setSlots((current) => [...current, slot].sort((left, right) => left.startsAt.localeCompare(right.startsAt)));
      setSlotStart("");
      setSlotEnd("");
    } catch (error) {
      setScheduleMessage(error instanceof Error ? error.message : "Unable to add availability.");
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

      <section className="settings-scheduling">
        <div className="settings-section-heading">
          <div>
            <div className="eyebrow">Booking setup</div>
            <h2>Services and availability</h2>
          </div>
          <p>Clients can request a slot after choosing one of your services.</p>
        </div>
        {scheduleMessage && <div className="profile-error" role="alert">{scheduleMessage}</div>}

        <div className="settings-booking-grid">
          <form className="settings-subform" onSubmit={addService}>
            <h3>Add a service</h3>
            <label className="studio-label"><span>Service name</span><input className="studio-input" value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="e.g. Knotless braids" required /></label>
            <div className="settings-inline-fields">
              <label className="studio-label"><span>Price (ZAR)</span><input className="studio-input" type="number" min="0" step="0.01" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} placeholder="850.00" required /></label>
              <label className="studio-label"><span>Minutes</span><input className="studio-input" type="number" min="15" step="15" value={serviceDuration} onChange={(event) => setServiceDuration(event.target.value)} required /></label>
            </div>
            <button className="btn-primary" type="submit">Add service</button>
            <ul className="settings-list">
              {services.map((service) => <li key={service.id}><span><strong>{service.name}</strong><small>R {service.price} · {service.durationMinutes} min</small></span><button className="btn-outline-sm danger-action" type="button" onClick={() => void deleteService(service.id).then(() => setServices((current) => current.filter((item) => item.id !== service.id))).catch((error) => setScheduleMessage(error.message))}>Remove</button></li>)}
            </ul>
          </form>

          <form className="settings-subform" onSubmit={addSlot}>
            <h3>Add availability</h3>
            <label className="studio-label"><span>Starts</span><input className="studio-input" type="datetime-local" value={slotStart} onChange={(event) => setSlotStart(event.target.value)} required /></label>
            <label className="studio-label"><span>Ends</span><input className="studio-input" type="datetime-local" value={slotEnd} onChange={(event) => setSlotEnd(event.target.value)} required /></label>
            <button className="btn-primary" type="submit">Add time slot</button>
            <ul className="settings-list">
              {slots.map((slot) => <li key={slot.id}><span><strong>{new Date(slot.startsAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</strong><small>{new Date(slot.startsAt).toLocaleTimeString("en-ZA", { hour: "numeric", minute: "2-digit" })} - {new Date(slot.endsAt).toLocaleTimeString("en-ZA", { hour: "numeric", minute: "2-digit" })}</small></span><button className="btn-outline-sm danger-action" type="button" onClick={() => void deleteAvailability(slot.id).then(() => setSlots((current) => current.filter((item) => item.id !== slot.id))).catch((error) => setScheduleMessage(error.message))}>Remove</button></li>)}
            </ul>
          </form>
        </div>
      </section>
    </section>
  );
}

export default SettingsPage;
