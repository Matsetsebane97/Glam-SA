import { useEffect, useMemo, useState } from "react";
import { createReview, getBookings } from "../api";
import { IconBookmark, IconCalendar, IconClock, IconStar } from "../components/Icons";
import type { Booking, CurrentUser, Post } from "../types";
import { getSavedPostIds } from "../utils/savedPosts";

type ClientDashboardPageProps = {
  currentUser: CurrentUser | null;
  posts: Post[];
  onNavigate: (path: string) => void;
};

const reminderKey = (bookingId: number) => `bridgyReminder:${bookingId}`;

function icsEscape(value: string) {
  return value.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\r?\n/g, "\\n");
}

function downloadCalendarEvent(booking: Booking) {
  const toCalendarDate = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bridgy//Client Calendar//EN",
    "BEGIN:VEVENT",
    `UID:bridgy-booking-${booking.id}@bridgy`,
    `DTSTAMP:${toCalendarDate(new Date().toISOString())}`,
    `DTSTART:${toCalendarDate(booking.startsAt)}`,
    `DTEND:${toCalendarDate(booking.endsAt)}`,
    `SUMMARY:${icsEscape(`${booking.serviceName} with ${booking.otherUserName}`)}`,
    `DESCRIPTION:${icsEscape(booking.notes || "Booked through Bridgy")}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Tomorrow: ${booking.serviceName}`)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Coming up: ${booking.serviceName}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `bridgy-${booking.serviceName.toLowerCase().replace(/\s+/g, "-")}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

function ClientDashboardPage({ currentUser, posts, onNavigate }: ClientDashboardPageProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reminders, setReminders] = useState<number[]>([]);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    void getBookings()
      .then(setBookings)
      .catch(() => setNotice("We could not load your appointments."))
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  useEffect(() => {
    setReminders(bookings.filter((booking) => localStorage.getItem(reminderKey(booking.id)) === "on").map((booking) => booking.id));
  }, [bookings]);

  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "confirmed" && new Date(booking.startsAt) >= new Date()).slice(0, 3),
    [bookings],
  );
  const savedCount = currentUser ? getSavedPostIds(currentUser.id).filter((id) => posts.some((post) => post.id === id)).length : 0;
  const reviewableBookings = bookings.filter((booking) => booking.status === "completed" && !booking.review);

  const toggleReminder = (bookingId: number) => {
    const enabled = !reminders.includes(bookingId);
    if (enabled) localStorage.setItem(reminderKey(bookingId), "on");
    else localStorage.removeItem(reminderKey(bookingId));
    setReminders((current) => enabled ? [...current, bookingId] : current.filter((id) => id !== bookingId));
  };

  const submitReview = async () => {
    if (!reviewBooking) return;
    setIsSubmittingReview(true);
    try {
      await createReview({ bookingId: reviewBooking.id, rating, comment });
      setBookings((current) => current.map((booking) => booking.id === reviewBooking.id
        ? { ...booking, review: { id: 0, rating, comment } }
        : booking));
      setReviewBooking(null);
      setComment("");
      setNotice("Thanks for sharing your experience.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to submit your review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!currentUser) {
    return <section className="client-dashboard-empty"><h1>Your client dashboard</h1><p>Sign in to manage appointments, saved looks, and reviews.</p><button className="btn-primary" type="button" onClick={() => onNavigate("/login")}>Sign in</button></section>;
  }

  return (
    <section className="client-dashboard">
      <header className="client-dashboard-header">
        <div><span className="dashboard-eyebrow">Your beauty plans</span><h1>Client dashboard</h1><p>Keep your saved inspiration and appointments in one place.</p></div>
        <button className="btn-primary" type="button" onClick={() => onNavigate("/discover")}><IconCalendar size={16} /> Find an artist</button>
      </header>

      {notice && <p className="dashboard-notice" role="status">{notice}</p>}
      <div className="client-dashboard-stats">
        <button type="button" onClick={() => onNavigate("/saved")}><IconBookmark size={18} /><strong>{savedCount}</strong><span>Saved looks</span></button>
        <button type="button" onClick={() => onNavigate("/messages")}><IconCalendar size={18} /><strong>{bookings.length}</strong><span>Appointments</span></button>
        <div><IconStar size={18} /><strong>{reviewableBookings.length}</strong><span>Reviews to leave</span></div>
      </div>

      <section className="dashboard-section">
        <div className="dashboard-section-heading"><div><span className="dashboard-eyebrow">Next up</span><h2>Upcoming appointments</h2></div><button className="btn-ghost-sm" type="button" onClick={() => onNavigate("/messages")}>View all</button></div>
        {isLoading ? <p className="dashboard-muted">Loading your appointments...</p> : upcomingBookings.length === 0 ? <div className="dashboard-empty-row"><IconCalendar size={20} /><p>No confirmed appointments yet.</p><button className="btn-outline-sm" type="button" onClick={() => onNavigate("/discover")}>Browse artists</button></div> : (
          <div className="dashboard-appointment-list">
            {upcomingBookings.map((booking) => (
              <article className="dashboard-appointment" key={booking.id}>
                <div className="appointment-date"><strong>{new Date(booking.startsAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</strong><span>{new Date(booking.startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span></div>
                <div className="appointment-copy"><strong>{booking.serviceName}</strong><span>with {booking.otherUserName} · R {booking.price}</span></div>
                <div className="appointment-actions"><button className="btn-outline-sm" type="button" onClick={() => downloadCalendarEvent(booking)}><IconCalendar size={14} /> Calendar</button><button className={`btn-ghost-sm${reminders.includes(booking.id) ? " active" : ""}`} type="button" onClick={() => toggleReminder(booking.id)}><IconClock size={14} /> {reminders.includes(booking.id) ? "Reminder on" : "Remind me"}</button></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading"><div><span className="dashboard-eyebrow">After your appointment</span><h2>Share your experience</h2></div></div>
        {reviewableBookings.length === 0 ? <p className="dashboard-muted">Completed appointments will appear here for review.</p> : <div className="dashboard-review-list">{reviewableBookings.slice(0, 3).map((booking) => <article className="dashboard-review-row" key={booking.id}><div><strong>{booking.serviceName}</strong><span>with {booking.otherUserName}</span></div><button className="btn-primary-sm" type="button" onClick={() => setReviewBooking(booking)}><IconStar size={14} /> Leave review</button></article>)}</div>}
      </section>

      {reviewBooking && <div className="review-modal-backdrop" role="dialog" aria-modal="true"><section className="review-modal"><h2>Review {reviewBooking.otherUserName}</h2><p>How was your {reviewBooking.serviceName} appointment?</p><div className="review-stars" aria-label="Choose a rating">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={value <= rating ? "active" : ""} onClick={() => setRating(value)} aria-label={`${value} star${value === 1 ? "" : "s"}`}><IconStar size={24} fill="currentColor" /></button>)}</div><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share a helpful note (optional)" maxLength={600} /><div className="review-modal-actions"><button className="btn-ghost" type="button" onClick={() => setReviewBooking(null)}>Cancel</button><button className="btn-primary" type="button" disabled={isSubmittingReview} onClick={() => void submitReview()}>{isSubmittingReview ? "Submitting..." : "Submit review"}</button></div></section></div>}
    </section>
  );
}

export default ClientDashboardPage;
