// Frontend representations of data returned by the Django API.
// Optional fields preserve compatibility with profiles created before newer migrations.
export type Post = {
  id: number;
  ownerId?: number;
  likesCount: number;
  whatsappNumber?: string;
  creator: string;
  handle: string;
  location: string;
  creatorLocation?: string;
  service: string;
  category: string;
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
  profilePhotoUrl?: string;
  bio?: string;
  serviceCategories?: string[];
  travelRadiusKm?: number;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  province?: string;
  city?: string;
  suburb?: string;
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
  isStaff?: boolean;
  isSuperuser?: boolean;
  rating?: number | null;
  reviewCount?: number;
  reviews?: Review[];
};

export type UserProfile = Pick<CurrentUser, "id" | "name" | "handle" | "accountType" | "profilePhotoUrl" | "bio" | "serviceCategories" | "travelRadiusKm" | "locationLabel"> & {
  posts: Post[];
  rating?: number | null;
  reviewCount?: number;
  reviews?: Review[];
};

export type Review = {
  id: number;
  rating: number;
  comment: string;
  authorName: string;
  createdAt: string;
};

export type Conversation = {
  userId: number;
  name: string;
  handle: string;
  lastMessage: string;
  createdAt: string;
  postService: string;
  unreadCount?: number;
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
  isCreator?: boolean;
  otherUserName: string;
  otherUserPhoto?: string;
  whatsappNumber?: string;
  serviceName: string;
  price: string;
  startsAt: string;
  endsAt: string;
  status: "requested" | "confirmed" | "declined" | "cancelled" | "completed";
  notes: string;
  postId?: number | null;
  postImageUrl?: string;
  createdAt: string;
  review?: { id: number; rating: number; comment: string } | null;
};

export type Message = {
  id: number;
  senderId: number;
  recipientId: number;
  body: string;
  createdAt: string;
  postService: string;
  isRead?: boolean;
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
  openSlotCount?: number;
};

export type NavItem = "Home" | "Discover" | "Messages" | "Saved" | "Upload";

export type Coordinates = {
  latitude: number;
  longitude: number;
};
