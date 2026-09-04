from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_post_likes_count"),
    ]

    operations = [
        migrations.CreateModel(
            name="AvailabilitySlot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("starts_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField()),
                ("is_available", models.BooleanField(default=True)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="availability_slots", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["starts_at"],
                "constraints": [models.UniqueConstraint(fields=("owner", "starts_at", "ends_at"), name="unique_owner_availability_window")],
            },
        ),
        migrations.CreateModel(
            name="ServiceOffering",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("duration_minutes", models.PositiveIntegerField(default=60)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="service_offerings", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Booking",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("service_name", models.CharField(max_length=120)),
                ("price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("starts_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField()),
                ("status", models.CharField(choices=[("requested", "Requested"), ("confirmed", "Confirmed"), ("declined", "Declined"), ("cancelled", "Cancelled")], default="requested", max_length=20)),
                ("notes", models.TextField(blank=True, max_length=2000)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("client", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bookings_made", to=settings.AUTH_USER_MODEL)),
                ("creator", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bookings_received", to=settings.AUTH_USER_MODEL)),
                ("post", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="bookings", to="api.post")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]