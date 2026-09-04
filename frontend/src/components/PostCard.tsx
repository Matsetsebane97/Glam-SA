import { useEffect, useState } from "react";
import {
  IconBookmark,
  IconCheck,
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
import type { AvailabilitySlot, ServiceOffering } from "../types";

type PostCardProps = {
  post: Post;
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
};

function PostCard({ post, currentUser, onNavigate }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isUpdatingLike, setIsUpdatingLike] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showInquire, setShowInquire] = useState(false);
  const [copied, setCopied] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [inquiryText, setInquiryText] = useState(`Hi ${post.creator}, I would love to book this ${post.service} look.`);
  const [inquiryStatus, setInquiryStatus] = useState("");
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const styleImageUrl = post.mediaType.startsWith("image/") ? (post.mediaUrl || post.imageUrl) : post.imageUrl;
  const whatsappLink = whatsappUrl(
    post.whatsappNumber,
    inquiryText,
    styleImageUrl,
  );

  useEffect(() => {
    if (!showInquire || !post.ownerId) return;
    setBookingStatus("");
    void Promise.all([getServices(post.ownerId, post.id), getAvailability(post.ownerId)])
      .then(([nextServices, nextSlots]) => {
        setServices(nextServices.filter((service) => service.isActive));
        setSlots(nextSlots.filter((slot) => slot.isAvailable));
        const matchingService = nextServices.find((service) => service.name.toLowerCase() === post.service.toLowerCase());
        setSelectedServiceId(String(matchingService?.id || nextServices[0]?.id || ""));
        setSelectedSlotId(String(nextSlots[0]?.id || ""));
      })
      .catch(() => setBookingStatus("Booking times are not available right now."));
  }, [post.ownerId, post.service, showInquire]);

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
    } finally { setIsUpdatingLike(false); }
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
      setAuthNotice("Sign in to book this look.");
      return;
    }
    setAuthNotice("");
    setShowInquire(true);
  };

  const submitInquiry = async () => {
    if (!currentUser) { setInquiryStatus("Sign in to send a booking inquiry."); return; }
    if (!post.ownerId) { setInquiryStatus("This artist is not accepting in-app inquiries yet."); return; }
    setIsSendingInquiry(true); setInquiryStatus("");
    try {
      await sendMessage({ recipientId: post.ownerId, postId: post.id, body: inquiryText });
      setInquiryStatus("Inquiry sent. You can continue the conversation from Messages.");
    } catch (error) { setInquiryStatus(error instanceof Error ? error.message : "Unable to send inquiry."); }
    finally { setIsSendingInquiry(false); }
  };

  const submitBooking = async () => {
    if (!currentUser) {
      setBookingStatus("Sign in to request a booking.");
      return;
    }
    if (!selectedServiceId || !selectedSlotId) {
      setBookingStatus("Choose a service and available time first.");
      return;
    }
    try {
      const booking = await createBooking({
        serviceId: Number(selectedServiceId),
        slotId: Number(selectedSlotId),
        postId: post.id,
        notes: inquiryText,
      });
      setBookingStatus(`Booking requested for ${new Date(booking.startsAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}.`);
      setSlots((current) => current.filter((slot) => slot.id !== Number(selectedSlotId)));
    } catch (error) {
      setBookingStatus(error instanceof Error ? error.message : "Unable to request booking.");
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
      // Ignored
    }
  };

  return (
    <article className="post-card">
      {/* Header */}
      <header className="post-card-head">
        <button className="post-author post-author-link" type="button" onClick={() => post.ownerId && onNavigate(`/profile/${post.ownerId}`)} disabled={!post.ownerId}>
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

        <button
          className="btn-book-action"
          type="button"
          onClick={openBooking}
        >
          Book Look
        </button>
      </header>

      {/* Media Viewport */}
      <div
        className="post-media-wrap"
        onDoubleClick={toggleLike}
      >
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
            className="action-btn"
            aria-label="Inquire or message artist"
            type="button"
            onClick={openBooking}
          >
            <IconMessage size={20} />
            <span className="action-label">Inquire</span>
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
          <button type="button" onClick={() => onNavigate("/login")}>Sign in</button>
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

      {/* Quick Booking / Inquiry Modal */}
      {showInquire && (
        <div className="inquiry-modal-backdrop" onClick={() => setShowInquire(false)}>
          <div className="inquiry-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="inquiry-header">
              <div className="inquiry-artist-info">
                <div className="inquiry-avatar">{post.creator.charAt(0)}</div>
                <div>
                  <h3>Book with {post.creator}</h3>
                  <p>Specialty: <strong>{post.service}</strong> {post.location ? `· ${post.location}` : ""}</p>
                </div>
              </div>
              <button
                className="inquiry-close-btn"
                type="button"
                onClick={() => setShowInquire(false)}
              >
                ✕
              </button>
            </div>

            <p className="inquiry-desc">
              Connect directly with {post.creator} to check calendar availability, request quotes, or book a session for this style.
            </p>
            <div className="booking-summary">
              <strong>R {post.price}</strong>
              <span>Estimated time: {formatDuration(post.durationMinutes)}</span>
            </div>

            <label className="inquiry-message-label">Your booking message
              <textarea rows={3} value={inquiryText} onChange={(event) => setInquiryText(event.target.value)} />
            </label>
            {currentUser && services.length > 0 && (
              <div className="booking-fields">
                <label className="inquiry-message-label">
                  Service
                  <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)}>
                    {services.map((service) => <option key={service.id} value={service.id}>{service.name} · R {service.price} · {formatDuration(service.durationMinutes)}</option>)}
                  </select>
                </label>
                <label className="inquiry-message-label">
                  Available time
                  <select value={selectedSlotId} onChange={(event) => setSelectedSlotId(event.target.value)}>
                    {slots.map((slot) => <option key={slot.id} value={slot.id}>{new Date(slot.startsAt).toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</option>)}
                  </select>
                </label>
                <button type="button" className="btn-primary" onClick={() => void submitBooking()} disabled={!slots.length}>
                  Request booking
                </button>
              </div>
            )}
            {inquiryStatus && <p className="inquiry-status">{inquiryStatus}</p>}
            {bookingStatus && <p className="inquiry-status">{bookingStatus}</p>}
            {inquiryStatus.startsWith("Inquiry sent") && (
              <button type="button" className="btn-outline-sm inquiry-messages-link" onClick={() => onNavigate("/messages")}>
                View Messages
              </button>
            )}

            <div className="inquiry-actions">
              {whatsappLink ? (
                <a href={whatsappLink} target="_blank" rel="noreferrer" className="btn-whatsapp">
                  <IconWhatsApp size={18} />
                  <span>Chat on WhatsApp</span>
                </a>
              ) : (
                <span className="btn-whatsapp is-unavailable" title="This artist has not added a WhatsApp number">
                  <IconWhatsApp size={18} />
                  <span>WhatsApp unavailable</span>
                </span>
              )}

              <button
                type="button"
                className="btn-ghost"
                onClick={() => void submitInquiry()}
                disabled={isSendingInquiry}
              >
                {isSendingInquiry ? "Sending..." : currentUser ? "Send In-App Request" : "Sign In to Send"}
              </button>
              {!currentUser && <button type="button" className="btn-primary" onClick={() => onNavigate("/login")}>Open Sign In</button>}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default PostCard;
