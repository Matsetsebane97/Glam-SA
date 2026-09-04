import cloudinary
import cloudinary.uploader
from django.conf import settings


def is_configured():
    return bool(
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    )


def upload_media(uploaded_file):
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    try:
        result = cloudinary.uploader.upload(
            uploaded_file,
            folder="glam-sa/work",
            resource_type="auto",
        )
    except Exception as error:
        raise RuntimeError(f"Cloudinary upload failed: {error}") from error

    secure_url = result.get("secure_url")
    if not secure_url:
        raise RuntimeError("Cloudinary did not return a media URL.")
    return secure_url