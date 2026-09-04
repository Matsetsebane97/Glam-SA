// Centralizes browser requests so pages share one API contract.
import type { AvailabilitySlot, Booking, Conversation, Coordinates, CurrentUser, Message, NearbyArtist, Post, ServiceOffering, UserProfile } from "./types";

type CurrentUserResponse = {
  authenticated: boolean;
  id?: number;
  name?: string;
  handle?: string;
  accountType?: "creator" | "client";
  whatsappNumber?: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
};

type PostQuery = Coordinates & {
  radius?: number;
};

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const response = await fetch("/api/auth/me/");
  if (!response.ok) throw new Error("Unable to load current user.");

  const data = (await response.json()) as CurrentUserResponse;
  if (!data.authenticated || !data.name || !data.handle) return null;

  return {
    id: data.id,
    name: data.name,
    handle: data.handle,
    accountType: data.accountType,
    whatsappNumber: data.whatsappNumber,
    latitude: data.latitude,
    longitude: data.longitude,
    locationLabel: data.locationLabel,
  };
};

export const logout = async (): Promise<void> => {
  const response = await fetch("/api/auth/logout/", { method: "POST" });
  if (!response.ok) throw new Error("Unable to log out.");
};

export const updateProfile = async (payload: {
  name: string;
  whatsappNumber: string;
  locationLabel: string;
}): Promise<CurrentUser> => {
  const response = await fetch("/api/auth/profile/", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as CurrentUser & { error?: string };
  if (!response.ok || !data.name || !data.handle) {
    throw new Error(data.error || "Unable to update your profile.");
  }
  return data;
};

export const getCategories = async (): Promise<string[]> => {
  const response = await fetch("/api/categories/");
  if (!response.ok) throw new Error("Unable to load categories.");

  const data = (await response.json()) as { categories: string[] };
  return data.categories;
};

export const getPosts = async (query?: PostQuery): Promise<Post[]> => {
  const params = new URLSearchParams();
  if (query?.latitude != null) params.set("latitude", String(query.latitude));
  if (query?.longitude != null) params.set("longitude", String(query.longitude));
  if (query?.radius != null) params.set("radius", String(query.radius));

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`/api/posts/${suffix}`);
  if (!response.ok) throw new Error("Unable to load community posts.");

  const data = (await response.json()) as { posts: Post[] };
  return data.posts;
};

export const getNearbyArtists = async (query: PostQuery): Promise<NearbyArtist[]> => {
  const params = new URLSearchParams({
    latitude: String(query.latitude),
    longitude: String(query.longitude),
  });
  if (query.radius != null) params.set("radius", String(query.radius));

  const response = await fetch(`/api/artists/nearby/?${params.toString()}`);
  if (!response.ok) throw new Error("Unable to load nearby artists.");

  const data = (await response.json()) as { artists: NearbyArtist[] };
  return data.artists;
};

export const getMyPosts = async (): Promise<Post[]> => {
  const response = await fetch("/api/posts/mine/");
  if (!response.ok) throw new Error("Unable to load your posts.");

  const data = (await response.json()) as { posts: Post[] };
  return data.posts;
};

export const getUserProfile = async (userId: number): Promise<UserProfile> => {
  const response = await fetch(`/api/users/${userId}/`);
  if (!response.ok) throw new Error("Unable to load this profile.");
  return (await response.json()) as UserProfile;
};

export const getServices = async (ownerId?: number): Promise<ServiceOffering[]> => {
  const response = await fetch(ownerId ? `/api/users/${ownerId}/services/` : "/api/services/");
  if (!response.ok) throw new Error("Unable to load services.");
  return ((await response.json()) as { services: ServiceOffering[] }).services;
};

export const saveService = async (payload: { id?: number; name: string; price: string; durationMinutes: number }): Promise<ServiceOffering> => {
  const response = await fetch(payload.id ? `/api/services/${payload.id}/` : "/api/services/", {
    method: payload.id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as ServiceOffering & { error?: string };
  if (!response.ok) throw new Error(data.error || "Unable to save service.");
  return data;
};

export const deleteService = async (serviceId: number): Promise<void> => {
  const response = await fetch(`/api/services/${serviceId}/`, { method: "DELETE" });
  if (!response.ok) throw new Error("Unable to delete service.");
};

export const getAvailability = async (ownerId?: number): Promise<AvailabilitySlot[]> => {
  const response = await fetch(ownerId ? `/api/users/${ownerId}/availability/` : "/api/availability/");
  if (!response.ok) throw new Error("Unable to load availability.");
  return ((await response.json()) as { slots: AvailabilitySlot[] }).slots;
};

export const addAvailability = async (startsAt: string, endsAt: string): Promise<AvailabilitySlot> => {
  const response = await fetch("/api/availability/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startsAt, endsAt }),
  });
  const data = (await response.json().catch(() => ({}))) as AvailabilitySlot & { error?: string };
  if (!response.ok) throw new Error(data.error || "Unable to add availability.");
  return data;
};

export const deleteAvailability = async (slotId: number): Promise<void> => {
  const response = await fetch(`/api/availability/${slotId}/`, { method: "DELETE" });
  if (!response.ok) throw new Error("Unable to remove availability.");
};

export const createBooking = async (payload: { serviceId: number; slotId: number; postId?: number; notes?: string }): Promise<Booking> => {
  const response = await fetch("/api/bookings/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as Booking & { error?: string };
  if (!response.ok) throw new Error(data.error || "Unable to request booking.");
  return data;
};

export const updatePost = async (
  postId: number,
  payload: { service?: string; caption?: string; location?: string },
): Promise<Post> => {
  const response = await fetch(`/api/posts/${postId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || "Unable to update post.");
  }

  return (await response.json()) as Post;
};

export const deletePost = async (postId: number): Promise<void> => {
  const response = await fetch(`/api/posts/${postId}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || "Unable to delete post.");
  }
};

export const setPostLike = async (postId: number, isLiked: boolean): Promise<number> => {
  const response = await fetch(`/api/posts/${postId}/like/`, { method: isLiked ? "POST" : "DELETE" });
  const data = (await response.json().catch(() => ({}))) as { likesCount?: number; error?: string };
  if (!response.ok || data.likesCount == null) throw new Error(data.error || "Unable to update like.");
  return data.likesCount;
};

export const getConversations = async (): Promise<Conversation[]> => {
  const response = await fetch("/api/messages/");
  if (!response.ok) throw new Error("Unable to load your messages.");
  const data = (await response.json()) as { conversations: Conversation[] };
  return data.conversations;
};

export const getMessages = async (userId: number): Promise<Message[]> => {
  const response = await fetch(`/api/messages/${userId}/`);
  if (!response.ok) throw new Error("Unable to load this conversation.");
  const data = (await response.json()) as { messages: Message[] };
  return data.messages;
};

export const sendMessage = async (payload: { recipientId: number; body: string; postId?: number }): Promise<Message> => {
  const response = await fetch("/api/messages/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as Message & { error?: string };
  if (!response.ok) throw new Error(data.error || "Unable to send message.");
  return data;
};
