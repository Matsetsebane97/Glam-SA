"""Database models for creator profiles, portfolio posts, and messages."""

from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    account_type = models.CharField(max_length=20, default="creator")
    whatsapp_number = models.CharField(max_length=30, blank=True)
    profile_photo_url = models.TextField(blank=True)
    bio = models.TextField(blank=True, max_length=600)
    service_categories = models.CharField(max_length=180, blank=True)
    travel_radius_km = models.PositiveIntegerField(default=15)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    location_label = models.CharField(max_length=120, blank=True)
    location_captured_at = models.DateTimeField(auto_now_add=True)
    email_notifications = models.BooleanField(default=True)
    whatsapp_notifications = models.BooleanField(default=True)

    def as_dict(self):
        return {
            "accountType": self.account_type,
            "whatsappNumber": self.whatsapp_number,
            "profilePhotoUrl": self.profile_photo_url,
            "bio": self.bio,
            "serviceCategories": [c for c in self.service_categories.split(",") if c],
            "travelRadiusKm": self.travel_radius_km,
            "latitude": float(self.latitude),
            "longitude": float(self.longitude),
            "locationLabel": self.location_label,
            "emailNotifications": self.email_notifications,
            "whatsappNotifications": self.whatsapp_notifications,
        }

    class Meta:
        ordering = ["-id"]


class ServiceOffering(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="service_offerings")
    post = models.OneToOneField("Post", on_delete=models.CASCADE, null=True, blank=True, related_name="service_offering")
    name = models.CharField(max_length=120)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_minutes = models.PositiveIntegerField(default=60)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]


class AvailabilitySlot(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="availability_slots")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ["starts_at"]
        constraints = [
            models.UniqueConstraint(fields=["owner", "starts_at", "ends_at"], name="unique_owner_availability_window"),
        ]



class SearchSynonym(models.Model):
    """Store synonyms for search terms, e.g., "hairstyle" ↔ "haircut"."""
    term = models.CharField(max_length=80, unique=True)
    synonyms = models.JSONField(default=list, blank=True)

    def __str__(self):
        return self.term


class Booking(models.Model):
    STATUS_CHOICES = [
        ("requested", "Requested"),
        ("confirmed", "Confirmed"),
        ("declined", "Declined"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    ]

    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookings_made")
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookings_received")
    post = models.ForeignKey('Post', on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    service_name = models.CharField(max_length=120)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="requested")
    notes = models.TextField(blank=True, max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_messages")
    post = models.ForeignKey('Post', on_delete=models.SET_NULL, null=True, blank=True, related_name="messages")
    body = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

class Post(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="posts")
    creator = models.CharField(max_length=120)
    handle = models.CharField(max_length=80)
    location = models.CharField(max_length=120, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    service = models.CharField(max_length=120)
    category = models.CharField(max_length=80, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    duration_minutes = models.PositiveIntegerField(default=60)
    caption = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    media_file = models.FileField(upload_to="work/", blank=True)
    media_type = models.CharField(max_length=20, blank=True)
    likes_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def as_dict(self, distance_km=None):
        media_url = self.media_file.url if self.media_file else self.image_url
        owner_profile = getattr(self.owner, "profile", None) if self.owner_id else None
        payload = {
            "id": self.id,
            "ownerId": self.owner_id,
            "creator": self.creator,
            "handle": self.handle,
            "location": self.location,
            "service": self.service,
            "category": self.category,
            "price": str(self.price),
            "durationMinutes": self.duration_minutes,
            "caption": self.caption,
            "imageUrl": self.image_url,
            "mediaUrl": media_url,
            "mediaType": self.media_type,
            "createdAt": self.created_at.isoformat(),
            "likesCount": self.likes_count,
            "whatsappNumber": owner_profile.whatsapp_number if owner_profile else "",
        }
        if self.latitude is not None and self.longitude is not None:
            payload["latitude"] = float(self.latitude)
            payload["longitude"] = float(self.longitude)
        if distance_km is not None:
            payload["distanceKm"] = round(distance_km, 1)
        return payload
