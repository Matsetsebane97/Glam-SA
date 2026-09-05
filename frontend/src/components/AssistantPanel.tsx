import { useMemo, useState } from "react";
import { createBooking, getAvailability, getNearbyArtists, getServices } from "../api";
import { IconBookmark, IconChevronRight, IconClose, IconMessage, IconMic, IconPin, IconSend, IconWhatsApp } from "./Icons";
import type { AvailabilitySlot, CurrentUser, NearbyArtist, Post, ServiceOffering } from "../types";
import { formatDuration } from "../utils/geo";
import { whatsappUrl } from "../utils/whatsapp";

type AssistantPanelProps = {
  posts: Post[];
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
  onSearch: (query: string) => void;
};

type ChatMessage = {
  id: number;
  author: "assistant" | "user";
  text: string;
  matches?: ArtistMatch[];
  quickReplies?: string[];
  fullResultCount?: number;
  fullResultQuery?: string;
};

type ArtistMatch = {
  id: string;
  ownerId?: number;
  postId?: number;
  preferredWeekday?: number;
  preferredDateLabel?: string;
  name: string;
  handle: string;
  service?: string;
  category?: string;
  location?: string;
  whatsappNumber?: string;
  distanceKm?: number;
  minPrice?: number;
  maxPrice?: number;
  resultCount: number;
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

const categoryAliases: Record<string, string> = {
  braid: "Hair",
  braids: "Hair",
  hair: "Hair",
  nail: "Nails",
  nails: "Nails",
  manicure: "Nails",
  pedicure: "Nails",
  barber: "Barbering",
  barbers: "Barbering",
  barbering: "Barbering",
  makeup: "Makeup",
  facial: "Skincare",
  skincare: "Skincare",
  tattoo: "Tattoos",
  tattoos: "Tattoos",
};

const assistantSuggestions = ["Hair near me", "Nails under R500", "Makeup in Sandton", "Find artist Naledi"];
const fallbackSuggestions = ["Try a broader budget", "Search another area", "Browse the full feed"];
const recentSearchesKey = "glamAssistantRecentSearches";
const savedArtistsKey = "glamAssistantSavedArtists";
const searchStopWords = new Set(["a", "an", "appointment", "artist", "artists", "beauty", "book", "booking", "find", "for", "in", "look", "looks", "me", "near", "nearby", "next", "please", "session", "show", "the", "than", "this", "to", "under", "below", "less"]);
const speechRecognitionName = "webkitSpeechRecognition";
const weekdayAliases: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
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

type ParsedQuestion = {
  category?: string;
  location?: string;
  maxPrice?: number;
  searchTerms: string[];
  wantsNearby: boolean;
  preferredWeekday?: number;
  preferredDateLabel?: string;
};

function parseQuestion(question: string): ParsedQuestion {
  const normalizedQuestion = question.trim().toLowerCase();
  const categoryToken = normalizedQuestion.match(/\b(braids?|hair|nails?|manicure|pedicure|barber(?:ing|s)?|makeup|facials?|skincare|tattoos?)\b/);
  const priceMatch = normalizedQuestion.match(/(?:under|below|less than)\s*r?\s*(\d+(?:\.\d+)?)/);
  const locationMatch = normalizedQuestion.match(/\bnear\s+(?!me\b)([a-z][a-z\s-]*?)(?=\s+(?:under|below|less than)\b|$)/);
  const weekdayMatch = normalizedQuestion.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  const category = categoryToken ? categoryAliases[categoryToken[1]] : getFuzzyCategory(normalizedQuestion);
  const wantsNearby = /\b(near me|nearby|close to me|around me)\b/.test(normalizedQuestion);
  const searchTerms = normalizedQuestion
    .replace(categoryToken?.[0] || "", "")
    .replace(priceMatch?.[0] || "", "")
    .replace(locationMatch?.[0] || "", "")
    .replace(weekdayMatch?.[0] || "", "")
    .replace(/\b(today|tomorrow|weekend)\b/g, "")
    .replace(/\b(near me|nearby|close to me|around me)\b/g, "")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term && !searchStopWords.has(term));

  return {
    category,
    location: locationMatch?.[1].trim(),
    maxPrice: priceMatch ? Number(priceMatch[1]) : undefined,
    searchTerms,
    wantsNearby,
    preferredWeekday: weekdayMatch ? weekdayAliases[weekdayMatch[1]] : undefined,
    preferredDateLabel: weekdayMatch?.[1],
  };
}

function getEditDistance(firstValue: string, secondValue: string) {
  const distances = Array.from({ length: firstValue.length + 1 }, (_, firstIndex) =>
    Array.from({ length: secondValue.length + 1 }, (_, secondIndex) => firstIndex + secondIndex),
  );

  for (let firstIndex = 0; firstIndex <= firstValue.length; firstIndex += 1) distances[firstIndex][0] = firstIndex;
  for (let secondIndex = 0; secondIndex <= secondValue.length; secondIndex += 1) distances[0][secondIndex] = secondIndex;

  for (let firstIndex = 1; firstIndex <= firstValue.length; firstIndex += 1) {
    for (let secondIndex = 1; secondIndex <= secondValue.length; secondIndex += 1) {
      const cost = firstValue[firstIndex - 1] === secondValue[secondIndex - 1] ? 0 : 1;
      distances[firstIndex][secondIndex] = Math.min(
        distances[firstIndex - 1][secondIndex] + 1,
        distances[firstIndex][secondIndex - 1] + 1,
        distances[firstIndex - 1][secondIndex - 1] + cost,
      );
    }
  }

  return distances[firstValue.length][secondValue.length];
}

function isFuzzyMatch(term: string, candidate: string) {
  if (!term || !candidate) return false;
  if (candidate.includes(term) || term.includes(candidate)) return true;
  const maxDistance = term.length > 6 ? 2 : 1;
  return Math.abs(candidate.length - term.length) <= maxDistance && getEditDistance(term, candidate) <= maxDistance;
}

function textMatchesTerm(text: string, term: string) {
  const normalizedText = text.toLowerCase();
  if (normalizedText.includes(term)) return true;
  return normalizedText.split(/[^a-z0-9]+/).some((word) => isFuzzyMatch(term, word));
}

function getFuzzyCategory(normalizedQuestion: string) {
  const terms = normalizedQuestion.split(/[^a-z0-9]+/).filter(Boolean);
  const categoryAlias = Object.entries(categoryAliases).find(([alias]) =>
    terms.some((term) => isFuzzyMatch(term, alias)),
  );

  return categoryAlias?.[1];
}

function priceFromPost(post: Post) {
  const price = Number(post.price);
  return Number.isFinite(price) ? price : undefined;
}

function formatPrice(price?: number) {
  if (price == null) return "";
  return `R${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
}

function formatPriceRange(artist: ArtistMatch) {
  if (artist.minPrice == null) return "";
  if (artist.maxPrice != null && artist.maxPrice !== artist.minPrice) {
    return `${formatPrice(artist.minPrice)}-${formatPrice(artist.maxPrice)}`;
  }
  return formatPrice(artist.minPrice);
}

function formatDistance(distanceKm?: number) {
  if (distanceKm == null) return "";
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`;
}

function formatSlot(slot: AvailabilitySlot) {
  return new Date(slot.startsAt).toLocaleString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function createBookingNote(artist: ArtistMatch) {
  const serviceText = artist.service || artist.category || "a beauty service";
  return `Hi ${artist.name}, I found you on Glam SA and would like to request a booking for ${serviceText}.`;
}

function selectBestService(services: ServiceOffering[], artist: ArtistMatch) {
  const activeServices = services.filter((service) => service.isActive);
  const normalizedService = artist.service?.toLowerCase();
  const normalizedCategory = artist.category?.toLowerCase();
  const match = activeServices.find((service) => {
    const normalizedName = service.name.toLowerCase();
    return Boolean(
      normalizedService &&
        (normalizedName.includes(normalizedService) || normalizedService.includes(normalizedName)),
    ) || Boolean(normalizedCategory && normalizedName.includes(normalizedCategory));
  });

  return match || activeServices[0];
}

function sortSlotsByPreference(slots: AvailabilitySlot[], preferredWeekday?: number) {
  if (preferredWeekday == null) return slots;
  return [...slots].sort((leftSlot, rightSlot) => {
    const leftMatches = new Date(leftSlot.startsAt).getDay() === preferredWeekday;
    const rightMatches = new Date(rightSlot.startsAt).getDay() === preferredWeekday;
    if (leftMatches === rightMatches) return leftSlot.startsAt.localeCompare(rightSlot.startsAt);
    return leftMatches ? -1 : 1;
  });
}

function withBookingPreference(artists: ArtistMatch[], parsedQuestion: ParsedQuestion) {
  return artists.map((artist) => ({
    ...artist,
    preferredWeekday: parsedQuestion.preferredWeekday,
    preferredDateLabel: parsedQuestion.preferredDateLabel,
  }));
}

function getArtistMatches(posts: Post[]): ArtistMatch[] {
  const artistsByKey = new Map<string, ArtistMatch>();

  posts.forEach((post) => {
    const key = post.ownerId ? `owner-${post.ownerId}` : `handle-${post.handle.toLowerCase()}`;
    const existingArtist = artistsByKey.get(key);
    const price = priceFromPost(post);

    if (existingArtist) {
      artistsByKey.set(key, {
        ...existingArtist,
        postId: existingArtist.postId || post.id,
        whatsappNumber: existingArtist.whatsappNumber || post.whatsappNumber,
        minPrice: price == null ? existingArtist.minPrice : Math.min(existingArtist.minPrice ?? price, price),
        maxPrice: price == null ? existingArtist.maxPrice : Math.max(existingArtist.maxPrice ?? price, price),
        resultCount: existingArtist.resultCount + 1,
      });
      return;
    }

    artistsByKey.set(key, {
      id: key,
      ownerId: post.ownerId,
      postId: post.id,
      name: post.creator,
      handle: post.handle,
      service: post.service,
      category: post.category,
      location: post.location,
      whatsappNumber: post.whatsappNumber,
      minPrice: price,
      maxPrice: price,
      resultCount: 1,
    });
  });

  return Array.from(artistsByKey.values());
}

function matchesQuestion(post: Post, parsedQuestion: ParsedQuestion) {
  const matchesCategory = !parsedQuestion.category || post.category.toLowerCase() === parsedQuestion.category.toLowerCase();
  const matchesLocation = !parsedQuestion.location || textMatchesTerm(post.location, parsedQuestion.location);
  const matchesPrice = parsedQuestion.maxPrice == null || Number(post.price) <= parsedQuestion.maxPrice;
  const searchableText = [post.creator, post.handle, post.location, post.service, post.category, post.caption]
    .join(" ")
    .toLowerCase();
  const matchesSearch = parsedQuestion.searchTerms.every((term) => textMatchesTerm(searchableText, term));

  return matchesCategory && matchesLocation && matchesPrice && matchesSearch;
}

function mergeNearbyArtist(artist: NearbyArtist, postMatch?: ArtistMatch): ArtistMatch {
  return {
    id: `owner-${artist.id}`,
    ownerId: artist.id,
    name: artist.name,
    handle: artist.handle,
    service: postMatch?.service,
    postId: postMatch?.postId,
    category: postMatch?.category,
    location: artist.locationLabel || postMatch?.location,
    whatsappNumber: artist.whatsappNumber || postMatch?.whatsappNumber,
    distanceKm: artist.distanceKm,
    minPrice: postMatch?.minPrice,
    maxPrice: postMatch?.maxPrice,
    resultCount: postMatch?.resultCount || artist.postCount,
  };
}

async function answerQuestion(question: string, posts: Post[], currentUser: CurrentUser | null): Promise<Pick<ChatMessage, "text" | "matches" | "quickReplies" | "fullResultCount" | "fullResultQuery">> {
  const parsedQuestion = parseQuestion(question);
  const matchingPosts = posts.filter((post) => {
    return matchesQuestion(post, parsedQuestion);
  });

  if (parsedQuestion.wantsNearby) {
    if (currentUser?.latitude == null || currentUser.longitude == null) {
      return {
        text: "I need your profile location before I can show artists near you.",
        quickReplies: ["Makeup in Sandton", "Nails under R500", "Browse the full feed"],
      };
    }

    try {
      const nearbyArtists = await getNearbyArtists({
        latitude: currentUser.latitude,
        longitude: currentUser.longitude,
        radius: 50,
      });
      const postMatchesByOwnerId = new Map(
        getArtistMatches(matchingPosts).flatMap((artist) => artist.ownerId ? [[artist.ownerId, artist]] : []),
      );
      const nearbyMatches = nearbyArtists
        .map((artist) => mergeNearbyArtist(artist, postMatchesByOwnerId.get(artist.id)))
        .filter((artist) => {
          const matchesCategory = !parsedQuestion.category || artist.category === parsedQuestion.category || postMatchesByOwnerId.has(artist.ownerId || 0);
          const matchesPrice = parsedQuestion.maxPrice == null || artist.minPrice == null || artist.minPrice <= parsedQuestion.maxPrice;
          const searchableText = [artist.name, artist.handle, artist.service, artist.category, artist.location].join(" ").toLowerCase();
          return matchesCategory && matchesPrice && parsedQuestion.searchTerms.every((term) => textMatchesTerm(searchableText, term));
        });

      if (nearbyMatches.length > 0) {
        return {
          text: `Here are ${Math.min(nearbyMatches.length, 3)} nearby artist${nearbyMatches.length === 1 ? "" : "s"} within 50 km.`,
          matches: withBookingPreference(nearbyMatches.slice(0, 3), parsedQuestion),
          fullResultCount: nearbyMatches.length > 3 ? nearbyMatches.length : undefined,
          fullResultQuery: question,
        };
      }
    } catch {
      return { text: "I could not load nearby artists right now. Try a location search instead.", quickReplies: fallbackSuggestions };
    }
  }

  if (matchingPosts.length === 0) {
    return {
      text: "I could not find a matching artist yet. Try a broader location, category, or budget.",
      quickReplies: fallbackSuggestions,
    };
  }

  const allArtistMatches = getArtistMatches(matchingPosts);
  const matches = withBookingPreference(allArtistMatches.slice(0, 3), parsedQuestion);
  const suffix = matchingPosts.length > matches.length ? ` I found ${matchingPosts.length} matching looks in total.` : "";
  return {
    text: `Here are ${matches.length} matching artist${matches.length === 1 ? "" : "s"}.${suffix}`,
    matches,
    fullResultCount: allArtistMatches.length > 3 ? allArtistMatches.length : undefined,
    fullResultQuery: question,
  };
}

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
    return [...recentSearches, ...assistantSuggestions.filter((suggestion) => !recentSearches.includes(suggestion))].slice(0, 4);
  }, [recentSearches]);

  const saveRecentSearch = (question: string) => {
    const nextSearches = [question, ...recentSearches.filter((search) => search.toLowerCase() !== question.toLowerCase())].slice(0, 3);
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
      ? savedArtistIds.filter((savedArtistId) => savedArtistId !== artistId)
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
    recognition.onend = () => setVoiceStatus((status) => status === "Listening..." ? "" : status);
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
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: Date.now(), author: "user", text: question },
    ]);
    setDraft("");
    setIsThinking(true);

    const answer = await answerQuestion(question, posts, currentUser);
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: Date.now() + 1, author: "assistant", ...answer },
    ]);
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
        const activeServices = nextServices.filter((service) => service.isActive);
        const availableSlots = sortSlotsByPreference(
          nextSlots.filter((slot) => slot.isAvailable),
          artist.preferredWeekday,
        );
        const bestService = selectBestService(activeServices, artist);
        const hasPreferredSlot = artist.preferredWeekday == null || availableSlots.some((slot) => new Date(slot.startsAt).getDay() === artist.preferredWeekday);
        updateBookingPanel(artist.id, {
          isLoading: false,
          services: activeServices,
          slots: availableSlots,
          selectedServiceId: String(bestService?.id || ""),
          selectedSlotId: String(availableSlots[0]?.id || ""),
          status: activeServices.length && availableSlots.length
            ? hasPreferredSlot ? "" : `No ${artist.preferredDateLabel} slot yet, so I selected the next open time.`
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
            <div>
              <strong>Glam SA assistant</strong>
              <span>Discovery help</span>
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
                      return (
                        <article className="assistant-artist-card" key={artist.id}>
                          {(() => {
                            const savedArtistId = artist.ownerId ? `owner-${artist.ownerId}` : artist.id;
                            const isSaved = savedArtistIds.includes(savedArtistId);
                            return (
                              <>
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
                              <span>{[artist.service || artist.category, priceRange].filter(Boolean).join(" - ") || `${artist.resultCount} matching look${artist.resultCount === 1 ? "" : "s"}`}</span>
                              {(artist.location || artist.distanceKm != null) && (
                                <span className="assistant-artist-location">
                                  <IconPin size={11} />
                                  {[artist.location, formatDistance(artist.distanceKm)].filter(Boolean).join(" - ")}
                                </span>
                              )}
                            </span>
                          </button>
                          <div className="assistant-artist-actions">
                            <button type="button" disabled={!artist.ownerId} onClick={() => openProfile(artist)}>Profile</button>
                            <button type="button" disabled={!artist.ownerId} onClick={() => openBooking(artist)}>Book</button>
                            <button type="button" className={isSaved ? "saved" : ""} onClick={() => toggleSavedArtist(artist)}>
                              <IconBookmark size={13} fill={isSaved ? "currentColor" : undefined} />
                              {isSaved ? "Saved" : "Save"}
                            </button>
                            {messageHref ? (
                              <a href={messageHref} target="_blank" rel="noreferrer" aria-label={`Message ${artist.name} on WhatsApp`} onClick={() => setIsOpen(false)}>
                                <IconWhatsApp size={14} /> Message
                              </a>
                            ) : (
                              <button type="button" disabled>Message</button>
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
                                        onChange={(event) => updateBookingPanel(artist.id, { selectedServiceId: event.target.value, status: "" })}
                                      >
                                        {bookingPanel.services.map((service) => (
                                          <option key={service.id} value={service.id}>
                                            {service.name} - R {service.price} - {formatDuration(service.durationMinutes)}
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
                                        onChange={(event) => updateBookingPanel(artist.id, { selectedSlotId: event.target.value, status: "" })}
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
                                      onChange={(event) => updateBookingPanel(artist.id, { notes: event.target.value })}
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
                              </>
                            );
                          })()}
                        </article>
                      );
                    })}
                  </div>
                )}
                {message.quickReplies && (
                  <div className="assistant-quick-replies">
                    {message.quickReplies.map((reply) => (
                      <button type="button" key={reply} onClick={() => void ask(reply)}>{reply}</button>
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
            {isThinking && <div className="assistant-message"><span>Finding artists...</span></div>}
          </div>
          <div className="assistant-suggestions" aria-label="Suggested assistant searches">
            {visiblePrompts.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => void ask(suggestion)}>{suggestion}</button>
            ))}
          </div>
          <form className="assistant-compose" onSubmit={(event) => { event.preventDefault(); ask(); }}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Try: makeup near Sandton under R800"
              aria-label="Ask Glam SA assistant"
            />
            <button className="icon-btn assistant-voice-btn" type="button" onClick={startVoiceSearch} aria-label="Start voice search">
              <IconMic size={15} />
            </button>
            <button className="icon-btn" type="submit" disabled={!draft.trim() || isThinking} aria-label="Send question">
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
          <section className="booking-auth-popup" onClick={(event) => event.stopPropagation()}>
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
              <button className="btn-primary" type="button" onClick={() => { setShowBookingAuthPopup(false); setIsOpen(false); onNavigate("/login"); }}>
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
