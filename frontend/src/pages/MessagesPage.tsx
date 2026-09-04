// Conversation list and message thread for booking inquiries.
import { useEffect, useState } from "react";
import { getConversations, getMessages, sendMessage } from "../api";
import { IconMessage, IconSend, IconVerified } from "../components/Icons";
import type { Conversation, CurrentUser, Message } from "../types";

type MessagesPageProps = {
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
};

function MessagesPage({ currentUser, onNavigate }: MessagesPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    void getConversations()
      .then((items) => {
        setConversations(items);
        setSelectedUser(items[0] || null);
      })
      .catch(() => setError("We could not load your messages."))
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  useEffect(() => {
    if (!selectedUser) return;
    void getMessages(selectedUser.userId).then(setMessages).catch(() => setError("We could not load this conversation."));
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

  if (!currentUser) {
    return (
      <section className="page-content messages-page">
        <div className="profile-login-state">
          <IconMessage size={34} />
          <h1>Your booking inbox</h1>
          <p>Sign in to message artists and manage booking conversations.</p>
          <button className="btn-primary" type="button" onClick={() => onNavigate("/login")}>
            Sign in to continue
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-content messages-page">
      <header className="messages-heading">
        <div className="eyebrow">
          <IconMessage size={13} /> Direct booking
        </div>
        <h1>Messages</h1>
        <p>Keep your booking conversations in one place.</p>
      </header>

      {error && <div className="profile-error" role="alert">{error}</div>}
      {isLoading && (
        <div className="empty-state">
          <p>Loading your inbox...</p>
        </div>
      )}
      {!isLoading && conversations.length === 0 && (
        <div className="empty-state">
          <IconMessage size={32} />
          <h3>No conversations yet</h3>
          <p>Use “Book Look” on an artist’s post to start a booking inquiry.</p>
          <button className="btn-primary" type="button" onClick={() => onNavigate("/")}>
            Find an artist
          </button>
        </div>
      )}
      {!isLoading && conversations.length > 0 && (
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
                  placeholder="Write a booking message..."
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
    </section>
  );
}

export default MessagesPage;