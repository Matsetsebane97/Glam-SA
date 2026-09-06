import json
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.utils import timezone

from .models import AvailabilitySlot, Booking, Message, ServiceOffering, UserProfile


class BookingLogicTests(TestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username="client1", email="client1@example.com", password="password123", first_name="Nomvula"
        )
        UserProfile.objects.create(
            user=self.client_user,
            account_type="client",
            whatsapp_number="+27821112222",
            latitude=Decimal("-26.2041"),
            longitude=Decimal("28.0473"),
        )

        self.creator_user = User.objects.create_user(
            username="creator1", email="creator1@example.com", password="password123", first_name="Zola Hair"
        )
        UserProfile.objects.create(
            user=self.creator_user,
            account_type="creator",
            whatsapp_number="+27833334444",
            latitude=Decimal("-26.2041"),
            longitude=Decimal("28.0473"),
        )

        self.service = ServiceOffering.objects.create(
            owner=self.creator_user,
            name="Knotless Braids",
            price=Decimal("650.00"),
            duration_minutes=120,
            is_active=True,
        )

        now = timezone.now() + timedelta(days=1)
        self.slot = AvailabilitySlot.objects.create(
            owner=self.creator_user,
            starts_at=now.replace(hour=10, minute=0, second=0, microsecond=0),
            ends_at=now.replace(hour=12, minute=0, second=0, microsecond=0),
            is_available=True,
        )

        self.http_client = Client()

    def test_client_booking_creation_and_slot_locking(self):
        self.http_client.login(username="client1", password="password123")
        response = self.http_client.post(
            "/api/bookings/",
            data=json.dumps({
                "serviceId": self.service.id,
                "slotId": self.slot.id,
                "notes": "Prefers ombre color",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["status"], "requested")
        self.assertEqual(data["serviceName"], "Knotless Braids")
        self.assertEqual(data["price"], "650.00")

        # Verify slot is locked
        self.slot.refresh_from_db()
        self.assertFalse(self.slot.is_available)

        # Verify initial notification message was generated
        self.assertTrue(Message.objects.filter(recipient=self.creator_user).exists())

    def test_creator_confirms_booking(self):
        booking = Booking.objects.create(
            client=self.client_user,
            creator=self.creator_user,
            service_name=self.service.name,
            price=self.service.price,
            starts_at=self.slot.starts_at,
            ends_at=self.slot.ends_at,
            status="requested",
        )
        self.slot.is_available = False
        self.slot.save()

        # Creator logs in and confirms
        self.http_client.login(username="creator1", password="password123")
        response = self.http_client.patch(
            f"/api/bookings/{booking.id}/",
            data=json.dumps({"action": "confirm"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "confirmed")

        booking.refresh_from_db()
        self.assertEqual(booking.status, "confirmed")

    def test_creator_declines_booking_and_frees_slot(self):
        booking = Booking.objects.create(
            client=self.client_user,
            creator=self.creator_user,
            service_name=self.service.name,
            price=self.service.price,
            starts_at=self.slot.starts_at,
            ends_at=self.slot.ends_at,
            status="requested",
        )
        self.slot.is_available = False
        self.slot.save()

        self.http_client.login(username="creator1", password="password123")
        response = self.http_client.patch(
            f"/api/bookings/{booking.id}/",
            data=json.dumps({"action": "decline"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "declined")

        # Slot should be auto-released
        self.slot.refresh_from_db()
        self.assertTrue(self.slot.is_available)

    def test_client_cancels_booking_and_frees_slot(self):
        booking = Booking.objects.create(
            client=self.client_user,
            creator=self.creator_user,
            service_name=self.service.name,
            price=self.service.price,
            starts_at=self.slot.starts_at,
            ends_at=self.slot.ends_at,
            status="confirmed",
        )
        self.slot.is_available = False
        self.slot.save()

        self.http_client.login(username="client1", password="password123")
        response = self.http_client.patch(
            f"/api/bookings/{booking.id}/",
            data=json.dumps({"action": "cancel"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "cancelled")

        # Slot should be freed
        self.slot.refresh_from_db()
        self.assertTrue(self.slot.is_available)

    def test_update_profile_account_type(self):
        self.http_client.login(username="client1", password="password123")
        response = self.http_client.patch(
            "/api/auth/profile/",
            data=json.dumps({
                "name": "Nomvula Updated",
                "accountType": "creator",
                "whatsappNumber": "+27821112222",
                "locationLabel": "Rosebank",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["accountType"], "creator")
        self.client_user.profile.refresh_from_db()
        self.assertEqual(self.client_user.profile.account_type, "creator")

