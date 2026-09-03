"""Database models for creator profiles, portfolio posts, and messages."""

from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    account_type = models.CharField(max_length=20, default="creator")
    whatsapp_number = models.CharField(max_length=30, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    location_label = models.CharField(max_length=120, blank=True)
    location_captured_at = models.DateTimeField(auto_now_add=True)

    def as_dict(self):
        return {
            "accountType": self.account_type,
            "whatsappNumber": self.whatsapp_number,
            "latitude": float(self.latitude),
            "longitude": float(self.longitude),
            "locationLabel": self.location_label,
        }


class Post(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="posts")
    creator = models.CharField(max_length=120)
    handle = models.CharField(max_length=80)
    location = models.CharField(max_length=120, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    service = models.CharField(max_length=120)
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
        payload = {
            "id": self.id,
            "ownerId": self.owner_id,
            "creator": self.creator,
            "handle": self.handle,
            "location": self.location,
            "service": self.service,
            "caption": self.caption,
            "imageUrl": self.image_url,
            "mediaUrl": media_url,
            "mediaType": self.media_type,
            "createdAt": self.created_at.isoformat(),
            "likesCount": self.likes_count,
        }
        if self.latitude is not None and self.longitude is not None:
            payload["latitude"] = float(self.latitude)
            payload["longitude"] = float(self.longitude)
        if distance_km is not None:
            payload["distanceKm"] = round(distance_km, 1)
        return payload


class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_messages")
    post = models.ForeignKey(Post, on_delete=models.SET_NULL, null=True, blank=True, related_name="messages")
    body = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
