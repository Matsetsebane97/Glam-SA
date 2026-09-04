// Frontend representations of data returned by the Django API.
export type Post = {
  id: number;
  ownerId?: number;
  likesCount: number;
  whatsappNumber?: string;
  creator: string;
  handle: string;
  location: string;
  service: string;
  price: string;
  durationMinutes: number;
  caption: string;
  imageUrl: string;
  mediaUrl: string;
  mediaType: string;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
};

export type CurrentUser = {
  id?: number;
  name: string;
  handle: string;
  accountType?: "creator" | "client";
  whatsappNumber?: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
};

export type UserProfile = Pick<CurrentUser, "id" | "name" | "handle" | "accountType" | "locationLabel"> & {
  posts: Post[];
};

export type Conversation = {
  userId: number;
  name: string;
  handle: string;
  lastMessage: string;
  createdAt: string;
  postService: string;
};

export type ServiceOffering = {
  id: number;
  name: string;
  price: string;
  durationMinutes: number;
  isActive: boolean;
};

export type AvailabilitySlot = {
  id: number;
  startsAt: string;
  endsAt: string;
  isAvailable: boolean;
};

export type Booking = {
  id: number;
  clientId: number;
  creatorId: number;
  otherUserName: string;
  serviceName: string;
  price: string;
  startsAt: string;
  endsAt: string;
  status: "requested" | "confirmed" | "declined" | "cancelled";
  notes: string;
  createdAt: string;
};

export type Message = {
  id: number;
  senderId: number;
  recipientId: number;
  body: string;
  createdAt: string;
  postService: string;
};

export type NearbyArtist = {
  id: number;
  name: string;
  handle: string;
  latitude: number;
  longitude: number;
  locationLabel: string;
  whatsappNumber?: string;
  distanceKm: number;
  postCount: number;
};

export type NavItem = "Home" | "Discover" | "Messages" | "Upload";

export type Coordinates = {
  latitude: number;
  longitude: number;
};
