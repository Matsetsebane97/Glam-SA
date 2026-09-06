import { useEffect, useState } from "react";
import {
  IconBookmark,
  IconCalendar,
  IconCheck,
  IconClock,
  IconClose,
  IconHeart,
  IconMessage,
  IconPin,
  IconShare,
  IconVerified,
  IconWhatsApp,
} from "./Icons";
import type { CurrentUser, Post } from "../types";
import { formatDistance, formatDuration } from "../utils/geo";
import { whatsappUrl } from "../utils/whatsapp";
import { createBooking, getAvailability, getServices, sendMessage, setPostLike } from "../api";
import type { AvailabilitySlot, Booking, ServiceOffering } from "../types";

type PostCardProps = {
  post: Post;
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
  initialShowBooking?: boolean;
  onCloseBooking?: () => void;
  bookingOnly?: boolean;
};

function PostCard({
  post,
  currentUser,
  onNavigate,
  initialShowBooking,
  onCloseBooking,
  bookingOnly,
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isUpdatingLike, setIsUpdatingLike] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Booking & Inquiry states
  const [showInquire, setShowInquire] = useState(initialShowBooking ?? false);
  const [bookingModalTab, setBookingModalTab] = useState<"book" | "inquire">("book");
  const [copied, setCopied] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);

  const [inquiryText, setInquiryText] = useState(
    `Hi ${post.creator}, I would love to book your "${post.service}" look.`,
  );
  const [inquiryStatus, setInquiryStatus] = useState("");
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);

  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<Booking | null>(null);

  const [authNotice, setAuthNotice] = useState("");
  const [showBookingAuthPopup, setShowBookingAuthPopup] = useState(false);

  const styleImageUrl = post.mediaType.startsWith("image/")
    ? post.mediaUrl || post.imageUrl
    : post.imageUrl;
  const whatsappLink = whatsappUrl(post.whatsappNumber, inquiryText, styleImageUrl);

  // Fetch creator services and available slots when opening booking
  useEffect(() => {
    if (!showInquire || !post.ownerId) return;
    setBookingStatus("");
    setBookingSuccess(null);

    void Promise.all([getServices(post.ownerId, post.id), getAvailability(post.ownerId)])
      .then(([nextServices, nextSlots]) => {
        const activeServices = nextServices.filter((service) => service.isActive);
        const activeSlots = nextSlots.filter((slot) => slot.isAvailable);

        setServices(activeServices);
        setSlots(activeSlots);

        const matchingService = activeServices.find(
          (s) => s.name.toLowerCase() === post.service.toLowerCase(),
        );
        setSelectedServiceId(String(matchingService?.id || activeServices[0]?.id || ""));

        // Group slots by date
        if (activeSlots.length > 0) {
          const firstDateKey = new Date(activeSlots[0].startsAt).toLocaleDateString("en-ZA", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          setSelectedDateKey(firstDateKey);
          setSelectedSlotId(String(activeSlots[0].id));
        }
      })
      .catch(() => setBookingStatus("Booking calendar is currently unavailable."));
  }, [post.ownerId, post.service, showInquire]);

  // Group slots by formatted date key
  const slotsByDate = slots.reduce<Record<string, AvailabilitySlot[]>>((acc, slot) => {
    const dateKey = new Date(slot.startsAt).toLocaleDateString("en-ZA", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});

  const availableDates = Object.keys(slotsByDate);
  const currentDaySlots = selectedDateKey ? slotsByDate[selectedDateKey] || [] : [];
  const selectedService = services.find((s) => String(s.id) === selectedServiceId);
  const currentPrice = selectedService?.price ? `R ${selectedService.price}` : `R ${post.price}`;
  const currentDuration = selectedService?.durationMinutes
    ? formatDuration(selectedService.durationMinutes)
    : formatDuration(post.durationMinutes);

  const toggleLike = async () => {
    if (!currentUser) {
      setAuthNotice("Sign in to like posts.");
      return;
    }
    if (isUpdatingLike) return;
    const nextIsLiked = !isLiked;
    const previousCount = likesCount;
    setIsLiked(nextIsLiked);
    setLikesCount((prev) => Math.max(0, prev + (nextIsLiked ? 1 : -1)));
    if (nextIsLiked) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 600);
    }
    setIsUpdatingLike(true);
    try {
      setLikesCount(await setPostLike(post.id, nextIsLiked));
    } catch {
      setIsLiked(!nextIsLiked);
      setLikesCount(previousCount);
    } finally {
      setIsUpdatingLike(false);
    }
  };

  const toggleSave = () => {
    if (!currentUser) {
      setAuthNotice("Sign in to save posts.");
      return;
    }
    setIsSaved((current) => !current);
    setAuthNotice("");
  };

  const openBooking = () => {
    if (!currentUser) {
      setAuthNotice("");
      setShowBookingAuthPopup(true);
      return;
    }
    setAuthNotice("");
    setShowInquire(true);
  };

  const submitInquiry = async () => {
    if (!currentUser) {
      setInquiryStatus("Sign in to send a booking inquiry.");
      return;
    }
    if (!post.ownerId) {
      setInquiryStatus("This artist is not accepting in-app inquiries yet.");
      return;
    }
    setIsSendingInquiry(true);
    setInquiryStatus("");
    try {
      await sendMessage({ recipientId: post.ownerId, postId: post.id, body: inquiryText });
      setInquiryStatus("Inquiry sent! View conversation in your inbox.");
    } catch (error) {
      setInquiryStatus(error instanceof Error ? error.message : "Unable to send inquiry.");
    } finally {
      setIsSendingInquiry(false);
    }
  };

  const submitBooking = async () => {
    if (!currentUser) {
      setBookingStatus("Sign in to request a booking.");
      return;
    }
    if (!selectedServiceId || !selectedSlotId) {
      setBookingStatus("Please choose a service and an available time slot.");
      return;
    }
    setIsSubmittingBooking(true);
    setBookingStatus("");
    try {
      const booking = await createBooking({
        serviceId: Number(selectedServiceId),
        slotId: Number(selectedSlotId),
        postId: post.id,
        notes: inquiryText,
      });
      setBookingSuccess(booking);
      setSlots((current) => current.filter((slot) => slot.id !== Number(selectedSlotId)));
    } catch (error) {
      setBookingStatus(error instanceof Error ? error.message : "Unable to request booking.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.creator} on Glam SA`,
          text: `Check out ${post.service} by ${post.creator} on Glam SA!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignore user cancellations or copy errors
    }
  };

  const closeBooking = () => {
    setShowInquire(false);
    setShowBookingAuthPopup(false);
    onCloseBooking?.();
  };

  const bookingModalsMarkup = (
    <>
      {/* ─── AUTH POPUP (WHEN SIGN IN REQUIRED TO BOOK) ───────────────────────── */}
      {showBookingAuthPopup && (
        <div
          className="glam-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={closeBooking}
        >
          <div className="glam-auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="glam-modal-close"
              type="button"
              onClick={closeBooking}
              aria-label="Close popup"
            >
              <IconClose size={18} />
            </button>
            <div className="glam-auth-icon-wrap">
              <IconCalendar size={32} />
            </div>
            <h3>Book this style on Glam SA</h3>
            <p>
              Sign in or create a free client account to book with <strong>{post.creator}</strong>,
              select available slots, and manage appointments.
            </p>
            <div className="glam-auth-actions-stack">
              <button
                className="btn-primary btn-block"
                type="button"
                onClick={() => onNavigate("/login")}
              >
                Sign in / Create Account
              </button>
              <button
                className="btn-ghost btn-block"
                type="button"
                onClick={closeBooking}
              >
                Keep browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODERN BOOKING DRAWER / MODAL ────────────────────────────────────── */}
      {showInquire && (
        <div className="glam-modal-backdrop" onClick={closeBooking}>
          <div className="glam-booking-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Sheet Header */}
            <div className="glam-sheet-header">
              <div className="glam-sheet-artist">
                <div className="glam-artist-avatar">{post.creator.charAt(0)}</div>
                <div>
                  <div className="glam-artist-title-row">
                    <h3>{post.creator}</h3>
                    <IconVerified size={14} />
                  </div>
                  <p className="glam-artist-sub">
                    {post.service} {post.location ? `· ${post.location}` : ""}
                  </p>
                </div>
              </div>
              <button
                className="glam-modal-close"
                type="button"
                onClick={closeBooking}
                aria-label="Close booking modal"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Segmented Modal Tabs */}
            {!bookingSuccess && (
              <div className="glam-booking-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={bookingModalTab === "book"}
                  className={`glam-booking-tab ${bookingModalTab === "book" ? "active" : ""}`}
                  onClick={() => setBookingModalTab("book")}
                >
                  <IconCalendar size={15} /> Book Appointment
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={bookingModalTab === "inquire"}
                  className={`glam-booking-tab ${bookingModalTab === "inquire" ? "active" : ""}`}
                  onClick={() => setBookingModalTab("inquire")}
                >
                  <IconMessage size={15} /> Message / WhatsApp
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="glam-sheet-body">
              {/* SUCCESS CONFIRMATION STATE */}
              {bookingSuccess ? (
                <div className="glam-booking-success-view">
                  <div className="glam-success-icon-badge">
                    <IconCheck size={36} />
                  </div>
                  <h2>Appointment Requested!</h2>
                  <p className="glam-success-desc">
                    Your booking request has been sent to <strong>{post.creator}</strong>.
                    You will receive updates once confirmed.
                  </p>

                  <div className="glam-success-summary-card">
                    <div className="glam-summary-row">
                      <span className="summary-label">Service:</span>
                      <strong>{bookingSuccess.serviceName}</strong>
                    </div>
                    <div className="glam-summary-row">
                      <span className="summary-label">Price:</span>
                      <strong className="summary-price">R {bookingSuccess.price}</strong>
                    </div>
                    <div className="glam-summary-row">
                      <span className="summary-label">Date & Time:</span>
                      <strong>
                        {new Date(bookingSuccess.startsAt).toLocaleString("en-ZA", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                    </div>
                    {bookingSuccess.notes && (
                      <div className="glam-summary-row">
                        <span className="summary-label">Notes:</span>
                        <em>"{bookingSuccess.notes}"</em>
                      </div>
                    )}
                  </div>

                  <div className="glam-success-actions">
                    <button
                      type="button"
                      className="btn-primary btn-block"
                      onClick={() => onNavigate("/messages")}
                    >
                      <IconCalendar size={16} /> View in Appointments & Bookings
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-block"
                      onClick={closeBooking}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : bookingModalTab === "book" ? (
                /* TAB 1: BOOK APPOINTMENT FLOW */
                <div className="glam-booking-flow">
                  {/* Step 1: Select Service */}
                  <div className="glam-flow-section">
                    <label className="glam-flow-label">
                      <span>1. Select Service</span>
                      <span className="glam-flow-hint">Tap to switch service</span>
                    </label>

                    {services.length > 0 ? (
                      <div className="glam-services-chips-grid">
                        {services.map((service) => {
                          const isSelected = String(service.id) === selectedServiceId;
                          return (
                            <button
                              key={service.id}
                              type="button"
                              className={`glam-service-chip ${isSelected ? "selected" : ""}`}
                              onClick={() => setSelectedServiceId(String(service.id))}
                            >
                              <div className="chip-service-info">
                                <strong>{service.name}</strong>
                                <small>{formatDuration(service.durationMinutes)}</small>
                              </div>
                              <span className="chip-service-price">R {service.price}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="glam-default-service-card">
                        <div>
                          <strong>{post.service}</strong>
                          <small>Estimated: {formatDuration(post.durationMinutes)}</small>
                        </div>
                        <span className="chip-service-price">R {post.price}</span>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Select Date & Time Slot */}
                  <div className="glam-flow-section">
                    <label className="glam-flow-label">
                      <span>2. Choose Date & Time</span>
                      {availableDates.length > 0 && (
                        <span className="glam-flow-hint">
                          {slots.length} available slot(s)
                        </span>
                      )}
                    </label>

                    {slots.length === 0 ? (
                      <div className="glam-no-slots-box">
                        <IconClock size={24} />
                        <div>
                          <strong>No pre-set calendar slots available</strong>
                          <p>
                            {post.creator} accepts direct appointments. You can send a booking inquiry
                            or message them on WhatsApp to arrange a time.
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
                              <IconWhatsApp size={14} /> WhatsApp {post.creator}
                            </a>
                          )}
                          <button
                            type="button"
                            className="btn-ghost-sm"
                            onClick={() => setBookingModalTab("inquire")}
                          >
                            Send In-App Message
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Horizontal Date Pills */}
                        <div className="glam-date-pills-row">
                          {availableDates.map((dateKey) => {
                            const isSelectedDate = dateKey === selectedDateKey;
                            const count = slotsByDate[dateKey]?.length || 0;
                            return (
                              <button
                                key={dateKey}
                                type="button"
                                className={`glam-date-pill ${isSelectedDate ? "active" : ""}`}
                                onClick={() => {
                                  setSelectedDateKey(dateKey);
                                  const firstSlot = slotsByDate[dateKey]?.[0];
                                  if (firstSlot) setSelectedSlotId(String(firstSlot.id));
                                }}
                              >
                                <strong>{dateKey}</strong>
                                <small>{count} slot{count > 1 ? "s" : ""}</small>
                              </button>
                            );
                          })}
                        </div>

                        {/* Time Slots for Selected Date */}
                        <div className="glam-time-slots-grid">
                          {currentDaySlots.map((slot) => {
                            const isSelectedSlot = String(slot.id) === selectedSlotId;
                            const start = new Date(slot.startsAt);
                            const end = new Date(slot.endsAt);
                            const timeLabel = `${start.toLocaleTimeString("en-ZA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} – ${end.toLocaleTimeString("en-ZA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`;

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                className={`glam-time-chip ${isSelectedSlot ? "selected" : ""}`}
                                onClick={() => setSelectedSlotId(String(slot.id))}
                              >
                                <IconClock size={12} />
                                <span>{timeLabel}</span>
                                {isSelectedSlot && <IconCheck size={12} />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Step 3: Special Requests / Notes */}
                  <div className="glam-flow-section">
                    <label className="glam-flow-label">
                      <span>3. Notes or Preferences (Optional)</span>
                    </label>
                    <textarea
                      className="glam-booking-notes"
                      rows={2}
                      placeholder="e.g. Hair length, color, prefer morning session, or salon visit preference..."
                      value={inquiryText}
                      onChange={(e) => setInquiryText(e.target.value)}
                    />
                  </div>

                  {bookingStatus && (
                    <div className="profile-error" role="alert">
                      {bookingStatus}
                    </div>
                  )}

                  {/* Footer Action & Summary */}
                  <div className="glam-booking-sheet-footer">
                    <div className="glam-footer-price-summary">
                      <span className="summary-total-label">Estimated Total:</span>
                      <strong className="summary-total-price">{currentPrice}</strong>
                      <small className="summary-duration">({currentDuration})</small>
                    </div>

                    <button
                      type="button"
                      className="btn-primary btn-book-submit"
                      onClick={() => void submitBooking()}
                      disabled={!slots.length || !selectedSlotId || isSubmittingBooking}
                    >
                      {isSubmittingBooking ? (
                        "Submitting request..."
                      ) : (
                        <>
                          <IconCalendar size={16} /> Request Appointment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* TAB 2: DIRECT INQUIRY & WHATSAPP FLOW */
                <div className="glam-inquire-flow">
                  <p className="glam-inquire-desc">
                    Have questions about this style or need custom arrangements? Message{" "}
                    <strong>{post.creator}</strong> directly.
                  </p>

                  <div className="glam-inquire-channels">
                    {whatsappLink ? (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-whatsapp btn-block"
                      >
                        <IconWhatsApp size={18} />
                        <span>Chat on WhatsApp</span>
                      </a>
                    ) : (
                      <div className="whatsapp-unavailable-notice">
                        <IconWhatsApp size={16} /> WhatsApp number not provided by this artist
                      </div>
                    )}

                    <div className="glam-inquire-divider">
                      <span>or send an in-app message</span>
                    </div>

                    <textarea
                      className="glam-booking-notes"
                      rows={3}
                      value={inquiryText}
                      onChange={(e) => setInquiryText(e.target.value)}
                      placeholder="Write your question or booking request..."
                    />

                    {inquiryStatus && (
                      <p className="glam-inquiry-status-msg">{inquiryStatus}</p>
                    )}

                    <button
                      type="button"
                      className="btn-primary btn-block"
                      onClick={() => void submitInquiry()}
                      disabled={isSendingInquiry || !inquiryText.trim()}
                    >
                      {isSendingInquiry ? "Sending..." : "Send In-App Message"}
                    </button>

                    {inquiryStatus.includes("sent") && (
                      <button
                        type="button"
                        className="btn-outline-sm btn-block"
                        onClick={() => onNavigate("/messages")}
                      >
                        Go to Messages Inbox
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (bookingOnly) {
    return bookingModalsMarkup;
  }

  return (
    <article className="post-card">
      {/* Header */}
      <header className="post-card-head">
        <button
          className="post-author post-author-link"
          type="button"
          onClick={() => post.ownerId && onNavigate(`/profile/${post.ownerId}`)}
          disabled={!post.ownerId}
        >
          <div className="post-avatar" aria-hidden="true">
            {post.creator.charAt(0).toUpperCase()}
          </div>
          <div className="post-author-details">
            <div className="post-creator-name">
              <strong>{post.creator}</strong>
              <IconVerified size={13} />
            </div>
            <div className="post-meta-sub">
              <span className="post-handle">{post.handle}</span>
              {post.distanceKm != null && (
                <span className="post-distance-badge">
                  <IconPin size={11} />
                  {formatDistance(post.distanceKm)}
                </span>
              )}
              {post.location && !post.distanceKm && (
                <span className="post-location-tag">
                  <IconPin size={11} />
                  {post.location}
                </span>
              )}
            </div>
          </div>
        </button>

        <button className="btn-book-action" type="button" onClick={openBooking}>
          <IconCalendar size={13} /> Book Look
        </button>
      </header>

      {/* Media Viewport */}
      <div className="post-media-wrap" onDoubleClick={toggleLike}>
        {post.mediaUrl && post.mediaType.startsWith("video/") ? (
          <video
            src={post.mediaUrl}
            controls
            preload="metadata"
            aria-label={post.service}
            className="post-media-video"
          />
        ) : post.mediaUrl || post.imageUrl ? (
          <img
            src={post.mediaUrl || post.imageUrl}
            alt={post.service}
            loading="lazy"
            className="post-media-img"
          />
        ) : (
          <div className="media-placeholder">
            <span>{post.service}</span>
          </div>
        )}

        {/* Double-tap Heart Animation */}
        {heartBurst && (
          <div className="heart-burst-overlay">
            <IconHeart size={72} fill="#E5484D" className="burst-heart-icon" />
          </div>
        )}
      </div>

      {/* Actions Row */}
      <div className="post-card-actions">
        <div className="action-group">
          <button
            className={`action-btn like-btn ${isLiked ? "active" : ""}`}
            onClick={toggleLike}
            aria-label="Like look"
            type="button"
          >
            <IconHeart size={20} fill={isLiked ? "#E5484D" : "none"} />
            <span className="action-count">{likesCount}</span>
          </button>

          <button
            className="action-btn book-look-btn"
            aria-label="Book look"
            type="button"
            onClick={openBooking}
          >
            <IconCalendar size={19} />
            <span className="action-label">Book</span>
          </button>

          <button
            className="action-btn"
            aria-label="Share post"
            type="button"
            onClick={handleShare}
          >
            <IconShare size={20} />
            {copied && <span className="action-copied"><IconCheck size={12} /> Copied</span>}
          </button>
        </div>

        <button
          className={`action-btn bookmark-btn ${isSaved ? "active" : ""}`}
          onClick={toggleSave}
          aria-label="Save look"
          type="button"
        >
          <IconBookmark size={20} fill={isSaved ? "#E5BE76" : "none"} />
        </button>
      </div>

      {authNotice && (
        <div className="post-auth-notice" role="status">
          <span>{authNotice}</span>
          <button type="button" onClick={() => onNavigate("/login")}>
            Sign in
          </button>
        </div>
      )}

      {/* Caption & Timestamp */}
      {post.caption && (
        <div className="post-caption-box">
          <p className="post-caption">
            <strong className="caption-author">{post.handle}</strong> {post.caption}
          </p>
        </div>
      )}

      <footer className="post-footer">
        <div className="post-style-meta">
          <span><strong>Style:</strong> {post.service}</span>
          <span><strong>Category:</strong> {post.category}</span>
        </div>
        <time className="post-time" dateTime={post.createdAt}>
          {new Date(post.createdAt).toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </time>
      </footer>

      {/* ─── AUTH POPUP (WHEN SIGN IN REQUIRED TO BOOK) ───────────────────────── */}
      {showBookingAuthPopup && (
        <div
          className="glam-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowBookingAuthPopup(false)}
        >
          <div className="glam-auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="glam-modal-close"
              type="button"
              onClick={() => setShowBookingAuthPopup(false)}
              aria-label="Close popup"
            >
              <IconClose size={18} />
            </button>
            <div className="glam-auth-icon-wrap">
              <IconCalendar size={32} />
            </div>
            <h3>Book this style on Glam SA</h3>
            <p>
              Sign in or create a free client account to book with <strong>{post.creator}</strong>,
              select available slots, and manage appointments.
            </p>
            <div className="glam-auth-actions-stack">
              <button
                className="btn-primary btn-block"
                type="button"
                onClick={() => onNavigate("/login")}
              >
                Sign in / Create Account
              </button>
              <button
                className="btn-ghost btn-block"
                type="button"
                onClick={() => setShowBookingAuthPopup(false)}
              >
                Keep browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODERN BOOKING DRAWER / MODAL ────────────────────────────────────── */}
      {showInquire && (
        <div className="glam-modal-backdrop" onClick={() => setShowInquire(false)}>
          <div className="glam-booking-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Sheet Header */}
            <div className="glam-sheet-header">
              <div className="glam-sheet-artist">
                <div className="glam-artist-avatar">{post.creator.charAt(0)}</div>
                <div>
                  <div className="glam-artist-title-row">
                    <h3>{post.creator}</h3>
                    <IconVerified size={14} />
                  </div>
                  <p className="glam-artist-sub">
                    {post.service} {post.location ? `· ${post.location}` : ""}
                  </p>
                </div>
              </div>
              <button
                className="glam-modal-close"
                type="button"
                onClick={() => setShowInquire(false)}
                aria-label="Close booking modal"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Segmented Modal Tabs */}
            {!bookingSuccess && (
              <div className="glam-booking-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={bookingModalTab === "book"}
                  className={`glam-booking-tab ${bookingModalTab === "book" ? "active" : ""}`}
                  onClick={() => setBookingModalTab("book")}
                >
                  <IconCalendar size={15} /> Book Appointment
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={bookingModalTab === "inquire"}
                  className={`glam-booking-tab ${bookingModalTab === "inquire" ? "active" : ""}`}
                  onClick={() => setBookingModalTab("inquire")}
                >
                  <IconMessage size={15} /> Message / WhatsApp
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="glam-sheet-body">
              {/* SUCCESS CONFIRMATION STATE */}
              {bookingSuccess ? (
                <div className="glam-booking-success-view">
                  <div className="glam-success-icon-badge">
                    <IconCheck size={36} />
                  </div>
                  <h2>Appointment Requested!</h2>
                  <p className="glam-success-desc">
                    Your booking request has been sent to <strong>{post.creator}</strong>.
                    You will receive updates once confirmed.
                  </p>

                  <div className="glam-success-summary-card">
                    <div className="glam-summary-row">
                      <span className="summary-label">Service:</span>
                      <strong>{bookingSuccess.serviceName}</strong>
                    </div>
                    <div className="glam-summary-row">
                      <span className="summary-label">Price:</span>
                      <strong className="summary-price">R {bookingSuccess.price}</strong>
                    </div>
                    <div className="glam-summary-row">
                      <span className="summary-label">Date & Time:</span>
                      <strong>
                        {new Date(bookingSuccess.startsAt).toLocaleString("en-ZA", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                    </div>
                    {bookingSuccess.notes && (
                      <div className="glam-summary-row">
                        <span className="summary-label">Notes:</span>
                        <em>"{bookingSuccess.notes}"</em>
                      </div>
                    )}
                  </div>

                  <div className="glam-success-actions">
                    <button
                      type="button"
                      className="btn-primary btn-block"
                      onClick={() => onNavigate("/messages")}
                    >
                      <IconCalendar size={16} /> View in Appointments & Bookings
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-block"
                      onClick={() => setShowInquire(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : bookingModalTab === "book" ? (
                /* TAB 1: BOOK APPOINTMENT FLOW */
                <div className="glam-booking-flow">
                  {/* Step 1: Select Service */}
                  <div className="glam-flow-section">
                    <label className="glam-flow-label">
                      <span>1. Select Service</span>
                      <span className="glam-flow-hint">Tap to switch service</span>
                    </label>

                    {services.length > 0 ? (
                      <div className="glam-services-chips-grid">
                        {services.map((service) => {
                          const isSelected = String(service.id) === selectedServiceId;
                          return (
                            <button
                              key={service.id}
                              type="button"
                              className={`glam-service-chip ${isSelected ? "selected" : ""}`}
                              onClick={() => setSelectedServiceId(String(service.id))}
                            >
                              <div className="chip-service-info">
                                <strong>{service.name}</strong>
                                <small>{formatDuration(service.durationMinutes)}</small>
                              </div>
                              <span className="chip-service-price">R {service.price}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="glam-default-service-card">
                        <div>
                          <strong>{post.service}</strong>
                          <small>Estimated: {formatDuration(post.durationMinutes)}</small>
                        </div>
                        <span className="chip-service-price">R {post.price}</span>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Select Date & Time Slot */}
                  <div className="glam-flow-section">
                    <label className="glam-flow-label">
                      <span>2. Choose Date & Time</span>
                      {availableDates.length > 0 && (
                        <span className="glam-flow-hint">
                          {slots.length} available slot(s)
                        </span>
                      )}
                    </label>

                    {slots.length === 0 ? (
                      <div className="glam-no-slots-box">
                        <IconClock size={24} />
                        <div>
                          <strong>No pre-set calendar slots available</strong>
                          <p>
                            {post.creator} accepts direct appointments. You can send a booking inquiry
                            or message them on WhatsApp to arrange a time.
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
                              <IconWhatsApp size={14} /> WhatsApp {post.creator}
                            </a>
                          )}
                          <button
                            type="button"
                            className="btn-ghost-sm"
                            onClick={() => setBookingModalTab("inquire")}
                          >
                            Send In-App Message
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Horizontal Date Pills */}
                        <div className="glam-date-pills-row">
                          {availableDates.map((dateKey) => {
                            const isSelectedDate = dateKey === selectedDateKey;
                            const count = slotsByDate[dateKey]?.length || 0;
                            return (
                              <button
                                key={dateKey}
                                type="button"
                                className={`glam-date-pill ${isSelectedDate ? "active" : ""}`}
                                onClick={() => {
                                  setSelectedDateKey(dateKey);
                                  const firstSlot = slotsByDate[dateKey]?.[0];
                                  if (firstSlot) setSelectedSlotId(String(firstSlot.id));
                                }}
                              >
                                <strong>{dateKey}</strong>
                                <small>{count} slot{count > 1 ? "s" : ""}</small>
                              </button>
                            );
                          })}
                        </div>

                        {/* Time Slots for Selected Date */}
                        <div className="glam-time-slots-grid">
                          {currentDaySlots.map((slot) => {
                            const isSelectedSlot = String(slot.id) === selectedSlotId;
                            const start = new Date(slot.startsAt);
                            const end = new Date(slot.endsAt);
                            const timeLabel = `${start.toLocaleTimeString("en-ZA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} – ${end.toLocaleTimeString("en-ZA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`;

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                className={`glam-time-chip ${isSelectedSlot ? "selected" : ""}`}
                                onClick={() => setSelectedSlotId(String(slot.id))}
                              >
                                <IconClock size={12} />
                                <span>{timeLabel}</span>
                                {isSelectedSlot && <IconCheck size={12} />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Step 3: Special Requests / Notes */}
                  <div className="glam-flow-section">
                    <label className="glam-flow-label">
                      <span>3. Notes or Preferences (Optional)</span>
                    </label>
                    <textarea
                      className="glam-booking-notes"
                      rows={2}
                      placeholder="e.g. Hair length, color, prefer morning session, or salon visit preference..."
                      value={inquiryText}
                      onChange={(e) => setInquiryText(e.target.value)}
                    />
                  </div>

                  {bookingStatus && (
                    <div className="profile-error" role="alert">
                      {bookingStatus}
                    </div>
                  )}

                  {/* Footer Action & Summary */}
                  <div className="glam-booking-sheet-footer">
                    <div className="glam-footer-price-summary">
                      <span className="summary-total-label">Estimated Total:</span>
                      <strong className="summary-total-price">{currentPrice}</strong>
                      <small className="summary-duration">({currentDuration})</small>
                    </div>

                    <button
                      type="button"
                      className="btn-primary btn-book-submit"
                      onClick={() => void submitBooking()}
                      disabled={!slots.length || !selectedSlotId || isSubmittingBooking}
                    >
                      {isSubmittingBooking ? (
                        "Submitting request..."
                      ) : (
                        <>
                          <IconCalendar size={16} /> Request Appointment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* TAB 2: DIRECT INQUIRY & WHATSAPP FLOW */
                <div className="glam-inquire-flow">
                  <p className="glam-inquire-desc">
                    Have questions about this style or need custom arrangements? Message{" "}
                    <strong>{post.creator}</strong> directly.
                  </p>

                  <div className="glam-inquire-channels">
                    {whatsappLink ? (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-whatsapp btn-block"
                      >
                        <IconWhatsApp size={18} />
                        <span>Chat on WhatsApp</span>
                      </a>
                    ) : (
                      <div className="whatsapp-unavailable-notice">
                        <IconWhatsApp size={16} /> WhatsApp number not provided by this artist
                      </div>
                    )}

                    <div className="glam-inquire-divider">
                      <span>or send an in-app message</span>
                    </div>

                    <textarea
                      className="glam-booking-notes"
                      rows={3}
                      value={inquiryText}
                      onChange={(e) => setInquiryText(e.target.value)}
                      placeholder="Write your question or booking request..."
                    />

                    {inquiryStatus && (
                      <p className="glam-inquiry-status-msg">{inquiryStatus}</p>
                    )}

                    <button
                      type="button"
                      className="btn-primary btn-block"
                      onClick={() => void submitInquiry()}
                      disabled={isSendingInquiry || !inquiryText.trim()}
                    >
                      {isSendingInquiry ? "Sending..." : "Send In-App Message"}
                    </button>

                    {inquiryStatus.includes("sent") && (
                      <button
                        type="button"
                        className="btn-outline-sm btn-block"
                        onClick={() => onNavigate("/messages")}
                      >
                        Go to Messages Inbox
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default PostCard;
