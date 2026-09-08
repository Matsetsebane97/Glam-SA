import { useState, useEffect, useMemo } from "react";
import type {
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
  IconMoon,
  IconVerified,
  IconPin,
  IconSparkles,
  IconSun,
} from "./Icons";
import { formatDurationMinutes } from "../utils/assistantLogic";

// Calendar navigation icons
const IconChevronLeft = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const IconChevronRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

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

// Duration formatting is provided by formatDurationMinutes from assistantLogic.

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
      title,
    )}&dates=${dates}&details=${encodeURIComponent(
      details,
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
  postImageUrl: _postImageUrl,
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

  // Calendar navigation
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Services & Availability data
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Selections
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId || "",
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
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(
    null,
  );

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
        if (
          initialServiceId &&
          fetchedServices.some((s) => String(s.id) === initialServiceId)
        ) {
          setSelectedServiceId(initialServiceId);
        } else if (fetchedServices.length > 0) {
          // If initialServiceName matches, use it; otherwise default to first
          const matched = initialServiceName
            ? fetchedServices.find(
                (s) =>
                  s.name.toLowerCase() === initialServiceName.toLowerCase(),
              )
            : null;
          setSelectedServiceId(
            String(matched ? matched.id : fetchedServices[0].id),
          );
        }

        // Don't auto-select date - let user choose from calendar
        // Just clear any previous selections
        setSelectedDateKey("");
        setSelectedSlotId("");
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
  const currentDaySlots = useMemo(
    () => (selectedDateKey ? slotsByDate[selectedDateKey] || [] : []),
    [selectedDateKey, slotsByDate],
  );

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
  const selectedService = services.find(
    (s) => String(s.id) === selectedServiceId,
  );
  const currentServiceName =
    selectedService?.name || initialServiceName || "Signature Styling";
  const currentPrice = selectedService?.price
    ? `R ${selectedService.price}`
    : initialPrice
      ? `R ${initialPrice}`
      : "Price on request";
  const currentDuration = selectedService?.durationMinutes
    ? formatDurationMinutes(selectedService.durationMinutes)
    : formatDurationMinutes(initialDurationMinutes);

  // Toggle quick tag in notes
  const toggleQuickTag = (tag: string) => {
    if (notes.includes(tag)) {
      setNotes(
        notes
          .replace(tag, "")
          .replace(/\s*,\s*,/g, ",")
          .replace(/^,\s*|,\s*$/g, "")
          .trim(),
      );
    } else {
      setNotes((prev) => (prev ? `${prev.trim()}, ${tag}` : tag));
    }
  };

  // WhatsApp link generation
  const whatsappNumberClean = (creatorPhone || "").replace(/\D/g, "");
  const whatsappLink = whatsappNumberClean
    ? `https://wa.me/${whatsappNumberClean}?text=${encodeURIComponent(
        `Hi ${creatorName}! I saw your work on Glam SA and I'd like to ask about booking "${currentServiceName}".`,
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
        body: `Inquiry regarding ${currentServiceName}: "${inquiryText.trim()}"`,
        postId,
      });
      setInquirySent(true);
      setInquiryText("");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to send message.",
      );
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
    const serviceIdNum =
      Number(selectedServiceId) || (services[0] ? services[0].id : null);
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
          : "That time slot is no longer available. Please choose another.",
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
                <strong>{creatorName}</strong>, manage your appointments, and
                chat.
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
                Your appointment request has been sent to{" "}
                <strong>{creatorName}</strong>. You will be notified once
                confirmed.
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
                    {new Date(confirmedBooking.startsAt).toLocaleString(
                      "en-ZA",
                      {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </strong>
                </div>
                <div className="glam-summary-row">
                  <span className="summary-label">Estimated Total:</span>
                  <strong className="summary-price">
                    R {confirmedBooking.price}
                  </strong>
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
                      }" on ${new Date(
                        confirmedBooking.startsAt,
                      ).toLocaleDateString("en-ZA", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })} at ${new Date(
                        confirmedBooking.startsAt,
                      ).toLocaleTimeString("en-ZA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}. Excited to see you!`,
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

                <button
                  type="button"
                  className="btn-ghost btn-block"
                  onClick={onClose}
                >
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
                  <div className="glam-loading-pill">
                    Loading menu & availability...
                  </div>
                ) : services.length > 0 ? (
                  <div className="glam-services-chips-grid">
                    {services.map((service) => {
                      const isSelected =
                        String(service.id) === selectedServiceId;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          className={`glam-service-card-item ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() =>
                            setSelectedServiceId(String(service.id))
                          }
                        >
                          <div className="glam-service-card-top">
                            <div className="glam-service-radio">
                              {isSelected && (
                                <span className="glam-radio-dot" />
                              )}
                            </div>
                            <strong className="glam-service-name">
                              {service.name}
                            </strong>
                          </div>
                          <div className="glam-service-card-bottom">
                            <span className="glam-service-duration">
                              <IconClock size={12} />
                              {formatDurationMinutes(service.durationMinutes)}
                            </span>
                            <span className="glam-service-price">
                              R {service.price}
                            </span>
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
                    <span>Choose Date</span>
                  </label>
                  {slots.length > 0 && (
                    <span className="glam-flow-hint">
                      {availableDates.length} day{availableDates.length > 1 ? "s" : ""} available
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
                        {creatorName} accepts appointment requests via direct
                        messaging or WhatsApp. You can send a request with your
                        desired time below.
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
                    {/* Full Calendar View */}
                    <div className="glam-full-calendar">
                      {/* Calendar Header with Month Navigation */}
                      <div className="glam-calendar-nav-header">
                        <button
                          type="button"
                          className="calendar-nav-btn"
                          onClick={() => {
                            const newMonth = new Date(calendarMonth);
                            newMonth.setMonth(newMonth.getMonth() - 1);
                            setCalendarMonth(newMonth);
                          }}
                          aria-label="Previous month"
                        >
                          <IconChevronLeft size={20} />
                        </button>
                        
                        <h3 className="calendar-month-title">
                          {calendarMonth.toLocaleDateString("en-ZA", {
                            month: "long",
                            year: "numeric",
                          })}
                        </h3>
                        
                        <button
                          type="button"
                          className="calendar-nav-btn"
                          onClick={() => {
                            const newMonth = new Date(calendarMonth);
                            newMonth.setMonth(newMonth.getMonth() + 1);
                            setCalendarMonth(newMonth);
                          }}
                          aria-label="Next month"
                        >
                          <IconChevronRight size={20} />
                        </button>
                      </div>

                      {/* Calendar Grid */}
                      <div className="glam-calendar-grid">
                        {/* Weekday headers */}
                        <div className="glam-calendar-weekdays">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="glam-weekday-label">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar dates */}
                        <div className="glam-calendar-dates">
                          {(() => {
                            const year = calendarMonth.getFullYear();
                            const month = calendarMonth.getMonth();
                            
                            // First day of the month
                            const firstDay = new Date(year, month, 1);
                            const startDayOfWeek = firstDay.getDay();
                            
                            // Last day of the month
                            const lastDay = new Date(year, month + 1, 0);
                            const daysInMonth = lastDay.getDate();
                            
                            // Total cells needed
                            const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
                            
                            const calendarDays = [];
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            for (let i = 0; i < totalCells; i++) {
                              const dayNum = i - startDayOfWeek + 1;

                              if (dayNum < 1 || dayNum > daysInMonth) {
                                // Empty cell for days outside current month
                                calendarDays.push(
                                  <div
                                    key={`empty-${i}`}
                                    className="glam-calendar-day empty"
                                  />
                                );
                              } else {
                                const currentDate = new Date(year, month, dayNum);
                                currentDate.setHours(0, 0, 0, 0);
                                
                                const dateKey = currentDate.toLocaleDateString("en-ZA", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                });

                                const hasSlots = slotsByDate[dateKey]?.length > 0;
                                const isSelected = dateKey === selectedDateKey;
                                const isToday = currentDate.getTime() === today.getTime();
                                const isPast = currentDate < today;
                                const slotCount = slotsByDate[dateKey]?.length || 0;

                                calendarDays.push(
                                  <button
                                    key={dateKey}
                                    type="button"
                                    disabled={!hasSlots || isPast}
                                    className={`glam-calendar-day ${
                                      hasSlots && !isPast ? "available" : "unavailable"
                                    } ${isSelected ? "selected" : ""} ${
                                      isToday ? "today" : ""
                                    } ${isPast ? "past" : ""}`}
                                    onClick={() => {
                                      if (hasSlots && !isPast) {
                                        setSelectedDateKey(dateKey);
                                        // Clear time slot selection to force user to choose
                                        setSelectedSlotId("");
                                      }
                                    }}
                                  >
                                    <span className="day-number">{dayNum}</span>
                                    {hasSlots && !isPast && (
                                      <span className="slot-indicator">
                                        {slotCount} slot{slotCount > 1 ? "s" : ""}
                                      </span>
                                    )}
                                  </button>
                                );
                              }
                            }

                            return calendarDays;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Time Slots (Only show after date selection) */}
                    {selectedDateKey && currentDaySlots.length > 0 && (
                      <div className="glam-time-selection-section">
                        <div className="glam-flow-header-row">
                          <label className="glam-flow-label">
                            <span className="flow-step-num">3</span>
                            <span>Choose Time</span>
                          </label>
                          <span className="glam-flow-hint">
                            {currentDaySlots.length} slot{currentDaySlots.length > 1 ? "s" : ""} on {selectedDateKey}
                          </span>
                        </div>

                        {/* Categorized Time Slots */}
                        <div className="glam-time-periods-container">
                          {categorizedSlots.morning.length > 0 && (
                            <div className="glam-time-period-group">
                              <span className="period-label">
                                <IconSun size={14} /> Morning
                              </span>
                              <div className="glam-time-chips-wrap">
                                {categorizedSlots.morning.map((slot) => {
                                  const isSelected =
                                    String(slot.id) === selectedSlotId;
                                  const timeStr = new Date(
                                    slot.startsAt,
                                  ).toLocaleTimeString("en-ZA", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  });
                                  return (
                                    <button
                                      key={slot.id}
                                      type="button"
                                      className={`glam-time-chip ${
                                        isSelected ? "selected" : ""
                                      }`}
                                      onClick={() =>
                                        setSelectedSlotId(String(slot.id))
                                      }
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
                              <span className="period-label">
                                <IconSun size={14} /> Afternoon
                              </span>
                              <div className="glam-time-chips-wrap">
                                {categorizedSlots.afternoon.map((slot) => {
                              const isSelected =
                                String(slot.id) === selectedSlotId;
                              const timeStr = new Date(
                                slot.startsAt,
                              ).toLocaleTimeString("en-ZA", {
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  className={`glam-time-chip ${
                                    isSelected ? "selected" : ""
                                  }`}
                                  onClick={() =>
                                    setSelectedSlotId(String(slot.id))
                                  }
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
                          <span className="period-label">
                            <IconMoon size={14} /> Evening
                          </span>
                          <div className="glam-time-chips-wrap">
                            {categorizedSlots.evening.map((slot) => {
                              const isSelected =
                                String(slot.id) === selectedSlotId;
                              const timeStr = new Date(
                                slot.startsAt,
                              ).toLocaleTimeString("en-ZA", {
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  className={`glam-time-chip ${
                                    isSelected ? "selected" : ""
                                  }`}
                                  onClick={() =>
                                    setSelectedSlotId(String(slot.id))
                                  }
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
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Step 4: Special Requests / Notes & Quick Tags (Only show after time selection) */}
              {selectedDateKey && selectedSlotId && (
                <div className="glam-flow-section">
                  <div className="glam-flow-header-row">
                    <label className="glam-flow-label">
                      <span className="flow-step-num">4</span>
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
              )}

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
                    <strong className="summary-total-price">
                      {currentPrice}
                    </strong>
                    <span className="summary-duration">
                      ({currentDuration})
                    </span>
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
                Have custom questions, group bookings, or need a specific time
                not listed? Contact <strong>{creatorName}</strong> directly.
              </p>

              <div className="glam-inquire-channels">
                {whatsappLink ? (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-whatsapp"
                  >
                    <IconWhatsApp size={18} /> Chat with {creatorName} on
                    WhatsApp
                  </a>
                ) : (
                  <div className="whatsapp-unavailable-notice">
                    <IconWhatsApp size={16} /> Stylist hasn't enabled direct
                    WhatsApp inquiries.
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
                    <IconCheck size={14} /> Message sent! View responses in your
                    Messages tab.
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
