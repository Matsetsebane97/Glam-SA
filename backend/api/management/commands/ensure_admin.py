import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create or update the administrator configured through environment variables."

    def handle(self, *args, **options):
        username = os.getenv("GLAM_ADMIN_USERNAME")
        password = os.getenv("GLAM_ADMIN_PASSWORD")

        if not username or not password:
            self.stdout.write("Admin bootstrap skipped: GLAM_ADMIN_USERNAME and GLAM_ADMIN_PASSWORD are not set.")
            return
        if len(password) < 8:
            raise CommandError("GLAM_ADMIN_PASSWORD must contain at least 8 characters.")

        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={"email": username},
        )
        user.email = username
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save(update_fields=["email", "is_staff", "is_superuser", "password"])

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} administrator {username}."))
