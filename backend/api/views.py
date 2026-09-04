"""HTTP handlers for authentication, discovery, portfolios, and messaging."""

import json
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.db.models import F
from django.views.decorators.csrf import csrf_exempt

from .geo import haversine_km, parse_optional_coordinate
from .models import Message, Post, UserProfile
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

    if not name or not email or len(password) < 8:
        return JsonResponse({"error": "Name, email, and an 8-character password are required."}, status=400)
    if account_type not in ("creator", "client"):
        return JsonResponse({"error": "Choose whether you are signing up as a creator or client."}, status=400)
    if account_type == "creator" and not whatsapp_number:
        return JsonResponse({"error": "A WhatsApp number is required for creator accounts."}, status=400)

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
    profile.save(update_fields=["whatsapp_number", "location_label"])

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
        "locationLabel": profile.location_label if profile else "",
        "posts": [post.as_dict() for post in user.posts.all()],
    })


def health(request):
    return JsonResponse({"status": "ok"})


def categories(request):
    return JsonResponse({"categories": CATEGORIES})


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

        post = Post.objects.create(
            creator=payload["creator"],
            handle=payload["handle"],
            location=payload.get("location", "") or (profile.location_label if profile else ""),
            latitude=profile.latitude if profile else None,
            longitude=profile.longitude if profile else None,
            service=payload["service"],
            caption=payload.get("caption", ""),
            image_url=uploaded_media_url or payload.get("imageUrl", ""),
            media_file=None if uploaded_media_url else media_file,
            media_type=media_type,
            owner=request.user,
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

    artists = []
    for profile in UserProfile.objects.select_related("user").all():
        distance = haversine_km(latitude, longitude, profile.latitude, profile.longitude)
        if distance > float(radius_km):
            continue

        user = profile.user
        post_count = Post.objects.filter(owner=user).count()
        artists.append({
            "id": user.id,
            "name": user.get_full_name() or user.username,
            "handle": f"@{user.username.split('@')[0]}",
            "latitude": float(profile.latitude),
            "longitude": float(profile.longitude),
            "locationLabel": profile.location_label,
            "whatsappNumber": profile.whatsapp_number,
            "distanceKm": round(distance, 1),
            "postCount": post_count,
        })

    artists.sort(key=lambda artist: artist["distanceKm"])
    return JsonResponse({"artists": artists})


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
