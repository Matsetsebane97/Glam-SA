import { useState, useEffect, useMemo } from "react";
import {
  CurrentUser,
  ServiceOffering,
  AvailabilitySlot,
  Booking,
} from "../types";
import {
  getServices,
  getAvailability,
  createBooking,
  sendMessage,
} from "../api";
import {
  IconCalendar,
  IconClock,
  IconCheck,
  IconClose,
  IconWhatsApp,
  IconMessage,
  IconVerified,
  IconPin,
  IconSparkles,
} from "./Icons";

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: number;
  creatorName: string;
  creatorHandle?: string;
  creatorLocation?: string;
  creatorAvatar?: string;
  creatorPhone?: string;
  postId?: number;
  postImageUrl?: string;
  initialServiceId?: string;
  initialServiceName?: string;
  initialPrice?: string | number;
  initialDurationMinutes?: number;
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
}

const QUICK_TAGS = [
  "Wash & blow-dry needed",
  "Sensitive scalp",
  "Need completed before 5 PM",
  "Bringing own hair / extensions",
  "First time client",
  "House call request",
];

const formatDuration = (minutes?: number): string => {
  if (!minutes) return "60 mins";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours && remaining) return `${hours}h ${remaining}m`;
  if (hours) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${remaining} mins`;
};

const formatGoogleCalendarUrl = ({
  title,
  details,
  location,
  startsAt,
  endsAt,
}: {
  title: string;
  details: string;
  location: string;
  startsAt: string;
  endsAt: string;
}) => {
  try {
    const formatIso = (dateStr: string) =>
      new Date(dateStr).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const dates = `${formatIso(startsAt)}/${formatIso(endsAt)}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&dates=${dates}&details=${encodeURIComponent(
      details
    )}&location=${encodeURIComponent(location)}`;
  } catch {
    return "#";
  }
};

export default function BookingModal({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  creatorHandle,
  creatorLocation,
  creatorAvatar,
  creatorPhone,
  postId,
  postImageUrl,
  initialServiceId,
  initialServiceName,
  initialPrice,
  initialDurationMinutes,
  currentUser,
  onNavigate,
}: BookingModalProps) {
  // Navigation & tabs
  const [activeTab, setActiveTab] = useState<"book" | "inquire">("book");
  const [showAuthGate, setShowAuthGate] = useState(false);

  // Services & Availability data
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Selections
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId || ""
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Direct Inquire state
  const [inquiryText, setInquiryText] = useState("");
  const [isInquiring, setIsInquiring] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);

  // Booking submission & result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load creator services and availability slots
  useEffect(() => {
    if (!isOpen || !creatorId) return;

    setIsLoadingData(true);
    setErrorMessage("");
    setConfirmedBooking(null);
    setInquirySent(false);

    Promise.all([
      getServices(creatorId).catch(() => []),
      getAvailability(creatorId).catch(() => []),
    ])
      .then(([fetchedServices, fetchedSlots]) => {
        setServices(fetchedServices);
        const availableSlots = fetchedSlots.filter((s) => s.isAvailable);
        setSlots(availableSlots);

        // Preselect service
        if (initialServiceId && fetchedServices.some((s) => String(s.id) === initialServiceId)) {
          setSelectedServiceId(initialServiceId);
        } else if (fetchedServices.length > 0) {
          // If initialServiceName matches, use it; otherwise default to first
          const matched = initialServiceName
            ? fetchedServices.find(
                (s) => s.name.toLowerCase() === initialServiceName.toLowerCase()
              )
            : null;
          setSelectedServiceId(String(matched ? matched.id : fetchedServices[0].id));
        }

        // Group slots by formatted date key
        if (availableSlots.length > 0) {
          const firstSlotDate = new Date(availableSlots[0].startsAt).toLocaleDateString("en-ZA", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          setSelectedDateKey(firstSlotDate);
          setSelectedSlotId(String(availableSlots[0].id));
        }
      })
      .catch(() => setErrorMessage("Unable to load stylist calendar."))
      .finally(() => setIsLoadingData(false));
  }, [isOpen, creatorId, initialServiceId, initialServiceName]);

  // Group slots by day
  const slotsByDate = useMemo(() => {
    return slots.reduce<Record<string, AvailabilitySlot[]>>((acc, slot) => {
      const dateKey = new Date(slot.startsAt).toLocaleDateString("en-ZA", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(slot);
      return acc;
    }, {});
  }, [slots]);

  const availableDates = useMemo(() => Object.keys(slotsByDate), [slotsByDate]);
  const currentDaySlots = selectedDateKey ? slotsByDate[selectedDateKey] || [] : [];

  // Group current day's slots into Morning, Afternoon, and Evening
  const categorizedSlots = useMemo(() => {
    const morning: AvailabilitySlot[] = [];
    const afternoon: AvailabilitySlot[] = [];
    const evening: AvailabilitySlot[] = [];

    currentDaySlots.forEach((slot) => {
      const hour = new Date(slot.startsAt).getHours();
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [currentDaySlots]);

  // Pricing & Duration calculation
  const selectedService = services.find((s) => String(s.id) === selectedServiceId);
  const currentServiceName =
    selectedService?.name || initialServiceName || "Signature Styling";
  const currentPrice = selectedService?.price
    ? `R ${selectedService.price}`
    : initialPrice
    ? `R ${initialPrice}`
    : "Price on request";
  const currentDuration = selectedService?.durationMinutes
    ? formatDuration(selectedService.durationMinutes)
    : formatDuration(initialDurationMinutes);

  const selectedSlot = slots.find((s) => String(s.id) === selectedSlotId);

  // Toggle quick tag in notes
  const toggleQuickTag = (tag: string) => {
    if (notes.includes(tag)) {
      setNotes(
        notes
          .replace(tag, "")
          .replace(/\s*,\s*,/g, ",")
          .replace(/^,\s*|,\s*$/g, "")
          .trim()
      );
    } else {
      setNotes((prev) => (prev ? `${prev.trim()}, ${tag}` : tag));
    }
  };

  // WhatsApp link generation
  const whatsappNumberClean = (creatorPhone || "").replace(/\D/g, "");
  const whatsappLink = whatsappNumberClean
    ? `https://wa.me/${whatsappNumberClean}?text=${encodeURIComponent(
        `Hi ${creatorName}! I saw your work on Glam SA and I'd like to ask about booking "${currentServiceName}".`
      )}`
    : null;

  // Handle direct in-app inquiry
  const handleSendInquiry = async () => {
    if (!currentUser) {
      setShowAuthGate(true);
      return;
    }
    if (!inquiryText.trim()) return;

    setIsInquiring(true);
    setErrorMessage("");
    try {
      await sendMessage({
        recipientId: creatorId,
        body: `💬 Inquiry regarding ${currentServiceName}: "${inquiryText.trim()}"`,
        postId,
      });
      setInquirySent(true);
      setInquiryText("");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setIsInquiring(false);
    }
  };

  // Handle booking submission
  const handleSubmitBooking = async () => {
    if (!currentUser) {
      setShowAuthGate(true);
      return;
    }

    if (!selectedSlotId) {
      setErrorMessage("Please select a date and time slot.");
      return;
    }

    // Need a valid service ID; fallback to selectedServiceId or first service
    const serviceIdNum = Number(selectedServiceId) || (services[0] ? services[0].id : null);
    if (!serviceIdNum) {
      setErrorMessage("Please select a valid service to book.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const newBooking = await createBooking({
        serviceId: serviceIdNum,
        slotId: Number(selectedSlotId),
        postId,
        notes: notes.trim() || undefined,
      });

      setConfirmedBooking(newBooking);
      // Remove booked slot locally so it can't be clicked again
      setSlots((prev) => prev.filter((s) => String(s.id) !== selectedSlotId));
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "That time slot is no longer available. Please choose another."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="glam-modal-backdrop" onClick={onClose}>
      <div
        className="glam-booking-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Book appointment with ${creatorName}`}
      >
        {/* Auth Gate Interstitial */}
        {showAuthGate && !currentUser ? (
          <div className="glam-auth-overlay">
            <div className="glam-auth-modal-card">
              <div className="glam-auth-icon-wrap">
                <IconSparkles size={28} />
              </div>
              <h3>Join Glam SA to Book</h3>
              <p>
                Sign in or register a free client account to book directly with{" "}
                <strong>{creatorName}</strong>, manage your appointments, and chat.
              </p>
              <div className="glam-auth-actions-stack">
                <button
                  type="button"
                  className="btn-primary btn-block"
                  onClick={() => onNavigate("/login")}
                >
                  Sign in / Create Free Account
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-block"
                  onClick={() => setShowAuthGate(false)}
                >
                  Cancel & Return
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Header with Creator Brand */}
        <div className="glam-sheet-header">
          <div className="glam-sheet-artist">
            {creatorAvatar ? (
              <img
                src={creatorAvatar}
                alt={creatorName}
                className="glam-artist-avatar-img"
              />
            ) : (
              <div className="glam-artist-avatar">
                {creatorName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="glam-artist-details">
              <div className="glam-artist-title-row">
                <h3>{creatorName}</h3>
                <IconVerified size={15} />
              </div>
              <p className="glam-artist-sub">
                {creatorHandle && <span>{creatorHandle}</span>}
                {creatorLocation && (
                  <span className="glam-artist-location">
                    <IconPin size={12} /> {creatorLocation}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            className="glam-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close booking modal"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Segmented Mode Switcher */}
        {!confirmedBooking && (
          <div className="glam-booking-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "book"}
              className={`glam-booking-tab ${activeTab === "book" ? "active" : ""}`}
              onClick={() => setActiveTab("book")}
            >
              <IconCalendar size={15} /> Book Appointment
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "inquire"}
              className={`glam-booking-tab ${activeTab === "inquire" ? "active" : ""}`}
              onClick={() => setActiveTab("inquire")}
            >
              <IconMessage size={15} /> Message & WhatsApp
            </button>
          </div>
        )}

        {/* Modal Sheet Body */}
        <div className="glam-sheet-body">
          {/* ─────────────────────────────────────────────────────────────
              CASE 1: BOOKING CONFIRMATION SUCCESS STATE
             ───────────────────────────────────────────────────────────── */}
          {confirmedBooking ? (
            <div className="glam-booking-success-view">
              <div className="glam-success-icon-badge">
                <IconCheck size={36} />
              </div>
              <h2>Appointment Requested!</h2>
              <p className="glam-success-desc">
                Your appointment request has been sent to <strong>{creatorName}</strong>.
                You will be notified once confirmed.
              </p>

              <div className="glam-success-summary-card">
                <div className="glam-summary-row">
                  <span className="summary-label">Service:</span>
                  <strong>{confirmedBooking.serviceName}</strong>
                </div>
                <div className="glam-summary-row">
                  <span className="summary-label">Stylist:</span>
                  <strong>{creatorName}</strong>
                </div>
                <div className="glam-summary-row">
                  <span className="summary-label">Date & Time:</span>
                  <strong>
                    {new Date(confirmedBooking.startsAt).toLocaleString("en-ZA", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </div>
                <div className="glam-summary-row">
                  <span className="summary-label">Estimated Total:</span>
                  <strong className="summary-price">R {confirmedBooking.price}</strong>
                </div>
                {creatorLocation && (
                  <div className="glam-summary-row">
                    <span className="summary-label">Location:</span>
                    <span>{creatorLocation}</span>
                  </div>
                )}
                {confirmedBooking.notes && (
                  <div className="glam-summary-row">
                    <span className="summary-label">Your Notes:</span>
                    <em>"{confirmedBooking.notes}"</em>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="glam-success-actions">
                {/* Google Calendar Link */}
                <a
                  href={formatGoogleCalendarUrl({
                    title: `Glam SA Appointment: ${confirmedBooking.serviceName} with ${creatorName}`,
                    details: `Appointment booked via Glam SA.\nService: ${confirmedBooking.serviceName}\nPrice: R${confirmedBooking.price}\nNotes: ${confirmedBooking.notes || "None"}`,
                    location: creatorLocation || "Stylist Salon",
                    startsAt: confirmedBooking.startsAt,
                    endsAt: confirmedBooking.endsAt,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline-sm btn-block"
                >
                  <IconCalendar size={15} /> Add to Google Calendar
                </a>

                {/* WhatsApp Direct follow-up */}
                {whatsappNumberClean && (
                  <a
                    href={`https://wa.me/${whatsappNumberClean}?text=${encodeURIComponent(
                      `Hi ${creatorName}! I just submitted an appointment request on Glam SA for "${
                        confirmedBooking.serviceName
                      }" on ${new Date(confirmedBooking.startsAt).toLocaleDateString("en-ZA", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })} at ${new Date(confirmedBooking.startsAt).toLocaleTimeString("en-ZA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}. Excited to see you!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-whatsapp-sm btn-block"
                  >
                    <IconWhatsApp size={16} /> Confirm Details via WhatsApp
                  </a>
                )}

                <button
                  type="button"
                  className="btn-primary btn-block"
                  onClick={() => {
                    onClose();
                    onNavigate("/messages");
                  }}
                >
                  <IconCalendar size={16} /> View in My Appointments
                </button>

                <button type="button" className="btn-ghost btn-block" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          ) : activeTab === "book" ? (
            /* ─────────────────────────────────────────────────────────────
               CASE 2: BOOKING FLOW (Step 1: Service, Step 2: Slot, Step 3: Notes)
               ───────────────────────────────────────────────────────────── */
            <div className="glam-booking-flow">
              {/* Step 1: Service Selection */}
              <div className="glam-flow-section">
                <div className="glam-flow-header-row">
                  <label className="glam-flow-label">
                    <span className="flow-step-num">1</span>
                    <span>Select Service</span>
                  </label>
                  {services.length > 1 && (
                    <span className="glam-flow-hint">
                      {services.length} options available
                    </span>
                  )}
                </div>

                {isLoadingData ? (
                  <div className="glam-loading-pill">Loading menu & availability...</div>
                ) : services.length > 0 ? (
                  <div className="glam-services-chips-grid">
                    {services.map((service) => {
                      const isSelected = String(service.id) === selectedServiceId;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          className={`glam-service-card-item ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() => setSelectedServiceId(String(service.id))}
                        >
                          <div className="glam-service-card-top">
                            <div className="glam-service-radio">
                              {isSelected && <span className="glam-radio-dot" />}
                            </div>
                            <strong className="glam-service-name">{service.name}</strong>
                          </div>
                          <div className="glam-service-card-bottom">
                            <span className="glam-service-duration">
                              <IconClock size={12} />
                              {formatDuration(service.durationMinutes)}
                            </span>
                            <span className="glam-service-price">R {service.price}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="glam-default-service-card">
                    <div className="glam-service-card-top">
                      <IconSparkles size={16} />
                      <strong>{currentServiceName}</strong>
                    </div>
                    <div className="glam-service-card-bottom">
                      <span className="glam-service-duration">
                        <IconClock size={12} />
                        {currentDuration}
                      </span>
                      <span className="glam-service-price">{currentPrice}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Date & Time Picker */}
              <div className="glam-flow-section">
                <div className="glam-flow-header-row">
                  <label className="glam-flow-label">
                    <span className="flow-step-num">2</span>
                    <span>Choose Date & Time</span>
                  </label>
                  {slots.length > 0 && (
                    <span className="glam-flow-hint">
                      {slots.length} open slot{slots.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {slots.length === 0 ? (
                  <div className="glam-no-slots-box">
                    <div className="no-slots-icon-wrap">
                      <IconCalendar size={26} />
                    </div>
                    <div>
                      <strong>No Pre-Set Calendar Slots Right Now</strong>
                      <p>
                        {creatorName} accepts appointment requests via direct messaging or
                        WhatsApp. You can send a request with your desired time below.
                      </p>
                    </div>
                    <div className="glam-no-slots-actions">
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-whatsapp-sm"
                        >
                          <IconWhatsApp size={15} /> WhatsApp {creatorName}
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        onClick={() => setActiveTab("inquire")}
                      >
                        <IconMessage size={14} /> Send In-App Message
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Horizontal Date Pills */}
                    <div className="glam-date-strip">
                      {availableDates.map((dateKey) => {
                        const isSelected = dateKey === selectedDateKey;
                        const count = slotsByDate[dateKey]?.length || 0;
                        const parts = dateKey.split(" ");
                        const weekday = parts[0];
                        const dayNum = parts[1];
                        const month = parts[2];

                        return (
                          <button
                            key={dateKey}
                            type="button"
                            className={`glam-date-pill-card ${
                              isSelected ? "active" : ""
                            }`}
                            onClick={() => {
                              setSelectedDateKey(dateKey);
                              const firstSlot = slotsByDate[dateKey]?.[0];
                              if (firstSlot) setSelectedSlotId(String(firstSlot.id));
                            }}
                          >
                            <span className="date-weekday">{weekday}</span>
                            <strong className="date-day-number">{dayNum}</strong>
                            <span className="date-month">{month}</span>
                            <span className="date-slot-indicator">
                              {count} slot{count > 1 ? "s" : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Categorized Time Slots */}
                    <div className="glam-time-periods-container">
                      {categorizedSlots.morning.length > 0 && (
                        <div className="glam-time-period-group">
                          <span className="period-label">🌅 Morning</span>
                          <div className="glam-time-chips-wrap">
                            {categorizedSlots.morning.map((slot) => {
                              const isSelected = String(slot.id) === selectedSlotId;
                              const timeStr = new Date(slot.startsAt).toLocaleTimeString(
                                "en-ZA",
                                { hour: "2-digit", minute: "2-digit" }
                              );
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  className={`glam-time-chip ${
                                    isSelected ? "selected" : ""
                                  }`}
                                  onClick={() => setSelectedSlotId(String(slot.id))}
                                >
                                  <IconClock size={12} />
                                  <span>{timeStr}</span>
                                  {isSelected && <IconCheck size={12} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {categorizedSlots.afternoon.length > 0 && (
                        <div className="glam-time-period-group">
                          <span className="period-label">☀️ Afternoon</span>
                          <div className="glam-time-chips-wrap">
                            {categorizedSlots.afternoon.map((slot) => {
                              const isSelected = String(slot.id) === selectedSlotId;
                              const timeStr = new Date(slot.startsAt).toLocaleTimeString(
                                "en-ZA",
                                { hour: "2-digit", minute: "2-digit" }
                              );
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  className={`glam-time-chip ${
                                    isSelected ? "selected" : ""
                                  }`}
                                  onClick={() => setSelectedSlotId(String(slot.id))}
                                >
                                  <IconClock size={12} />
                                  <span>{timeStr}</span>
                                  {isSelected && <IconCheck size={12} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {categorizedSlots.evening.length > 0 && (
                        <div className="glam-time-period-group">
                          <span className="period-label">🌙 Evening</span>
                          <div className="glam-time-chips-wrap">
                            {categorizedSlots.evening.map((slot) => {
                              const isSelected = String(slot.id) === selectedSlotId;
                              const timeStr = new Date(slot.startsAt).toLocaleTimeString(
                                "en-ZA",
                                { hour: "2-digit", minute: "2-digit" }
                              );
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  className={`glam-time-chip ${
                                    isSelected ? "selected" : ""
                                  }`}
                                  onClick={() => setSelectedSlotId(String(slot.id))}
                                >
                                  <IconClock size={12} />
                                  <span>{timeStr}</span>
                                  {isSelected && <IconCheck size={12} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Step 3: Special Requests / Notes & Quick Tags */}
              <div className="glam-flow-section">
                <div className="glam-flow-header-row">
                  <label className="glam-flow-label">
                    <span className="flow-step-num">3</span>
                    <span>Notes & Preferences (Optional)</span>
                  </label>
                </div>

                {/* Quick Add Chips */}
                <div className="glam-quick-tags-row">
                  {QUICK_TAGS.map((tag) => {
                    const isApplied = notes.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`glam-quick-tag-chip ${isApplied ? "applied" : ""}`}
                        onClick={() => toggleQuickTag(tag)}
                      >
                        {isApplied ? "✓ " : "+ "}
                        {tag}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  className="glam-booking-notes"
                  rows={2}
                  placeholder="e.g. Hair length, preferred tone, specific styling reference, or salon visit details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {errorMessage && (
                <div className="profile-error" role="alert">
                  {errorMessage}
                </div>
              )}

              {/* Sticky Order Summary & Submit Footer */}
              <div className="glam-booking-sheet-footer">
                <div className="glam-footer-price-summary">
                  <span className="summary-total-label">Estimated Total:</span>
                  <div className="summary-price-line">
                    <strong className="summary-total-price">{currentPrice}</strong>
                    <span className="summary-duration">({currentDuration})</span>
                  </div>
                  <small className="summary-payment-terms">
                    Pay at appointment · No upfront deposit required
                  </small>
                </div>

                <button
                  type="button"
                  className="btn-primary btn-book-submit"
                  onClick={() => void handleSubmitBooking()}
                  disabled={!slots.length || !selectedSlotId || isSubmitting}
                >
                  {isSubmitting ? (
                    "Sending Request..."
                  ) : (
                    <>
                      <IconCalendar size={17} /> Request Appointment
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               CASE 3: DIRECT INQUIRY & WHATSAPP TAB
               ───────────────────────────────────────────────────────────── */
            <div className="glam-inquire-flow">
              <p className="glam-inquire-desc">
                Have custom questions, group bookings, or need a specific time not listed?
                Contact <strong>{creatorName}</strong> directly.
              </p>

              <div className="glam-inquire-channels">
                {whatsappLink ? (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-whatsapp"
                  >
                    <IconWhatsApp size={18} /> Chat with {creatorName} on WhatsApp
                  </a>
                ) : (
                  <div className="whatsapp-unavailable-notice">
                    <IconWhatsApp size={16} /> Stylist hasn't enabled direct WhatsApp inquiries.
                  </div>
                )}

                <div className="glam-inquire-divider">
                  <span>OR SEND IN-APP MESSAGE</span>
                </div>

                <div className="glam-in-app-inquire-box">
                  <textarea
                    rows={3}
                    placeholder={`Ask ${creatorName} about styling options, consultation, or home visits...`}
                    value={inquiryText}
                    onChange={(e) => setInquiryText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-primary btn-block"
                    onClick={() => void handleSendInquiry()}
                    disabled={!inquiryText.trim() || isInquiring}
                  >
                    {isInquiring ? "Sending..." : "Send In-App Message"}
                  </button>
                </div>

                {inquirySent && (
                  <p className="glam-inquiry-status-msg">
                    ✓ Message sent! View responses in your Messages tab.
                  </p>
                )}

                {errorMessage && (
                  <div className="profile-error" role="alert">
                    {errorMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
