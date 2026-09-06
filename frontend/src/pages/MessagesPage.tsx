// Conversation list, message threads, and appointments/bookings management.
import { useEffect, useState } from "react";
import { getBookings, getConversations, getMessages, sendMessage, updateBookingStatus } from "../api";
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconClose,
  IconMessage,
  IconSend,
  IconSparkles,
  IconVerified,
  IconWhatsApp,
} from "../components/Icons";
import { whatsappUrl } from "../utils/whatsapp";
import type { Booking, Conversation, CurrentUser, Message } from "../types";

type MessagesPageProps = {
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
};

type TabType = "messages" | "bookings";
type BookingFilter = "all" | "requested" | "confirmed" | "completed" | "cancelled";

function MessagesPage({ currentUser, onNavigate }: MessagesPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("messages");

  // Messages state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("all");
  const [isUpdatingBookingId, setIsUpdatingBookingId] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const isCreator = currentUser?.accountType === "creator";

  // Load initial conversations and bookings
  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    Promise.all([
      getConversations().catch(() => []),
      getBookings().catch(() => []),
    ])
      .then(([convs, bks]) => {
        setConversations(convs);
        setSelectedUser(convs[0] || null);
        setBookings(bks);
      })
      .catch(() => setError("We could not load your inbox."))
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  // Load messages when selected user changes
  useEffect(() => {
    if (!selectedUser) return;
    void getMessages(selectedUser.userId)
      .then(setMessages)
      .catch(() => setError("We could not load this conversation."));
  }, [selectedUser]);

  const send = async () => {
    if (!selectedUser || !draft.trim()) return;
    setIsSending(true);
    setError("");

    try {
      const message = await sendMessage({ recipientId: selectedUser.userId, body: draft.trim() });
      setMessages((currentMessages) => [...currentMessages, message]);
      setConversations((items) =>
        items.map((item) =>
          item.userId === selectedUser.userId
            ? { ...item, lastMessage: message.body, createdAt: message.createdAt }
            : item,
        ),
      );
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleBookingAction = async (
    bookingId: number,
    action: "confirm" | "decline" | "cancel" | "complete",
  ) => {
    setIsUpdatingBookingId(bookingId);
    setActionNotice("");
    try {
      const updated = await updateBookingStatus(bookingId, action);
      setBookings((prev) =>
        prev.map((item) => (item.id === bookingId ? { ...item, status: updated.status } : item)),
      );
      const actionLabels: Record<string, string> = {
        confirm: "Booking confirmed successfully!",
        decline: "Booking request declined.",
        cancel: "Booking cancelled.",
        complete: "Booking marked as completed!",
      };
      setActionNotice(actionLabels[action] || "Status updated.");
      // Refresh conversations in case an automated notification message was sent
      getConversations().then(setConversations).catch(() => {});
    } catch (actionError) {
      setActionNotice(actionError instanceof Error ? actionError.message : "Failed to update booking.");
    } finally {
      setIsUpdatingBookingId(null);
    }
  };

  const switchToChatWithUser = (userId: number, name: string, handle?: string) => {
    setActiveTab("messages");
    const existing = conversations.find((c) => c.userId === userId);
    if (existing) {
      setSelectedUser(existing);
    } else {
      const newConv: Conversation = {
        userId,
        name,
        handle: handle || `@${name.toLowerCase().replace(/\s+/g, "")}`,
        lastMessage: "Start your conversation...",
        createdAt: new Date().toISOString(),
        postService: "Booking",
      };
      setConversations((prev) => [newConv, ...prev]);
      setSelectedUser(newConv);
    }
  };

  if (!currentUser) {
    return (
      <section className="page-content messages-page">
        <div className="profile-login-state">
          <IconMessage size={34} />
          <h1>Your booking & messaging inbox</h1>
          <p>Sign in to manage appointments, message artists, and track booking requests.</p>
          <button className="btn-primary" type="button" onClick={() => onNavigate("/login")}>
            Sign in to continue
          </button>
        </div>
      </section>
    );
  }

  // Count pending bookings needing creator attention
  const pendingRequestsCount = bookings.filter(
    (b) => (b.isCreator ?? isCreator) && b.status === "requested",
  ).length;

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === "all") return true;
    if (bookingFilter === "requested") return b.status === "requested";
    if (bookingFilter === "confirmed") return b.status === "confirmed";
    if (bookingFilter === "completed") return b.status === "completed";
    if (bookingFilter === "cancelled") return b.status === "cancelled" || b.status === "declined";
    return true;
  });

  return (
    <section className="page-content messages-page">
      <header className="messages-heading">
        <div className="eyebrow">
          <IconMessage size={13} /> {isCreator ? "Creator Studio" : "Client Portal"}
        </div>
        <h1>Inbox & Bookings</h1>
        <p>Manage direct conversations, incoming appointment requests, and confirmed sessions.</p>

        {/* Tab Switcher */}
        <div className="inbox-tabs-bar" role="tablist" aria-label="Inbox navigation">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "messages"}
            className={`inbox-tab-btn ${activeTab === "messages" ? "active" : ""}`}
            onClick={() => setActiveTab("messages")}
          >
            <IconMessage size={16} /> Direct Messages
            {conversations.length > 0 && <span className="tab-count-badge">{conversations.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bookings"}
            className={`inbox-tab-btn ${activeTab === "bookings" ? "active" : ""}`}
            onClick={() => setActiveTab("bookings")}
          >
            <IconCalendar size={16} /> Appointments & Bookings
            {pendingRequestsCount > 0 && (
              <span className="tab-count-badge badge-pending">{pendingRequestsCount} new</span>
            )}
          </button>
        </div>
      </header>

      {error && <div className="profile-error" role="alert">{error}</div>}
      {actionNotice && (
        <div
          className="profile-error"
          role="status"
          style={{
            background: "rgba(194, 111, 62, 0.15)",
            borderColor: "var(--accent, #c26f3e)",
            color: "var(--text, #f8fafc)",
          }}
        >
          {actionNotice}
        </div>
      )}

      {isLoading && (
        <div className="empty-state">
          <p>Loading your inbox...</p>
        </div>
      )}

      {/* ─── TAB 1: DIRECT MESSAGES ─────────────────────────────────────────── */}
      {!isLoading && activeTab === "messages" && (
        <>
          {conversations.length === 0 ? (
            <div className="empty-state">
              <IconMessage size={32} />
              <h3>No conversations yet</h3>
              <p>Inquire on an artist's portfolio look to start a conversation.</p>
              <button className="btn-primary" type="button" onClick={() => onNavigate("/")}>
                Find an artist
              </button>
            </div>
          ) : (
            <div className="messenger-layout">
              <aside className="conversation-list" aria-label="Conversations">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.userId}
                    type="button"
                    className={`conversation-item ${selectedUser?.userId === conversation.userId ? "active" : ""}`}
                    onClick={() => setSelectedUser(conversation)}
                  >
                    <div className="conversation-avatar">{conversation.name.charAt(0)}</div>
                    <div>
                      <strong>
                        {conversation.name}
                        <IconVerified size={12} />
                      </strong>
                      <small>{conversation.postService}</small>
                      <p>{conversation.lastMessage}</p>
                    </div>
                  </button>
                ))}
              </aside>

              {selectedUser && (
                <section className="conversation-panel">
                  <header className="conversation-header">
                    <div className="conversation-avatar">{selectedUser.name.charAt(0)}</div>
                    <div>
                      <h2>{selectedUser.name}</h2>
                      <p>{selectedUser.handle} · {selectedUser.postService}</p>
                    </div>
                  </header>

                  <div className="message-list">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`message-bubble ${message.senderId === currentUser.id ? "mine" : ""}`}
                      >
                        <p>{message.body}</p>
                        <time>
                          {new Date(message.createdAt).toLocaleString("en-ZA", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    ))}
                  </div>

                  <form
                    className="message-compose"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void send();
                    }}
                  >
                    <textarea
                      rows={2}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Write a message..."
                      aria-label="Message"
                    />
                    <button className="btn-primary" type="submit" disabled={isSending || !draft.trim()}>
                      <IconSend size={16} /> {isSending ? "Sending..." : "Send"}
                    </button>
                  </form>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── TAB 2: APPOINTMENTS & BOOKINGS ─────────────────────────────────── */}
      {!isLoading && activeTab === "bookings" && (
        <div className="bookings-hub-container">
          {/* Top Banner / Filter Toolbar */}
          <div className="bookings-toolbar">
            <div className="bookings-filter-group" role="group" aria-label="Filter bookings by status">
              <button
                type="button"
                className={`booking-pill-btn ${bookingFilter === "all" ? "active" : ""}`}
                onClick={() => setBookingFilter("all")}
              >
                All ({bookings.length})
              </button>
              <button
                type="button"
                className={`booking-pill-btn ${bookingFilter === "requested" ? "active" : ""}`}
                onClick={() => setBookingFilter("requested")}
              >
                <IconClock size={12} /> Pending ({bookings.filter((b) => b.status === "requested").length})
              </button>
              <button
                type="button"
                className={`booking-pill-btn ${bookingFilter === "confirmed" ? "active" : ""}`}
                onClick={() => setBookingFilter("confirmed")}
              >
                <IconCheck size={12} /> Confirmed ({bookings.filter((b) => b.status === "confirmed").length})
              </button>
              <button
                type="button"
                className={`booking-pill-btn ${bookingFilter === "completed" ? "active" : ""}`}
                onClick={() => setBookingFilter("completed")}
              >
                <IconSparkles size={12} /> Completed ({bookings.filter((b) => b.status === "completed").length})
              </button>
              <button
                type="button"
                className={`booking-pill-btn ${bookingFilter === "cancelled" ? "active" : ""}`}
                onClick={() => setBookingFilter("cancelled")}
              >
                Cancelled ({bookings.filter((b) => b.status === "cancelled" || b.status === "declined").length})
              </button>
            </div>

            {isCreator && (
              <button
                type="button"
                className="btn-outline-sm set-schedule-btn"
                onClick={() => onNavigate("/settings")}
                title="Manage working hours and create availability slots"
              >
                <IconClock size={14} /> Set Working Hours
              </button>
            )}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="empty-state">
              <IconCalendar size={36} />
              <h3>No bookings found</h3>
              <p>
                {bookingFilter === "all"
                  ? isCreator
                    ? "You have not received any booking requests yet. Set your working hours so clients can request time slots."
                    : "You have not requested any bookings yet. Find an artist style on the feed to book an appointment."
                  : `No bookings with status "${bookingFilter}".`}
              </p>
              {isCreator ? (
                <button className="btn-primary" type="button" onClick={() => onNavigate("/settings")}>
                  Manage Schedule & Slots
                </button>
              ) : (
                <button className="btn-primary" type="button" onClick={() => onNavigate("/")}>
                  Explore Styles & Artists
                </button>
              )}
            </div>
          ) : (
            <div className="booking-cards-grid">
              {filteredBookings.map((b) => {
                const userIsCreator = b.isCreator ?? isCreator;
                const startDate = new Date(b.startsAt);
                const endDate = new Date(b.endsAt);
                const formattedDate = startDate.toLocaleDateString("en-ZA", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const formattedTime = `${startDate.toLocaleTimeString("en-ZA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} – ${endDate.toLocaleTimeString("en-ZA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`;

                const whatsappMsg = `Hi ${b.otherUserName}, inquiring regarding our Glam SA booking for "${b.serviceName}" on ${formattedDate} at ${formattedTime}.`;
                const whatsappHref = whatsappUrl(b.whatsappNumber, whatsappMsg, b.postImageUrl);

                return (
                  <article key={b.id} className={`booking-card-item status-${b.status}`}>
                    {/* Header: Service + Price + Status */}
                    <div className="bcard-header">
                      <div className="bcard-service-meta">
                        <h3>{b.serviceName}</h3>
                        <span className="bcard-price">R {b.price}</span>
                      </div>
                      <span className={`booking-status-badge status-${b.status}`}>
                        {b.status === "requested" && (
                          <>
                            <IconClock size={12} /> Pending Approval
                          </>
                        )}
                        {b.status === "confirmed" && (
                          <>
                            <IconCheck size={12} /> Confirmed
                          </>
                        )}
                        {b.status === "completed" && (
                          <>
                            <IconSparkles size={12} /> Completed
                          </>
                        )}
                        {b.status === "declined" && (
                          <>
                            <IconClose size={12} /> Declined
                          </>
                        )}
                        {b.status === "cancelled" && (
                          <>
                            <IconClose size={12} /> Cancelled
                          </>
                        )}
                      </span>
                    </div>

                    {/* Look preview thumbnail if linked */}
                    {b.postImageUrl && (
                      <div className="bcard-look-preview">
                        <img src={b.postImageUrl} alt={b.serviceName} />
                        <span>Booked from portfolio look</span>
                      </div>
                    )}

                    {/* Details: Date, Time & Counterparty */}
                    <div className="bcard-body">
                      <div className="bcard-detail-row">
                        <IconCalendar size={16} />
                        <span><strong>{formattedDate}</strong> ({formattedTime})</span>
                      </div>

                      <div className="bcard-detail-row">
                        <div className="bcard-party-avatar">
                          {b.otherUserPhoto ? (
                            <img src={b.otherUserPhoto} alt={b.otherUserName} />
                          ) : (
                            b.otherUserName.charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="bcard-party-label">
                            {userIsCreator ? "Client" : "Beauty Artist"}:
                          </span>
                          <strong>{b.otherUserName}</strong>
                        </div>
                      </div>

                      {b.notes && (
                        <div className="bcard-notes-box">
                          <span className="bcard-notes-label">Client Notes:</span>
                          <p>"{b.notes}"</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    <div className="bcard-actions-footer">
                      {/* Creator actions on pending requested */}
                      {userIsCreator && b.status === "requested" && (
                        <>
                          <button
                            type="button"
                            className="btn-primary-sm"
                            disabled={isUpdatingBookingId === b.id}
                            onClick={() => void handleBookingAction(b.id, "confirm")}
                          >
                            <IconCheck size={14} /> Accept & Confirm
                          </button>
                          <button
                            type="button"
                            className="btn-outline-sm danger-action"
                            disabled={isUpdatingBookingId === b.id}
                            onClick={() => void handleBookingAction(b.id, "decline")}
                          >
                            <IconClose size={14} /> Decline
                          </button>
                        </>
                      )}

                      {/* Client actions on pending requested */}
                      {!userIsCreator && b.status === "requested" && (
                        <button
                          type="button"
                          className="btn-outline-sm danger-action"
                          disabled={isUpdatingBookingId === b.id}
                          onClick={() => void handleBookingAction(b.id, "cancel")}
                        >
                          Cancel Request
                        </button>
                      )}

                      {/* Actions on confirmed booking */}
                      {b.status === "confirmed" && (
                        <>
                          {userIsCreator && (
                            <button
                              type="button"
                              className="btn-primary-sm"
                              disabled={isUpdatingBookingId === b.id}
                              onClick={() => void handleBookingAction(b.id, "complete")}
                            >
                              <IconCheck size={14} /> Mark Completed
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-outline-sm danger-action"
                            disabled={isUpdatingBookingId === b.id}
                            onClick={() => void handleBookingAction(b.id, "cancel")}
                          >
                            Cancel Appointment
                          </button>
                        </>
                      )}

                      {/* Chat & WhatsApp links */}
                      <div className="bcard-contact-group">
                        <button
                          type="button"
                          className="btn-ghost-sm"
                          onClick={() =>
                            switchToChatWithUser(
                              userIsCreator ? b.clientId : b.creatorId,
                              b.otherUserName,
                            )
                          }
                          title="Open chat message"
                        >
                          <IconMessage size={14} /> Chat
                        </button>

                        {whatsappHref && (
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-whatsapp-sm"
                            title="Chat on WhatsApp"
                          >
                            <IconWhatsApp size={14} /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default MessagesPage;