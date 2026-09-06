"""HTTP handlers for authentication, discovery, portfolios, messaging, and search functionality."""

import json
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.db import transaction
from django.db.models import Count, F, Q
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .geo import haversine_km, parse_optional_coordinate
from .category_model import classifier
from .models import AvailabilitySlot, Booking, Message, Post, ServiceOffering, UserProfile
from .storage import is_configured, upload_media


CATEGORIES = ["For you", "Hair", "Nails", "Barbering", "Makeup", "Skincare", "Tattoos"]


def _parse_coordinate(value, name):
    try:
        coordinate = Decimal(str(value))
    except (InvalidOperation, TypeError):
        return None, JsonResponse({"error": f"A valid {name} is required."}, status=400)

    if name == "latitude" and not (-90 <= coordinate <= 90):
        return None, JsonResponse({"error": "Latitude must be between -90 and 90."}, status=400)
    if name == "longitude" and not (-180 <= coordinate <= 180):
        return None, JsonResponse({"error": "Longitude must be between -180 and 180."}, status=400)

    return coordinate, None


@csrf_exempt
def signup(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Request body must be valid JSON."}, status=400)

    name = payload.get("name", "").strip()
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")
    location_label = payload.get("locationLabel", "").strip()
    account_type = payload.get("accountType", "creator").strip().lower()
    whatsapp_number = payload.get("whatsappNumber", "").strip()
    profile_photo_url = str(payload.get("profilePhotoUrl") or "").strip()
    bio = str(payload.get("bio") or "").strip()
    service_categories = payload.get("serviceCategories") or []
    travel_radius_km = payload.get("travelRadiusKm", 15)

    if not name or not email or len(password) < 8:
        return JsonResponse({"error": "Name, email, and an 8-character password are required."}, status=400)
    if account_type not in ("creator", "client"):
        return JsonResponse({"error": "Choose whether you are signing up as a creator or client."}, status=400)
    if account_type == "creator" and not whatsapp_number:
        return JsonResponse({"error": "A WhatsApp number is required for creator accounts."}, status=400)
    if profile_photo_url and not profile_photo_url.startswith("data:image/"):
        return JsonResponse({"error": "Profile photo must be an image file."}, status=400)
    if profile_photo_url and len(profile_photo_url) > 2_000_000:
        return JsonResponse({"error": "Profile photo must be smaller than 2 MB."}, status=400)
    if len(bio) > 600:
        return JsonResponse({"error": "Creator bio must be 600 characters or fewer."}, status=400)
    if not isinstance(service_categories, list):
        return JsonResponse({"error": "Choose valid service categories."}, status=400)
    allowed_categories = [category for category in CATEGORIES if category != "For you"]
    normalized_categories = []
    for category in service_categories:
        category_name = str(category).strip()
        if category_name not in allowed_categories:
            return JsonResponse({"error": "Choose valid service categories."}, status=400)
        if category_name not in normalized_categories:
            normalized_categories.append(category_name)
    try:
        travel_radius_km = int(travel_radius_km)
    except (TypeError, ValueError):
        return JsonResponse({"error": "Travel radius must be a valid number."}, status=400)
    if travel_radius_km < 0 or travel_radius_km > 250:
        return JsonResponse({"error": "Travel radius must be between 0 and 250 km."}, status=400)

    latitude, latitude_error = _parse_coordinate(payload.get("latitude"), "latitude")
    if latitude_error:
        return latitude_error

    longitude, longitude_error = _parse_coordinate(payload.get("longitude"), "longitude")
    if longitude_error:
        return longitude_error

    from django.contrib.auth.models import User

    if User.objects.filter(username=email).exists():
        return JsonResponse({"error": "An account with that email already exists."}, status=409)

    user = User.objects.create_user(username=email, email=email, password=password, first_name=name)
    UserProfile.objects.create(
        user=user,
        account_type=account_type,
        whatsapp_number=whatsapp_number,
        profile_photo_url=profile_photo_url[:2_000_000],
        bio=bio[:600] if account_type == "creator" else "",
        service_categories=",".join(normalized_categories) if account_type == "creator" else "",
        travel_radius_km=travel_radius_km if account_type == "creator" else 0,
        latitude=latitude,
        longitude=longitude,
        location_label=location_label,
    )
    login(request, user)
    return JsonResponse({"message": "Your account is ready."}, status=201)


@csrf_exempt
def auth_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Request body must be valid JSON."}, status=400)
    email = payload.get("email", "").strip().lower()
    user = authenticate(request, username=email, password=payload.get("password", ""))
    if user is None:
        return JsonResponse({"error": "Email or password is incorrect."}, status=401)
    login(request, user)
    return JsonResponse({"message": "Welcome back."})


@csrf_exempt
def auth_logout(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed."}, status=405)
    logout(request)
    return JsonResponse({"message": "You have been logged out."})


def current_user(request):
    if not request.user.is_authenticated:
        return JsonResponse({"authenticated": False})
    payload = {
        "authenticated": True,
        "id": request.user.id,
        "name": request.user.get_full_name() or request.user.username,
        "handle": f"@{request.user.username.split('@')[0]}",
    }

    profile = getattr(request.user, "profile", None)
    if profile:
        payload.update(profile.as_dict())

    return JsonResponse(payload)


@csrf_exempt
def update_profile(request):
    if request.method != "PATCH":
        return JsonResponse({"error": "Method not allowed."}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to update your profile."}, status=401)

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Request body must be valid JSON."}, status=400)

    name = str(payload.get("name", "")).strip()
    if not name:
        return JsonResponse({"error": "Your name or brand name is required."}, status=400)
    if len(name) > 150:
        return JsonResponse({"error": "Your name must be 150 characters or fewer."}, status=400)

    profile = getattr(request.user, "profile", None)
    if profile is None:
        return JsonResponse({"error": "Your profile could not be found."}, status=404)

    request.user.first_name = name
    request.user.save(update_fields=["first_name"])
    profile.whatsapp_number = str(payload.get("whatsappNumber") or "").strip()[:30]
    profile.location_label = str(payload.get("locationLabel") or "").strip()[:120]
    
    update_fields = ["whatsapp_number", "location_label", "email_notifications", "whatsapp_notifications"]

    if "accountType" in payload and payload["accountType"] in ("creator", "client"):
        profile.account_type = payload["accountType"]
        update_fields.append("account_type")

    if "emailNotifications" in payload:
        profile.email_notifications = bool(payload["emailNotifications"])
    if "whatsappNotifications" in payload:
        profile.whatsapp_notifications = bool(payload["whatsappNotifications"])

    profile.save(update_fields=update_fields)

    response = {
        "id": request.user.id,
        "name": request.user.get_full_name() or request.user.username,
        "handle": f"@{request.user.username.split('@')[0]}",
    }
    response.update(profile.as_dict())
    return JsonResponse(response)


def user_profile(request, user_id):
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    try:
        user = User.objects.select_related("profile").get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found."}, status=404)

    profile = getattr(user, "profile", None)
    return JsonResponse({
        "id": user.id,
        "name": user.get_full_name() or user.username,
        "handle": f"@{user.username.split('@')[0]}",
        "accountType": profile.account_type if profile else "creator",
        "whatsappNumber": profile.whatsapp_number if profile else "",
        "profilePhotoUrl": profile.profile_photo_url if profile else "",
        "bio": profile.bio if profile else "",
        "serviceCategories": [category for category in profile.service_categories.split(",") if category] if profile else [],
        "travelRadiusKm": profile.travel_radius_km if profile else 0,
        "locationLabel": profile.location_label if profile else "",
        "posts": [post.as_dict() for post in user.posts.all()],
    })


def health(request):
    return JsonResponse({"status": "ok"})


def categories(request):
    return JsonResponse({"categories": CATEGORIES})


@csrf_exempt
def suggest_category(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Request body must be valid JSON."}, status=400)

    service = str(payload.get("service", "")).strip()
    if len(service) < 3:
        return JsonResponse({"category": None, "confidence": 0})

    category, confidence = classifier.predict(service)
    return JsonResponse({"category": category, "confidence": confidence})


def _posts_with_distance(latitude, longitude, radius_km):
    posts_with_distance = []
    for post in Post.objects.exclude(latitude__isnull=True).exclude(longitude__isnull=True):
        distance = haversine_km(latitude, longitude, post.latitude, post.longitude)
        if distance <= radius_km:
            posts_with_distance.append((post, distance))

    posts_with_distance.sort(key=lambda item: item[1])
    return [post.as_dict(distance_km=distance) for post, distance in posts_with_distance]


@csrf_exempt
def posts(request):
    if request.method == "GET":
        latitude = parse_optional_coordinate(request.GET.get("latitude"))
        longitude = parse_optional_coordinate(request.GET.get("longitude"))
        radius_km = parse_optional_coordinate(request.GET.get("radius")) or 50

        if latitude is not None and longitude is not None:
            return JsonResponse({"posts": _posts_with_distance(latitude, longitude, float(radius_km))})

        return JsonResponse({"posts": [post.as_dict() for post in Post.objects.all()]})

    if request.method == "POST":
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Log in to share your work."}, status=401)

        profile = getattr(request.user, "profile", None)
        if profile and profile.account_type != "creator":
            return JsonResponse({"error": "Only creator accounts can upload work."}, status=403)

        payload = request.POST
        media_file = request.FILES.get("media")
        if media_file:
            media_type = media_file.content_type or ""
            if not (media_type.startswith("image/") or media_type.startswith("video/")):
                return JsonResponse({"error": "Upload an image or video file."}, status=400)
            if media_file.size > 50 * 1024 * 1024:
                return JsonResponse({"error": "Files must be smaller than 50 MB."}, status=400)
            if not is_configured() and not settings.DEBUG:
                return JsonResponse(
                    {"error": "Cloudinary media storage is not configured on the server."},
                    status=503,
                )
        else:
            media_type = ""

        uploaded_media_url = ""
        if media_file and is_configured():
            try:
                uploaded_media_url = upload_media(media_file)
            except RuntimeError as error:
                return JsonResponse({"error": str(error)}, status=502)

        required_fields = ["creator", "handle", "service"]
        missing_fields = [field for field in required_fields if not payload.get(field)]
        if missing_fields:
            return JsonResponse(
                {"error": "Missing required fields.", "fields": missing_fields},
                status=400,
            )

        try:
            price = Decimal(str(payload.get("price", "")))
            duration_minutes = int(payload.get("durationMinutes", ""))
        except (InvalidOperation, TypeError, ValueError):
            return JsonResponse({"error": "A valid price and estimated time are required."}, status=400)
        if price < 0 or duration_minutes < 15:
            return JsonResponse({"error": "Price must be non-negative and estimated time must be at least 15 minutes."}, status=400)

        post = Post.objects.create(
            creator=payload["creator"],
            handle=payload["handle"],
            location=payload.get("location", "") or (profile.location_label if profile else ""),
            latitude=profile.latitude if profile else None,
            longitude=profile.longitude if profile else None,
            service=payload["service"],
            category=payload.get("category", "").strip(),
            price=price,
            duration_minutes=duration_minutes,
            caption=payload.get("caption", ""),
            image_url=uploaded_media_url or payload.get("imageUrl", ""),
            media_file=None if uploaded_media_url else media_file,
            media_type=media_type,
            owner=request.user,
        )
        ServiceOffering.objects.update_or_create(
            owner=request.user,
            post=post,
            defaults={
                "name": post.service,
                "price": post.price,
                "duration_minutes": post.duration_minutes,
                "is_active": True,
            },
        )
        return JsonResponse(post.as_dict(), status=201)

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def my_posts(request):
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed."}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to view your uploaded work."}, status=401)

    user_posts = Post.objects.filter(owner=request.user)
    return JsonResponse({"posts": [p.as_dict() for p in user_posts]})


@csrf_exempt
def post_detail(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found."}, status=404)

    if request.method == "GET":
        return JsonResponse(post.as_dict())

    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    if post.owner != request.user and not request.user.is_superuser:
        return JsonResponse({"error": "You do not have permission to modify this post."}, status=403)

    if request.method == "DELETE":
        post.delete()
        return JsonResponse({"message": "Post deleted successfully."})

    if request.method in ("PATCH", "PUT", "POST"):
        try:
            if request.content_type and "application/json" in request.content_type:
                payload = json.loads(request.body)
            else:
                payload = request.POST
        except Exception:
            return JsonResponse({"error": "Invalid request body."}, status=400)

        if "service" in payload and str(payload["service"]).strip():
            post.service = str(payload["service"]).strip()
        if "caption" in payload:
            post.caption = str(payload["caption"]).strip()
        if "location" in payload:
            post.location = str(payload["location"]).strip()
        if "price" in payload:
            post.price = Decimal(str(payload["price"]))
        if "durationMinutes" in payload:
            post.duration_minutes = int(payload["durationMinutes"])

        post.save()
        return JsonResponse(post.as_dict())

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def post_like(request, post_id):
    if request.method not in ("POST", "DELETE"):
        return JsonResponse({"error": "Method not allowed."}, status=405)
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found."}, status=404)

    if request.method == "POST":
        Post.objects.filter(id=post_id).update(likes_count=F("likes_count") + 1)
    else:
        Post.objects.filter(id=post_id, likes_count__gt=0).update(likes_count=F("likes_count") - 1)

    post.refresh_from_db(fields=["likes_count"])
    return JsonResponse({"likesCount": post.likes_count})


def nearby_artists(request):
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    latitude = parse_optional_coordinate(request.GET.get("latitude"))
    longitude = parse_optional_coordinate(request.GET.get("longitude"))
    radius_km = parse_optional_coordinate(request.GET.get("radius")) or 50

    if latitude is None or longitude is None:
        return JsonResponse({"error": "latitude and longitude are required."}, status=400)

    now = timezone.now()
    profiles = UserProfile.objects.select_related("user").filter(account_type="creator").annotate(
        post_count=Count("user__posts", distinct=True),
        open_slot_count=Count(
            "user__availability_slots",
            filter=Q(
                user__availability_slots__is_available=True,
                user__availability_slots__starts_at__gte=now,
            ),
            distinct=True,
        ),
    )

    artists = []
    for profile in profiles:
        distance = haversine_km(latitude, longitude, profile.latitude, profile.longitude)
        if distance > float(radius_km):
            continue

        user = profile.user
        artists.append({
            "id": user.id,
            "name": user.get_full_name() or user.username,
            "handle": f"@{user.username.split('@')[0]}",
            "latitude": float(profile.latitude),
            "longitude": float(profile.longitude),
            "locationLabel": profile.location_label,
            "whatsappNumber": profile.whatsapp_number,
            "distanceKm": round(distance, 1),
            "postCount": profile.post_count,
            "openSlotCount": profile.open_slot_count,
        })

    artists.sort(key=lambda artist: artist["distanceKm"])
    return JsonResponse({"artists": artists})


def _service_as_dict(service):
    return {
        "id": service.id,
        "name": service.name,
        "price": str(service.price),
        "durationMinutes": service.duration_minutes,
        "isActive": service.is_active,
    }


def _slot_as_dict(slot):
    return {
        "id": slot.id,
        "startsAt": slot.starts_at.isoformat(),
        "endsAt": slot.ends_at.isoformat(),
        "isAvailable": slot.is_available,
    }


def _booking_as_dict(booking, viewer):
    other_user = booking.creator if booking.client_id == viewer.id else booking.client
    other_profile = getattr(other_user, "profile", None)
    post_img = ""
    if booking.post:
        post_img = booking.post.media_file.url if booking.post.media_file else booking.post.image_url
    return {
        "id": booking.id,
        "clientId": booking.client_id,
        "creatorId": booking.creator_id,
        "isCreator": booking.creator_id == viewer.id,
        "otherUserName": other_user.get_full_name() or other_user.username,
        "otherUserPhoto": other_profile.profile_photo_url if other_profile else "",
        "whatsappNumber": other_profile.whatsapp_number if other_profile else "",
        "serviceName": booking.service_name,
        "price": str(booking.price),
        "startsAt": booking.starts_at.isoformat(),
        "endsAt": booking.ends_at.isoformat(),
        "status": booking.status,
        "notes": booking.notes,
        "postId": booking.post_id,
        "postImageUrl": post_img,
        "createdAt": booking.created_at.isoformat(),
    }


def services(request, owner_id=None, service_id=None):
    if request.method == "GET":
        if owner_id is None:
            if not request.user.is_authenticated:
                return JsonResponse({"error": "Log in to manage services."}, status=401)
            owner_id = request.user.id
        queryset = ServiceOffering.objects.filter(owner_id=owner_id)
        if request.GET.get("postId"):
            queryset = queryset.filter(post_id=request.GET["postId"])
        if service_id is not None:
            queryset = queryset.filter(id=service_id)
        return JsonResponse({"services": [_service_as_dict(service) for service in queryset]})

    if not request.user.is_authenticated or (owner_id is not None and owner_id != request.user.id):
        return JsonResponse({"error": "Only the profile owner can manage services."}, status=403)

    if service_id is not None:
        try:
            service = ServiceOffering.objects.get(id=service_id, owner=request.user)
        except ServiceOffering.DoesNotExist:
            return JsonResponse({"error": "Service not found."}, status=404)
        if request.method == "DELETE":
            service.delete()
            return JsonResponse({"message": "Service deleted."})
        if request.method != "PATCH":
            return JsonResponse({"error": "Method not allowed."}, status=405)
        payload = json.loads(request.body or "{}")
        is_new_service = False
    else:
        if request.method != "POST":
            return JsonResponse({"error": "Method not allowed."}, status=405)
        payload = json.loads(request.body or "{}")
        service = ServiceOffering(owner=request.user)
        is_new_service = True

    name = str(payload.get("name", service.name)).strip()
    try:
        price = Decimal(str(payload.get("price", service.price)))
        duration = int(payload.get("durationMinutes", service.duration_minutes))
    except (InvalidOperation, TypeError, ValueError):
        return JsonResponse({"error": "Price and duration must be valid numbers."}, status=400)
    if not name or price < 0 or duration < 15:
        return JsonResponse({"error": "Add a service name, a non-negative price, and a duration of at least 15 minutes."}, status=400)

    service.name = name[:120]
    service.price = price
    service.duration_minutes = duration
    service.is_active = bool(payload.get("isActive", service.is_active if service.pk else True))
    service.save()
    return JsonResponse(_service_as_dict(service), status=201 if is_new_service else 200)


def _is_creator_account(user):
    profile = getattr(user, "profile", None)
    return bool(profile and profile.account_type == "creator")


@csrf_exempt
def availability(request, owner_id=None, slot_id=None):
    if request.method == "GET":
        if owner_id is None:
            if not request.user.is_authenticated:
                return JsonResponse({"error": "Log in to manage availability."}, status=401)
            owner_id = request.user.id
        slots = AvailabilitySlot.objects.filter(owner_id=owner_id, starts_at__gte=timezone.now())
        viewing_own = request.user.is_authenticated and request.user.id == owner_id
        if not viewing_own:
            slots = slots.filter(is_available=True)
        if slot_id is not None:
            slots = slots.filter(id=slot_id)
        return JsonResponse({"slots": [_slot_as_dict(slot) for slot in slots]})

    if not request.user.is_authenticated or (owner_id is not None and owner_id != request.user.id):
        return JsonResponse({"error": "Only the profile owner can manage availability."}, status=403)
    if not _is_creator_account(request.user):
        return JsonResponse({"error": "Only stylists and creators can publish booking time slots."}, status=403)

    if slot_id is not None:
        try:
            slot = AvailabilitySlot.objects.get(id=slot_id, owner=request.user)
        except AvailabilitySlot.DoesNotExist:
            return JsonResponse({"error": "Availability slot not found."}, status=404)
        if request.method == "DELETE":
            slot.delete()
            return JsonResponse({"message": "Availability removed."})
        return JsonResponse({"error": "Only deletion is supported for existing slots."}, status=405)

    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    payload = json.loads(request.body or "{}")

    # Support batch slots creation
    slots_batch = payload.get("slots")
    if isinstance(slots_batch, list) and slots_batch:
        created_slots = []
        for item in slots_batch:
            s_at = parse_datetime(str(item.get("startsAt", "")))
            e_at = parse_datetime(str(item.get("endsAt", "")))
            if s_at and e_at and not timezone.is_naive(s_at) and not timezone.is_naive(e_at) and e_at > s_at and s_at >= timezone.now():
                slot, created = AvailabilitySlot.objects.get_or_create(owner=request.user, starts_at=s_at, ends_at=e_at)
                if created:
                    created_slots.append(slot)
        return JsonResponse({"slots": [_slot_as_dict(slot) for slot in created_slots], "count": len(created_slots)}, status=201)

    try:
        starts_at = parse_datetime(str(payload["startsAt"]))
        ends_at = parse_datetime(str(payload["endsAt"]))
    except (KeyError, TypeError, ValueError):
        return JsonResponse({"error": "Valid start and end times are required."}, status=400)
    if not starts_at or not ends_at or timezone.is_naive(starts_at) or timezone.is_naive(ends_at) or ends_at <= starts_at:
        return JsonResponse({"error": "Availability must have an end time after its start time."}, status=400)
    if starts_at < timezone.now():
        return JsonResponse({"error": "Availability slots must start in the future."}, status=400)
    slot, created = AvailabilitySlot.objects.get_or_create(owner=request.user, starts_at=starts_at, ends_at=ends_at)
    if not created:
        return JsonResponse({"error": "That availability slot already exists."}, status=409)
    return JsonResponse(_slot_as_dict(slot), status=201)


@csrf_exempt
def bookings(request, booking_id=None):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to manage bookings."}, status=401)

    if request.method == "GET":
        queryset = (
            Booking.objects.filter(Q(client=request.user) | Q(creator=request.user))
            .select_related("client", "creator", "post", "creator__profile", "client__profile")
            .order_by("-starts_at")
        )
        if booking_id is not None:
            queryset = queryset.filter(id=booking_id)
        return JsonResponse({"bookings": [_booking_as_dict(booking, request.user) for booking in queryset]})

    if request.method == "PATCH":
        if booking_id is None:
            return JsonResponse({"error": "Booking ID is required for updates."}, status=400)
        try:
            booking = Booking.objects.select_related("client", "creator", "post").get(id=booking_id)
        except Booking.DoesNotExist:
            return JsonResponse({"error": "Booking not found."}, status=404)

        is_client = booking.client_id == request.user.id
        is_creator = booking.creator_id == request.user.id
        if not (is_client or is_creator):
            return JsonResponse({"error": "You do not have permission to modify this booking."}, status=403)

        payload = json.loads(request.body or "{}")
        action = payload.get("action")

        if action == "confirm":
            if not is_creator:
                return JsonResponse({"error": "Only the service creator can confirm a booking."}, status=403)
            if booking.status != "requested":
                return JsonResponse({"error": f"Cannot confirm booking with status '{booking.status}'."}, status=400)
            booking.status = "confirmed"
            booking.save(update_fields=["status"])
            Message.objects.create(
                sender=request.user,
                recipient=booking.client,
                post=booking.post,
                body=f"✅ Booking Confirmed: Your appointment for {booking.service_name} on {booking.starts_at.strftime('%d %b %Y at %H:%M')} has been accepted.",
            )

        elif action == "decline":
            if not is_creator:
                return JsonResponse({"error": "Only the service creator can decline a booking."}, status=403)
            if booking.status != "requested":
                return JsonResponse({"error": f"Cannot decline booking with status '{booking.status}'."}, status=400)
            booking.status = "declined"
            booking.save(update_fields=["status"])
            # Auto-release slot so another client can book
            AvailabilitySlot.objects.filter(
                owner=booking.creator, starts_at=booking.starts_at, ends_at=booking.ends_at
            ).update(is_available=True)
            Message.objects.create(
                sender=request.user,
                recipient=booking.client,
                post=booking.post,
                body=f"❌ Booking Declined: The appointment request for {booking.service_name} on {booking.starts_at.strftime('%d %b %Y at %H:%M')} could not be accommodated.",
            )

        elif action == "cancel":
            if booking.status not in ["requested", "confirmed"]:
                return JsonResponse({"error": f"Cannot cancel booking with status '{booking.status}'."}, status=400)
            booking.status = "cancelled"
            booking.save(update_fields=["status"])
            # Auto-release slot
            AvailabilitySlot.objects.filter(
                owner=booking.creator, starts_at=booking.starts_at, ends_at=booking.ends_at
            ).update(is_available=True)
            other_user = booking.creator if is_client else booking.client
            canceller = "Client" if is_client else "Creator"
            Message.objects.create(
                sender=request.user,
                recipient=other_user,
                post=booking.post,
                body=f"⚠️ Booking Cancelled: The appointment for {booking.service_name} on {booking.starts_at.strftime('%d %b %Y at %H:%M')} was cancelled by the {canceller}.",
            )

        elif action == "complete":
            if not is_creator:
                return JsonResponse({"error": "Only the creator can mark a booking as completed."}, status=403)
            booking.status = "completed"
            booking.save(update_fields=["status"])
            Message.objects.create(
                sender=request.user,
                recipient=booking.client,
                post=booking.post,
                body=f"🎉 Booking Completed: Thank you for booking {booking.service_name} with {booking.creator.get_full_name() or booking.creator.username}!",
            )

        else:
            return JsonResponse({"error": f"Unknown action '{action}'."}, status=400)

        return JsonResponse(_booking_as_dict(booking, request.user))

    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    try:
        payload = json.loads(request.body or "{}")
        service = ServiceOffering.objects.get(id=payload.get("serviceId"), is_active=True)
        slot = AvailabilitySlot.objects.get(id=payload.get("slotId"), owner=service.owner, is_available=True)
    except (json.JSONDecodeError, ServiceOffering.DoesNotExist, AvailabilitySlot.DoesNotExist, TypeError, ValueError):
        return JsonResponse({"error": "Choose a valid service and an available time slot published by this stylist."}, status=400)
    if slot.starts_at < timezone.now():
        return JsonResponse({"error": "That time slot has already passed. Choose another available time."}, status=400)
    if service.owner_id == request.user.id:
        return JsonResponse({"error": "You cannot book your own service."}, status=400)
    post_id = payload.get("postId") or None
    if post_id:
        try:
            post = Post.objects.get(id=post_id, owner=service.owner)
        except (Post.DoesNotExist, TypeError, ValueError):
            return JsonResponse({"error": "That portfolio look does not belong to this creator."}, status=400)
    else:
        post = None

    with transaction.atomic():
        if Booking.objects.filter(creator=service.owner, starts_at__lt=slot.ends_at, ends_at__gt=slot.starts_at, status__in=["requested", "confirmed"]).exists():
            return JsonResponse({"error": "That time is no longer available."}, status=409)

        booking = Booking.objects.create(
            client=request.user,
            creator=service.owner,
            post=post,
            service_name=service.name,
            price=service.price,
            starts_at=slot.starts_at,
            ends_at=slot.ends_at,
            notes=str(payload.get("notes") or "").strip(),
        )
        slot.is_available = False
        slot.save(update_fields=["is_available"])

        client_name = request.user.get_full_name() or request.user.username
        notes_str = f" Notes: \"{booking.notes}\"" if booking.notes else ""
        Message.objects.create(
            sender=request.user,
            recipient=service.owner,
            post=post,
            body=f"📅 New booking requested by {client_name} for {booking.service_name} on {slot.starts_at.strftime('%d %b %Y at %H:%M')}. Price: R{booking.price}.{notes_str}",
        )

    return JsonResponse(_booking_as_dict(booking, request.user), status=201)


@csrf_exempt
def messages(request, recipient_id=None):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to use Glam SA messages."}, status=401)

    if request.method == "GET":
        if recipient_id is not None:
            messages_queryset = Message.objects.filter(
                sender__in=[request.user, recipient_id],
                recipient__in=[request.user, recipient_id],
            ).select_related("sender", "recipient", "post")
            return JsonResponse({"messages": [_message_as_dict(message) for message in messages_queryset]})

        messages_queryset = Message.objects.filter(
            sender=request.user,
        ) | Message.objects.filter(recipient=request.user)
        latest_by_user = {}
        for message in messages_queryset.select_related("sender", "recipient", "post"):
            other_user = message.recipient if message.sender_id == request.user.id else message.sender
            latest_by_user[other_user.id] = message
        conversations = []
        for message in sorted(latest_by_user.values(), key=lambda item: item.created_at, reverse=True):
            other_user = message.recipient if message.sender_id == request.user.id else message.sender
            conversations.append({
                "userId": other_user.id,
                "name": other_user.get_full_name() or other_user.username,
                "handle": f"@{other_user.username.split('@')[0]}",
                "lastMessage": message.body,
                "createdAt": message.created_at.isoformat(),
                "postService": message.post.service if message.post else "Booking inquiry",
            })
        return JsonResponse({"conversations": conversations})

    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    try:
        payload = json.loads(request.body)
        recipient = UserProfile.objects.select_related("user").get(user_id=payload.get("recipientId")).user
    except (json.JSONDecodeError, UserProfile.DoesNotExist, TypeError, ValueError):
        return JsonResponse({"error": "A valid recipient is required."}, status=400)

    body = str(payload.get("body", "")).strip()
    if not body:
        return JsonResponse({"error": "Write a message before sending."}, status=400)
    if len(body) > 2000:
        return JsonResponse({"error": "Messages must be 2000 characters or fewer."}, status=400)

    post = None
    if payload.get("postId"):
        try:
            post = Post.objects.get(id=payload["postId"])
        except (Post.DoesNotExist, TypeError, ValueError):
            return JsonResponse({"error": "The referenced look was not found."}, status=400)
        if post.owner_id != recipient.id:
            return JsonResponse({"error": "That look does not belong to the selected artist."}, status=400)

    message = Message.objects.create(sender=request.user, recipient=recipient, post=post, body=body)
    return JsonResponse(_message_as_dict(message), status=201)


def _message_as_dict(message):
    return {
        "id": message.id,
        "senderId": message.sender_id,
        "recipientId": message.recipient_id,
        "body": message.body,
        "createdAt": message.created_at.isoformat(),
        "postService": message.post.service if message.post else "Booking inquiry",
    }


@csrf_exempt
def change_password(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed."}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to change your password."}, status=401)

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Request body must be valid JSON."}, status=400)

    current_password = payload.get("currentPassword", "")
    new_password = payload.get("newPassword", "")

    if not current_password or not new_password:
        return JsonResponse({"error": "Both current and new passwords are required."}, status=400)

    if len(new_password) < 8:
        return JsonResponse({"error": "New password must be at least 8 characters long."}, status=400)

    if not request.user.check_password(current_password):
        return JsonResponse({"error": "Current password is incorrect."}, status=400)

    request.user.set_password(new_password)
    request.user.save()
    login(request, request.user) # Keep the user logged in
    return JsonResponse({"message": "Password updated successfully."})


@csrf_exempt
def delete_account(request):
    if request.method != "DELETE":
        return JsonResponse({"error": "Method not allowed."}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to delete your account."}, status=401)

    user = request.user
    logout(request)
    user.delete()
    return JsonResponse({"message": "Account deleted successfully."})
