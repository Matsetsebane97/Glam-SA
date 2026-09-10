import { useEffect, useState } from "react";
import { getBookings, getConversations } from "../api";
import { IconBell, IconCalendar, IconMessage } from "../components/Icons";
import type { Booking, Conversation, CurrentUser } from "../types";

type NotificationsPageProps = {
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function NotificationsPage({ currentUser, onNavigate }: NotificationsPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void Promise.all([getConversations(), getBookings()])
      .then(([nextConversations, nextBookings]) => {
        setConversations(nextConversations.filter((conversation) => (conversation.unreadCount ?? 0) > 0));
        setBookings(nextBookings.filter((booking) => ["requested", "confirmed", "declined", "cancelled", "completed"].includes(booking.status)));
        setError("");
      })
      .catch(() => setError("We could not load your notifications right now."))
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  if (!currentUser) {
    return (
      <section className="page-content notifications-page">
        <div className="profile-login-state">
          <IconBell size={34} />
          <h1>Sign in to see notifications</h1>
          <p>Track messages, booking requests, and appointment updates in one place.</p>
          <button className="btn-primary" type="button" onClick={() => onNavigate("/login")}>Sign in to continue</button>
        </div>
      </section>
    );
  }

  const bookingRequests = bookings.filter((booking) => booking.isCreator && booking.status === "requested");
  const recentBookings = bookings.filter((booking) => !(booking.isCreator && booking.status === "requested")).slice(0, 8);

  return (
    <section className="page-content notifications-page">
      <header className="notifications-header">
        <div>
          <div className="eyebrow"><IconBell size={13} /> Your activity</div>
          <h1>Notifications</h1>
          <p>Stay current on conversations and appointment activity.</p>
        </div>
        <button className="btn-outline-sm" type="button" onClick={() => onNavigate("/messages")}>
          <IconMessage size={15} /> Open messages
        </button>
      </header>

      {isLoading && <div className="empty-state"><p>Loading notifications...</p></div>}
      {!isLoading && error && <div className="empty-state error"><p>{error}</p></div>}
      {!isLoading && !error && (
        <div className="notifications-grid">
          <section className="notification-section">
            <div className="notification-section-heading">
              <div><IconMessage size={17} /><h2>Unread conversations</h2></div>
              <span>{conversations.reduce((total, item) => total + (item.unreadCount ?? 0), 0)}</span>
            </div>
            {conversations.length === 0 ? (
              <p className="notification-empty-copy">You are all caught up on messages.</p>
            ) : conversations.map((conversation) => (
              <button key={conversation.userId} className="notification-row" type="button" onClick={() => onNavigate("/messages")}>
                <span className="notification-row-icon"><IconMessage size={16} /></span>
                <span className="notification-row-copy">
                  <strong>{conversation.name}</strong>
                  <span>{conversation.lastMessage}</span>
                </span>
                <span className="notification-count">{conversation.unreadCount}</span>
              </button>
            ))}
          </section>

          <section className="notification-section">
            <div className="notification-section-heading">
              <div><IconCalendar size={17} /><h2>Booking activity</h2></div>
              <span>{bookingRequests.length}</span>
            </div>
            {bookingRequests.map((booking) => (
              <button key={booking.id} className="notification-row" type="button" onClick={() => onNavigate("/messages")}>
                <span className="notification-row-icon is-accent"><IconCalendar size={16} /></span>
                <span className="notification-row-copy">
                  <strong>New booking request</strong>
                  <span>{booking.serviceName} with {booking.otherUserName}</span>
                  <small>{formatDate(booking.startsAt)}</small>
                </span>
                <span className="notification-status pending">Review</span>
              </button>
            ))}
            {recentBookings.map((booking) => (
              <div key={booking.id} className="notification-row is-static">
                <span className="notification-row-icon"><IconCalendar size={16} /></span>
                <span className="notification-row-copy">
                  <strong>{booking.serviceName}</strong>
                  <span>{booking.status} with {booking.otherUserName}</span>
                  <small>{formatDate(booking.startsAt)}</small>
                </span>
                <span className={`notification-status ${booking.status}`}>{booking.status}</span>
              </div>
            ))}
            {bookingRequests.length === 0 && recentBookings.length === 0 && (
              <p className="notification-empty-copy">No booking activity yet.</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

export default NotificationsPage;
