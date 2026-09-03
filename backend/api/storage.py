import json
import mimetypes
import urllib.error
import urllib.parse
import urllib.request
import uuid

from django.conf import settings


def is_configured():
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)


def upload_media(uploaded_file):
    bucket = settings.SUPABASE_STORAGE_BUCKET
    suffix = mimetypes.guess_extension(uploaded_file.content_type or "") or ""
    path = f"work/{uuid.uuid4().hex}{suffix}"
    encoded_path = urllib.parse.quote(path, safe="/")
    url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{encoded_path}"
    request = urllib.request.Request(
        url,
        data=uploaded_file.read(),
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": uploaded_file.content_type or "application/octet-stream",
            "x-upsert": "false",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status not in (200, 201):
                raise RuntimeError(f"Supabase returned HTTP {response.status}.")
    except (urllib.error.HTTPError, urllib.error.URLError) as error:
        detail = error.read().decode("utf-8", errors="replace") if hasattr(error, "read") else str(error)
        try:
            detail = json.loads(detail).get("message", detail)
        except (TypeError, json.JSONDecodeError):
            pass
        raise RuntimeError(f"Supabase upload failed: {detail}") from error

    public_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/{encoded_path}"
    return public_url