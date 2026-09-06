import { useMemo, useState } from "react";
import { createBooking, getAvailability, getServices } from "../api";
import { IconBookmark, IconChevronRight, IconClose, IconMessage, IconMic, IconPin, IconSend, IconSparkles, IconWhatsApp } from "./Icons";
import type { AvailabilitySlot, CurrentUser, Post, ServiceOffering } from "../types";
import { whatsappUrl } from "../utils/whatsapp";
import {
  answerQuestion,
  assistantSuggestions,
  createBookingNote,
  formatDistanceKm,
  formatDurationMinutes,
  formatPriceRange,
  formatSlot,
  parseQuestion,
  recentSearchesKey,
  savedArtistsKey,
  selectBestService,
  sortSlotsByPreference,
  type ArtistMatch,
  type ChatMessage,
} from "../utils/assistantLogic";

// ─── Local Types ──────────────────────────────────────────────────────────────

type AssistantPanelProps = {
  posts: Post[];
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
  onSearch: (query: string) => void;
};

type BookingPanelState = {
  isLoading: boolean;
  isSubmitting: boolean;
  services: ServiceOffering[];
  slots: AvailabilitySlot[];
  selectedServiceId: string;
  selectedSlotId: string;
  notes: string;
  status: string;
};

type SpeechRecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const speechRecognitionName = "webkitSpeechRecognition";

// ─── Component ────────────────────────────────────────────────────────────────

function AssistantPanel({ posts, currentUser, onNavigate, onSearch }: AssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const storedSearches = window.localStorage.getItem(recentSearchesKey);
      return storedSearches ? (JSON.parse(storedSearches) as string[]).slice(0, 3) : [];
    } catch {
      return [];
    }
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, author: "assistant", text: "Hi, I can help you find beauty services by artist, category, location, or budget." },
  ]);
  const [savedArtistIds, setSavedArtistIds] = useState<string[]>(() => {
    try {
      const storedArtists = window.localStorage.getItem(savedArtistsKey);
      return storedArtists ? (JSON.parse(storedArtists) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [activeBookingArtistId, setActiveBookingArtistId] = useState<string | null>(null);
  const [bookingPanels, setBookingPanels] = useState<Record<string, BookingPanelState>>({});
  const [showBookingAuthPopup, setShowBookingAuthPopup] = useState(false);

  const visiblePrompts = useMemo(() => {
    return [...recentSearches, ...assistantSuggestions.filter((s) => !recentSearches.includes(s))].slice(0, 4);
  }, [recentSearches]);

  const saveRecentSearch = (question: string) => {
    const nextSearches = [question, ...recentSearches.filter((s) => s.toLowerCase() !== question.toLowerCase())].slice(0, 3);
    setRecentSearches(nextSearches);
    window.localStorage.setItem(recentSearchesKey, JSON.stringify(nextSearches));
  };

  const browseFeed = () => {
    setIsOpen(false);
    onNavigate("/");
  };

  const openFullResults = (query: string) => {
    if (parseQuestion(query).wantsNearby) {
      setIsOpen(false);
      onNavigate("/discover");
      return;
    }
    onSearch(query);
    browseFeed();
  };

  const toggleSavedArtist = (artist: ArtistMatch) => {
    const artistId = artist.ownerId ? `owner-${artist.ownerId}` : artist.id;
    const nextSavedArtistIds = savedArtistIds.includes(artistId)
      ? savedArtistIds.filter((savedId) => savedId !== artistId)
      : [artistId, ...savedArtistIds];
    setSavedArtistIds(nextSavedArtistIds);
    window.localStorage.setItem(savedArtistsKey, JSON.stringify(nextSavedArtistIds));
  };

  const updateBookingPanel = (artistId: string, update: Partial<BookingPanelState>) => {
    setBookingPanels((currentPanels) => ({
      ...currentPanels,
      [artistId]: {
        ...(currentPanels[artistId] || {
          isLoading: false,
          isSubmitting: false,
          services: [],
          slots: [],
          selectedServiceId: "",
          selectedSlotId: "",
          notes: "",
          status: "",
        }),
        ...update,
      },
    }));
  };

  const startVoiceSearch = () => {
    const recognitionConstructor = (window as unknown as Record<string, SpeechRecognitionConstructor | undefined>)[speechRecognitionName];
    if (!recognitionConstructor) {
      setVoiceStatus("Voice search is not supported in this browser.");
      return;
    }
    const recognition = new recognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-ZA";
    setVoiceStatus("Listening...");
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      setDraft(transcript);
      setVoiceStatus("");
      void ask(transcript);
    };
    recognition.onerror = () => setVoiceStatus("I could not hear that clearly.");
    recognition.onend = () => setVoiceStatus((status) => (status === "Listening..." ? "" : status));
    recognition.start();
  };

  const ask = async (nextQuestion = draft) => {
    const question = nextQuestion.trim();
    if (!question) return;
    if (question === "Browse the full feed") {
      browseFeed();
      return;
    }
    saveRecentSearch(question);
    setMessages((current) => [...current, { id: Date.now(), author: "user", text: question }]);
    setDraft("");
    setIsThinking(true);
    const answer = await answerQuestion(question, posts, currentUser);
    setMessages((current) => [...current, { id: Date.now() + 1, author: "assistant", ...answer }]);
    setIsThinking(false);
  };

  const openProfile = (artist: ArtistMatch) => {
    if (!artist.ownerId) return;
    setIsOpen(false);
    onNavigate(`/profile/${artist.ownerId}`);
  };

  const openBooking = (artist: ArtistMatch) => {
    if (!artist.ownerId) return;
    if (!currentUser) {
      setShowBookingAuthPopup(true);
      return;
    }
    if (activeBookingArtistId === artist.id) {
      setActiveBookingArtistId(null);
      return;
    }
    setActiveBookingArtistId(artist.id);
    updateBookingPanel(artist.id, {
      isLoading: true,
      status: "",
      notes: bookingPanels[artist.id]?.notes || createBookingNote(artist),
    });

    void Promise.all([getServices(artist.ownerId), getAvailability(artist.ownerId)])
      .then(([nextServices, nextSlots]) => {
        const activeServices = nextServices.filter((s) => s.isActive);
        const availableSlots = sortSlotsByPreference(
          nextSlots.filter((slot) => slot.isAvailable),
          artist.preferredWeekday,
        );
        const bestService = selectBestService(activeServices, artist);
        const hasPreferredSlot =
          artist.preferredWeekday == null ||
          availableSlots.some((slot) => new Date(slot.startsAt).getDay() === artist.preferredWeekday);
        updateBookingPanel(artist.id, {
          isLoading: false,
          services: activeServices,
          slots: availableSlots,
          selectedServiceId: String(bestService?.id || ""),
          selectedSlotId: String(availableSlots[0]?.id || ""),
          status:
            activeServices.length && availableSlots.length
              ? hasPreferredSlot
                ? ""
                : `No ${artist.preferredDateLabel} slot yet, so I selected the next open time.`
              : "This artist needs an active service and open time before bookings can be requested.",
        });
      })
      .catch(() => {
        updateBookingPanel(artist.id, {
          isLoading: false,
          status: "Booking times are not available right now. You can still open the profile or send a message.",
        });
      });
  };

  const submitAssistantBooking = async (artist: ArtistMatch) => {
    const bookingPanel = bookingPanels[artist.id];
    if (!artist.ownerId || !bookingPanel) return;
    if (!currentUser) {
      setIsOpen(false);
      onNavigate("/login");
      return;
    }
    if (currentUser.id === artist.ownerId) {
      updateBookingPanel(artist.id, { status: "You cannot book your own service." });
      return;
    }
    if (!bookingPanel.selectedServiceId || !bookingPanel.selectedSlotId) {
      updateBookingPanel(artist.id, { status: "Choose a service and available time first." });
      return;
    }
    updateBookingPanel(artist.id, { isSubmitting: true, status: "" });
    try {
      const booking = await createBooking({
        serviceId: Number(bookingPanel.selectedServiceId),
        slotId: Number(bookingPanel.selectedSlotId),
        postId: artist.postId,
        notes: bookingPanel.notes,
      });
      updateBookingPanel(artist.id, {
        isSubmitting: false,
        selectedSlotId: "",
        slots: bookingPanel.slots.filter((slot) => slot.id !== Number(bookingPanel.selectedSlotId)),
        status: `Booking requested for ${formatSlot({ id: 0, startsAt: booking.startsAt, endsAt: booking.endsAt, isAvailable: false })}.`,
      });
    } catch (error) {
      updateBookingPanel(artist.id, {
        isSubmitting: false,
        status: error instanceof Error ? error.message : "Unable to request booking.",
      });
    }
  };

  return (
    <div className="assistant-widget">
      {isOpen && (
        <section className="assistant-panel" aria-label="Glam SA assistant">
          <header className="assistant-header">
            <div className="assistant-header-identity">
              <div className="assistant-header-avatar" aria-hidden="true">
                <IconSparkles size={16} />
              </div>
              <div>
                <strong>Glam Assistant</strong>
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span className="assistant-online-dot" />
                  Discovery help
                </span>
              </div>
            </div>
            <button className="icon-btn" type="button" onClick={() => setIsOpen(false)} aria-label="Close assistant">
              <IconClose size={16} />
            </button>
          </header>
          <div className="assistant-messages" aria-live="polite">
            {messages.map((message) => (
              <div className={`assistant-message ${message.author}`} key={message.id}>
                <span>{message.text}</span>
                {message.matches && (
                  <div className="assistant-match-list">
                    {message.matches.map((artist) => {
                      const priceRange = formatPriceRange(artist);
                      const bookingPanel = bookingPanels[artist.id];
                      const showBookingPanel = activeBookingArtistId === artist.id && bookingPanel;
                      const messageHref = whatsappUrl(
                        artist.whatsappNumber,
                        `Hi ${artist.name}, I found you on Glam SA and want to inquire about booking a session!`,
                      );
                      const savedArtistId = artist.ownerId ? `owner-${artist.ownerId}` : artist.id;
                      const isSaved = savedArtistIds.includes(savedArtistId);
                      return (
                        <article className="assistant-artist-card" key={artist.id}>
                          <button
                            className="assistant-artist-card-main"
                            type="button"
                            disabled={!artist.ownerId}
                            aria-label={artist.ownerId ? `View ${artist.name}'s profile` : `${artist.name} profile unavailable`}
                            onClick={() => openProfile(artist)}
                          >
                            <span className="assistant-artist-avatar">{artist.name.charAt(0).toUpperCase()}</span>
                            <span className="assistant-artist-copy">
                              <span className="assistant-artist-title-row">
                                <strong>{artist.name}</strong>
                                {artist.ownerId && <IconChevronRight size={14} />}
                              </span>
                              <span>
                                {[artist.service || artist.category, priceRange].filter(Boolean).join(" - ") ||
                                  `${artist.resultCount} matching look${artist.resultCount === 1 ? "" : "s"}`}
                              </span>
                              {(artist.location || artist.distanceKm != null) && (
                                <span className="assistant-artist-location">
                                  <IconPin size={11} />
                                  {[artist.location, formatDistanceKm(artist.distanceKm)].filter(Boolean).join(" - ")}
                                </span>
                              )}
                            </span>
                          </button>
                          <div className="assistant-artist-actions">
                            <button type="button" disabled={!artist.ownerId} onClick={() => openProfile(artist)}>
                              Profile
                            </button>
                            <button type="button" disabled={!artist.ownerId} onClick={() => openBooking(artist)}>
                              Book
                            </button>
                            <button type="button" className={isSaved ? "saved" : ""} onClick={() => toggleSavedArtist(artist)}>
                              <IconBookmark size={13} fill={isSaved ? "currentColor" : undefined} />
                              {isSaved ? "Saved" : "Save"}
                            </button>
                            {messageHref ? (
                              <a href={messageHref} target="_blank" rel="noreferrer" aria-label={`Message ${artist.name} on WhatsApp`} onClick={() => setIsOpen(false)}>
                                <IconWhatsApp size={14} /> Message
                              </a>
                            ) : (
                              <button type="button" disabled>
                                Message
                              </button>
                            )}
                          </div>
                          {showBookingPanel && (
                            <div className="assistant-booking-panel">
                              {bookingPanel.isLoading ? (
                                <p className="assistant-booking-status">Checking services and open times...</p>
                              ) : (
                                <>
                                  {bookingPanel.services.length > 0 && (
                                    <label className="assistant-booking-field">
                                      <span>Service</span>
                                      <select
                                        value={bookingPanel.selectedServiceId}
                                        onChange={(e) => updateBookingPanel(artist.id, { selectedServiceId: e.target.value, status: "" })}
                                      >
                                        {bookingPanel.services.map((service) => (
                                          <option key={service.id} value={service.id}>
                                            {service.name} - R {service.price} - {formatDurationMinutes(service.durationMinutes)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  )}
                                  {bookingPanel.slots.length > 0 && (
                                    <label className="assistant-booking-field">
                                      <span>Available time</span>
                                      <select
                                        value={bookingPanel.selectedSlotId}
                                        onChange={(e) => updateBookingPanel(artist.id, { selectedSlotId: e.target.value, status: "" })}
                                      >
                                        {bookingPanel.slots.map((slot) => (
                                          <option key={slot.id} value={slot.id}>
                                            {formatSlot(slot)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  )}
                                  <label className="assistant-booking-field">
                                    <span>Note</span>
                                    <textarea
                                      rows={3}
                                      value={bookingPanel.notes}
                                      onChange={(e) => updateBookingPanel(artist.id, { notes: e.target.value })}
                                    />
                                  </label>
                                  <div className="assistant-booking-actions">
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      disabled={bookingPanel.isSubmitting || !bookingPanel.services.length || !bookingPanel.slots.length}
                                      onClick={() => void submitAssistantBooking(artist)}
                                    >
                                      {bookingPanel.isSubmitting ? "Requesting..." : "Request booking"}
                                    </button>
                                    <button type="button" className="btn-ghost" onClick={() => openProfile(artist)}>
                                      Profile
                                    </button>
                                  </div>
                                  {bookingPanel.status && (
                                    <p className="assistant-booking-status" role="status">
                                      {bookingPanel.status}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
                {message.quickReplies && (
                  <div className="assistant-quick-replies">
                    {message.quickReplies.map((reply) => (
                      <button type="button" key={reply} onClick={() => void ask(reply)}>
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
                {message.fullResultCount && message.fullResultQuery && (
                  <button className="assistant-full-results" type="button" onClick={() => openFullResults(message.fullResultQuery!)}>
                    View all {message.fullResultCount} artists
                  </button>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="assistant-thinking" aria-label="Finding artists">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
          <div className="assistant-suggestions" aria-label="Suggested assistant searches">
            {visiblePrompts.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => void ask(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
          <form className="assistant-compose" onSubmit={(e) => { e.preventDefault(); void ask(); }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Try: makeup near Sandton under R800"
              aria-label="Ask Glam SA assistant"
            />
            <button className="icon-btn assistant-voice-btn" type="button" onClick={startVoiceSearch} aria-label="Start voice search">
              <IconMic size={15} />
            </button>
            <button className="icon-btn asst-send-btn" type="submit" disabled={!draft.trim() || isThinking} aria-label="Send question">
              <IconSend size={16} />
            </button>
          </form>
          {voiceStatus && <div className="assistant-voice-status" role="status">{voiceStatus}</div>}
          <button className="assistant-feed-link" type="button" onClick={browseFeed}>
            Browse the full feed
          </button>
        </section>
      )}
      {showBookingAuthPopup && (
        <div className="booking-auth-backdrop" role="dialog" aria-modal="true" aria-label="Create an account to book" onClick={() => setShowBookingAuthPopup(false)}>
          <section className="booking-auth-popup" onClick={(e) => e.stopPropagation()}>
            <button className="booking-auth-close" type="button" onClick={() => setShowBookingAuthPopup(false)} aria-label="Close popup">
              <IconClose size={17} />
            </button>
            <div className="booking-auth-icon">
              <IconMessage size={22} />
            </div>
            <h2>Create an account to book</h2>
            <p>
              Booking requests are available after sign in so artists can confirm who you are and manage the appointment from Glam SA.
            </p>
            <div className="booking-auth-actions">
              <button
                className="btn-primary"
                type="button"
                onClick={() => { setShowBookingAuthPopup(false); setIsOpen(false); onNavigate("/login"); }}
              >
                Sign in / Join
              </button>
              <button className="btn-ghost" type="button" onClick={() => setShowBookingAuthPopup(false)}>
                Keep browsing
              </button>
            </div>
          </section>
        </div>
      )}
      {!isOpen && (
        <button className="assistant-launcher" type="button" onClick={() => setIsOpen(true)} aria-label="Open Glam SA assistant">
          <IconMessage size={19} />
          <span>Ask Glam</span>
        </button>
      )}
    </div>
  );
}

export default AssistantPanel;
